import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BENCHMARK_THRESHOLDS,
  GUIDANCE_CASES,
  runDeterministic,
  runRetrieval,
  runVerifier,
} from './accuracyBenchmark';

/**
 * The benchmark is this repo's accuracy claim, so it is pinned like any other
 * behaviour: the fixtures have to stay well-formed, the measured numbers have to
 * stay above the published floors, and the two failures that motivated the
 * benchmark - a named contact sent to the keypad, and an answer naming one
 * button while pointing at another - have to stay fixed.
 *
 * The floors are asserted here as well as in `npm run bench:guidance` so that a
 * regression fails `npm test`, which is what CI runs on every pull request.
 */

describe('the offline guidance accuracy benchmark', () => {
  test('every fixture is a well-formed screen and question', () => {
    const ids = new Set<string>();

    for (const testCase of GUIDANCE_CASES) {
      assert.ok(testCase.appPackage.length > 0, `${testCase.id}: app package`);
      assert.ok(testCase.question.trim().length > 0, `${testCase.id}: question`);
      assert.ok(testCase.elements.length > 0, `${testCase.id}: elements`);
      assert.equal(ids.has(testCase.id), false, `duplicate case id ${testCase.id}`);
      ids.add(testCase.id);

      if (testCase.expectedIndex === null) continue;
      assert.ok(
        testCase.expectedIndex >= 0 && testCase.expectedIndex < testCase.elements.length,
        `${testCase.id}: expected index ${testCase.expectedIndex} is not on the screen`,
      );
      assert.match(
        testCase.elements[testCase.expectedIndex],
        /\[(BUTTON|INPUT|TOGGLE)\]/,
        `${testCase.id}: the expected element must be something an elder can tap`,
      );
    }
  });

  test('the deterministic layers stay above their precision and coverage floors', () => {
    const report = runDeterministic();

    assert.ok(
      report.precision >= BENCHMARK_THRESHOLDS.deterministicPrecision,
      `precision ${report.precision.toFixed(3)}; wrong: ${report.failures
        .map((failure) => failure.id)
        .join(', ')}`,
    );
    assert.ok(
      report.coverage >= BENCHMARK_THRESHOLDS.deterministicCoverage,
      `coverage ${report.coverage.toFixed(3)}; unanswered: ${report.unanswered
        .map((gap) => gap.id)
        .join(', ')}`,
    );
  });

  test('an unchecked fast answer is never delivered for a screen with nothing to tap', () => {
    const report = runDeterministic();

    assert.deepEqual(report.falsePositives.map((failure) => failure.id), []);
  });

  test('a named contact goes to their own call button, not to the keypad', () => {
    const testCase = GUIDANCE_CASES.find((entry) => entry.id === 'dialer-call-contact');
    assert.ok(testCase, 'the dialer fixture is gone');

    const report = runDeterministic([testCase]);

    assert.equal(report.results[0].source, 'fast_path');
    assert.equal(report.results[0].index, testCase.expectedIndex);
  });

  test('an answer naming one control while pointing at another is flagged', () => {
    // Both fixtures point at a one-word tab whose label is too generic to
    // identify, which is exactly the shape a contradiction check silently
    // skips: the sentence names "Camera" or "New chat" and the spotlight lands
    // on "Calls", so the elder taps what they heard, not what was highlighted.
    const ids = new Set(['whatsapp-list-video-call', 'whatsapp-list-preview-is-not-the-target']);
    const cases = GUIDANCE_CASES.filter((entry) => ids.has(entry.id));
    assert.equal(cases.length, ids.size);

    const failures = runVerifier(cases).kinds.flatMap((kind) =>
      kind.failures.map((failure) => `${failure.caseId} [${failure.kind}]`),
    );

    assert.deepEqual(failures, []);
  });

  test('the verifier keeps its gold answers and its overall floor', () => {
    const report = runVerifier();
    const gold = report.kinds.find((kind) => kind.kind === 'gold');

    assert.ok(gold, 'the gold perturbation is missing');
    assert.ok(
      gold.rate >= BENCHMARK_THRESHOLDS.verifierGoldSurvival,
      `gold survival ${gold.rate.toFixed(3)}`,
    );
    assert.ok(
      report.rate >= BENCHMARK_THRESHOLDS.verifierOverall,
      `verifier overall ${report.rate.toFixed(3)}`,
    );
  });

  test('the examples handed to the models stay about the app on screen', () => {
    const report = runRetrieval();

    assert.ok(
      report.top1Rate >= BENCHMARK_THRESHOLDS.retrievalTop1,
      `retrieval top-1 ${report.top1Rate.toFixed(3)}; missed: ${report.failures
        .map((failure) => failure.caseId)
        .join(', ')}`,
    );
  });
});
