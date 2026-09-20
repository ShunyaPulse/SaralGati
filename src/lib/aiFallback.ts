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

import { scoreOutputConfidence } from './confidenceScorer';

/**
 * SaralGati AI Dual-Engine with Confidence-Based Arbitration
 * 
 * Runs both engines concurrently:
 * - Engine A: Custom fine-tuned LoRA on Cloudflare Workers AI (saralgati-elder-lora)
 * - Engine B: Google Gemini AI Studio (Multi-Key array rotation across Eco-Ordered Models)
 * 
 * Whichever model outputs the higher objective grounding confidence score
 * (0 to 100) is delivered to the elder. On tie, prefers custom fine-tuned LoRA.
 */

interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  uiElements?: string[];
}

export interface AIResponse {
  text: string;
  source: 'lora' | 'gemini';
  modelUsed?: string;
  confidence?: number;
  competingResults?: {
    loraConfidence?: number;
    geminiConfidence?: number;
    winner: 'lora' | 'gemini';
  };
}

// Environment-friendly -> High Intelligence Model Progression
const GEMINI_MODELS_ECO_ORDER = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest'
];

async function fetchCloudflareLoRA(options: GenerateOptions): Promise<AIResponse | null> {
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
          lora: loraName,
          max_tokens: 65
        })
      });

      if (response.ok) {
        const result = await response.json();
        const text = result.result?.response || result.result?.choices?.[0]?.message?.content;
        if (text && typeof text === 'string' && text.trim()) {
          return { text: text.trim(), source: 'lora', modelUsed: loraName };
        }
      } else {
        console.warn(`[LoRA] Cloudflare returned status ${response.status} on attempt ${attempt}.`);
        if (attempt < MAX_LORA_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    } catch (cfErr) {
      console.warn('[LoRA] Error on attempt:', attempt, cfErr);
      if (attempt === MAX_LORA_RETRIES) break;
    }
  }

  return null;
}

async function fetchGeminiAIStudio(options: GenerateOptions): Promise<AIResponse | null> {
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
      maxOutputTokens: 65
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
          body: JSON.stringify(requestBody)
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

export async function generateAIResponse(options: GenerateOptions): Promise<AIResponse> {
  const hasLoRA = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_LORA_NAME);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());

  if (!hasLoRA && !hasGemini) {
    throw new Error('Neither Cloudflare LoRA nor GEMINI_API_KEY is configured.');
  }

  // 1. Run both models concurrently in parallel when both are configured
  if (hasLoRA && hasGemini) {
    const [loraOutcome, geminiOutcome] = await Promise.allSettled([
      fetchCloudflareLoRA(options),
      fetchGeminiAIStudio(options)
    ]);

    const loraResult = loraOutcome.status === 'fulfilled' ? loraOutcome.value : null;
    const geminiResult = geminiOutcome.status === 'fulfilled' ? geminiOutcome.value : null;

    // Both models successfully generated responses: Arbitrate by Confidence Score!
    if (loraResult && geminiResult) {
      const loraScore = scoreOutputConfidence(loraResult.text, options.userPrompt, options.uiElements);
      const geminiScore = scoreOutputConfidence(geminiResult.text, options.userPrompt, options.uiElements);

      console.log(`[AI Arbitration] LoRA Confidence: ${loraScore.score}% vs Gemini Confidence: ${geminiScore.score}%`);

      // On tie or higher LoRA score, deliver custom LoRA answer; otherwise deliver Gemini
      if (loraScore.score >= geminiScore.score) {
        return {
          ...loraResult,
          confidence: loraScore.score,
          competingResults: {
            loraConfidence: loraScore.score,
            geminiConfidence: geminiScore.score,
            winner: 'lora'
          }
        };
      } else {
        return {
          ...geminiResult,
          confidence: geminiScore.score,
          competingResults: {
            loraConfidence: loraScore.score,
            geminiConfidence: geminiScore.score,
            winner: 'gemini'
          }
        };
      }
    }

    // Only one model succeeded
    if (loraResult) {
      const loraScore = scoreOutputConfidence(loraResult.text, options.userPrompt, options.uiElements);
      return { ...loraResult, confidence: loraScore.score };
    }

    if (geminiResult) {
      const geminiScore = scoreOutputConfidence(geminiResult.text, options.userPrompt, options.uiElements);
      return { ...geminiResult, confidence: geminiScore.score };
    }

    throw new Error('Both Cloudflare LoRA and Gemini AI Studio failed to generate a response.');
  }

  // 2. Only LoRA is configured
  if (hasLoRA) {
    const loraResult = await fetchCloudflareLoRA(options);
    if (loraResult) {
      const loraScore = scoreOutputConfidence(loraResult.text, options.userPrompt, options.uiElements);
      return { ...loraResult, confidence: loraScore.score };
    }
    throw new Error('Cloudflare LoRA failed and no Gemini API key configured.');
  }

  // 3. Only Gemini is configured
  const geminiResult = await fetchGeminiAIStudio(options);
  if (geminiResult) {
    const geminiScore = scoreOutputConfidence(geminiResult.text, options.userPrompt, options.uiElements);
    return { ...geminiResult, confidence: geminiScore.score };
  }
  throw new Error('Gemini AI Studio failed to generate a response.');
}
