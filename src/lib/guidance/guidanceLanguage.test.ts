import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { matchFastPathRule } from './agentFastPath';
import { scoreOutputConfidence } from '@/lib/ai/confidenceScorer';
import { formatRelevantFewShots } from '@/lib/ai/fewShotGrounding';
import { analyzeForFraud, sentinelExplanation } from '@/lib/fraud/fraudSentinel';
import { flowStepInstruction } from '@/lib/data/flowEngine';
import { hasDevanagari } from './guidanceLanguage';
import {
  ELDER_INTENTS,
  INTENT_ENGLISH_EXPLANATIONS,
  INTENT_HINDI_EXPLANATIONS,
  getIntentExplanation,
  matchElderIntent,
} from './intentDictionary';

/**
 * The companion offers "Everything in English", and before this suite existed
 * that promise only reached the labels: every layer that produces a *spoken*
 * sentence was written in Hinglish, so an English elder was still read Hindi.
 *
 * These tests pin the whole guidance stack to the elder's choice - the fast
 * path, the intent dictionary, the multi-step flows, the few-shot examples
 * that steer the models, the arbitration between the two engines, and the
 * fraud intercept - because a single layer left in Hinglish is enough to bring
 * the bug back.
 */

const DEVANAGARI = /[\u0900-\u097F]/;

describe('English guidance stays English', () => {
  test('every intent that has a Hindi explanation also has an English one', () => {
    assert.deepEqual(
      Object.keys(INTENT_ENGLISH_EXPLANATIONS).sort(),
      Object.keys(INTENT_HINDI_EXPLANATIONS).sort(),
    );

    for (const [id, english] of Object.entries(INTENT_ENGLISH_EXPLANATIONS)) {
      assert.ok(english.trim().length > 0, `${id} needs a non-empty English line`);
      assert.ok(
        !DEVANAGARI.test(english),
        `${id} must not carry Devanagari into English mode: ${english}`,
      );
    }
  });

  test('the intent dictionary answers in the requested language', () => {
    const videoCall = ELDER_INTENTS.find((intent) => intent.id === 'video_call');
    assert.ok(videoCall);

    const hindi = getIntentExplanation(videoCall, 'hi');
    const english = getIntentExplanation(videoCall, 'en');

    assert.ok(!DEVANAGARI.test(english));
    assert.notEqual(english, hindi);
    // Default stays Hindi so older callers and the existing pins keep working.
    assert.equal(getIntentExplanation(videoCall), hindi);
    assert.equal(getIntentExplanation(videoCall, 'en'), INTENT_ENGLISH_EXPLANATIONS.video_call);
  });

  test('the fast path speaks English when the elder chose English', () => {
    const englishCases = [
      matchFastPathRule('com.whatsapp', 'video call kaise lagau', [
        '[BUTTON] Video Call',
        '[BUTTON] Calls',
      ], 'en'),
      matchFastPathRule('com.google.android.dialer', 'call karna hai', ['[BUTTON] Keypad'], 'en'),
      matchFastPathRule('com.google.android.apps.photos', 'photo delete karo', ['[BUTTON] Delete'], 'en'),
      matchFastPathRule('com.android.contacts', 'naya number add karo', ['[BUTTON] Add'], 'en'),
      // No app-specific rule: this one comes from the intent dictionary.
      matchFastPathRule('com.unknown.elderapp', 'video call', ['[BUTTON] Video Call'], 'en'),
    ];

    for (const match of englishCases) {
      assert.ok(match, 'expected a fast-path match');
      assert.ok(
        !DEVANAGARI.test(match.explanation),
        `English mode must not answer in Devanagari: ${match.explanation}`,
      );
    }

    assert.equal(
      englishCases[0]?.explanation,
      'Tap here on the video call button to start a video call.',
    );
    // The Hindi column is unchanged, which is what the existing pins assert.
    assert.equal(
      matchFastPathRule('com.whatsapp', 'video call kaise lagau', ['[BUTTON] Video Call'])?.explanation,
      'Video call karne ke liye yahan video call button par dabayein.',
    );
  });

  test('the intent dictionary sees the language it was given', () => {
    const result = matchElderIntent('video call karo', ['[BUTTON] Video Call'], 'en');
    assert.equal(result.highlightIndex, 0);
    assert.ok(!DEVANAGARI.test(result.explanation));
  });

  test('a multi-step flow names the step in English', () => {
    const step = {
      stepNumber: 2,
      label: 'Tap Video Call Icon',
      hindiInstruction: 'कदम 2/2: वीडियो कॉल लगाने के लिए ऊपर दिए गए वीडियो कैमरा बटन पर दबाएं।',
      expectedKeywords: ['video call'],
    };

    assert.equal(
      flowStepInstruction(step, 2, 'en'),
      'Step 2 of 2: tap "Tap Video Call Icon" on your screen.',
    );
    assert.equal(flowStepInstruction(step, 2, 'hi'), step.hindiInstruction);
  });

  test('the examples that steer the models are English too', () => {
    const english = formatRelevantFewShots('com.whatsapp', 'video call kaise kare', 4, 'en');
    const hindi = formatRelevantFewShots('com.whatsapp', 'video call kaise kare', 4, 'hi');

    assert.ok(!hasDevanagari(english), 'English few-shots must not teach the model Hindi');
    assert.match(english, /Answer: Tap|Answer: To/);
    // Hindi mode is untouched: it still teaches the Hindi voice.
    assert.ok(hasDevanagari(hindi));
  });

  test('a Hindi answer loses arbitration when English was asked for', () => {
    const uiElements = ['[BUTTON] Video call', '[BUTTON] Calls'];
    const question = 'video call lagao';
    const hindiAnswer = 'वीडियो कॉल के लिए ऊपर वीडियो कॉल बटन पर दबाएं। TARGET:0';
    const englishAnswer = 'Tap the video call button at the top. TARGET:0';

    const hindiScore = scoreOutputConfidence(hindiAnswer, question, uiElements, 'en');
    const englishScore = scoreOutputConfidence(englishAnswer, question, uiElements, 'en');

    assert.ok(
      englishScore.score > hindiScore.score,
      `English answer (${englishScore.score}) must beat the Hindi one (${hindiScore.score})`,
    );
    assert.ok(
      hindiScore.reasons.some((reason) => reason.includes('English guidance was requested')),
    );
    // The same Hindi answer is not penalised when Hindi guidance is wanted.
    assert.ok(
      scoreOutputConfidence(hindiAnswer, question, uiElements, 'hi').score > hindiScore.score,
    );
  });

  test('the fraud intercept speaks the elder’s language', () => {
    const verdict = analyzeForFraud({ messages: ['please share your OTP with me'] });
    assert.notEqual(verdict.threat_level, 'SAFE');

    const english = sentinelExplanation(verdict, 'en');
    assert.equal(english, verdict.user_alert.message_en);
    assert.ok(!DEVANAGARI.test(english));
    assert.equal(sentinelExplanation(verdict), verdict.user_alert.message_hi);
  });
});
