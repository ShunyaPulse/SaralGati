import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { app_package, ui_elements } = await req.json();

    if (!app_package || !ui_elements || !Array.isArray(ui_elements)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      console.warn("Cloudflare credentials missing. Returning fallback heuristic.");
      // Fallback heuristic if API keys aren't setup yet
      return NextResponse.json({
        success: true,
        data: {
          explanation: `आप अभी ऐप इस्तेमाल कर रहे हैं। यहाँ आप मेनू से आगे जा सकते हैं।`
        }
      });
    }

    // Cloudflare Workers AI Endpoint for Llama 3.2 3B Instruct
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-3b-instruct`;

    const prompt = `You are SaralGati, a patient companion for Indian elders.
The user is currently looking at an app with package name: ${app_package}.
Here are the text elements visible on their screen:
${ui_elements.join(' | ')}

Explain this screen to the elder in 1 or 2 very simple Hindi sentences. 
Tell them where they are and what they can do next. Be comforting and respectful. Do not mention that you are an AI. Only output the Hindi sentence.`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a helpful elder companion assistant. Output only Hindi.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Cloudflare AI error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const explanation = result.result?.response || result.result?.choices?.[0]?.message?.content || "मुझे यह स्क्रीन समझ नहीं आ रही है।";

    return NextResponse.json({
      success: true,
      data: {
        explanation: explanation.trim()
      }
    });

  } catch (error) {
    console.error('Agent Explain Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process screen context' }, { status: 500 });
  }
}
