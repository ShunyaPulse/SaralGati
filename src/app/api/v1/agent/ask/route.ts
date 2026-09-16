import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse } from '@/lib/aiFallback';

export async function POST(req: NextRequest) {
  try {
    const { app_package, ui_elements, question, conversation_history = [] } = await req.json();

    if (!app_package || !ui_elements || !Array.isArray(ui_elements) || !question) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const formattedElements = ui_elements.map((el: string, idx: number) => `[${idx}] ${el}`).join('\n');

    const systemPrompt = `You are SaralGati, a patient, warm companion for Indian elders.
The user is looking at an Android app: ${app_package}.
Here are the numbered interactive elements on their screen:
${formattedElements}

Instructions:
1. Answer the user's question in 1 or 2 simple, comforting Hindi sentences.
2. If your answer directs the user to tap or look at a specific element on screen, append " TARGET:[index]" at the very end of your response, where [index] is the exact number of that element (for example: TARGET:2).
3. If no specific element needs to be tapped, do NOT output any TARGET tag.
4. Do not mention that you are an AI. Only output the Hindi sentence.`;

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

    // Smart Fallback: If AI model forgot TARGET tag, match intent from question and screen elements
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

      for (let i = 0; i < ui_elements.length; i++) {
        const elText = ui_elements[i].toLowerCase();

        // 1. Direct containment
        if (elText.length > 2 && (qLower.includes(elText) || elText.includes(qLower))) {
          highlightIndex = i;
          break;
        }

        // 2. Intent-based synonym matching
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
