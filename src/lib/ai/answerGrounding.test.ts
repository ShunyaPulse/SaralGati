import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  groundAnswer,
  parseTargetTag,
  withTargetTag,
} from './answerGrounding';
import { scoreOutputConfidence } from './confidenceScorer';

/**
 * Grounding is the step between "the model said something" and "the companion
 * spotlights something". It is what the arbiter now compares, what the cache
 * gate reads, and what the flywheel labels screens with, so these pins matter
 * more than a formatting test usually would.
 */

const SCREEN = ['[BUTTON] Search', '[BUTTON] Video call'];

describe('grounding a model answer', () => {
  test('only the first TARGET tag is read, and the spoken sentence loses it', () => {
    assert.deepEqual(parseTargetTag('Tap Subscribe here. TARGET:2'), {
      explanation: 'Tap Subscribe here.',
      targetIndex: 2,
    });
    // The ask route has always taken the first tag; the arbiter must agree with
    // it, or the spotlight and the voice would name different buttons.
    assert.equal(parseTargetTag('TARGET:1 then TARGET:4').targetIndex, 1);
    assert.deepEqual(parseTargetTag('No tag here.'), {
      explanation: 'No tag here.',
      targetIndex: null,
    });
  });

  test('the tag is re-appended at the end and never duplicated', () => {
    assert.equal(withTargetTag('Tap Calls.', 3), 'Tap Calls. TARGET:3');
    assert.equal(withTargetTag('Tap Calls.', null), 'Tap Calls.');
  });

  test('an out-of-bounds tag is repaired to the element the elder meant', () => {
    const grounded = groundAnswer({
      text: 'Video call karne ke liye upar video call button par dabayein. TARGET:9',
      question: 'video call lagao',
      uiElements: SCREEN,
      lang: 'hi',
    });

    assert.equal(grounded.rawTargetIndex, 9);
    assert.equal(grounded.targetIndex, 1);
    assert.equal(grounded.validation.status, 'recovered_intent');
    assert.match(grounded.explanation, /TARGET:1$/);
    // The repaired answer is the better answer: the raw text would have scored
    // 10 ("out of bounds") and lost an arbitration it should have won.
    assert.ok(
      grounded.score > scoreOutputConfidence(
        'Video call karne ke liye upar video call button par dabayein. TARGET:9',
        'video call lagao',
        SCREEN,
        'hi',
      ).score,
    );
  });

  test('an index that is not on the screen is replaced, never kept', () => {
    const grounded = groundAnswer({
      text: 'Video call ke liye upar wale button par dabayein. TARGET:7',
      question: 'video call lagao',
      uiElements: SCREEN,
      lang: 'hi',
    });

    assert.equal(grounded.validation.status, 'recovered_intent');
    assert.equal(
      grounded.explanation.includes('TARGET:7'),
      false,
      'a stale index must not survive grounding',
    );
    assert.match(grounded.explanation, /TARGET:1$/);
  });

  test('an answer nothing on screen supports is delivered without a target', () => {
    const grounded = groundAnswer({
      text: 'Aap yahan kuch bhi dabayein. TARGET:7',
      question: 'kuch samajh nahi aa raha',
      uiElements: SCREEN,
      lang: 'hi',
    });

    // Nothing can be spotlighted, so the tag goes and the score collapses to the
    // no-target floor - far below what the cache gate accepts.
    assert.equal(grounded.validation.status, 'no_target');
    assert.equal(grounded.targetIndex, null);
    assert.equal(grounded.score, 20);
    assert.equal(grounded.explanation, 'Aap yahan kuch bhi dabayein.');
  });

  test('a screen with nothing to tap grounds to no target instead of a guess', () => {
    const grounded = groundAnswer({
      text: 'Ye screen aapki settings dikhati hai.',
      question: 'ye kya hai',
      uiElements: [],
      lang: 'hi',
    });

    assert.equal(grounded.targetIndex, null);
    assert.equal(grounded.score, 20);
    assert.equal(grounded.explanation, 'Ye screen aapki settings dikhati hai.');
  });

  test('a grounded answer is what the 7-day cache gate wants to see', () => {
    const grounded = groundAnswer({
      text: 'Video call ke liye upar wale button par tap karein. TARGET:1',
      question: 'video call lagao',
      uiElements: SCREEN,
      lang: 'hi',
    });

    assert.ok(grounded.score >= 50, `expected a promotable score, got ${grounded.score}`);
    assert.equal(grounded.targetIndex, 1);
    assert.deepEqual(grounded.reasons.filter((r) => r.includes('(-')), []);
  });
});
