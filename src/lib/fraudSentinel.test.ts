import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzeForFraud,
  collectFragments,
  matchFraudRules,
  sentinelExplanation,
  shouldInterceptFraud,
  type FraudSentinelInput,
  type ThreatCategory,
} from './fraudSentinel';

const DEVANAGARI = /[\u0900-\u097F]/;

/** The exact verdict keys, in the order the spec demands them. */
const VERDICT_KEYS = [
  'threat_level',
  'threat_category',
  'confidence',
  'detected_triggers',
  'action_decision',
  'user_alert',
  'risk_reasoning',
];

test('a normal screen and a normal question are SAFE and allowed', () => {
  const verdict = analyzeForFraud({
    app_package: 'com.whatsapp',
    question: 'Suresh ko video call kaise karein?',
    ui_elements: ['[BUTTON] Audio Call', '[BUTTON] Video Call', '[INPUT] Search', '[TEXT] Recent chats'],
  });

  assert.equal(verdict.threat_level, 'SAFE');
  assert.equal(verdict.threat_category, 'NONE');
  assert.equal(verdict.action_decision.action, 'ALLOW');
  assert.deepEqual(verdict.detected_triggers, []);
  assert.equal(verdict.action_decision.target_element_to_block, null);
  assert.equal(verdict.action_decision.safe_action_index, null);
  assert.ok(verdict.confidence >= 0.9, 'a clean screen is judged confidently');
  assert.equal(shouldInterceptFraud(verdict), false);
  assert.match(verdict.user_alert.message_hi, DEVANAGARI);
});

test('a bank reminder that warns against sharing is not read as a request', () => {
  const otpReminder = analyzeForFraud({
    messages: ['Your OTP is 4291. Do not share it with anyone.'],
  });
  assert.equal(otpReminder.threat_level, 'SAFE');
  assert.equal(otpReminder.threat_category, 'NONE');

  const pinReminder = analyzeForFraud({
    messages: ['Cashback of ₹50 credited to your account. Never share your PIN with anyone.'],
  });
  assert.equal(pinReminder.threat_level, 'SAFE');
});

test('asking to share the OTP is CRITICAL and blocks the screen', () => {
  const verdict = analyzeForFraud({
    app_package: 'com.whatsapp',
    messages: ['Sir main bank se bol raha hoon, apna OTP batao warna account band ho jayega'],
  });

  assert.equal(verdict.threat_level, 'CRITICAL');
  assert.equal(verdict.threat_category, 'OTP_THEFT');
  assert.equal(verdict.action_decision.action, 'BLOCK_AND_INTERCEPT');
  assert.ok(verdict.detected_triggers.some((trigger) => trigger.includes('OTP')));
  assert.ok(verdict.confidence >= 0.9);
  assert.equal(shouldInterceptFraud(verdict), true);
  assert.match(verdict.user_alert.message_hi, DEVANAGARI);
  assert.equal(sentinelExplanation(verdict), verdict.user_alert.message_hi);
});

test('the Hindi OTP ask is caught as well', () => {
  const verdict = analyzeForFraud({ messages: ['अपना ओटीपी बता दो'] });
  assert.equal(verdict.threat_level, 'CRITICAL');
  assert.equal(verdict.threat_category, 'OTP_THEFT');
});

test('a UPI PIN asked for to receive money kills the risky session', () => {
  const verdict = analyzeForFraud({
    messages: ['₹5000 cashback approved! Scan this QR and enter your UPI PIN to receive the money'],
  });

  assert.equal(verdict.threat_category, 'PAYMENT_FRAUD');
  assert.equal(verdict.threat_level, 'CRITICAL');
  assert.equal(verdict.action_decision.action, 'KILL_SESSION');
  assert.match(verdict.user_alert.message_en, /Receiving money never needs a UPI PIN/);
});

test('a collect request with a PIN is money leaving, not arriving', () => {
  const verdict = analyzeForFraud({
    messages: ['You have received a collect request of ₹9,000. Approve the request and enter UPI PIN to get the money'],
  });

  assert.equal(verdict.threat_category, 'PAYMENT_FRAUD');
  assert.equal(verdict.threat_level, 'CRITICAL');
  assert.equal(verdict.action_decision.action, 'KILL_SESSION');
});

test('remote access coercion is CRITICAL, a bare app mention is only a warning', () => {
  const coercion = analyzeForFraud({
    messages: ['Aapka refund atka hai, AnyDesk install karo aur 9 digit code batao'],
  });
  assert.equal(coercion.threat_category, 'REMOTE_ACCESS');
  assert.equal(coercion.threat_level, 'CRITICAL');
  assert.equal(coercion.action_decision.action, 'KILL_SESSION');

  // Family may legitimately set up AnyDesk for help, so the app name alone must
  // not block the phone.
  const mention = analyzeForFraud({ question: 'AnyDesk kya hai?', ui_elements: ['[TEXT] AnyDesk'] });
  assert.equal(mention.threat_category, 'REMOTE_ACCESS');
  assert.equal(mention.threat_level, 'SUSPICIOUS');
  assert.equal(mention.action_decision.action, 'SHOW_WARNING');
  assert.equal(shouldInterceptFraud(mention), false);
});

