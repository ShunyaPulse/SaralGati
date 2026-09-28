import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { formatRelevantFewShots } from './fewShotGrounding';

/**
 * The examples are what tell the model "on a screen like this, the elder means
 * that element". Picking the wrong ones is a silent accuracy loss: the model is
 * shown a WhatsApp answer while the elder is looking at IRCTC. The selector is
 * BM25 now, and these pins are the reason to believe it is better than the
 * word-count it replaced.
 */

/** The example headers of the selected blocks, in order. */
function selectedPackages(packageName: string, question: string, count = 1): string[] {
  return formatRelevantFewShots(packageName, question, count, 'hi')
    .split('\n\n')
    .map((block) => block.split('\n')[0].trim());
}

describe('few-shot retrieval', () => {
  test('a rare, distinctive word carries the match', () => {
    // Not one keyword of this question appears in the IRCTC example's *answer*,
    // and "check" is shared with a Paytm example - only "PNR"/"Enquiry" make it
    // the right one, and BM25's inverse document frequency is what weighs them.
    const [first] = selectedPackages('com.unknown.pkg', 'PNR status check karo');
    assert.equal(first, 'Example 1 (cris.org.in.prs.ima):');
  });

  test('the app the elder is actually looking at wins its own examples', () => {
    const [first, second] = selectedPackages('com.android.settings', 'wifi chalu karo', 2);
    assert.equal(first, 'Example 1 (com.android.settings):');
    assert.equal(second, 'Example 2 (com.android.settings):');
  });

  test('a question with no keywords still prefers the foreground app', () => {
    const [first] = selectedPackages('com.google.android.dialer', 'ye kya hai');
    assert.equal(first, 'Example 1 (com.google.android.dialer):');
  });

  test('Hinglish words are matched, not just English ones', () => {
    const [first] = selectedPackages('net.one97.paytm', 'khate mein kitne paise hain');
    assert.equal(first, 'Example 1 (net.one97.paytm):');
    assert.match(
      formatRelevantFewShots('net.one97.paytm', 'khate mein kitne paise hain', 1, 'hi'),
      /Check Balance/,
    );
  });

  test('selection is deterministic and respects the language', () => {
    const hindi = formatRelevantFewShots('com.whatsapp', 'video call kaise lagau', 4, 'hi');
    const english = formatRelevantFewShots('com.whatsapp', 'video call kaise lagau', 4, 'en');

    assert.equal(hindi, formatRelevantFewShots('com.whatsapp', 'video call kaise lagau', 4, 'hi'));
    // Same examples, same order: only the answers are translated.
    assert.deepEqual(
      hindi.split('\n\n').map((block) => block.split('\n').slice(0, 2).join('\n')),
      english.split('\n\n').map((block) => block.split('\n').slice(0, 2).join('\n')),
    );
  });

  test('a flood of common words cannot outrank a relevant example', () => {
    // Every one of these words is a stop-word in Hinglish, so the IRCTC example
    // must still win on the one word that is not.
    const [first] = selectedPackages('', 'kya hai aur kaise karo yeh mujhe mera PNR');
    assert.equal(first, 'Example 1 (cris.org.in.prs.ima):');
  });
});
