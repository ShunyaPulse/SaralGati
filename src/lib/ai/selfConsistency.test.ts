import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { voteOnAnswers } from './selfConsistency';

/**
 * One sample from a stochastic decoder is a guess; several samples that agree
 * are evidence. The vote is over the *validated target*, because that is the
 * decision the spotlight and the elder's finger depend on.
 */

const SCREEN = ['[BUTTON] Electricity Bill', '[BUTTON] Mobile Recharge'];
const QUESTION = 'dono mein kya farak hai';

const BILL = 'Electricity Bill par tap karein. TARGET:0';
const RECHARGE = 'Mobile Recharge par tap karein. TARGET:1';
const UNGROUNDABLE = 'Aap yahan kuch bhi dabayein. TARGET:7';

function vote(samples: string[]) {
  return voteOnAnswers({ samples, question: QUESTION, uiElements: SCREEN, lang: 'hi' });
}

describe('self-consistency voting', () => {
  test('the plurality target wins', () => {
    const result = vote([BILL, BILL, RECHARGE]);

    assert.ok(result);
    assert.equal(result.targetIndex, 0);
    assert.equal(result.sampleCount, 3);
    assert.equal(result.agreeingSamples, 2);
    assert.equal(result.isConsensus, true);
    assert.match(result.text, /TARGET:0$/);
    assert.equal(result.sampleIndex, 0);
  });

  test('samples split across two elements are not a consensus', () => {
    const result = vote([BILL, RECHARGE]);

    assert.ok(result);
    assert.equal(result.isConsensus, false);
    assert.equal(result.agreeingSamples, 1);
    // An even split falls back to the best-grounded sentence, and on an exact
    // tie to the first sample drawn, which keeps the vote deterministic.
    assert.equal(result.targetIndex, 0);
  });

  test('a sample nobody can ground is not a vote for nowhere', () => {
    const result = vote([UNGROUNDABLE, BILL]);

    assert.ok(result);
    assert.equal(result.sampleCount, 2);
    assert.equal(result.agreeingSamples, 1);
    assert.equal(result.targetIndex, 0);
    assert.equal(result.isConsensus, false);
  });

  test('when no sample names an element, the best sentence is still delivered', () => {
    const result = vote([
      'Aap yahan kuch bhi dabayein.',
      'Electricity Bill ki jaankari yahan hai.',
    ]);

    assert.ok(result);
    assert.equal(result.targetIndex, null);
    assert.equal(result.isConsensus, false);
    assert.ok(result.text.length > 0);
  });

  test('nothing at all to vote on returns null rather than an invented answer', () => {
    assert.equal(vote([]), null);
    assert.equal(vote(['', '   ']), null);
  });

  test('the winner keeps its own wording, not a concatenation of samples', () => {
    const result = vote([BILL, RECHARGE, RECHARGE]);

    assert.ok(result);
    assert.equal(result.targetIndex, 1);
    assert.match(result.text, /^Mobile Recharge par tap karein\. TARGET:1$/);
  });
});
