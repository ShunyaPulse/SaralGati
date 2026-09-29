/**
 * The anti-fraud sentinel, split by concern:
 *
 * - `types`      the verdict / input shapes it speaks in
 * - `patterns`   the regex vocabulary the rules are written against
 * - `rules`      the rule pack and the per-category severity tables
 * - `alertCopy`  the bilingual alert wording for each category
 * - `analyze`    fragment collection, rule matching and verdict assembly
 *
 * Importers keep using `@/lib/fraud/fraudSentinel`, so this surface is the
 * module's public API.
 */
export type { AlertCopy } from './alertCopy';
export { ALERT_COPY } from './alertCopy';
export type {
  FraudSentinelInput,
  FraudSentinelVerdict,
  SentinelAction,
  SentinelFragment,
  ThreatCategory,
  ThreatLevel,
} from './types';
export {
  analyzeForFraud,
  collectFragments,
  escalateFraudVerdict,
  matchFraudRules,
  sentinelExplanation,
  shouldInterceptFraud,
} from './analyze';
