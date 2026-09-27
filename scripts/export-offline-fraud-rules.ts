/**
 * Regenerates the Android asset `android/app/src/main/assets/offline_fraud_rules.json`
 * from `src/lib/offlineFraudRules.ts`.
 *
 * Run with `npm run rules:export` after changing the offline ruleset. The asset
 * is committed and pinned in sync by `offlineFraudRules.test.ts`, so a stale
 * device ruleset fails the test suite instead of shipping silently.
 */

import fs from 'node:fs';
import path from 'node:path';

import { serializeOfflineFraudRules } from '../src/lib/offlineFraudRules';

const target = path.join(
  process.cwd(),
  'android',
  'app',
  'src',
  'main',
  'assets',
  'offline_fraud_rules.json',
);

const asset = serializeOfflineFraudRules();
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(asset, null, 2)}\n`, 'utf8');

console.log(
  `Wrote ${asset.rules.length} offline fraud rules (v${asset.version}) to ${path.relative(
    process.cwd(),
    target,
  )}`,
);
