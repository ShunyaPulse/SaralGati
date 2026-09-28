import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_PROMOTABLE_CONFIDENCE,
  scoreOutputConfidence,
} from './confidenceScorer';

/**
 * The score is what decides which of two engine answers is spoken, and whether
 * the answer is worth caching for a week. Two things matter here: an answer that
 * names a *different* button than the one it highlights is the most common way a
 * model is confidently wrong, and a weak answer must never reach the shared
 * cache where every elder on the same screen would hear it.
 */

const BILL_SCREEN = ['[BUTTON] Electricity Bill', '[BUTTON] Mobile Recharge'];
const QUESTION = 'dono mein kya farak hai';

function negativeReasons(score: { reasons: string[] }): string[] {
  return score.reasons.filter((reason) => reason.includes('(-'));
}

describe('the confidence score behind arbitration and the cache', () => {
  test('an answer that names a different button loses 25 points', () => {
    const naming = scoreOutputConfidence(
      'Mobile Recharge par tap karein. TARGET:0',
      QUESTION,
      BILL_SCREEN,
      'hi',
    );
    // Same sentence and same target, but the conflicting element is simply not
    // on the screen any more, so there is nothing left for it to contradict.
    const alone = scoreOutputConfidence(
      'Mobile Recharge par tap karein. TARGET:0',
      QUESTION,
      ['[BUTTON] Electricity Bill'],
      'hi',
    );

    assert.equal(naming.score, alone.score - 25);
    assert.ok(
      naming.reasons.some((reason) => reason.includes('names a different element')),
    );
  });

  test('an answer that names the highlighted button is not punished', () => {
    const score = scoreOutputConfidence(
      'Electricity Bill par tap karein. TARGET:0',
      QUESTION,
      BILL_SCREEN,
      'hi',
    );

    assert.deepEqual(negativeReasons(score), []);
  });

  test('a generic sentence is not punished for saying nothing specific', () => {
    const score = scoreOutputConfidence(
      'Yahan dabayein. TARGET:0',
      QUESTION,
      BILL_SCREEN,
      'hi',
    );

    assert.deepEqual(negativeReasons(score), []);
  });

  test('an English answer in English mode is not treated as a mismatch', () => {
    const score = scoreOutputConfidence(
      'Tap Electricity Bill here. TARGET:0',
      QUESTION,
      BILL_SCREEN,
      'en',
    );

    assert.deepEqual(negativeReasons(score), []);
  });

  test('the promotion floor separates a grounded answer from a weak one', () => {
    const grounded = scoreOutputConfidence(
      'Electricity Bill par tap karein. TARGET:0',
      QUESTION,
      BILL_SCREEN,
      'hi',
    );
    const noTarget = scoreOutputConfidence('Yahan dabayein.', QUESTION, BILL_SCREEN, 'hi');
    const outOfBounds = scoreOutputConfidence(
      'Electricity Bill par tap karein. TARGET:9',
      QUESTION,
      BILL_SCREEN,
      'hi',
    );

    assert.ok(grounded.score >= MIN_PROMOTABLE_CONFIDENCE);
    assert.ok(noTarget.score < MIN_PROMOTABLE_CONFIDENCE);
    assert.ok(outOfBounds.score < MIN_PROMOTABLE_CONFIDENCE);
    assert.equal(outOfBounds.targetIndex, 9);
  });

  test('a wrong-button answer is flagged, not merely discounted', () => {
    // A score is a matter of degree: 35 (in bounds) + 30 (actionable) + 15 (no
    // intent matched) + 10 (a clear action verb) - 25 (the mismatch) still lands
    // above the floor, so a threshold alone would happily cache an answer about
    // the wrong button for a week. The flag is what the cache gate reads.
    const wrongButton = scoreOutputConfidence(
      'Mobile Recharge par tap karein. TARGET:0',
      QUESTION,
      BILL_SCREEN,
      'hi',
    );
    const honest = scoreOutputConfidence(
      'Electricity Bill par tap karein. TARGET:0',
      QUESTION,
      BILL_SCREEN,
      'hi',
    );

    assert.equal(wrongButton.contradictsTarget, true);
    assert.equal(honest.contradictsTarget, false);
    assert.ok(wrongButton.score >= MIN_PROMOTABLE_CONFIDENCE);
    assert.ok(honest.score > wrongButton.score);
  });
});
