import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isActionableElement,
  isNoiseElement,
  validateSemanticTarget,
} from './semanticValidator';

/**
 * "📹 Video call" is a line of status text in a chat list, and the companion
 * must never tell an elder to tap it. WhatsApp's own in-chat control carries the
 * same three words and *is* a button - and because the noise rules strip the
 * role tag before they look at the text, the real button used to be classified
 * as a preview. The model's correct answer was then downscored by 35 and
 * "recovered" onto an unrelated element, which is a silent accuracy loss on one
 * of the most common elder tasks there is.
 */

describe('noise detection respects the element role', () => {
  test('a tappable "Video call" is a target, not a preview', () => {
    assert.equal(isNoiseElement('[BUTTON] Video call'), false);
    assert.equal(isNoiseElement('3:[BUTTON] Video call'), false);
    assert.equal(isNoiseElement('[TOGGLE] Audio call'), false);
  });

  test('the same words as static text are still preview noise', () => {
    assert.equal(isNoiseElement('[TEXT] Video call'), true);
    assert.equal(isNoiseElement('[TEXT] 📹 Missed call'), true);
    assert.equal(isNoiseElement('📹 Missed call'), true);
  });

  test('counters and timestamps stay noise even on a button', () => {
    assert.equal(isNoiseElement('[BUTTON] 4 videos'), true);
    assert.equal(isNoiseElement('[BUTTON] Yesterday'), true);
  });

  test('the role survives a numeric prefix', () => {
    assert.equal(isActionableElement('2:[BUTTON] Calls'), true);
    assert.equal(isActionableElement('[INPUT] Message'), true);
    assert.equal(isActionableElement('[TEXT] Calls'), false);
  });

  test('a real call button is accepted instead of being recovered away', () => {
    const screen = ['[BUTTON] Video call', '[BUTTON] More options'];

    const result = validateSemanticTarget(
      'video call lagao',
      0,
      screen,
      'Video call ke liye upar wale button par dabayein.',
    );

    assert.equal(result.status, 'accepted');
    assert.equal(result.validatedIndex, 0);
  });

  test('a preview line is still refused as a target', () => {
    const screen = ['[TEXT] Video call', '[BUTTON] More options'];

    const result = validateSemanticTarget(
      'video call lagao',
      0,
      screen,
      'Video call dekhiye.',
    );

    assert.notEqual(result.status, 'accepted');
  });
});
