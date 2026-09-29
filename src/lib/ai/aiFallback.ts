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

import { groundAnswer, type GroundedAnswer } from './answerGrounding';
import type { GuidanceLang } from '@/lib/guidance/guidanceLanguage';
import { voteOnAnswers } from './selfConsistency';

/**
 * SaralGati AI Dual-Engine with Confidence-Based Arbitration
 *
 * Runs both engines concurrently:
 * - Engine A: Custom fine-tuned LoRA on Cloudflare Workers AI (saralgati-elder-lora)
 * - Engine B: Google Gemini AI Studio (Multi-Key array rotation across Eco-Ordered Models)
 *
 * Whichever model outputs the higher *grounded* confidence score (0 to 100) is
 * delivered to the elder. On tie, prefers custom fine-tuned LoRA.
 *
 * "Grounded" is the accuracy fix this module now enforces: both answers are run
 * through the same semantic validator the route applies afterwards before they
 * are compared, so a confident answer that points at the wrong element - or at
 * an element that is not on the screen - loses on merit instead of winning and
 * being repaired (or dropped) after the other engine was already discarded.
 */

interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  uiElements?: string[];
  /**
   * The language the elder chose. Both engines are asked for it in the prompt,
   * but the fine-tuned LoRA was trained on Hinglish, so arbitration has to
   * count an answer written in the wrong script as the weaker answer.
   */
  lang?: GuidanceLang;
  /**
   * How many times to sample the teacher engine (see `selfConsistencyScope`).
   * >1 turns on self-consistency voting (src/lib/ai/selfConsistency.ts): samples
   * are drawn at a sampling temperature and the plurality validated target
   * wins. Left at 1 where an elder is waiting; raised where a label is being
   * produced for training.
   */
  selfConsistency?: number;
  /**
   * Which engines that vote may draw from. Default 'teacher'.
   *
   * The two engines are not symmetric: Cloudflare Workers AI serves our own
   * LoRA adapter - the *student* the flywheel trains - while Gemini is a frozen
   * general model that never learns from these rows. Voting on the teacher
   * removes label noise (the published technique, applied where it belongs).
   * Voting on the student adds no outside information: the plurality of a
   * model's own opinions is still its own opinion, and teaching it back to the
   * adapter is self-distillation, which is how a fine-tune drifts and loses
   * diversity. 'all' exists for the interactive path, where nothing is being
   * trained and more samples simply means a better answer is likelier.
   */
  selfConsistencyScope?: 'teacher' | 'all';
  /** Decoder temperature for this call. 0 is the calm default. */
  temperature?: number;
}

/** Everything the arbiter can explain about why it picked what it picked. */
export interface AnswerGrounding {
  /** Validator verdict on the delivered answer. */
  status: GroundedAnswer['validation']['status'];
  score: number;
  reasons: string[];
  /** Both engines pointed at the same element: independent corroboration. */
  agreed: boolean;
  loraTargetIndex: number | null;
  geminiTargetIndex: number | null;
  /** The delivered sentence names a different element than it points at. */
  contradictsTarget: boolean;
}

