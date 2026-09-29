/**
 * An offline accuracy benchmark for the guidance stack.
 *
 * Every accuracy claim in this repo used to rest on a handful of pinned
 * examples. That is enough to stop a specific bug coming back, and not enough
 * to answer the only question that matters here: *how often does the companion
 * point the elder at the right button?* This module answers it with no network,
 * no model call and no cost - the deterministic engines (fast path, intent
 * dictionary, semantic validator, confidence scorer, BM25 retrieval) are pure
 * functions of a screen and a question, so they can be scored against labelled
 * cases on every commit.
 *
 * Three numbers come out of it, and they are the ones to move:
 *
 * 1. **Deterministic accuracy / coverage.** The fast path and the intent
 *    dictionary answer *before* the model runs and their answer is delivered
 *    unchecked, so a wrong one is not repaired by anything. Precision here is a
 *    correctness metric, coverage is a latency metric (an answered question
 *    never pays for inference).
 * 2. **Verifier behaviour under perturbation.** A labelled answer is
 *    deliberately damaged - index off by one, an index that is not on the
 *    screen, a sentence naming a different element, a call-preview line - and
 *    `groundAnswer` has to repair it, refuse it, or at least flag it. This is
 *    the measurement that says whether the verifier earns its place.
 * 3. **Retrieval hit rate.** Whether the examples handed to the model are the
 *    ones about the app the elder is looking at.
 *
 * Fixtures are written the way a device sends a screen (index-prefixed,
 * role-tagged lines) and the way an elder speaks (imperative, mostly Hinglish).
 */

import { matchFastPathRule } from '@/lib/guidance/agentFastPath';
import { formatRelevantFewShots } from '../fewShotGrounding';
import { matchElderIntent } from '@/lib/guidance/intentDictionary';
import { GUIDANCE_CASES, type GuidanceCase } from './fixtures';
import {
  checkVerifierCase,
  names,
  noiseElementIndex,
  otherElementIndex,
  spokenLabel,
  type PerturbationKind,
  type VerifierCaseResult,
  type VerifierKindReport,
  type VerifierReport,
} from './verifierCases';

// The fixtures and the verifier's case builders moved into their own modules;
// they are part of this module's public surface just as they always were.
export { GUIDANCE_CASES };
export type { GuidanceCase };
export type { PerturbationKind, VerifierCaseResult, VerifierKindReport, VerifierReport };

export interface DeterministicCaseResult {
  id: string;
  source: 'fast_path' | 'intent_dictionary' | 'unanswered';
  index: number | null;
  expectedIndex: number | null;
  correct: boolean;
}

export interface DeterministicReport {
  total: number;
  answered: number;
  correct: number;
  /** Correct / answered - the fast layers are delivered unchecked. */
  precision: number;
  /** Answered / total - the share of questions that never pay for inference. */
  coverage: number;
  /** Cases where nothing should be tapped but an engine pointed somewhere. */
  falsePositives: DeterministicCaseResult[];
  failures: DeterministicCaseResult[];
  /**
   * Questions a real element was expected for that still fall through to the
   * models. Named so the coverage number is actionable rather than a score to
   * watch: each one is a case where the deterministic layers could be taught
   * the flow for free.
   */
  unanswered: DeterministicCaseResult[];
  results: DeterministicCaseResult[];
}

/**
 * The deterministic engines as `/ask` runs them: fast path first (it wins
 * outright), then the intent dictionary.
 */
export function runDeterministic(
  cases: GuidanceCase[] = GUIDANCE_CASES,
): DeterministicReport {
  const results: DeterministicCaseResult[] = [];

  for (const testCase of cases) {
    const lang = testCase.lang ?? 'hi';
    const fastPath = matchFastPathRule(
      testCase.appPackage,
      testCase.question,
      testCase.elements,
      lang,
    );

    let source: DeterministicCaseResult['source'] = 'unanswered';
    let index: number | null = null;

    if (fastPath) {
      source = 'fast_path';
      index = fastPath.index;
    } else {
      const intent = matchElderIntent(testCase.question, testCase.elements, lang);
      if (intent.highlightIndex !== null) {
        source = 'intent_dictionary';
        index = intent.highlightIndex;
      }
    }

    results.push({
      id: testCase.id,
      source,
      index,
      expectedIndex: testCase.expectedIndex,
      correct: index !== null && index === testCase.expectedIndex,
    });
  }

  const answered = results.filter((result) => result.index !== null);
  const correct = results.filter((result) => result.correct);
  const falsePositives = results.filter(
    (result) => result.index !== null && result.expectedIndex === null,
  );
  const failures = results.filter(
    (result) =>
      result.index !== null &&
      result.expectedIndex !== null &&
      result.index !== result.expectedIndex,
  );
  const unanswered = results.filter(
    (result) => result.index === null && result.expectedIndex !== null,
  );

  return {
    total: results.length,
    answered: answered.length,
    correct: correct.length,
    precision: answered.length === 0 ? 1 : correct.length / answered.length,
    coverage: results.length === 0 ? 0 : answered.length / results.length,
    falsePositives,
    failures,
    unanswered,
    results,
  };
}

