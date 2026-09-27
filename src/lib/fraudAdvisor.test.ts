import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzeForFraudWithAdvisor,
  buildFraudAdvisorInput,
  FRAUD_ANALYST_SYSTEM_PROMPT,
  getFraudSecondOpinion,
  needsSecondOpinion,
} from './fraudAdvisor';
import {
  analyzeForFraud,
  escalateFraudVerdict,
  matchFraudRules,
  type FraudSentinelVerdict,
} from './fraudSentinel';

const DEVANAGARI = /[\u0900-\u097F]/;

/** Exact verdict keys, in the order the spec demands them. */
const VERDICT_KEYS = [
  'threat_level',
  'threat_category',
  'confidence',
  'detected_triggers',
  'action_decision',
  'user_alert',
  'risk_reasoning',
];

/** A screen the rules judge as SAFE with no scam-shaped surface. */
const CLEAN_SCREEN = { screen_text: 'Beta ka video call aa raha hai, swipe karke uthaiye' };

/** One rule fires here, so the deterministic verdict is DANGEROUS on thin ice. */
const THIN_DANGEROUS = { screen_text: 'Your electricity will be disconnected today' };

const CLEAN_VERDICT = analyzeForFraud(CLEAN_SCREEN);

/** Swap env values for one test and always restore them afterwards. */
function withEnv(overrides: Record<string, string | undefined>): () => void {
  const saved: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(overrides)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return () => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

/** The request the advisor is expected to send to Cloudflare. */
interface AdvisorRequestBody {
  lora?: string;
  max_tokens?: number;
  messages: Array<{ role: string; content: string }>;
}

/** Capture the outbound request and answer with a fixed model reply. */
function stubFetch(reply: unknown, options: { status?: number } = {}) {
  const calls: Array<{ url: string; body: AdvisorRequestBody }> = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({
      url: String(url),
      body: JSON.parse(String(init.body)) as AdvisorRequestBody,
    });
    return new Response(JSON.stringify(reply), {
      status: options.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

function modelReply(level: string, category: string, reasoning = 'model said so') {
  return {
    result: {
      response: JSON.stringify({
        threat_level: level,
        threat_category: category,
        risk_reasoning: reasoning,
      }),
    },
  };
}

test('a clean screen with no scam surface never pays for a model call', () => {
  assert.equal(CLEAN_VERDICT.threat_level, 'SAFE');
  assert.equal(needsSecondOpinion(CLEAN_VERDICT, CLEAN_SCREEN), false);
  // Same clean verdict, but the visible text is now scam-shaped.
  assert.equal(
    needsSecondOpinion(CLEAN_VERDICT, {
      screen_text: 'Account unlock karne ke liye https://tiny.example/verify kholein',
    }),
    true,
  );
});

test('uncertainty is read off the verdict level and rule count', () => {
  const suspicious: FraudSentinelVerdict = {
    ...CLEAN_VERDICT,
    threat_level: 'SUSPICIOUS',
  };
  assert.equal(needsSecondOpinion(suspicious, CLEAN_SCREEN), true);

  const thin = analyzeForFraud(THIN_DANGEROUS);
  assert.equal(thin.threat_level, 'DANGEROUS');
  assert.equal(matchFraudRules(THIN_DANGEROUS).length, 1);
  assert.equal(needsSecondOpinion(thin, THIN_DANGEROUS), true);

  // Corroborated DANGEROUS and CRITICAL verdicts are already decisive.
  const multi = {
    screen_text: `${THIN_DANGEROUS.screen_text}. Share OTP 4821 urgently to avoid cutoff`,
  };
  assert.ok(matchFraudRules(multi).length >= 2, 'expected a multi-rule screen');
  assert.equal(needsSecondOpinion(analyzeForFraud(multi), multi), false);
  assert.equal(
    needsSecondOpinion(
      analyzeForFraud({ screen_text: 'Share OTP 4821 to unlock your account' }),
      { screen_text: 'Share OTP 4821 to unlock your account' },
    ),
    false,
  );
});

test('escalation is one way and keeps the verdict shape the companion parses', () => {
  const escalated = escalateFraudVerdict(CLEAN_VERDICT, {
    level: 'DANGEROUS',
    category: 'MALICIOUS_APK',
    reasoning: 'APK download link in a chat',
    source: 'test-adapter',
  });

  assert.equal(escalated.threat_level, 'DANGEROUS');
  assert.equal(escalated.threat_category, 'MALICIOUS_APK');
  assert.equal(escalated.action_decision.action, 'BLOCK_AND_INTERCEPT');
  assert.match(escalated.user_alert.message_hi, DEVANAGARI);
  assert.deepEqual(Object.keys(escalated), VERDICT_KEYS);
  assert.ok(
    escalated.detected_triggers.some((trigger) => trigger.includes('SECOND_OPINION (test-adapter)')),
    'escalation must be auditable',
  );
  assert.ok(escalated.risk_reasoning.includes('second opinion (test-adapter)'));
  assert.ok(escalated.confidence >= CLEAN_VERDICT.confidence);

  // Equal or lower levels are refused outright - the model cannot undo a warning.
  for (const level of ['SAFE', 'SUSPICIOUS'] as const) {
    const same = escalateFraudVerdict(escalated, {
      level,
      category: 'MALICIOUS_APK',
      reasoning: 'looks fine to me',
      source: 'test-adapter',
    });
    assert.equal(same, escalated, `${level} must not downgrade a DANGEROUS verdict`);
  }
});

test('only theft vectors may be escalated to CRITICAL', () => {
  const suspicious: FraudSentinelVerdict = { ...CLEAN_VERDICT, threat_level: 'SUSPICIOUS' };

  const capped = escalateFraudVerdict(suspicious, {
    level: 'CRITICAL',
    category: 'PRIVACY_RISK',
    reasoning: 'wants contacts access',
    source: 'test-adapter',
  });
  assert.equal(capped.threat_level, 'DANGEROUS');

  const allowed = escalateFraudVerdict(suspicious, {
    level: 'CRITICAL',
    category: 'PAYMENT_FRAUD',
    reasoning: 'UPI PIN inversion trap',
    source: 'test-adapter',
  });
  assert.equal(allowed.threat_level, 'CRITICAL');
  assert.equal(allowed.action_decision.action, 'BLOCK_AND_INTERCEPT');
});

test('the advisor sends the same prompt and payload shape the export trains on', async () => {
  assert.ok(FRAUD_ANALYST_SYSTEM_PROMPT.includes('"threat_level"'));
  assert.ok(FRAUD_ANALYST_SYSTEM_PROMPT.includes('"threat_category"'));
  assert.ok(FRAUD_ANALYST_SYSTEM_PROMPT.includes('"risk_reasoning"'));

  const payload = JSON.parse(
    buildFraudAdvisorInput({
      app_package: 'com.android.mms',
      messages: ['SBI: share OTP 4821'],
      urls: [],
      screen_text: 'sharing code',
      question: 'kya karun',
    }),
  );
  assert.equal(payload.app_package, 'com.android.mms');
  assert.deepEqual(Object.keys(payload.signals), [
    'question',
    'ui_elements',
    'messages',
    'urls',
    'screen_text',
  ]);
  assert.deepEqual(payload.signals.messages, ['SBI: share OTP 4821']);

  const restoreEnv = withEnv({
    CLOUDFLARE_ACCOUNT_ID: 'acct',
    CLOUDFLARE_API_TOKEN: 'token',
    CLOUDFLARE_LORA_NAME: 'saralgati-elder-llama31-8b',
    CLOUDFLARE_BASE_MODEL: undefined,
  });
  const stub = stubFetch(modelReply('CRITICAL', 'OTP_THEFT'));
  try {
    await analyzeForFraudWithAdvisor(THIN_DANGEROUS);
    assert.equal(stub.calls.length, 1);
    const { url, body } = stub.calls[0];
    assert.match(url, /api\.cloudflare\.com\/client\/v4\/accounts\/acct\/ai\/run\//);
    assert.equal(body.lora, 'saralgati-elder-llama31-8b');
    assert.equal(body.messages[0].content, FRAUD_ANALYST_SYSTEM_PROMPT);
    assert.equal(JSON.parse(body.messages[1].content).app_package, null);
  } finally {
    stub.restore();
    restoreEnv();
  }
});

test('a second opinion may raise a thin verdict but never lower it', async () => {
  const restoreEnv = withEnv({
    CLOUDFLARE_ACCOUNT_ID: 'acct',
    CLOUDFLARE_API_TOKEN: 'token',
    CLOUDFLARE_LORA_NAME: 'adapter',
  });

  const raising = stubFetch(modelReply('CRITICAL', 'REMOTE_ACCESS', 'asks for a remote control code'));
  try {
    const verdict = await analyzeForFraudWithAdvisor(THIN_DANGEROUS);
    assert.equal(verdict.threat_level, 'CRITICAL');
    assert.equal(verdict.threat_category, 'REMOTE_ACCESS');
    assert.match(verdict.user_alert.message_hi, DEVANAGARI);
    assert.ok(verdict.detected_triggers.some((t) => t.startsWith('SECOND_OPINION')));
  } finally {
    raising.restore();
  }

  const pointless = stubFetch(modelReply('SAFE', 'NONE', 'nothing to worry about'));
  try {
    const verdict = await analyzeForFraudWithAdvisor(THIN_DANGEROUS);
    assert.equal(verdict.threat_level, 'DANGEROUS');
    assert.equal(verdict.threat_category, 'PHISHING_IMPERSONATION');
  } finally {
    pointless.restore();
    restoreEnv();
  }
});

test('a broken advisor never weakens the sentinel', async () => {
  const restoreEnv = withEnv({
    CLOUDFLARE_ACCOUNT_ID: 'acct',
    CLOUDFLARE_API_TOKEN: 'token',
    CLOUDFLARE_LORA_NAME: 'adapter',
  });

  const deterministic = analyzeForFraud(THIN_DANGEROUS);

  // 1. Unusable (unparseable) model output.
  const garbage = stubFetch({ result: { response: 'I think this is fine, boss' } });
  try {
    assert.deepEqual(await analyzeForFraudWithAdvisor(THIN_DANGEROUS), deterministic);
  } finally {
    garbage.restore();
  }

  // 2. Out-of-taxonomy output.
  const nonsense = stubFetch(modelReply('VERY_BAD', 'OTP_THEFT'));
  try {
    assert.deepEqual(await analyzeForFraudWithAdvisor(THIN_DANGEROUS), deterministic);
  } finally {
    nonsense.restore();
  }

  // 3. Cloudflare erroring.
  const errored = stubFetch({}, { status: 503 });
  try {
    assert.deepEqual(await analyzeForFraudWithAdvisor(THIN_DANGEROUS), deterministic);
  } finally {
    errored.restore();
  }

  // 4. Network down.
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error('network down');
  }) as typeof fetch;
  try {
    assert.deepEqual(await analyzeForFraudWithAdvisor(THIN_DANGEROUS), deterministic);
  } finally {
    globalThis.fetch = original;
    restoreEnv();
  }
});

test('without Cloudflare credentials the advisor is skipped entirely', async () => {
  const restoreEnv = withEnv({
    CLOUDFLARE_ACCOUNT_ID: undefined,
    CLOUDFLARE_API_TOKEN: undefined,
    CLOUDFLARE_LORA_NAME: undefined,
  });
  const stub = stubFetch(modelReply('CRITICAL', 'REMOTE_ACCESS'));
  try {
    const verdict = await analyzeForFraudWithAdvisor(THIN_DANGEROUS);
    assert.equal(stub.calls.length, 0);
    assert.deepEqual(verdict, analyzeForFraud(THIN_DANGEROUS));
  } finally {
    stub.restore();
    restoreEnv();
  }
});

test('a stalled model is abandoned at the given budget', async () => {
  const restoreEnv = withEnv({
    CLOUDFLARE_ACCOUNT_ID: 'acct',
    CLOUDFLARE_API_TOKEN: 'token',
    CLOUDFLARE_LORA_NAME: 'adapter',
  });
  const original = globalThis.fetch;
  globalThis.fetch = ((_url: string, init: RequestInit) =>
    new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    })) as typeof fetch;
  try {
    const verdict = await analyzeForFraudWithAdvisor(THIN_DANGEROUS, {
      timeoutMs: 5,
    });
    assert.deepEqual(verdict, analyzeForFraud(THIN_DANGEROUS));
  } finally {
    globalThis.fetch = original;
    restoreEnv();
  }
});

test('an inconclusive second opinion is ignored', async () => {
  const restoreEnv = withEnv({
    CLOUDFLARE_ACCOUNT_ID: 'acct',
    CLOUDFLARE_API_TOKEN: 'token',
    CLOUDFLARE_LORA_NAME: 'adapter',
  });
  const stub = stubFetch(modelReply('DANGEROUS', 'NONE'));
  try {
    const thin = analyzeForFraud(THIN_DANGEROUS);
    assert.equal(await getFraudSecondOpinion(thin, THIN_DANGEROUS), null);
    assert.deepEqual(await analyzeForFraudWithAdvisor(THIN_DANGEROUS), thin);
  } finally {
    stub.restore();
    restoreEnv();
  }
});
