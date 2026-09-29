/**
 * Turns a model's raw sentence into a *grounded* answer: the `TARGET:n` tag it
 * emitted is checked against the real screen, repaired when the intent
 * dictionary knows a better element, and the sentence is then scored.
 *
 * The dual-engine arbitration used to compare raw text. A model that
 * confidently pointed at the wrong element - or at an index that is not on the
 * screen at all - could therefore win the comparison and only be repaired
 * afterwards, which meant the *other* engine's correct answer never got the
 * chance to win. Grounding both candidates before comparing them is what makes
 * the comparison itself meaningful, and it is also what gives the cache a
 * trustworthy confidence number to promote on.
 *
 * Pure and dependency-light on purpose: `/api/v1/agent/ask` re-derives the same
 * index from the winning answer, so the two paths must agree exactly.
 */

import { scoreOutputConfidence } from './confidenceScorer';
import type { GuidanceLang } from '@/lib/guidance/guidanceLanguage';
import {
  validateSemanticTarget,
  type SemanticValidationResult,
} from '@/lib/guidance/semanticValidator';

export interface GroundedAnswer {
  /** The sentence with its TARGET tag rewritten to the validated index. */
  explanation: string;
  /** What the model asked for, before validation. */
  rawTargetIndex: number | null;
  /** The element the companion should actually spotlight. */
  targetIndex: number | null;
  /** Objective grounding score, 0-100, as the arbiter compares it. */
  score: number;
  reasons: string[];
  /** The sentence names a different element than the one it points at. */
  contradictsTarget: boolean;
  validation: SemanticValidationResult;
}

/**
 * The first `TARGET:n` tag of an answer, removed from the spoken sentence.
 * The first one wins because that is what the ask route has always read, and a
 * mismatch between the two would put the spotlight on one button while the
 * voice names another.
 */
export function parseTargetTag(text: string): {
  explanation: string;
  targetIndex: number | null;
} {
  const match = /TARGET:\s*(\d+)/i.exec(text);
  return {
    explanation: text.replace(/TARGET:\s*\d+/gi, '').trim(),
    targetIndex: match ? parseInt(match[1], 10) : null,
  };
}

/** A control tag the elder must never hear, re-appended at the very end. */
export function withTargetTag(
  explanation: string,
  targetIndex: number | null,
): string {
  if (targetIndex === null) return explanation.trim();
  const sentence = explanation.trim();
  return sentence ? `${sentence} TARGET:${targetIndex}` : `TARGET:${targetIndex}`;
}

/**
 * Parse, validate, repair, score. An answer whose target the validator could
 * not stand behind keeps its sentence but loses the tag (and with it most of
 * its score, which is what stops it from being cached for a week).
 */
export function groundAnswer(params: {
  text: string;
  question: string;
  /** The elder's screen, in their client's original order. */
  uiElements?: string[];
  lang?: GuidanceLang;
}): GroundedAnswer {
  const { explanation, targetIndex: rawTargetIndex } = parseTargetTag(params.text);
  const uiElements = params.uiElements ?? [];
  const validation = validateSemanticTarget(
    params.question,
    rawTargetIndex,
    uiElements,
    explanation,
  );
  const targetIndex = validation.validatedIndex;
  const grounded = withTargetTag(explanation, targetIndex);
  const scored = scoreOutputConfidence(
    grounded,
    params.question,
    uiElements,
    params.lang ?? 'hi',
  );

  return {
    explanation: grounded,
    rawTargetIndex,
    targetIndex,
    score: scored.score,
    reasons: scored.reasons,
    contradictsTarget: scored.contradictsTarget,
    validation,
  };
}