test('an accessibility unlock request is blocked as remote access', () => {
  const verdict = analyzeForFraud({
    ui_elements: ['[TEXT] Please enable accessibility service for remote support'],
  });
  assert.equal(verdict.threat_category, 'REMOTE_ACCESS');
  assert.equal(verdict.threat_level, 'DANGEROUS');
  assert.equal(verdict.action_decision.action, 'BLOCK_AND_INTERCEPT');
});

test('fake disconnection, SIM and KYC notices are phishing, never CRITICAL', () => {
  const electricity = analyzeForFraud({
    messages: ['Aapki bijli aaj hi kat jayegi. Is link par click karein: bit.ly/paybijli'],
  });
  assert.equal(electricity.threat_category, 'PHISHING_IMPERSONATION');
  assert.equal(electricity.threat_level, 'DANGEROUS');
  assert.equal(electricity.action_decision.action, 'BLOCK_AND_INTERCEPT');

  const sim = analyzeForFraud({ messages: ['Your SIM will be blocked today, update KYC on this link'] });
  assert.equal(sim.threat_category, 'PHISHING_IMPERSONATION');
  assert.equal(sim.threat_level, 'DANGEROUS');

  const kyc = analyzeForFraud({ messages: ['Dear customer, complete your KYC update to keep your account active'] });
  assert.equal(kyc.threat_category, 'PHISHING_IMPERSONATION');
  assert.equal(kyc.threat_level, 'SUSPICIOUS');
  assert.equal(kyc.action_decision.action, 'SHOW_WARNING');
});

test('fake virus warnings and spin wheels are dangerous ads, not theft', () => {
  const virus = analyzeForFraud({
    screen_text: 'Warning! Your phone is infected with 3 viruses. Download now to clean it.',
  });
  assert.equal(virus.threat_category, 'MALVERTISING');
  assert.equal(virus.threat_level, 'DANGEROUS');
  assert.equal(virus.action_decision.action, 'BLOCK_AND_INTERCEPT');

  const spin = analyzeForFraud({ screen_text: 'Congratulations, spin the wheel and win a prize now' });
  assert.equal(spin.threat_category, 'MALVERTISING');
  assert.equal(spin.threat_level, 'DANGEROUS');
});

test('an APK pushed through a chat is blocked as sideloading', () => {
  const verdict = analyzeForFraud({ messages: ['Bhai yeh update.apk bhej raha hoon, install kar lena'] });
  assert.equal(verdict.threat_category, 'MALICIOUS_APK');
  assert.equal(verdict.threat_level, 'DANGEROUS');
  assert.equal(verdict.action_decision.action, 'BLOCK_AND_INTERCEPT');
});

test('unknown-sources instructions are blocked', () => {
  const verdict = analyzeForFraud({ screen_text: 'Please enable installation from unknown sources to continue' });
  assert.equal(verdict.threat_category, 'MALICIOUS_APK');
  assert.equal(verdict.threat_level, 'DANGEROUS');
});

test('unneeded SMS and contacts access is a privacy warning, not a block', () => {
  const verdict = analyzeForFraud({
    ui_elements: ['[BUTTON] Allow', '[TEXT] Allow this app to read your SMS and see your contacts'],
  });
  assert.equal(verdict.threat_category, 'PRIVACY_RISK');
  assert.equal(verdict.threat_level, 'SUSPICIOUS');
  assert.equal(verdict.action_decision.action, 'SHOW_WARNING');
  assert.equal(verdict.action_decision.target_element_to_block, 1);
  // There is no visible way out on this dialog, so no safe index is invented.
  assert.equal(verdict.action_decision.safe_action_index, null);
});

test('the verdict points at the trap element and at a safe way out', () => {
  const verdict = analyzeForFraud({
    ui_elements: [
      '[BUTTON] Cancel',
      '[TEXT] Please share your OTP to receive ₹5000 cashback',
      '[BUTTON] Share OTP',
    ],
  });

  assert.equal(verdict.threat_level, 'CRITICAL');
  assert.equal(verdict.threat_category, 'OTP_THEFT');
  assert.equal(verdict.action_decision.target_element_to_block, 1, 'the strongest evidence wins');
  assert.equal(verdict.action_decision.safe_action_index, 0, 'Cancel is offered as the escape');
  assert.ok(verdict.detected_triggers.length >= 2, 'both the message and the button are logged');
});

test('a payment app asking for the PIN while sending money is advisory, not blocked', () => {
  const verdict = analyzeForFraud({
    ui_elements: ['[INPUT] Enter UPI PIN', '[BUTTON] Pay ₹500'],
  });
  assert.equal(verdict.threat_category, 'PAYMENT_FRAUD');
  assert.equal(verdict.threat_level, 'SUSPICIOUS');
  assert.equal(verdict.action_decision.action, 'SHOW_WARNING');
  assert.equal(shouldInterceptFraud(verdict), false);
});

