import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse } from '@/lib/aiFallback';

export async function POST(req: NextRequest) {
  try {
    const { app_package, ui_elements, question, conversation_history = [] } = await req.json();

    if (!app_package || !ui_elements || !Array.isArray(ui_elements) || !question) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    // === METHOD 1: BACKEND FAST-PATH ENGINE ===
    const questionLower = question.toLowerCase();
    const findUIIndex = (keywords: string[]) => {
      return ui_elements.findIndex((el: string) => {
        const txt = el.toLowerCase();
        return keywords.some(k => txt.includes(k));
      });
    };

    let fpMatch = false;
    let fpExplanation = "";
    let fpIndex = -1;

    if (app_package === 'com.whatsapp') {
      if (questionLower.includes('video') || questionLower.includes('वीडियो')) {
        fpIndex = findUIIndex(['video', 'वीडियो', 'call']);
        if (fpIndex !== -1) { fpExplanation = 'वीडियो कॉल करने के लिए यहाँ दबाएं।'; fpMatch = true; }
      } else if (questionLower.includes('call') || questionLower.includes('कॉल') || questionLower.includes('phone')) {
        fpIndex = findUIIndex(['call', 'कॉल', 'phone']);
        if (fpIndex !== -1) { fpExplanation = 'कॉल करने के लिए यहाँ दबाएं।'; fpMatch = true; }
      } else if (questionLower.includes('status') || questionLower.includes('स्टेटस') || questionLower.includes('update')) {
        fpIndex = findUIIndex(['status', 'स्टेटस', 'update']);
        if (fpIndex !== -1) { fpExplanation = 'स्टेटस देखने के लिए यहाँ दबाएं।'; fpMatch = true; }
      } else if (questionLower.includes('message') || questionLower.includes('chat') || questionLower.includes('मैसेज') || questionLower.includes('new')) {
        fpIndex = findUIIndex(['message', 'chat', 'new', 'मैसेज', 'नया']);
        if (fpIndex !== -1) { fpExplanation = 'नया मैसेज भेजने के लिए यहाँ दबाएं।'; fpMatch = true; }
      }
    } else if (app_package.includes('dialer')) {
      if (questionLower.includes('call') || questionLower.includes('कॉल') || questionLower.includes('phone') || questionLower.includes('फोन') || questionLower.includes('dial')) {
        fpIndex = findUIIndex(['keypad', 'dialpad', 'dial', 'कॉल', 'key']);
        if (fpIndex !== -1) { fpExplanation = 'नंबर डायल करने के लिए यहाँ दबाएं।'; fpMatch = true; }
      } else if (questionLower.includes('contact') || questionLower.includes('संपर्क')) {
        fpIndex = findUIIndex(['contact', 'संपर्क']);
        if (fpIndex !== -1) { fpExplanation = 'संपर्क देखने के लिए यहाँ दबाएं।'; fpMatch = true; }
      }
    } else if (app_package.includes('facebook') || app_package.includes('katana')) {
      if (questionLower.includes('photo') || questionLower.includes('फोटो') || questionLower.includes('post') || questionLower.includes('पोस्ट') || questionLower.includes('mind')) {
        fpIndex = findUIIndex(['photo', 'फोटो', 'post', 'mind', 'create']);
        if (fpIndex !== -1) { fpExplanation = 'फोटो या पोस्ट डालने के लिए यहाँ दबाएं।'; fpMatch = true; }
      } else if (questionLower.includes('video') || questionLower.includes('watch')) {
        fpIndex = findUIIndex(['video', 'watch', 'वीडियो']);
        if (fpIndex !== -1) { fpExplanation = 'वीडियो देखने के लिए यहाँ दबाएं।'; fpMatch = true; }
      }
    } else if (app_package.includes('youtube')) {
      if (questionLower.includes('search') || questionLower.includes('खोज') || questionLower.includes('dhoondh')) {
        fpIndex = findUIIndex(['search', 'खोज']);
        if (fpIndex !== -1) { fpExplanation = 'वीडियो खोजने के लिए यहाँ दबाएं।'; fpMatch = true; }
      } else if (questionLower.includes('shorts')) {
        fpIndex = findUIIndex(['shorts']);
        if (fpIndex !== -1) { fpExplanation = 'शॉर्ट्स (Shorts) देखने के लिए यहाँ दबाएं।'; fpMatch = true; }
      }
    } else if (app_package.includes('photos') || app_package.includes('gallery')) {
      if (questionLower.includes('share') || questionLower.includes('bhejo') || questionLower.includes('शेयर')) {
        fpIndex = findUIIndex(['share', 'शेयर', 'send']);
        if (fpIndex !== -1) { fpExplanation = 'इस फोटो को किसी को भेजने के लिए यहाँ शेयर दबाएं।'; fpMatch = true; }
      } else if (questionLower.includes('delete') || questionLower.includes('hatao') || questionLower.includes('डिलीट')) {
        fpIndex = findUIIndex(['delete', 'trash', 'डिलीट']);
        if (fpIndex !== -1) { fpExplanation = 'इस फोटो को डिलीट करने के लिए यहाँ दबाएं।'; fpMatch = true; }
      }
    } else if (app_package.includes('messaging') || app_package.includes('sms')) {
      if (questionLower.includes('message') || questionLower.includes('sms') || questionLower.includes('मैसेज')) {
        fpIndex = findUIIndex(['start chat', 'new message', 'नया संदेश']);
        if (fpIndex !== -1) { fpExplanation = 'नया मैसेज भेजने के लिए यहाँ क्लिक करें।'; fpMatch = true; }
      } else if (questionLower.includes('otp') || questionLower.includes('code')) {
        fpIndex = findUIIndex(['unread', 'otp', 'message']);
        if (fpIndex !== -1) { fpExplanation = 'अपना मैसेज या OTP पढ़ने के लिए यहाँ दबाएं।'; fpMatch = true; }
      }
    } else if (app_package.includes('contacts')) {
      if (questionLower.includes('add') || questionLower.includes('naya') || questionLower.includes('नया')) {
        fpIndex = findUIIndex(['add', 'new', 'create', 'प्लस']);
        if (fpIndex !== -1) { fpExplanation = 'नया नंबर सेव करने के लिए यहाँ दबाएं।'; fpMatch = true; }
      } else if (questionLower.includes('search') || questionLower.includes('khoj')) {
        fpIndex = findUIIndex(['search', 'खोज']);
        if (fpIndex !== -1) { fpExplanation = 'किसी का नंबर खोजने के लिए यहाँ दबाएं।'; fpMatch = true; }
      }
    }

    if (fpMatch) {
      return NextResponse.json({
        success: true,
        data: {
          explanation: fpExplanation,
          highlight_index: fpIndex,
          source: 'fast_path',
          model_used: 'fast_path_rules'
        }
      });
    }
    // === END FAST-PATH ENGINE ===

    const formattedElements = ui_elements.map((el: string, idx: number) => `[${idx}] ${el}`).join('\n');

    const systemPrompt = `You are SaralGati, a patient, warm companion for Indian elders.
The user is looking at an Android app: ${app_package}.
Here are the numbered interactive elements on their screen:
${formattedElements}

Instructions:
1. Answer the user's question in 1 or 2 simple, comforting Hindi sentences.
2. Elements on screen are prefixed with their role:
   - [BUTTON]: Clickable button or icon that can be tapped.
   - [INPUT]: Text input box for typing.
   - [TOGGLE]: Switch or checkbox.
   - [TEXT]: Plain static non-clickable text or title.
3. When guiding the user to tap, open, or take action, ALWAYS target an interactive element ([BUTTON], [INPUT], or [TOGGLE]). Never target static [TEXT] unless specifically asked to read or verify text.
4. If your answer directs the user to tap or look at a specific element on screen, append " TARGET:[index]" at the very end of your response, where [index] is the exact number of that element (for example: TARGET:2).
5. If no specific element needs to be tapped, do NOT output any TARGET tag.
6. Do not mention that you are an AI. Only output the Hindi sentence.`;

    const aiResult = await generateAIResponse({
      systemPrompt,
      userPrompt: question,
      conversationHistory: conversation_history
    });

    const rawExplanation = aiResult.text;

    const targetMatch = rawExplanation.match(/TARGET:\s*(\d+)/i);
    let highlightIndex: number | null = null;
    let cleanExplanation = rawExplanation;

    if (targetMatch) {
      highlightIndex = parseInt(targetMatch[1], 10);
      cleanExplanation = rawExplanation.replace(/TARGET:\s*\d+/i, '').trim();
    }

    // Smart Fallback: If AI model forgot TARGET tag, match intent prioritizing actionable buttons over static text
    if (highlightIndex === null || highlightIndex < 0 || highlightIndex >= ui_elements.length) {
      const qLower = question.toLowerCase();
      
      const intentKeywords: Record<string, string[]> = {
        search: ['search', 'khoj', 'dhoondh', 'खोज', 'ढूंढ'],
        chat: ['chat', 'message', 'msg', 'naye chat', 'new chat', 'चैट', 'संदेश', 'मैसेज'],
        camera: ['camera', 'photo', 'tasveer', 'कैमरा', 'फोटो'],
        call: ['call', 'phone', 'कॉल', 'फोन'],
        status: ['status', 'update', 'story', 'अपडेट', 'स्टेटस'],
        settings: ['setting', 'option', 'more', 'dots', 'सेटिंग', 'विकल्प']
      };

      // Pass 1: Prioritize actionable buttons/inputs/toggles
      for (let i = 0; i < ui_elements.length; i++) {
        const elText = ui_elements[i].toLowerCase();
        const isActionable = elText.startsWith('[button]') || elText.startsWith('[input]') || elText.startsWith('[toggle]');
        if (!isActionable) continue;

        // Intent-based synonym matching
        for (const keywords of Object.values(intentKeywords)) {
          const qHas = keywords.some(k => qLower.includes(k));
          const elHas = keywords.some(k => elText.includes(k));
          if (qHas && elHas) {
            highlightIndex = i;
            break;
          }
        }
        if (highlightIndex !== null) break;
      }

      // Pass 2: If still not matched, check all elements
      if (highlightIndex === null) {
        for (let i = 0; i < ui_elements.length; i++) {
          const elText = ui_elements[i].toLowerCase();

          for (const keywords of Object.values(intentKeywords)) {
            const qHas = keywords.some(k => qLower.includes(k));
            const elHas = keywords.some(k => elText.includes(k));
            if (qHas && elHas) {
              highlightIndex = i;
              break;
            }
          }
          if (highlightIndex !== null) break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        explanation: cleanExplanation,
        highlight_index: highlightIndex,
        source: aiResult.source,
        model_used: aiResult.modelUsed
      }
    });

  } catch (error) {
    console.error('Agent Ask Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to answer user question' }, { status: 500 });
  }
}