/**
 * Damage a labelled answer five ways and check that grounding either repairs,
 * refuses or at least flags it. Every perturbation is derived from the case
 * itself, so the benchmark grows with the fixture list.
 */
export function runVerifier(
  cases: GuidanceCase[] = GUIDANCE_CASES,
): VerifierReport {
  const results: VerifierCaseResult[] = [];

  for (const testCase of cases) {
    const expected = testCase.expectedIndex;
    if (expected === null) continue;
    const label = spokenLabel(testCase.elements[expected]);

    // 1. A correct, well-named answer must survive untouched.
    results.push(
      checkVerifierCase(testCase, 'gold', names(label, expected), expected, (result) => ({
        passed: result.targetIndex === expected && !result.contradictsTarget,
        detail: `gold answer delivered as ${result.targetIndex}`,
      }))!,
    );

    // 2. The right sentence, the wrong index: it must be repaired or flagged.
    const offByOne = expected + 1 < testCase.elements.length ? expected + 1 : expected - 1;
    if (offByOne >= 0 && offByOne !== expected) {
      results.push(
        checkVerifierCase(
          testCase,
          'off_by_one',
          names(label, offByOne),
          offByOne,
          (result) => ({
            passed: result.targetIndex === expected || result.contradictsTarget,
            detail:
              result.targetIndex === expected
                ? 'repaired to the named element'
                : `delivered ${result.targetIndex} (expected ${expected}) without flagging it`,
          }),
        )!,
      );
    }

    // 3. An index that is not on the screen must never be delivered.
    results.push(
      checkVerifierCase(testCase, 'out_of_bounds', names(label, 99), 99, (result) => ({
        passed:
          result.targetIndex === null ||
          (result.targetIndex >= 0 && result.targetIndex < testCase.elements.length),
        detail: `out-of-bounds 99 delivered as ${result.targetIndex}`,
      }))!,
    );

    // 4. A sentence naming a different control than it points at is the way a
    //    model is confidently wrong; it has to be flagged.
    const other = otherElementIndex(testCase.elements, expected);
    if (other !== null) {
      results.push(
        checkVerifierCase(
          testCase,
          'names_other_element',
          names(spokenLabel(testCase.elements[other]), expected),
          expected,
          (result) => ({
            passed: result.contradictsTarget,
            detail: `naming "${spokenLabel(testCase.elements[other])}" while pointing at ${expected}${
              result.contradictsTarget ? ' was flagged' : ' went unflagged'
            }`,
          }),
        )!,
      );
    }

    // 5. Furniture is not a control, even when the model targets it.
    const noiseIndex = noiseElementIndex(testCase.elements);
    if (noiseIndex !== null && noiseIndex !== expected) {
      results.push(
        checkVerifierCase(
          testCase,
          'noise_target',
          names(spokenLabel(testCase.elements[noiseIndex]), noiseIndex),
          noiseIndex,
          (result) => ({
            passed: result.targetIndex !== noiseIndex,
            detail: `furniture element ${noiseIndex} delivered as ${result.targetIndex}`,
          }),
        )!,
      );
    }
  }

  const kinds: PerturbationKind[] = [
    'gold',
    'off_by_one',
    'out_of_bounds',
    'names_other_element',
    'noise_target',
  ];
  const kindReports = kinds
    .map((kind) => {
      const forKind = results.filter((result) => result.kind === kind);
      const passed = forKind.filter((result) => result.passed);
      return {
        kind,
        total: forKind.length,
        passed: passed.length,
        rate: forKind.length === 0 ? 1 : passed.length / forKind.length,
        failures: forKind.filter((result) => !result.passed),
      };
    })
    .filter((report) => report.total > 0);

  const passed = results.filter((result) => result.passed).length;

  return {
    total: results.length,
    passed,
    rate: results.length === 0 ? 1 : passed / results.length,
    kinds: kindReports,
    repaired: results.filter(
      (result) => result.kind === 'off_by_one' && result.targetIndex !== result.rawTargetIndex,
    ).length,
    flagged: results.filter((result) => result.contradictsTarget).length,
  };
}

export interface RetrievalCaseResult {
  caseId: string;
  appPackage: string;
  top1: boolean;
  top3: boolean;
  seen: string[];
}

export interface RetrievalReport {
  total: number;
  top1: number;
  top3: number;
  top1Rate: number;
  top3Rate: number;
  failures: RetrievalCaseResult[];
}

/**
 * Whether the examples handed to the model are about the app on screen. The
 * corpus is small and curated, so this measures *ranking*, not generalisation:
 * a regression that lets a WhatsApp example outrank an IRCTC one for a PNR
 * question shows up here immediately.
 */