test('secondary categories can never escalate into CRITICAL', () => {
  const verdict = analyzeForFraud({
    screen_text: 'Urgent! Your phone is infected, allow camera and download the cleaner now',
  });
  assert.equal(verdict.threat_category, 'MALVERTISING');
  assert.equal(verdict.threat_level, 'DANGEROUS');
  assert.equal(verdict.action_decision.action, 'BLOCK_AND_INTERCEPT');
});

test('both a scam verdict and a clean one match the specified JSON schema', () => {
  for (const input of [{ messages: ['share your OTP now'] }, { question: 'Namaste' }]) {
    const verdict = analyzeForFraud(input);

    assert.deepEqual(Object.keys(verdict), VERDICT_KEYS);
    assert.deepEqual(Object.keys(verdict.action_decision), [
      'action',
      'target_element_to_block',
      'safe_action_index',
      'safe_advice',
    ]);
    assert.deepEqual(Object.keys(verdict.user_alert), ['title', 'message_en', 'message_hi']);

    assert.equal(typeof verdict.confidence, 'number');
    assert.ok(verdict.confidence >= 0 && verdict.confidence <= 1);
    assert.ok(Array.isArray(verdict.detected_triggers));
    assert.ok(verdict.detected_triggers.every((trigger) => typeof trigger === 'string'));
    assert.equal(typeof verdict.risk_reasoning, 'string');
    assert.ok(verdict.risk_reasoning.length > 0);

    // The route serialises this object verbatim, so it must survive JSON.
    assert.deepEqual(JSON.parse(JSON.stringify(verdict)), verdict);
    assert.match(verdict.user_alert.message_hi, DEVANAGARI);
    assert.match(verdict.user_alert.message_en, /OTP/);
  }
});

test('identical input always produces an identical verdict', () => {
  const input: FraudSentinelInput = {
    app_package: 'com.whatsapp',
    question: 'yeh message kya hai?',
    ui_elements: ['[BUTTON] No thanks', '[TEXT] You won ₹25,000, share your OTP to claim'],
    messages: ['Install AnyDesk for help', 'aapka KYC pending hai'],
  };
  assert.deepEqual(analyzeForFraud(input), analyzeForFraud(input));
});

test('every taxonomy category is reachable and always speaks Hindi', () => {
  const samples: Array<{ expected: ThreatCategory; input: FraudSentinelInput }> = [
    { expected: 'OTP_THEFT', input: { messages: ['share your OTP with me'] } },
    { expected: 'PAYMENT_FRAUD', input: { messages: ['enter your UPI PIN to receive the refund'] } },
    { expected: 'REMOTE_ACCESS', input: { messages: ['aapka refund atka hai, AnyDesk install karo'] } },
    { expected: 'PHISHING_IMPERSONATION', input: { messages: ['your electricity will be disconnected today'] } },
    { expected: 'MALVERTISING', input: { screen_text: 'your phone is infected with a virus' } },
    { expected: 'MALICIOUS_APK', input: { messages: ['yeh app.apk whatsapp par bhej raha hoon'] } },
    { expected: 'PRIVACY_RISK', input: { screen_text: 'allow this app to access your contacts' } },
  ];

  for (const { expected, input } of samples) {
    const verdict = analyzeForFraud(input);
    assert.equal(verdict.threat_category, expected, `${expected} sample must map to its category`);
    assert.notEqual(verdict.threat_level, 'SAFE', `${expected} sample must not read as safe`);
    assert.match(verdict.user_alert.message_hi, DEVANAGARI, `${expected} needs Devanagari copy`);
    assert.ok(verdict.user_alert.message_en.length > 0);
    assert.ok(verdict.risk_reasoning.length > 0);
    assert.ok(verdict.detected_triggers.length > 0);
  }
});

test('fragments keep their origin so free text is never mis-attributed', () => {
  const fragments = collectFragments({
    ui_elements: ['[BUTTON] A', '[BUTTON] B'],
    messages: ['m1'],
    question: 'q',
  });
  assert.deepEqual(
    fragments.map((fragment) => fragment.elementIndex),
    [0, 1, null, null],
  );

  assert.deepEqual(collectFragments({}), []);
  assert.equal(analyzeForFraud({}).threat_level, 'SAFE');
});

test('free text alone never invents an element to block', () => {
  const verdict = analyzeForFraud({ messages: ['please share your OTP with me'] });
  assert.equal(verdict.action_decision.target_element_to_block, null);
  assert.equal(verdict.action_decision.safe_action_index, null);
});

test('matchFraudRules explains which rules fired', () => {
  const matches = matchFraudRules({ messages: ['please share your OTP with me'] });
  assert.ok(matches.some((match) => match.rule.id === 'otp-share-request'));
  assert.ok(matches.every((match) => match.severity >= 1 && match.severity <= 4));
});

