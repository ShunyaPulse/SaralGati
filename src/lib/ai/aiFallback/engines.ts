import type { AIResponse, GenerateOptions } from './types';
import {
  GEMINI_MODELS_ECO_ORDER,
  LORA_TIMEOUT_MS,
  GEMINI_TIMEOUT_MS,
  MAX_LORA_ATTEMPTS,
  MAX_ANSWER_TOKENS,
} from './scoring';

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

/**
 * The two HTTP clients were moved here untouched; the budgets they read live in
 * `scoring.ts` and the arbitration that races them in `index.ts`.
 */
export async function fetchCloudflareLoRA(options: GenerateOptions): Promise<AIResponse | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const loraName = process.env.CLOUDFLARE_LORA_NAME;
  const baseModel = process.env.CLOUDFLARE_BASE_MODEL ||
    (loraName?.includes('31') || loraName?.includes('8b')
      ? '@cf/meta/llama-3.1-8b-instruct-fast'
      : '@cf/meta/llama-3.2-3b-instruct');

  if (!accountId || !apiToken || !loraName) return null;

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${baseModel}`;
  const messages = [
    { role: 'system', content: options.systemPrompt },
    ...(options.conversationHistory || []),
    { role: 'user', content: options.userPrompt }
  ];

  for (let attempt = 1; attempt <= MAX_LORA_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages,
          lora: loraName,
          max_tokens: MAX_ANSWER_TOKENS,
          temperature: options.temperature ?? 0
        }),
        signal: AbortSignal.timeout(LORA_TIMEOUT_MS)
      });

      if (response.ok) {
        const result = await response.json();
        const text = result.result?.response || result.result?.choices?.[0]?.message?.content;
        if (text && typeof text === 'string' && text.trim()) {
          return { text: text.trim(), source: 'lora', modelUsed: loraName };
        }
      } else {
        console.warn(`[LoRA] Cloudflare returned status ${response.status} on attempt ${attempt}.`);
      }
    } catch (cfErr) {
      console.warn('[LoRA] Error on attempt:', attempt, cfErr);
    }
  }

  return null;
}

export async function fetchGeminiAIStudio(options: GenerateOptions): Promise<AIResponse | null> {
  const apiKeys = (process.env.GEMINI_API_KEY || '')
    .split(',')
    .map(key => key.trim())
    .filter(Boolean);

  if (apiKeys.length === 0) return null;

  let fullPrompt = `${options.systemPrompt}\n\n`;
  if (options.conversationHistory && options.conversationHistory.length > 0) {
    fullPrompt += `Previous conversation:\n`;
    for (const msg of options.conversationHistory) {
      fullPrompt += `${msg.role === 'user' ? 'Elder' : 'Assistant'}: ${msg.content}\n`;
    }
    fullPrompt += `\n`;
  }
  fullPrompt += `User Question: ${options.userPrompt}`;

  const requestBody = {
    contents: [{
      parts: [{ text: fullPrompt }]
    }],
    generationConfig: {
      maxOutputTokens: MAX_ANSWER_TOKENS,
      // Guidance wants the same calm answer every time, not a creative one -
      // unless the caller asked for samples to vote over.
      temperature: options.temperature ?? 0
    }
  };

  for (const model of GEMINI_MODELS_ECO_ORDER) {
    for (let i = 0; i < apiKeys.length; i++) {
      const currentKey = apiKeys[i];
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`;
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS)
        });

        if (!res.ok) continue;

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
        continue;
      }
    }
  }

  return null;
}
