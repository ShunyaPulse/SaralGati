import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse } from '@/lib/aiFallback';
import { validateDeviceToken } from '@/lib/agent-auth';

export async function POST(req: NextRequest) {
  try {
    const { app_package, ui_elements } = await req.json();

    if (!app_package || !ui_elements || !Array.isArray(ui_elements)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const auth = await validateDeviceToken(req);
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

    const systemPrompt = `You are SaralGati, a patient companion for Indian elders.
The user is currently looking at an app with package name: ${app_package}.
Here are the text elements visible on their screen:
${ui_elements.join(' | ')}

Explain this screen to the elder in 1 or 2 very simple Hinglish (Hindi written in English script) sentences. 
Tell them where they are and what they can do next. Be comforting and respectful. Do not mention that you are an AI. Only output the Hinglish sentence.`;

    const aiResult = await generateAIResponse({
      systemPrompt,
      userPrompt: 'Is screen ke baare mein samjhao aur batao mujhe kya karna chahiye.'
    });

    return NextResponse.json({
      success: true,
      data: {
        explanation: aiResult.text,
        source: aiResult.source,
        model_used: aiResult.modelUsed
      }
    });

  } catch (error) {
    console.error('Agent Explain Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process screen context' }, { status: 500 });
  }
}
