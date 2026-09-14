/**
 * SaralGati AI Fallback Engine
 * Tier 1: Custom fine-tuned LoRA on Cloudflare Workers AI (saralgati-elder-lora)
 * Tier 2: Google Gemini AI Studio (Multi-Key array rotation across Environment-Friendly -> Intelligent Models)
 * 
 * Flow:
 * For each model in the eco-friendly priority order:
 *   Try all available API keys one by one.
 *   If all keys exhaust/fail for that model, move to the next model.
 */

interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface AIResponse {
  text: string;
  source: 'lora' | 'gemini';
  modelUsed?: string;
}

// Environment-friendly -> High Intelligence Model Progression
// Prioritizes Lite/Low-compute models (500 RPD, high RPM) before escalating to heavier flash models
const GEMINI_MODELS_ECO_ORDER = [
  'gemini-3.1-flash-lite',  // Tier 2.1: Ultra-lightweight, 500 RPD, eco-friendly, fast
  'gemini-3.5-flash-lite',  // Tier 2.2: Next-gen lite, high reasoning, low compute, 500 RPD
  'gemini-2.5-flash',       // Tier 2.3: Standard reliable flash
  'gemini-3.5-flash',       // Tier 2.4: Advanced flash
  'gemini-flash-latest'     // Tier 2.5: Peak flash fallback
];

export async function generateAIResponse(options: GenerateOptions): Promise<AIResponse> {
  const { systemPrompt, userPrompt, conversationHistory = [] } = options;

  // =========================================================================
  // TIER 1: Custom LoRA on Cloudflare Workers AI
  // =========================================================================
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const loraName = process.env.CLOUDFLARE_LORA_NAME;

  if (accountId && apiToken && loraName) {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-3b-instruct`;
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userPrompt }
      ];

      let loraSuccess = false;
      const MAX_LORA_RETRIES = 3;

      for (let attempt = 1; attempt <= MAX_LORA_RETRIES; attempt++) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messages,
              lora: loraName
            })
          });

          if (response.ok) {
            const result = await response.json();
            const text = result.result?.response || result.result?.choices?.[0]?.message?.content;
            if (text && typeof text === 'string' && text.trim()) {
              return { text: text.trim(), source: 'lora', modelUsed: loraName };
            }
          } else {
            console.warn(`[Tier 1] Cloudflare LoRA returned status ${response.status} on attempt ${attempt}.`);
            if (attempt === MAX_LORA_RETRIES) {
              console.warn(`[Tier 1] Max retries reached. Initiating Tier 2 Gemini multi-key cascade...`);
            } else {
              // Wait 500ms before retrying
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        } catch (cfErr) {
          console.warn(`[Tier 1] Cloudflare LoRA error on attempt ${attempt}:`, cfErr);
          if (attempt === MAX_LORA_RETRIES) break;
        }
      }
    } catch (cfErr) {
      console.warn(`[Tier 1] Cloudflare LoRA outer error:`, cfErr);
    }
  }

  // =========================================================================
  // TIER 2: Google Gemini AI Studio (Multi-Key across Eco-Ordered Models)
  // Pattern: Keep model constant while rotating through all keys.
  // When all keys are exhausted for that model, shift to next model.
  // =========================================================================
  const apiKeys = (process.env.GEMINI_API_KEY || '')
    .split(',')
    .map(key => key.trim())
    .filter(Boolean);

  if (apiKeys.length === 0) {
    throw new Error('Tier 1 LoRA failed and no GEMINI_API_KEY configured for Tier 2 fallback.');
  }

  let fullPrompt = `${systemPrompt}\n\n`;
  if (conversationHistory.length > 0) {
    fullPrompt += `Previous conversation:\n`;
    for (const msg of conversationHistory) {
      fullPrompt += `${msg.role === 'user' ? 'Elder' : 'Assistant'}: ${msg.content}\n`;
    }
    fullPrompt += `\n`;
  }
  fullPrompt += `User Question: ${userPrompt}`;

  const requestBody = {
    contents: [{
      parts: [{ text: fullPrompt }]
    }]
  };

  // Outer loop: Model stays constant
  for (const model of GEMINI_MODELS_ECO_ORDER) {
    // Inner loop: Rotate through all API keys for this model
    for (let i = 0; i < apiKeys.length; i++) {
      const currentKey = apiKeys[i];
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`;
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
          console.warn(`[Tier 2] Model ${model} failed on Key #${i + 1} (${currentKey.slice(0, 8)}...) with status ${res.status}. Trying next key...`);
          continue; // Try next key for the SAME model
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && typeof text === 'string' && text.trim()) {
          return {
            text: text.trim(),
            source: 'gemini',
            modelUsed: `${model} (Key #${i + 1})`
          };
        }
      } catch (keyErr) {
        console.warn(`[Tier 2] Network error on model ${model} with Key #${i + 1}:`, keyErr);
        continue;
      }
    }
    console.warn(`[Tier 2] All ${apiKeys.length} API key(s) exhausted/failed for model '${model}'. Shifting to next model in eco order...`);
  }

  throw new Error('All Tier 1 and Tier 2 Gemini models & API keys failed.');
}
