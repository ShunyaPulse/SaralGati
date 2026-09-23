import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateAIResponse } from '@/lib/aiFallback';
import { validateDeviceToken } from '@/lib/agent-auth';

const explainRequestSchema = z.object({
  app_package: z.string().min(1, 'app_package is required').max(200).regex(/^[a-zA-Z][a-zA-Z0-9._]*$/),
  ui_elements: z.array(z.string().max(1000)).min(1).max(500)
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate first
    const flywheelSecret = req.headers.get('x-flywheel-secret');
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.FLYWHEEL_SECRET || process.env.API_SECRET || 'saralgati_super_secret_key_2024';
    
    const isFlywheel = 
      Boolean((flywheelSecret && flywheelSecret === expectedSecret) ||
      (authHeader && authHeader === `Bearer ${expectedSecret}`));

    const auth = isFlywheel ? { isAuthenticated: true } : await validateDeviceToken(req);
    if (!isFlywheel && !auth.isAuthenticated) {
      return NextResponse.json({
        success: true,
        data: {
          explanation: 'Aapki Elder ID invalid hai. Kripya SaralGati website se naya app download karke sahi Elder ID dalein.',
          source: 'security_gate',
          model_used: 'none'
        }
      });
    }

    // 2. Validate payload with Zod
    const rawBody = await req.json();
    const parseResult = explainRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const { app_package: safeAppPackage, ui_elements: safeUIElements } = parseResult.data;

    const systemPrompt = `You are SaralGati, a patient companion for Indian elders.
The user is currently looking at an app with package name: ${safeAppPackage}.
Here are the text elements visible on their screen:
${safeUIElements.join(' | ')}

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
