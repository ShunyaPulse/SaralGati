/**
 * Confidence-Weighted Self-Consistency Voting (Wang et al., 2022; Luo et al.,
 * Weighted Self-Consistency).
 *
 * One sample from a stochastic decoder is a guess, several samples that *agree*
 * are evidence. Each sample is run through the semantic validator and confidence
 * scorer first; target clusters accumulate both vote count (`count`) and
 * confidence mass (`scoreSum`, discounting self-contradictory sentences).
 *
 * Plurality vote count wins first, and ties between clusters are broken by
 * cumulative grounded confidence mass rather than arbitrary draw order when
 * quality differs.
 */

import { groundAnswer, type GroundedAnswer } from './answerGrounding';
import type { GuidanceLang } from '@/lib/guidance/guidanceLanguage';

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

interface TargetCluster {
  count: number;
  scoreSum: number;
  firstSampleIndex: number;
}

/**
 * Confidence-weighted majority vote over validated targets. Returns null only
 * when there is nothing to vote on, so a caller that asked for k samples still
 * answers when the model failed k-1 times.
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
  const clusters = new Map<number, TargetCluster>();
  for (const entry of grounded) {
    if (entry.answer.targetIndex === null) continue;
    const effectiveWeight = entry.answer.contradictsTarget
      ? entry.answer.score * 0.5
      : entry.answer.score;
    const existing = clusters.get(entry.answer.targetIndex);
    if (existing) {
      existing.count += 1;
      existing.scoreSum += effectiveWeight;
    } else {
      clusters.set(entry.answer.targetIndex, {
        count: 1,
        scoreSum: effectiveWeight,
        firstSampleIndex: entry.sampleIndex,
      });
    }
  }

  const leading = [...clusters.entries()].sort((a, b) => {
    if (b[1].count !== a[1].count) return b[1].count - a[1].count;
    if (b[1].scoreSum !== a[1].scoreSum) return b[1].scoreSum - a[1].scoreSum;
    return a[1].firstSampleIndex - b[1].firstSampleIndex;
  })[0];

  const candidates = leading
    ? grounded.filter((entry) => entry.answer.targetIndex === leading[0])
    : grounded;

  // Highest grounded score (preferring non-contradictory answers) wins among the
  // samples supporting the winning cluster.
  const best = candidates.reduce((a, b) => {
    if (a.answer.contradictsTarget !== b.answer.contradictsTarget) {
      return a.answer.contradictsTarget ? b : a;
    }
    return b.answer.score > a.answer.score ? b : a;
  });
  const agreeingSamples = leading ? leading[1].count : 0;

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
