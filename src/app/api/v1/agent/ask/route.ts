import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { app_package, ui_elements, question, conversation_history = [] } = await req.json();

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

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (conversation_history && conversation_history.length > 0) {
      messages.push(...conversation_history);
    }

    messages.push({ role: 'user', content: question });

    const payload: any = {
      messages: messages
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
    const rawExplanation = (result.result?.response || result.result?.choices?.[0]?.message?.content || "मुझे समझने में परेशानी हुई।").trim();

    const targetMatch = rawExplanation.match(/TARGET:\s*(\d+)/i);
    let highlightIndex: number | null = null;
    let cleanExplanation = rawExplanation;

    if (targetMatch) {
      highlightIndex = parseInt(targetMatch[1], 10);
      cleanExplanation = rawExplanation.replace(/TARGET:\s*\d+/i, '').trim();
    }

    return NextResponse.json({
      success: true,
      data: {
        explanation: cleanExplanation,
        highlight_index: highlightIndex
      }
    });

  } catch (error) {
    console.error('Agent Ask Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to answer user question' }, { status: 500 });
  }
}
