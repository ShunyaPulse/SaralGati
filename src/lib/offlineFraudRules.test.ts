import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { analyzeForFraud } from './fraudSentinel';
import {
  OFFLINE_FRAUD_RULES,
  findOfflineSafeActionIndex,
  matchOfflineFraudRules,
  normalizeOfflineFragments,
  serializeOfflineFraudRules,
} from './offlineFraudRules';

const ASSET_PATH = path.join(
  process.cwd(),
  'android',
  'app',
  'src',
  'main',
  'assets',
  'offline_fraud_rules.json',
);

/** Scams the companion must catch with no network at all. */
const MUST_CATCH: { text: string; category: string; level: string }[] = [
  { text: 'OTP bata do jaldi', category: 'OTP_THEFT', level: 'CRITICAL' },
  { text: 'Please share the verification code with me', category: 'OTP_THEFT', level: 'CRITICAL' },
  { text: 'Reward paane ke liye OTP enter karein', category: 'OTP_THEFT', level: 'CRITICAL' },
  { text: 'Refund ke liye UPI PIN daalein', category: 'PAYMENT_FRAUD', level: 'CRITICAL' },
  { text: 'Paise receive karne ke liye PIN daalo', category: 'PAYMENT_FRAUD', level: 'CRITICAL' },
  { text: 'Bank PIN share karein', category: 'PAYMENT_FRAUD', level: 'CRITICAL' },
  { text: 'Collect request approve karein', category: 'PAYMENT_FRAUD', level: 'DANGEROUS' },
  { text: 'QR scan karke paise receive karein', category: 'PAYMENT_FRAUD', level: 'CRITICAL' },
  { text: 'AnyDesk install karo, bank se call hai', category: 'REMOTE_ACCESS', level: 'CRITICAL' },
  { text: 'TeamViewer ka 9 digit code batao', category: 'REMOTE_ACCESS', level: 'CRITICAL' },
  { text: 'Ye APK WhatsApp par bhej diya, install kar lo', category: 'MALICIOUS_APK', level: 'DANGEROUS' },
  { text: 'Bijli connection kat jayega, abhi bhugtan karo', category: 'PHISHING_IMPERSONATION', level: 'DANGEROUS' },
  { text: 'Aapka SIM block ho jayega aaj hi', category: 'PHISHING_IMPERSONATION', level: 'DANGEROUS' },
];

/** Ordinary screens that must never trigger an offline warning. */
const MUST_NOT_FLAG = [
  'Send money',
  'Enter your UPI PIN to pay',
  'Do not share this OTP with anyone',
  'Never share your PIN with anyone',
  'Kisi ko na batao',
  'PIN change karein settings me',
  'Chats',
  'YouTube',
  'WhatsApp',
  'Download update available in Play Store',
  'Electricity bill pay karein',
  'Bank KYC update karein branch me',
  'Camera',
  '1234',
  '',
];

test('offline rules are well formed and uniquely identified', () => {
  const ids = new Set<string>();
  for (const rule of OFFLINE_FRAUD_RULES) {
    assert.ok(!ids.has(rule.id), `duplicate rule id ${rule.id}`);
    ids.add(rule.id);
    assert.match(rule.level, /^(DANGEROUS|CRITICAL)$/);
    assert.ok(rule.patterns.length > 0, `${rule.id} has no patterns`);
    for (const source of [...rule.patterns, ...(rule.requires ?? [])]) {
      assert.doesNotThrow(() => new RegExp(source), `${rule.id} has an invalid pattern`);
    }
  }
});

test('every high-confidence scam is caught offline at the expected category', () => {
  for (const { text, category, level } of MUST_CATCH) {
    const match = matchOfflineFraudRules([text]);
    assert.ok(match, `offline missed: ${text}`);
    assert.equal(match.category, category, `wrong category for: ${text}`);
    assert.equal(match.level, level, `wrong level for: ${text}`);
    assert.ok(match.title.length > 0 && match.messageHi.length > 0);
  }
});

test('the offline verdict never disagrees with the server on these scams', () => {
  for (const { text } of MUST_CATCH) {
    const server = analyzeForFraud({ ui_elements: [text] });
    assert.ok(
      server.threat_level === 'DANGEROUS' || server.threat_level === 'CRITICAL',
      `server does not flag a must-catch scam: ${text}`,
    );
    assert.ok(
      matchOfflineFraudRules([text]),
      `server flags it but offline misses it: ${text}`,
    );
  }
});

test('ordinary screens are never flagged offline', () => {
  for (const text of MUST_NOT_FLAG) {
    assert.equal(matchOfflineFraudRules([text]), null, `false positive on: ${text}`);
  }
});

test('a courtesy warning is not mistaken for an OTP request', () => {
  assert.equal(matchOfflineFraudRules(['Do not share this OTP with anyone']), null);
  // …but a real request hidden behind the courtesy line still trips the rule.
  assert.ok(matchOfflineFraudRules(['Kisi ko na batao, ab OTP batao']));
});

test('matching is per line, mirroring the server', () => {
  // Separate elements do not leak into each other…
  assert.equal(matchOfflineFraudRules(['OTP', 'batao']), null);
  assert.equal(matchOfflineFraudRules(['Refund', 'PIN daalein']), null);
  // …but the same combination on one line does.
  assert.ok(matchOfflineFraudRules(['OTP batao']));
  assert.ok(matchOfflineFraudRules(['Refund ke liye UPI PIN daalein']));
});

test('normalisation lower-cases, collapses whitespace and drops blanks', () => {
  assert.deepEqual(normalizeOfflineFragments(['  HELLO   World ', '\n\n', '']), [
    'hello world',
  ]);
});

test('the safe escape element can be located for the spotlight', () => {
  assert.equal(findOfflineSafeActionIndex(['Pay ₹500', '[BUTTON] Decline']), 1);
  assert.equal(findOfflineSafeActionIndex(['[BUTTON] Cancel', 'Submit']), 0);
  assert.equal(findOfflineSafeActionIndex(['[INPUT] Amount', 'Submit']), null);
});

test('the committed Android asset matches the ruleset', () => {
  assert.ok(
    fs.existsSync(ASSET_PATH),
    `missing ${ASSET_PATH}; run \`npm run rules:export\``,
  );
  const onDisk = JSON.parse(fs.readFileSync(ASSET_PATH, 'utf8'));
  assert.deepEqual(
    onDisk,
    serializeOfflineFraudRules(),
    'offline_fraud_rules.json is stale; run `npm run rules:export`',
  );
});