export interface AIResponse {
  text: string;
  source: 'lora' | 'gemini';
  modelUsed?: string;
  confidence?: number;
  /** Element the delivered answer points at, after validation. */
  targetIndex?: number | null;
  grounding?: AnswerGrounding;
  /** Present when self-consistency voting was used for this engine. */
  consistency?: {
    sampleCount: number;
    agreeingSamples: number;
    isConsensus: boolean;
  };
  competingResults?: {
    loraConfidence?: number;
    geminiConfidence?: number;
    winner: 'lora' | 'gemini';
    /** Both engines validated the same element. */
    targetAgreement?: boolean;
    loraTargetIndex?: number | null;
    geminiTargetIndex?: number | null;
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

/**
 * Per-attempt budget for one engine. An elder is waiting on spoken guidance and
 * the other engine may already have answered, so a stalled request has to give
 * up instead of holding the whole request open: without a bound, one hung
 * Workers AI or Gemini call could keep the better answer from ever being
 * delivered.
 */
const LORA_TIMEOUT_MS = 2500;
const GEMINI_TIMEOUT_MS = 2500;

/** One retry is worth a second of the elder's time; five are not. */
const MAX_LORA_ATTEMPTS = 2;

/**
 * 65 tokens cut Hinglish/Devanagari answers off mid-sentence often enough to be
 * visible (a 2-sentence Hindi reply plus its TARGET tag does not fit), and a
 * truncated answer is a worse answer however good the target is.
 */
const MAX_ANSWER_TOKENS = 96;

/** Two engines agreeing on the same element is corroboration worth recording. */
const CONSENSUS_BONUS = 5;

/**
 * Two engines pointing at *different* elements means at most one of them is
 * right and neither is convincing, so the delivered answer scores lower and is
 * far less likely to be promoted into the shared screen cache.
 */
const DISAGREEMENT_PENALTY = 10;

/**
 * Sampling temperature used for self-consistency. At 0 every sample is the same
 * answer and voting would be theatre, so samples are drawn warm on purpose - and
 * only there: a single-sample call stays greedy (0).
 */
const SELF_CONSISTENCY_TEMPERATURE = 0.6;

/** An upper bound so a caller cannot turn one answer into an AI bill. */
const MAX_SAMPLES = 3;

/**
 * Which side of the flywheel an engine sits on. The adapter is trained from the
 * rows this request captures, so it is the student; Gemini is the frozen
 * teacher those rows are labelled against.
 */
type EngineRole = 'teacher' | 'student';

/**
 * One engine's answer, sampled k times when self-consistency is on and reduced
 * to the plurality answer by `voteOnAnswers`. A failed sample is simply not a
 * vote, so a slow engine still answers from the samples that did arrive.
 */
async function sampleEngine(
  fetcher: (options: GenerateOptions) => Promise<AIResponse | null>,
  options: GenerateOptions,
  role: EngineRole,
): Promise<AIResponse | null> {
  const samples = Math.max(1, Math.min(MAX_SAMPLES, options.selfConsistency ?? 1));
  const votesHere = samples > 1 && (options.selfConsistencyScope ?? 'teacher') === 'all';
  if (role === 'student' && !votesHere) {
    // The student is answered greedily: one draw, at temperature 0. A vote over
    // the adapter's own samples would put the mode of its current habits into
    // its own training data instead of new information.
    return fetcher(options);
  }
  if (samples === 1) return fetcher(options);

  const outcomes = await Promise.allSettled(
    Array.from({ length: samples }, () =>
      fetcher({ ...options, temperature: SELF_CONSISTENCY_TEMPERATURE }),
    ),
  );
  const answers = outcomes.flatMap((outcome) =>
    outcome.status === 'fulfilled' && outcome.value ? [outcome.value] : [],
  );
  if (answers.length === 0) return null;
  if (answers.length === 1) return answers[0];

  const vote = voteOnAnswers({
    samples: answers.map((answer) => answer.text),
    question: options.userPrompt,
    uiElements: options.uiElements,
    lang: options.lang,
  });
  if (!vote) return answers[0];

  console.log(
    `[Self-Consistency] ${answers[0].source} (${role}): ${vote.agreeingSamples}/${vote.sampleCount} ` +
      `samples agreed on target ${vote.targetIndex ?? 'none'}.`,
  );

  return {
    ...answers[vote.sampleIndex],
    text: vote.text,
    consistency: {
      sampleCount: vote.sampleCount,
      agreeingSamples: vote.agreeingSamples,
      isConsensus: vote.isConsensus,
    },
  };
}

interface Candidate {  result: AIResponse;
  grounded: GroundedAnswer;
  /** Grounded score including the consensus adjustment. */
  score: number;
}

/**
 * Score an answer the way the elder will experience it: the tag it emitted,
 * validated against the real screen. A repaired tag (recovered intent or role)
 * counts as grounded - the appendix below it is what the companion will show.
 */
function scoreCandidate(
  result: AIResponse,
  options: GenerateOptions,
): Candidate {
  const grounded = groundAnswer({
    text: result.text,
    question: options.userPrompt,
    uiElements: options.uiElements,
    lang: options.lang,
  });
  return { result, grounded, score: grounded.score };
}

/**
 * Corroboration adjustment applied to both candidates. It deliberately does not
 * change *which* engine wins (that stays a pure quality comparison), it changes
 * how much the answer is trusted - which is what the cache promotion gate and
 * the logs read.
 */
function consensusAdjustment(
  loraTarget: number | null,
  geminiTarget: number | null,
): number {
  if (loraTarget === null || geminiTarget === null) return 0;
  return loraTarget === geminiTarget ? CONSENSUS_BONUS : -DISAGREEMENT_PENALTY;
}

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

export async function generateAIResponse(options: GenerateOptions): Promise<AIResponse> {
  const hasLoRA = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_LORA_NAME);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());

  if (!hasLoRA && !hasGemini) {
    throw new Error('Neither Cloudflare LoRA nor GEMINI_API_KEY is configured.');
  }

