import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeScreenQuestion, screenCacheKey } from './screenCache';

/**
 * The ask route reads and writes this key and the feedback route has to promote
 * a verified answer into the very same one. When the two drift apart (or when
 * the language is left out) the learning loop writes to a key nobody reads -
 * which is how a Hindi answer kept being served to an English elder.
 */

const base = {
  lang: 'hi' as const,
  appPackage: 'com.whatsapp',
  screenHash: 'abc123',
  normalizedQuestion: 'video call kaise lagau',
};

describe('the screen cache key is shared, stable and language-scoped', () => {
  test('the format is pinned, so a silent change cannot orphan the whole cache', () => {
    assert.equal(
      screenCacheKey(base),
      'screen_cache:5f68ef84f7ae3567898d2c20869fa4e2c34a56157f754145c49d6b7f10727a36',
    );
  });

  test('the same screen in two languages is two different keys', () => {
    assert.notEqual(screenCacheKey(base), screenCacheKey({ ...base, lang: 'en' }));
  });

  test('app, screen and question all take part in the key', () => {
    assert.notEqual(
      screenCacheKey(base),
      screenCacheKey({ ...base, appPackage: 'com.phonepe.app' }),
    );
    assert.notEqual(
      screenCacheKey(base),
      screenCacheKey({ ...base, screenHash: 'def456' }),
    );
    assert.notEqual(
      screenCacheKey(base),
      screenCacheKey({ ...base, normalizedQuestion: 'balance kaise dekhein' }),
    );
  });

  test('a follow-up question with history is cached separately from a cold one', () => {
    assert.notEqual(
      screenCacheKey(base),
      screenCacheKey({ ...base, historyHash: ':9f8e7d6c' }),
    );
  });

  test('questions normalise to the same identity regardless of case and punctuation', () => {
    assert.equal(
      normalizeScreenQuestion('  Video Call, kaise lagau?!! '),
      'video call kaise lagau',
    );
    assert.equal(
      normalizeScreenQuestion('पेंशन का पैसा   आया?'),
      'पेंशन का पैसा आया',
    );
  });
});
