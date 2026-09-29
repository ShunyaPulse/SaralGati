#!/usr/bin/env npx tsx
/**
 * Prints the offline guidance accuracy benchmark and fails when it regresses.
 *
 *   npm run bench:guidance
 *
 * No network, no model call, no database: every number comes from the pure
 * deterministic layers, so this is cheap enough to run on every commit and
 * gives an accuracy claim something to stand on.
 */

import {
  BENCHMARK_THRESHOLDS,
  formatBenchmarkReport,
  runGuidanceBenchmark,
} from '../src/lib/ai/accuracyBenchmark';

const report = runGuidanceBenchmark();
console.log(formatBenchmarkReport(report));

const failures: string[] = [];
if (report.deterministic.precision < BENCHMARK_THRESHOLDS.deterministicPrecision) {
  failures.push(
    `deterministic precision ${report.deterministic.precision.toFixed(3)} < ${BENCHMARK_THRESHOLDS.deterministicPrecision}`,
  );
}
if (report.deterministic.coverage < BENCHMARK_THRESHOLDS.deterministicCoverage) {
  failures.push(
    `deterministic coverage ${report.deterministic.coverage.toFixed(3)} < ${BENCHMARK_THRESHOLDS.deterministicCoverage}`,
  );
}
const gold = report.verifier.kinds.find((kind) => kind.kind === 'gold');
if (gold && gold.rate < BENCHMARK_THRESHOLDS.verifierGoldSurvival) {
  failures.push(
    `verifier gold survival ${gold.rate.toFixed(3)} < ${BENCHMARK_THRESHOLDS.verifierGoldSurvival}`,
  );
}
if (report.verifier.rate < BENCHMARK_THRESHOLDS.verifierOverall) {
  failures.push(
    `verifier overall ${report.verifier.rate.toFixed(3)} < ${BENCHMARK_THRESHOLDS.verifierOverall}`,
  );
}
if (report.retrieval.top1Rate < BENCHMARK_THRESHOLDS.retrievalTop1) {
  failures.push(
    `retrieval top-1 ${report.retrieval.top1Rate.toFixed(3)} < ${BENCHMARK_THRESHOLDS.retrievalTop1}`,
  );
}

if (failures.length > 0) {
  console.error('\nBenchmark regressed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('\nAll benchmark floors met.');
