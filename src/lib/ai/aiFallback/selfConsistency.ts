import type { AIResponse, GenerateOptions } from './types';
import { voteOnAnswers } from '../selfConsistency';

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
export async function sampleEngine(
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
