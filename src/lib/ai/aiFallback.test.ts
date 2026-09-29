import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { generateAIResponse } from './aiFallback';
import { groundAnswer } from './answerGrounding';
import { scoreOutputConfidence } from './confidenceScorer';

/**
 * The dual engine used to pick a winner by scoring the raw text of each answer
 * and only validating the winner afterwards. A confident sentence pointing at
 * the wrong element therefore won the comparison and the better answer was
 * thrown away - the elder got the hallucination. These tests pin the fix: both
 * candidates are validated first, and the winner is decided on grounded merit.
 */

const SCREEN = ['[BUTTON] Search', '[BUTTON] Video call'];
const QUESTION = 'video call lagao';
const OPTIONS = {
  systemPrompt: 'prompt',
  userPrompt: QUESTION,
  uiElements: SCREEN,
  lang: 'hi' as const,
};

/**
 * A neutral question, deliberately matching no intent in the dictionary: an
 * intent match lets the validator recover an answer to the element the intent
 * names, which would hide the difference these tests are about.
 */
const NEUTRAL_QUESTION = 'dono mein kya farak hai';
const BILL_SCREEN = ['[BUTTON] Electricity Bill', '[BUTTON] Mobile Recharge'];
/** A question the intent dictionary resolves to the Electricity Bill element. */
const BILL_QUESTION = 'bijli ka bill bharna hai';
const NEUTRAL_OPTIONS = {
  systemPrompt: 'prompt',
  userPrompt: NEUTRAL_QUESTION,
  uiElements: BILL_SCREEN,
  lang: 'hi' as const,
};

const LORA_ENV = {
  CLOUDFLARE_ACCOUNT_ID: 'account',
  CLOUDFLARE_API_TOKEN: 'token',
  CLOUDFLARE_LORA_NAME: 'saralgati-elder-llama31-8b',
  GEMINI_API_KEY: 'gemini-key',
};

/**
 * The two engines' hosts. Compared as whole hosts, not as substrings: a
 * substring test can be satisfied by any URL that merely contains the name.
 */
const LORA_HOST = 'api.cloudflare.com';
const GEMINI_HOST = 'generativelanguage.googleapis.com';

function hostOf(url: string): string {
  return new URL(url).host;
}

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

interface CapturedRequest {
  url: string;
  body: Record<string, unknown>;
  signal: AbortSignal | null | undefined;
}

/** A canned answer, or a callback that answers a call however it likes. */
type EngineReply = string | (() => Promise<Response>);

/**
 * Answer each engine by URL. A plain string is answered every time, an array is
 * consumed call by call (last entry repeats), and a callback is invoked as-is -
 * which is how a failing or hanging engine is simulated.
 */
function stubEngines(lora: EngineReply | EngineReply[], gemini: EngineReply | EngineReply[]) {
  const calls: CapturedRequest[] = [];
  const cursors = { lora: 0, gemini: 0 };
  const original = globalThis.fetch;

  const pick = (script: EngineReply | EngineReply[], engine: 'lora' | 'gemini') => {
    if (!Array.isArray(script)) return script;
    const index = Math.min(cursors[engine]++, script.length - 1);
    return script[index];
  };

  const respond = async (
    reply: EngineReply,
    wrap: (text: string) => Response,
  ): Promise<Response> => (typeof reply === 'function' ? reply() : wrap(reply));

  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const href = String(url);
    calls.push({
      url: href,
      body: JSON.parse(String(init.body)) as Record<string, unknown>,
      signal: init.signal,
    });

    if (hostOf(href) === LORA_HOST) {
      return respond(pick(lora, 'lora'), (text) =>
        json({ result: { response: text } }),
      );
    }
    return respond(pick(gemini, 'gemini'), (text) =>
      json({ candidates: [{ content: { parts: [{ text }] } }] }),
    );
  }) as typeof fetch;

  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

