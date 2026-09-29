import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { matchFastPathRule } from './agentFastPath';

/**
 * These pin the deterministic answers elders get for the most common questions.
 * The chain used to live inline in the ask route with no coverage at all, where
 * a one-character mistake meant an elder was pointed at the wrong button.
 *
 * Expectation strings are the exact sentences the companion app speaks, so the
 * assertions double as a review of the wording.
 */

const WHATSAPP_HOME = [
  '[BUTTON] Video Call',
  '[TEXT] Recent chats',
  '[BUTTON] Calls',
  '[INPUT] Search',
];

describe('matchFastPathRule', () => {
  test('answers a WhatsApp video call request with the video call button', () => {
    const result = matchFastPathRule('com.whatsapp', 'video call kaise lagau', WHATSAPP_HOME);
    assert.deepEqual(result, {
      explanation: 'Video call karne ke liye yahan video call button par dabayein.',
      index: 0,
    });
  });

  test('falls back to the Calls tab when no video call button is on screen', () => {
    const result = matchFastPathRule('com.whatsapp', 'video call lagao', [
      '[BUTTON] Calls',
      '[TEXT] Status',
      '[BUTTON] New chat',
    ]);
    assert.equal(result?.index, 0);
    assert.match(result?.explanation ?? '', /Calls par dabayein/);
  });

  test('understands Hindi script questions', () => {
    const result = matchFastPathRule('com.whatsapp', 'कॉल लगाओ', [
      '[BUTTON] Calls',
      '[BUTTON] New chat',
    ]);
    assert.equal(result?.index, 0);
    assert.match(result?.explanation ?? '', /Call lagane/);
  });

  test('skips dynamic counters and timestamps instead of pointing at them', () => {
    const result = matchFastPathRule('com.whatsapp', 'video call', [
      '[BUTTON] 3 videos',
      '[BUTTON] Video Call',
    ]);
    assert.equal(result?.index, 1, 'expected the noise label at index 0 to be skipped');
  });

  test('handles buttons flagged as below the fold', () => {
    const result = matchFastPathRule('com.whatsapp', 'video call', [
      '[BELOW-FOLD] [BUTTON] Video call',
      '[BUTTON] Calls',
    ]);
    assert.equal(result?.index, 0);
  });

  test('never targets a static [TEXT] when an actionable element matches', () => {
    // Only a [TEXT] Video call exists, so the chain must move on to Calls
    // rather than spotlighting a label the elder cannot tap.
    const result = matchFastPathRule('com.whatsapp', 'video call kaise lagau', [
      '[TEXT] Video call',
      '[BUTTON] Voice call',
      '[BUTTON] Keypad',
    ]);
    assert.equal(result?.index, 1);
    assert.match(result?.explanation ?? '', /Calls par dabayein/);
  });

  test('dials a number from the phone app', () => {
    const result = matchFastPathRule('com.google.android.dialer', 'call karna hai', [
      '[BUTTON] Keypad',
      '[BUTTON] Favorites',
    ]);
    assert.deepEqual(result, {
      explanation: 'Number dial karne ke liye yahan dabayein.',
      index: 0,
    });
  });

  test('opens contacts from the phone app', () => {
    const result = matchFastPathRule('com.google.android.dialer', 'contact dekho', [
      '[BUTTON] Keypad',
      '[BUTTON] Contacts',
    ]);
    assert.deepEqual(result, {
      explanation: 'Sampark (Contacts) dekhne ke liye yahan dabayein.',
      index: 1,
    });
  });

  test('searches YouTube', () => {
    const result = matchFastPathRule('com.google.android.youtube', 'search karo', [
      '[BUTTON] Search',
      '[BUTTON] Shorts',
    ]);
    assert.deepEqual(result, {
      explanation: 'Video khojne ke liye yahan dabayein.',
      index: 0,
    });
  });

  test('shares and deletes from the gallery', () => {
    const elements = ['[BUTTON] Share', '[BUTTON] Delete'];
    assert.deepEqual(matchFastPathRule('com.google.android.apps.photos', 'photo share karo', elements), {
      explanation: 'Is photo ko kisi ko bhejne ke liye yahan share dabayein.',
      index: 0,
    });
    assert.deepEqual(matchFastPathRule('com.google.android.apps.photos', 'photo delete karo', elements), {
      explanation: 'Is photo ko delete karne ke liye yahan dabayein.',
      index: 1,
    });
  });

  test('starts a new SMS and reads an OTP', () => {
    assert.deepEqual(
      matchFastPathRule('com.google.android.apps.messaging', 'message bhejo', [
        '[BUTTON] Start chat',
        '[BUTTON] Unread',
      ]),
      { explanation: 'Naya message bhejne ke liye yahan click karein.', index: 0 },
    );
    assert.deepEqual(
      matchFastPathRule('com.google.android.apps.messaging', 'otp dekho', [
        '[BUTTON] Unread',
        '[BUTTON] Start chat',
      ]),
      { explanation: 'Apna message ya OTP padhne ke liye yahan dabayein.', index: 0 },
    );
  });

  test('adds a contact', () => {
    assert.deepEqual(
      matchFastPathRule('com.android.contacts', 'naya number add karo', ['[BUTTON] Add', '[BUTTON] Search']),
      { explanation: 'Naya number save karne ke liye yahan dabayein.', index: 0 },
    );
  });

  test('watches a video on Facebook', () => {
    assert.deepEqual(
      matchFastPathRule('com.facebook.katana', 'video dekho', ['[BUTTON] Watch video', '[BUTTON] Create post']),
      { explanation: 'Video dekhne ke liye yahan dabayein.', index: 0 },
    );
  });

  test('uses the generic intent dictionary for an app with no rules of its own', () => {
    const result = matchFastPathRule('com.unknown.elderapp', 'video call', ['[BUTTON] Video Call']);
    assert.equal(result?.index, 0);
    assert.match(result?.explanation ?? '', /video call/i);
  });

  test('returns null when nothing on screen matches, so the caller can ask the model', () => {
    assert.equal(matchFastPathRule('com.unknown.elderapp', 'zzz nothing here', ['[BUTTON] alpha']), null);
  });

  test('is pure: it never mutates the caller’s element list', () => {
    const elements = ['[BUTTON] Video Call', '[BUTTON] Calls'];
    const snapshot = [...elements];
    matchFastPathRule('com.whatsapp', 'video call', elements);
    assert.deepEqual(elements, snapshot);
  });
});
