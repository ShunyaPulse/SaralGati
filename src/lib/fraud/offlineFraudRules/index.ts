/**
 * On-device (offline) anti-fraud ruleset for the Android companion.
 *
 * `fraudSentinel.ts` is the authoritative engine, but it runs on the server: an
 * elder with no network, a slow link, or a Cloud Run cold start gets no warning
 * at all. This module is a deliberately small, high-confidence mirror of the
 * direct theft vectors so the companion can warn *instantly* and with the radio
 * off. The server verdict still arrives afterwards and stays authoritative (and
 * only ever raises the level), so this is additive protection, never a
 * replacement.
 *
 * Two things keep this honest:
 *  - The Android app ships `assets/offline_fraud_rules.json`, generated from
 *    `OFFLINE_FRAUD_RULES` by `scripts/export-offline-fraud-rules.ts` and pinned
 *    in sync by a test, so the device can never run a stale ruleset.
 *  - The alert wording is taken from `ALERT_COPY` in `fraudSentinel.ts`, so the
 *    offline warning says exactly what the server warning would say.
 *
 * Only unambiguous combinations are included (OTP + "share it", receive money +
 * a PIN, a remote-control app + its code, an APK pushed over chat, fake
 * electricity/SIM cut-off threats). Anything fuzzier stays server-only rather
 * than risk scaring an elder with a false alarm.
 *
 * The folder splits along the module's real seams: the serialisable ruleset
 * (types, string patterns and the curated rule list) in `ruleset.ts` and the
 * compiled matching engine in `engine.ts`. This file re-exports the public
 * surface so the module path is unchanged.
 */

export {
  OFFLINE_FRAUD_RULES_VERSION,
  OFFLINE_FRAUD_RULES,
  OFFLINE_SAFE_ESCAPE,
  OFFLINE_SAFE_WARNING_PATTERNS,
} from './ruleset';
export type {
  OfflineThreatLevel,
  OfflineThreatCategory,
  OfflineFraudRule,
  OfflineFraudAssetRule,
  OfflineFraudAsset,
  OfflineFraudMatch,
} from './ruleset';
export {
  normalizeOfflineFragments,
  matchOfflineFraudRules,
  findOfflineSafeActionIndex,
  serializeOfflineFraudRules,
} from './engine';