function json(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** The fine-tuned adapter's calls - the student the flywheel trains. */
function loraCalls(calls: CapturedRequest[]): CapturedRequest[] {
  return calls.filter((call) => hostOf(call.url) === LORA_HOST);
}

/** The general model's calls - the frozen teacher. */
function geminiCalls(calls: CapturedRequest[]): CapturedRequest[] {
  return calls.filter((call) => hostOf(call.url) === GEMINI_HOST);
}

describe('grounded arbitration between the two engines', () => {
  test('an answer the validator repairs can beat one that scored better raw', async () => {
    const restore = withEnv(LORA_ENV);
    // The elder wants to pay the electricity bill. The LoRA answers about the
    // right element but tags an index that is not on the screen; Gemini answers
    // about the wrong element and tags it correctly. Raw scoring prefers Gemini
    // by a mile (100 vs 10, the out-of-bounds tag is fatal), yet on this screen
    // Gemini's answer would send the elder to Mobile Recharge.
    const question = BILL_QUESTION;
    const lora = 'Electricity Bill ke liye yahan tap karein. TARGET:9';
    const gemini = 'Mobile Recharge par tap karein. TARGET:1';
    const stub = stubEngines(lora, gemini);

    try {
      const result = await generateAIResponse({ ...NEUTRAL_OPTIONS, userPrompt: question });

      const rawLora = scoreOutputConfidence(lora, question, BILL_SCREEN, 'hi');
      const rawGemini = scoreOutputConfidence(gemini, question, BILL_SCREEN, 'hi');
      assert.ok(
        rawGemini.score > rawLora.score,
        'the raw comparison is the one the old code used, and it picked the wrong answer',
      );

      // Grounding repairs the LoRA answer to the element the intent dictionary
      // knows the elder meant, and that repaired answer wins.
      assert.equal(result.source, 'lora');
      assert.equal(result.competingResults?.winner, 'lora');
      assert.equal(result.grounding?.status, 'recovered_intent');
      assert.equal(result.targetIndex, 0);
      // The delivered sentence is the engine's own text: the ask route re-runs
      // the same validator on it, and validation is deterministic, so it lands
      // on the same element. Grounding only decides who wins.
      assert.equal(
        groundAnswer({
          text: result.text,
          question,
          uiElements: BILL_SCREEN,
          lang: 'hi',
        }).targetIndex,
        0,
      );
    } finally {
      stub.restore();
      restore();
    }
  });

  test('an answer whose sentence names a different button loses on merit', async () => {
    const restore = withEnv(LORA_ENV);
    // Same element on both sides, so the tie-break rule ("prefer the fine-tuned
    // LoRA") used to decide this - and the LoRA sentence is the one talking
    // about the button that is *not* being spotlighted.
    const lora = 'Mobile Recharge par tap karein. TARGET:0';
    const gemini = 'Electricity Bill par tap karein. TARGET:0';
    const stub = stubEngines(lora, gemini);

    try {
      const result = await generateAIResponse(NEUTRAL_OPTIONS);

      assert.equal(result.competingResults?.winner, 'gemini');
      assert.equal(result.source, 'gemini');
      assert.equal(result.targetIndex, 0);
      assert.ok(
        (result.competingResults?.geminiConfidence ?? 0) >
          (result.competingResults?.loraConfidence ?? 0),
      );

      const loraGrounded = groundAnswer({
        text: lora,
        question: NEUTRAL_QUESTION,
        uiElements: BILL_SCREEN,
        lang: 'hi',
      });
      assert.ok(
        loraGrounded.reasons.some((reason) =>
          reason.includes('names a different element'),
        ),
      );
      // Both answers point at the same element, so they are corroborated - the
      // penalty is what separates them.
      assert.equal(result.grounding?.agreed, true);
    } finally {
      stub.restore();
      restore();
    }
  });

  test('two engines pointing at the same element are corroborated', async () => {
    const restore = withEnv(LORA_ENV);
    const answer = 'Electricity Bill par tap karein. TARGET:0';
    const stub = stubEngines(answer, answer);

    try {
      const result = await generateAIResponse(NEUTRAL_OPTIONS);
      assert.equal(result.competingResults?.targetAgreement, true);
      assert.equal(result.grounding?.agreed, true);
      assert.equal(result.targetIndex, 0);

      const single = groundAnswer({
        text: answer,
        question: NEUTRAL_QUESTION,
        uiElements: BILL_SCREEN,
        lang: 'hi',
      });
      assert.equal(
        result.confidence,
        Math.min(100, single.score + 5),
        'consensus is worth a small, capped confidence bonus',
      );
    } finally {
      stub.restore();
      restore();
    }
  });

  test('two engines pointing at different elements are both discounted', async () => {
    const restore = withEnv(LORA_ENV);
    const lora = 'Electricity Bill par tap karein. TARGET:0';
    const gemini = 'Mobile Recharge par tap karein. TARGET:1';
    const stub = stubEngines(lora, gemini);

    try {
      const result = await generateAIResponse(NEUTRAL_OPTIONS);
      assert.equal(result.competingResults?.targetAgreement, false);
      const grounded = groundAnswer({
        text: lora,
        question: NEUTRAL_QUESTION,
        uiElements: BILL_SCREEN,
        lang: 'hi',
      });
      assert.equal(
        result.confidence,
        Math.max(0, grounded.score - 10),
        'disagreement costs confidence, so a shaky answer is not cached for a week',
      );
      assert.ok(
        (result.confidence ?? 0) < grounded.score,
        'the delivered answer is discounted, not the discarded one',
      );
    } finally {
      stub.restore();
      restore();
    }
  });

  test('an engine that hangs or errors cannot hold the answer back', async () => {
    const restore = withEnv(LORA_ENV);
    const hung = () => Promise.reject(new DOMException('aborted', 'AbortError'));
    const stub = stubEngines('Video call ke liye yahan tap karein. TARGET:1', hung);

    try {
      const result = await generateAIResponse(OPTIONS);
      assert.equal(result.source, 'lora');
      // Every outbound call carries a deadline, so one stalled engine can no
      // longer keep the elder waiting on the other engine's answer.
      for (const call of stub.calls) {
        assert.ok(call.signal, `${call.url} must carry an abort signal`);
      }
    } finally {
      stub.restore();
      restore();
    }
  });

  test('answers are requested greedily, with room for a full sentence', async () => {
    const restore = withEnv(LORA_ENV);
    const stub = stubEngines(
      'Video call ke liye yahan tap karein. TARGET:1',
      'Yahan tap karein. TARGET:1',
    );

    try {
      await generateAIResponse(OPTIONS);
      const loraCall = loraCalls(stub.calls)[0];
      assert.equal(geminiCalls(stub.calls).length, 1);
      const geminiCall = stub.calls.find((call) => hostOf(call.url) === GEMINI_HOST);

      assert.equal(loraCall?.body.temperature, 0);
      const geminiConfig = geminiCall?.body.generationConfig as {
        temperature?: number;
        maxOutputTokens?: number;
      };
      assert.equal(geminiConfig?.temperature, 0);
      // 65 tokens used to cut a two-sentence Hinglish answer off mid-sentence.
      assert.equal(loraCall?.body.max_tokens, 96);
      assert.equal(geminiConfig?.maxOutputTokens, 96);
    } finally {
      stub.restore();
      restore();
    }
  });
});

describe('self-consistency sampling', () => {
  const AGREE = 'Electricity Bill par tap karein. TARGET:0';
  const DISSENT = 'Mobile Recharge par tap karein. TARGET:1';
  /** The student says something useful but points nowhere. */
  const STUDENT_HEDGE = 'Electricity Bill ki jaankari yahan hai.';

  test('the vote is drawn from the teacher, and the student stays greedy', async () => {
    const restore = withEnv(LORA_ENV);
    // Flywheel shape: three teacher draws, one student draw. The student is the
    // adapter these very rows train, so its own plurality is not new information
    // - voting it would teach the adapter its current habits back.
    const stub = stubEngines(STUDENT_HEDGE, [AGREE, AGREE, DISSENT]);

    try {
      const result = await generateAIResponse({ ...NEUTRAL_OPTIONS, selfConsistency: 3 });

      const lora = loraCalls(stub.calls);
      assert.equal(lora.length, 1, 'the student answers once, greedily');
      assert.equal(lora[0].body.temperature, 0);

      const gemini = geminiCalls(stub.calls);
      assert.equal(gemini.length, 3, 'the teacher is sampled');
      for (const call of gemini) {
        const config = call.body.generationConfig as { temperature?: number };
        assert.equal(config.temperature, 0.6);
      }

      // The majority teacher answer is what the flywheel captures as a label.
      assert.equal(result.source, 'gemini');
      assert.equal(result.consistency?.sampleCount, 3);
      assert.equal(result.consistency?.agreeingSamples, 2);
      assert.equal(result.consistency?.isConsensus, true);
      assert.equal(result.targetIndex, 0);
    } finally {
      stub.restore();
      restore();
    }
  });

  test('the interactive path may vote on both engines instead', async () => {
    const restore = withEnv(LORA_ENV);
    const stub = stubEngines(AGREE, [AGREE, AGREE, DISSENT]);

    try {
      const result = await generateAIResponse({
        ...NEUTRAL_OPTIONS,
        selfConsistency: 3,
        selfConsistencyScope: 'all',
      });

      assert.equal(loraCalls(stub.calls).length, 3);
      assert.equal(geminiCalls(stub.calls).length, 3);
      assert.equal(result.targetIndex, 0);
    } finally {
      stub.restore();
      restore();
    }
  });

  test('a single sample keeps the greedy decoder and skips voting', async () => {
    const restore = withEnv(LORA_ENV);
    const stub = stubEngines(AGREE, AGREE);

    try {
      const result = await generateAIResponse({ ...NEUTRAL_OPTIONS, selfConsistency: 1 });
      assert.equal(result.consistency, undefined);
      const calls = loraCalls(stub.calls);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].body.temperature, 0);
    } finally {
      stub.restore();
      restore();
    }
  });

  test('failed samples simply do not vote', async () => {
    const restore = withEnv(LORA_ENV);
    const stub = stubEngines(
      STUDENT_HEDGE,
      [
        () => Promise.resolve(json({ candidates: [{ content: { parts: [{ text: AGREE }] } }] })),
        () => Promise.resolve(new Response('nope', { status: 500 })),
        () => Promise.resolve(new Response('nope', { status: 500 })),
      ],
    );

    try {
      const result = await generateAIResponse({ ...NEUTRAL_OPTIONS, selfConsistency: 3 });
      assert.equal(result.source, 'gemini');
      assert.equal(result.targetIndex, 0);
      assert.equal(result.consistency, undefined, 'a single surviving sample is not a vote');
    } finally {
      stub.restore();
      restore();
    }
  });
});
