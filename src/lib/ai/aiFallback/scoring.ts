import { groundAnswer, type GroundedAnswer } from '../answerGrounding';
import type { AIResponse, GenerateOptions } from './types';

export const GEMINI_MODELS_ECO_ORDER = [
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
export const LORA_TIMEOUT_MS = 2500;
export const GEMINI_TIMEOUT_MS = 2500;

/** One retry is worth a second of the elder's time; five are not. */
export const MAX_LORA_ATTEMPTS = 2;

/**
 * 65 tokens cut Hinglish/Devanagari answers off mid-sentence often enough to be
 * visible (a 2-sentence Hindi reply plus its TARGET tag does not fit), and a
 * truncated answer is a worse answer however good the target is.
 */
export const MAX_ANSWER_TOKENS = 96;

/** Two engines agreeing on the same element is corroboration worth recording. */
const CONSENSUS_BONUS = 5;

/**
 * Two engines pointing at *different* elements means at most one of them is
 * right and neither is convincing, so the delivered answer scores lower and is
 * far less likely to be promoted into the shared screen cache.
 */
const DISAGREEMENT_PENALTY = 10;

export interface Candidate {  result: AIResponse;
  grounded: GroundedAnswer;
  /** Grounded score including the consensus adjustment. */
  score: number;
}

/**
 * Score an answer the way the elder will experience it: the tag it emitted,
 * validated against the real screen. A repaired tag (recovered intent or role)
 * counts as grounded - the appendix below it is what the companion will show.
 */
export function scoreCandidate(
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
export function consensusAdjustment(
  loraTarget: number | null,
  geminiTarget: number | null,
): number {
  if (loraTarget === null || geminiTarget === null) return 0;
  return loraTarget === geminiTarget ? CONSENSUS_BONUS : -DISAGREEMENT_PENALTY;
}