  // 1. Run both models concurrently in parallel when both are configured
  if (hasLoRA && hasGemini) {
    const [loraOutcome, geminiOutcome] = await Promise.allSettled([
      sampleEngine(fetchCloudflareLoRA, options, 'student'),
      sampleEngine(fetchGeminiAIStudio, options, 'teacher')
    ]);

    const loraResult = loraOutcome.status === 'fulfilled' ? loraOutcome.value : null;
    const geminiResult = geminiOutcome.status === 'fulfilled' ? geminiOutcome.value : null;

    // Both models successfully generated responses: Arbitrate on grounded quality!
    if (loraResult && geminiResult) {
      const lora = scoreCandidate(loraResult, options);
      const gemini = scoreCandidate(geminiResult, options);
      const adjustment = consensusAdjustment(lora.grounded.targetIndex, gemini.grounded.targetIndex);
      const loraScore = Math.max(0, Math.min(100, lora.score + adjustment));
      const geminiScore = Math.max(0, Math.min(100, gemini.score + adjustment));
      const agreed =
        lora.grounded.targetIndex !== null &&
        lora.grounded.targetIndex === gemini.grounded.targetIndex;

      console.log(
        `[AI Arbitration] LoRA ${loraScore}% (target ${lora.grounded.targetIndex ?? 'none'}) vs ` +
          `Gemini ${geminiScore}% (target ${gemini.grounded.targetIndex ?? 'none'})` +
          `${adjustment ? ` [${adjustment > 0 ? 'consensus' : 'disagreement'} ${adjustment > 0 ? '+' : ''}${adjustment}]` : ''}`
      );

      const loraWins = loraScore >= geminiScore;
      const winner = loraWins ? lora : gemini;

      return {
        ...winner.result,
        confidence: loraWins ? loraScore : geminiScore,
        targetIndex: winner.grounded.targetIndex,
        grounding: {
          status: winner.grounded.validation.status,
          score: winner.grounded.score,
          reasons: winner.grounded.reasons,
          agreed,
          loraTargetIndex: lora.grounded.targetIndex,
          geminiTargetIndex: gemini.grounded.targetIndex,
          contradictsTarget: winner.grounded.contradictsTarget
        },
        competingResults: {
          loraConfidence: loraScore,
          geminiConfidence: geminiScore,
          winner: loraWins ? 'lora' : 'gemini',
          targetAgreement: agreed,
          loraTargetIndex: lora.grounded.targetIndex,
          geminiTargetIndex: gemini.grounded.targetIndex
        }
      };
    }

    // Only one model succeeded
    if (loraResult) {
      const lora = scoreCandidate(loraResult, options);
      return {
        ...lora.result,
        confidence: lora.score,
        targetIndex: lora.grounded.targetIndex,
        grounding: {
          status: lora.grounded.validation.status,
          score: lora.grounded.score,
          reasons: lora.grounded.reasons,
          agreed: false,
          loraTargetIndex: lora.grounded.targetIndex,
          geminiTargetIndex: null,
          contradictsTarget: lora.grounded.contradictsTarget
        }
      };
    }

    if (geminiResult) {
      const gemini = scoreCandidate(geminiResult, options);
      return {
        ...gemini.result,
        confidence: gemini.score,
        targetIndex: gemini.grounded.targetIndex,
        grounding: {
          status: gemini.grounded.validation.status,
          score: gemini.grounded.score,
          reasons: gemini.grounded.reasons,
          agreed: false,
          loraTargetIndex: null,
          geminiTargetIndex: gemini.grounded.targetIndex,
          contradictsTarget: gemini.grounded.contradictsTarget
        }
      };
    }

    throw new Error('Both Cloudflare LoRA and Gemini AI Studio failed to generate a response.');
  }

  // 2. Only LoRA is configured
  if (hasLoRA) {
    const loraResult = await sampleEngine(fetchCloudflareLoRA, options, 'student');
    if (loraResult) {
      const lora = scoreCandidate(loraResult, options);
      return {
        ...lora.result,
        confidence: lora.score,
        targetIndex: lora.grounded.targetIndex,
        grounding: {
          status: lora.grounded.validation.status,
          score: lora.grounded.score,
          reasons: lora.grounded.reasons,
          agreed: false,
          loraTargetIndex: lora.grounded.targetIndex,
          geminiTargetIndex: null,
          contradictsTarget: lora.grounded.contradictsTarget
        }
      };
    }
    throw new Error('Cloudflare LoRA failed and no Gemini API key configured.');
  }

  // 3. Only Gemini is configured
  const geminiResult = await sampleEngine(fetchGeminiAIStudio, options, 'teacher');
  if (geminiResult) {
    const gemini = scoreCandidate(geminiResult, options);
    return {
      ...gemini.result,
      confidence: gemini.score,
      targetIndex: gemini.grounded.targetIndex,
      grounding: {
        status: gemini.grounded.validation.status,
        score: gemini.grounded.score,
        reasons: gemini.grounded.reasons,
        agreed: false,
        loraTargetIndex: null,
        geminiTargetIndex: gemini.grounded.targetIndex,
        contradictsTarget: gemini.grounded.contradictsTarget
      }
    };
  }
  throw new Error('Gemini AI Studio failed to generate a response.');
}
