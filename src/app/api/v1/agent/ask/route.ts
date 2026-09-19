import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { generateAIResponse } from '@/lib/aiFallback';
import { cacheGet, cacheSet } from '@/lib/redis';
import { matchElderIntent } from '@/lib/intentDictionary';
import { pruneUITree } from '@/lib/uiPruner';
import { evaluateMultiStepFlow } from '@/lib/flowEngine';
import { formatRelevantFewShots } from '@/lib/fewShotGrounding';
import { validateSemanticTarget } from '@/lib/semanticValidator';
import { query, queryOne } from '@/lib/db';
import { validateDeviceToken } from '@/lib/agent-auth';
import { rateLimiter, getSubnet } from '@/lib/redis';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { app_package, ui_elements, question, conversation_history = [], elder_id } = await req.json();

    if (!app_package || !ui_elements || !Array.isArray(ui_elements) || !question) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    // Validate device session via Redis/DB or internal Flywheel secret
    const flywheelSecret = req.headers.get('x-flywheel-secret');
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.FLYWHEEL_SECRET || process.env.API_SECRET || 'saralgati_super_secret_key_2024';
    
    const isFlywheel = 
      Boolean((flywheelSecret && flywheelSecret === expectedSecret) ||
      (authHeader && authHeader === `Bearer ${expectedSecret}`));

    const auth = isFlywheel ? { isAuthenticated: true, elderId: undefined } : await validateDeviceToken(req);

    if (!auth.isAuthenticated) {
      return NextResponse.json({
        success: true,
        data: {
          explanation: 'Aapki Elder ID invalid hai. Kripya SaralGati website se naya app download karke sahi Elder ID dalein.',
          source: 'security_gate',
          model_used: 'none'
        }
      });
    }

    const effectiveElderId = auth.elderId || (isFlywheel ? null : elder_id) || null;

    // Apply strict AI processing rate limit (30 requests per minute per device/IP, 120 for flywheel)
    const rateLimitId = isFlywheel ? `ask:flywheel` : (auth.isAuthenticated ? `ask:token:${auth.elderId}` : `ask:ip:${req.headers.get('x-forwarded-for') || 'anon'}`);
    const rateLimit = await rateLimiter(rateLimitId, isFlywheel ? 120 : 30, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json({ success: false, error: 'Too many queries. Please wait a moment.' }, { status: 429 });
    }

    const interactionId = crypto.randomUUID();
    const normalizedElements = ui_elements.map((el: string) =>
      el.trim().toLowerCase().replace(/\b\d{1,2}:\d{2}\s*(am|pm)?\b/gi, '').replace(/\b\d+%/g, '').replace(/\\(\d+\s*(unread|new)\\)/gi, '').trim()
    ).join('|');
    const screenHash = crypto.createHash('sha256').update(normalizedElements).digest('hex').slice(0, 16);

    const logInteraction = async (suggestedIndex: number | null, explanation: string, source: string, modelUsed?: string) => {
      try {
        await query(
          `INSERT INTO model_interactions 
           (id, elder_id, app_package, screen_hash, question, ui_elements, suggested_index, explanation, source, model_used)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO NOTHING`,
          [
            interactionId,
            effectiveElderId,
            app_package,
            screenHash,
            question,
            JSON.stringify(ui_elements),
            suggestedIndex,
            explanation,
            source,
            modelUsed || 'unknown'
          ]
        );
      } catch (err) {
        console.error('Error recording interaction:', err);
      }
    };

    // === METHOD 0: MULTI-STEP FLOW ENGINE (Stateful Redis Sessions) ===
    const flowResult = await evaluateMultiStepFlow(effectiveElderId, question, ui_elements);
    if (flowResult && flowResult.isFlowActive && typeof flowResult.highlightIndex === 'number' && flowResult.highlightIndex >= 0) {
      logInteraction(flowResult.highlightIndex, flowResult.explanation || '', 'multi_step_flow', flowResult.flowId).catch(() => {});
      return NextResponse.json({
        success: true,
        data: {
          interaction_id: interactionId,
          explanation: flowResult.explanation,
          highlight_index: flowResult.highlightIndex,
          source: 'multi_step_flow',
          model_used: flowResult.flowId,
          flow: {
            flow_id: flowResult.flowId,
            current_step: flowResult.currentStep,
            total_steps: flowResult.totalSteps,
            step_label: flowResult.stepLabel
          }
        }
      });
    }

    // === METHOD 1: BACKEND FAST-PATH ENGINE ===
    const questionLower = question.toLowerCase();

    // Role-aware UI finder: strictly prioritizes interactive elements ([BUTTON], [INPUT], [TOGGLE])
    // and ignores subtitle/message preview noise (e.g. "3 videos", "2 photos", timestamps)
    const findUIIndex = (keywords: string[], requireActionable = true): number => {
      const isNoise = (txt: string) => {
        return /\b\d+\s*(videos?|photos?|messages?|audios?)\b/i.test(txt) ||
               /\b(yesterday|am|pm|today)\b/i.test(txt);
      };

      // Pass 1: Prioritize interactive elements ([BUTTON], [INPUT], [TOGGLE])
      const interactiveIdx = ui_elements.findIndex((el: string) => {
        const clean = el.replace(/^\[BELOW-FOLD\]\s*/i, '');
        const isActionable = /^\[(BUTTON|INPUT|TOGGLE)\]/i.test(clean);
        if (!isActionable) return false;
        const txt = clean.toLowerCase();
        if (isNoise(txt)) return false;
        return keywords.some(k => txt.includes(k.toLowerCase()));
      });

      if (interactiveIdx !== -1) return interactiveIdx;

      // Pass 2: Fallback only if requireActionable is false
      if (!requireActionable) {
        return ui_elements.findIndex((el: string) => {
          const txt = el.toLowerCase();
          if (isNoise(txt)) return false;
          return keywords.some(k => txt.includes(k.toLowerCase()));
        });
      }

      return -1;
    };

    let fpMatch = false;
    let fpExplanation = "";
    let fpIndex = -1;

    if (app_package === 'com.whatsapp') {
      if (/\bvideo\s*call\b/i.test(questionLower) || questionLower.includes('वीडियो कॉल') || /\bvideo\b/i.test(questionLower) && /\bcall\b|\bkaro\b|\blagao\b|\bkarni\b/i.test(questionLower)) {
        // 1. First check if a dedicated Video Call button is present (inside an active chat)
        let idx = findUIIndex(['video call', 'वीडियो कॉल', 'video_call']);
        if (idx !== -1) {
          fpIndex = idx;
          fpExplanation = 'Video call karne ke liye yahan video call button par dabayein.';
          fpMatch = true;
        } else {
          // 2. On main screen, direct to Calls tab on bottom navigation bar
          idx = findUIIndex(['calls', 'कॉल', 'call']);
          if (idx !== -1) {
            fpIndex = idx;
            fpExplanation = 'Video ya audio call lagane ke liye niche Calls par dabayein, ya jis vyakti se baat karni hai unki chat kholein.';
            fpMatch = true;
          }
        }
      } else if (questionLower.includes('call') || questionLower.includes('कॉल') || /\bphone\b(?!\s*pe)/i.test(questionLower) || questionLower.includes('फोन')) {
        let idx = findUIIndex(['audio call', 'voice call', 'कॉल']);
        if (idx !== -1) {
          fpIndex = idx;
          fpExplanation = 'Call karne ke liye yahan dabayein.';
          fpMatch = true;
        } else {
          idx = findUIIndex(['calls', 'call', 'कॉल']);
          if (idx !== -1) {
            fpIndex = idx;
            fpExplanation = 'Call lagane ke liye niche Calls par dabayein, ya kisi ki chat kholein.';
            fpMatch = true;
          }
        }
      } else if (questionLower.includes('status') || questionLower.includes('स्टेटस') || questionLower.includes('update')) {
        fpIndex = findUIIndex(['updates', 'status', 'स्टेटस', 'update']);
        if (fpIndex !== -1) { fpExplanation = 'Status (Updates) dekhne ke liye yahan dabayein.'; fpMatch = true; }
      } else if (questionLower.includes('message') || questionLower.includes('chat') || questionLower.includes('मैसेज') || questionLower.includes('new')) {
        fpIndex = findUIIndex(['message', 'chat', 'new', 'मैसेज', 'नया']);
        if (fpIndex !== -1) { fpExplanation = 'Naya message bhejne ke liye yahan dabayein.'; fpMatch = true; }
      }
    } else if (app_package.includes('dialer')) {
      if (questionLower.includes('call') || questionLower.includes('कॉल') || questionLower.includes('phone') || questionLower.includes('फोन') || questionLower.includes('dial')) {
        fpIndex = findUIIndex(['keypad', 'dialpad', 'dial', 'कॉल', 'key']);
        if (fpIndex !== -1) { fpExplanation = 'Number dial karne ke liye yahan dabayein.'; fpMatch = true; }
      } else if (questionLower.includes('contact') || questionLower.includes('संपर्क')) {
        fpIndex = findUIIndex(['contact', 'संपर्क']);
        if (fpIndex !== -1) { fpExplanation = 'Sampark (Contacts) dekhne ke liye yahan dabayein.'; fpMatch = true; }
      }
    } else if (app_package.includes('facebook') || app_package.includes('katana')) {
      if (questionLower.includes('photo') || questionLower.includes('फोटो') || questionLower.includes('post') || questionLower.includes('पोस्ट') || questionLower.includes('mind')) {
        fpIndex = findUIIndex(['photo', 'फोटो', 'post', 'mind', 'create']);
        if (fpIndex !== -1) { fpExplanation = 'Photo ya post daalne ke liye yahan dabayein.'; fpMatch = true; }
      } else if (questionLower.includes('video') || questionLower.includes('watch')) {
        fpIndex = findUIIndex(['video', 'watch', 'वीडियो']);
        if (fpIndex !== -1) { fpExplanation = 'Video dekhne ke liye yahan dabayein.'; fpMatch = true; }
      }
    } else if (app_package.includes('youtube')) {
      if (questionLower.includes('search') || questionLower.includes('खोज') || questionLower.includes('dhoondh')) {
        fpIndex = findUIIndex(['search', 'खोज']);
        if (fpIndex !== -1) { fpExplanation = 'Video khojne ke liye yahan dabayein.'; fpMatch = true; }
      } else if (questionLower.includes('shorts')) {
        fpIndex = findUIIndex(['shorts']);
        if (fpIndex !== -1) { fpExplanation = 'Shorts dekhne ke liye yahan dabayein.'; fpMatch = true; }
      }
    } else if (app_package.includes('photos') || app_package.includes('gallery')) {
      if (questionLower.includes('share') || questionLower.includes('bhejo') || questionLower.includes('शेयर')) {
        fpIndex = findUIIndex(['share', 'शेयर', 'send']);
        if (fpIndex !== -1) { fpExplanation = 'Is photo ko kisi ko bhejne ke liye yahan share dabayein.'; fpMatch = true; }
      } else if (questionLower.includes('delete') || questionLower.includes('hatao') || questionLower.includes('डिलीट')) {
        fpIndex = findUIIndex(['delete', 'trash', 'डिलीट']);
        if (fpIndex !== -1) { fpExplanation = 'Is photo ko delete karne ke liye yahan dabayein.'; fpMatch = true; }
      }
    } else if (app_package.includes('messaging') || app_package.includes('sms')) {
      if (questionLower.includes('message') || questionLower.includes('sms') || questionLower.includes('मैसेज')) {
        fpIndex = findUIIndex(['start chat', 'new message', 'नया संदेश']);
        if (fpIndex !== -1) { fpExplanation = 'Naya message bhejne ke liye yahan click karein.'; fpMatch = true; }
      } else if (questionLower.includes('otp') || questionLower.includes('code')) {
        fpIndex = findUIIndex(['unread', 'otp', 'message']);
        if (fpIndex !== -1) { fpExplanation = 'Apna message ya OTP padhne ke liye yahan dabayein.'; fpMatch = true; }
      }
    } else if (app_package.includes('contacts')) {
      if (questionLower.includes('add') || questionLower.includes('naya') || questionLower.includes('नया')) {
        fpIndex = findUIIndex(['add', 'new', 'create', 'प्लस']);
        if (fpIndex !== -1) { fpExplanation = 'Naya number save karne ke liye yahan dabayein.'; fpMatch = true; }
      } else if (questionLower.includes('search') || questionLower.includes('khoj')) {
        fpIndex = findUIIndex(['search', 'खोज']);
        if (fpIndex !== -1) { fpExplanation = 'Kisi ka number khojne ke liye yahan dabayein.'; fpMatch = true; }
      }
    }

    // General Elder Intent Fast-Path: If app-specific rules didn't hit, check 50-category dictionary
    if (!fpMatch) {
      const intentFastMatch = matchElderIntent(question, ui_elements);
      if (intentFastMatch.highlightIndex !== null && intentFastMatch.matchedIntent !== null) {
        fpIndex = intentFastMatch.highlightIndex;
        fpExplanation = intentFastMatch.explanation;
        fpMatch = true;
      }
    }

    if (fpMatch) {
      logInteraction(fpIndex, fpExplanation, 'fast_path', 'fast_path_rules').catch(() => {});
      return NextResponse.json({
        success: true,
        data: {
          interaction_id: interactionId,
          explanation: fpExplanation,
          highlight_index: fpIndex,
          source: 'fast_path',
          model_used: 'fast_path_rules'
        }
      });
    }
    // === END FAST-PATH ENGINE ===

    // === METHOD 2: REDIS GLOBAL SCREEN CACHE ===
    const normalizedQuestion = question.trim().toLowerCase().replace(/[^\w\s\u0900-\u097F]/g, '').replace(/\s+/g, ' ');
    const historyHash = conversation_history.length > 0
      ? `:${crypto.createHash('sha256').update(JSON.stringify(conversation_history)).digest('hex').slice(0, 8)}`
      : '';
    const cacheKey = `screen_cache:${app_package}:${screenHash}:${normalizedQuestion}${historyHash}`;

    const cached = await cacheGet<{ explanation: string; highlight_index: number | null }>(cacheKey);
    if (cached) {
      logInteraction(cached.highlight_index, cached.explanation, 'redis_cache', 'global_screen_cache').catch(() => {});
      return NextResponse.json({
        success: true,
        data: {
          interaction_id: interactionId,
          explanation: cached.explanation,
          highlight_index: cached.highlight_index,
          source: 'redis_cache',
          model_used: 'global_screen_cache'
        }
      });
    }
    // === END REDIS GLOBAL SCREEN CACHE ===

    // Prune UI Tree: filter preview noise and static boilerplate while preserving original client indices
    const { formattedString: formattedElements } = pruneUITree(ui_elements, question);

    const fewShots = formatRelevantFewShots(app_package, question, 4);

    const systemPrompt = `You are SaralGati, a patient, warm companion for Indian elders.
The user is looking at an Android app: ${app_package}.
Here are the numbered interactive elements on their screen:
${formattedElements}

Instructions:
1. Answer the user's question in 1 or 2 simple, comforting Hinglish (Hindi written in English script) sentences.
2. Elements on screen are prefixed with their role:
   - [BUTTON]: Clickable button or icon that can be tapped.
   - [INPUT]: Text input box for typing.
   - [TOGGLE]: Switch or checkbox.
   - [TEXT]: Plain static non-clickable text or title.
3. When guiding the user to tap, open, or take action, ALWAYS target an interactive element ([BUTTON], [INPUT], or [TOGGLE]). Never target static [TEXT] unless specifically asked to read or verify text.
4. If your answer directs the user to tap or look at a specific element on screen, append " TARGET:[index]" at the very end of your response, where [index] is the exact number of that element (for example: TARGET:2).
5. If no specific element needs to be tapped, do NOT output any TARGET tag.
6. Do not mention that you are an AI. Only output the Hinglish sentence.

Few-shot Grounding Examples:
${fewShots}`;

    const aiResult = await generateAIResponse({
      systemPrompt,
      userPrompt: question,
      conversationHistory: conversation_history,
      uiElements: ui_elements
    });

    const rawExplanation = aiResult.text;

    const targetMatch = rawExplanation.match(/TARGET:\s*(\d+)/i);
    let rawHighlightIndex: number | null = null;
    let cleanExplanation = rawExplanation;

    if (targetMatch) {
      rawHighlightIndex = parseInt(targetMatch[1], 10);
      cleanExplanation = rawExplanation.replace(/TARGET:\s*\d+/gi, '').trim();
    }

    // === METHOD 4: POST-LLM SEMANTIC TARGET VALIDATOR ===
    // Validates interactive role, filters noise (media/timestamps), and prevents semantic hallucinations
    const validation = validateSemanticTarget(question, rawHighlightIndex, ui_elements, cleanExplanation);
    const highlightIndex = validation.validatedIndex;

    const resultData = {
      explanation: cleanExplanation,
      highlight_index: highlightIndex,
      source: validation.status === 'recovered_intent' || validation.status === 'recovered_role' ? 'validated_fallback' : aiResult.source,
      model_used: aiResult.modelUsed,
      confidence: aiResult.confidence,
      arbitration: aiResult.competingResults
    };

    // Cache verified AI response for 7 days (prevents poisoning cache with hallucinations)
    if (validation.isValid) {
      await cacheSet(cacheKey, {
        explanation: cleanExplanation,
        highlight_index: highlightIndex
      }, 7 * 86400);
    }

    logInteraction(highlightIndex, cleanExplanation, resultData.source, aiResult.modelUsed).catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        interaction_id: interactionId,
        ...resultData
      }
    });

  } catch (error) {
    console.error('Agent Ask Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to answer user question' }, { status: 500 });
  }
}
