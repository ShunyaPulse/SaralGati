/**
 * Self-consistency voting - the cheapest well-established accuracy technique
 * that works on small models (Wang et al., 2022, "Self-Consistency Improves
 * Chain-of-Thought Reasoning in Language Models").
 *
 * The idea: one sample from a stochastic decoder is a guess, several samples
 * that *agree* are evidence. Instead of asking the model once and trusting the
 * first thing it says, ask it k times, run every sample through the same
 * semantic validator the route applies, and keep the answer the samples agree
 * on - the answer a plurality of independent draws supports.
 *
 * Voting on the validated **target index** rather than on the sentence is what
 * makes this affordable for an elder companion: the sentences differ in wording
 * every time, but "which button" is a discrete decision that samples either
 * agree or disagree about, and it is exactly the decision the spotlight and the
 * follower's finger depend on.
 *
 * Cost is why it is not always on. Sampling k times multiplies model calls, so
 * the callers enable it where the accuracy matters more than the latency: the
 * self-learning flywheel labels screens in batches with nobody waiting on an
 * answer, and better labels are what make the next adapter better.
 */

import { groundAnswer, type GroundedAnswer } from './answerGrounding';
import type { GuidanceLang } from './guidanceLanguage';

export interface ConsistencyVote {
  /** The winning sentence, with its TARGET tag already validated. */
  text: string;
  /** The element a plurality of samples agreed on, null when none was grounded. */
  targetIndex: number | null;
  /** Which input sample won, so the caller can keep that sample's metadata. */
  sampleIndex: number;
  /** Samples that produced a usable answer. */
  sampleCount: number;
  /** Samples whose validated target matched the winner. */
  agreeingSamples: number;
  /** A real majority (2+ samples on the same element, or every sample agreeing). */
  isConsensus: boolean;
  /** Grounding detail for the winning answer, for logs. */
  grounded: GroundedAnswer;
}

/**
 * Majority vote over validated targets. Returns null only when there is nothing
 * to vote on, so a caller that asked for k samples still answers when the model
 * failed k-1 times.
 *
 * Tie-breaking is deliberate: an equal number of samples pointing at different
 * elements is not consensus, so the best-grounded sentence wins - the same rule
 * the dual-engine arbiter uses.
 */
export function voteOnAnswers(params: {
  samples: string[];
  question: string;
  uiElements?: string[];
  lang?: GuidanceLang;
}): ConsistencyVote | null {
  const grounded = params.samples
    .map((text, sampleIndex) => ({
      sampleIndex,
      text,
      answer: groundAnswer({
        text,
        question: params.question,
        uiElements: params.uiElements,
        lang: params.lang,
      }),
    }))
    .filter((entry) => entry.text.trim().length > 0);

  if (grounded.length === 0) return null;

  // Only a validated target can be voted on: an answer the validator refused to
  // point anywhere is not a vote for "nowhere".
  const tally = new Map<number, number>();
  for (const entry of grounded) {
    if (entry.answer.targetIndex === null) continue;
    tally.set(entry.answer.targetIndex, (tally.get(entry.answer.targetIndex) ?? 0) + 1);
  }

  const leading = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
  const candidates = leading
    ? grounded.filter((entry) => entry.answer.targetIndex === leading[0])
    : grounded;
  // Highest grounded score wins among the samples supporting the majority,
  // which also covers the no-target case (there, the best sentence wins).
  const best = candidates.reduce((a, b) => (b.answer.score > a.answer.score ? b : a));
  const agreeingSamples = leading ? leading[1] : 0;

  return {
    text: best.answer.explanation,
    targetIndex: best.answer.targetIndex,
    sampleIndex: best.sampleIndex,
    sampleCount: grounded.length,
    agreeingSamples,
    isConsensus:
      best.answer.targetIndex !== null &&
      (agreeingSamples >= 2 || agreeingSamples === grounded.length),
    grounded: best.answer,
  };
}
