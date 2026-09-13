import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { app_package, ui_elements, question } = await req.json();

    if (!app_package || !ui_elements || !Array.isArray(ui_elements) || !question) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      console.warn("Cloudflare credentials missing. Returning fallback heuristic.");
      return NextResponse.json({
        success: true,
        data: {
          explanation: `माफ़ कीजिये, मैं अभी आपके सवाल का जवाब नहीं दे पा रहा हूँ।`
        }
      });
    }

    // Cloudflare Workers AI Endpoint for Llama 3.2 3B Instruct
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-3b-instruct`;

    const prompt = `You are SaralGati, a patient companion for Indian elders.
The user is looking at an app with package name: ${app_package}.
Here are the text elements visible on their screen:
${ui_elements.join(' | ')}

The user asked you this question (in Hindi via voice): "${question}"

Based on the screen contents, answer their question in 1 or 2 very simple, conversational Hindi sentences. 
Be comforting and respectful. Do not mention that you are an AI. Only output the Hindi sentence.`;

    const payload: any = {
      messages: [
        { role: 'system', content: 'You are a helpful elder companion assistant. Output only Hindi.' },
        { role: 'user', content: prompt }
      ]
    };

    if (process.env.CLOUDFLARE_LORA_NAME) {
      payload.lora = process.env.CLOUDFLARE_LORA_NAME;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Cloudflare AI error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const explanation = result.result?.response || result.result?.choices?.[0]?.message?.content || "मुझे समझने में परेशानी हुई।";

    return NextResponse.json({
      success: true,
      data: {
        explanation: explanation.trim()
      }
    });

  } catch (error) {
    console.error('Agent Ask Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to answer user question' }, { status: 500 });
  }
}