export function runRetrieval(
  cases: GuidanceCase[] = GUIDANCE_CASES,
): RetrievalReport {
  const results: RetrievalCaseResult[] = cases.map((testCase) => {
    const block = formatRelevantFewShots(
      testCase.appPackage,
      testCase.question,
      3,
      testCase.lang ?? 'hi',
    );
    const seen = block
      .split('\n\n')
      .map((entry) => entry.split('\n')[0].replace(/^Example \d+ \((.*)\):$/, '$1'));
    const matches = (entry: string | undefined) =>
      entry !== undefined &&
      (entry.includes(testCase.appPackage) || testCase.appPackage.includes(entry));
    return {
      caseId: testCase.id,
      appPackage: testCase.appPackage,
      top1: matches(seen[0]),
      top3: seen.some(matches),
      seen,
    };
  });

  const top1 = results.filter((result) => result.top1).length;
  const top3 = results.filter((result) => result.top3).length;

  return {
    total: results.length,
    top1,
    top3,
    top1Rate: results.length === 0 ? 1 : top1 / results.length,
    top3Rate: results.length === 0 ? 1 : top3 / results.length,
    failures: results.filter((result) => !result.top3),
  };
}

export interface BenchmarkReport {
  deterministic: DeterministicReport;
  verifier: VerifierReport;
  retrieval: RetrievalReport;
}

export function runGuidanceBenchmark(
  cases: GuidanceCase[] = GUIDANCE_CASES,
): BenchmarkReport {
  return {
    deterministic: runDeterministic(cases),
    verifier: runVerifier(cases),
    retrieval: runRetrieval(cases),
  };
}

/**
 * Regression floors, measured and then set just below what the stack achieves
 * (`npm run bench:guidance` prints the live numbers). They are deliberately not
 * set to 1: a benchmark that can only ever pass or fail on day one stops being
 * useful the first time a fixture is added.
 */
export const BENCHMARK_THRESHOLDS = {
  deterministicPrecision: 0.95,
  deterministicCoverage: 0.65,
  verifierGoldSurvival: 0.95,
  verifierOverall: 0.9,
  retrievalTop1: 0.9,
};

/** A printable report, so the CLI script and the tests share one format. */
export function formatBenchmarkReport(report: BenchmarkReport): string {
  const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const lines: string[] = [];

  const { deterministic, verifier, retrieval } = report;

  lines.push('SaralGati guidance accuracy benchmark');
  lines.push('='.repeat(60));
  lines.push(
    `cases: ${deterministic.total} | deterministic: ${deterministic.correct}/${deterministic.answered} ` +
      `answered correct (precision ${percent(deterministic.precision)}), ` +
      `coverage ${percent(deterministic.coverage)}`,
  );
  lines.push(
    `verifier: ${verifier.passed}/${verifier.total} perturbations handled (${percent(verifier.rate)}), ` +
      `${verifier.repaired} repaired, ${verifier.flagged} flagged`,
  );
  for (const kind of verifier.kinds) {
    lines.push(`  - ${kind.kind.padEnd(20)} ${kind.passed}/${kind.total} (${percent(kind.rate)})`);
  }
  lines.push(
    `retrieval: top-1 ${percent(retrieval.top1Rate)} | top-3 ${percent(retrieval.top3Rate)}`,
  );

  if (deterministic.failures.length > 0) {
    lines.push('');
    lines.push('Deterministic misses (delivered unchecked, so each one is a wrong answer):');
    for (const failure of deterministic.failures) {
      lines.push(
        `  - ${failure.id}: got ${failure.index}, expected ${failure.expectedIndex} (${failure.source})`,
      );
    }
  }
  if (deterministic.falsePositives.length > 0) {
    lines.push('');
    lines.push('Deterministic false positives (nothing should have been spotlighted):');
    for (const failure of deterministic.falsePositives) {
      lines.push(`  - ${failure.id}: pointed at ${failure.index} (${failure.source})`);
    }
  }
  if (deterministic.unanswered.length > 0) {
    lines.push('');
    lines.push('Still unanswered (a real element exists, but only the models can find it):');
    for (const gap of deterministic.unanswered) {
      lines.push(`  - ${gap.id}: expected ${gap.expectedIndex}`);
    }
  }
  const verifierFailures = verifier.kinds.flatMap((kind) => kind.failures);
  if (verifierFailures.length > 0) {
    lines.push('');
    lines.push('Verifier misses:');
    for (const failure of verifierFailures) {
      lines.push(`  - ${failure.caseId} [${failure.kind}]: ${failure.detail}`);
    }
  }
  if (retrieval.failures.length > 0) {
    lines.push('');
    lines.push('Retrieval misses (no example for the app on screen in the top 3):');
    for (const failure of retrieval.failures) {
      lines.push(`  - ${failure.caseId}: ${failure.appPackage} | got ${failure.seen.join(', ')}`);
    }
  }

  return lines.join('\n');
}
