import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGuidanceLang } from '@/lib/guidance/guidanceLanguage';
import { guidanceInstructions } from '@/lib/guidance/guidancePrompt';
import {
  REJECTED_GUIDANCE_COPY,
  buildDpoSample,
  buildSftSample,
  partitionTrainable,
  summarizeLanguageCoverage,
  teachesItsLanguage,
} from './trainingDataExport';

/**
 * The flywheel trains on (instruction, answer) pairs. Before this module the
 * export rebuilt every pair with the same Hinglish instruction, so an English
 * answer was taught as an example of "answer in Hinglish" - the fine-tune then
 * pushed back against the elder's own language choice.
 */

const base = {
  id: '11111111-1111-1111-1111-111111111111',
  appPackage: 'com.whatsapp',
  question: 'How do I video call my daughter?',
  elementsBlock: '[0] [BUTTON] Video Call\n[1] [TEXT] Recents',
  explanation: 'Tap the Video Call button to call your daughter.',
  targetIndex: 0,
  feedbackStatus: 'verified',
  createdAt: '2026-09-27T00:00:00.000Z',
};

describe('exported training rows teach the elder\u2019s language', () => {
  test('an English row is exported under the English instruction', () => {
    const sample = buildSftSample({ ...base, lang: 'en' });
    const system = sample.messages[0].content;

    assert.equal(system.includes(guidanceInstructions('en')), true);
    assert.equal(system.includes(guidanceInstructions('hi')), false);
    assert.equal(sample.metadata.guidance_lang, 'en');
    assert.equal(sample.messages[2].content, `${base.explanation} TARGET:0`);
  });

  test('a Hindi row still gets the Hinglish instruction', () => {
    const sample = buildSftSample({
      ...base,
      lang: 'hi',
      explanation: 'वीडियो कॉल के लिए यहाँ दबाएं।',
    });
    const system = sample.messages[0].content;

    assert.equal(system.includes(guidanceInstructions('hi')), true);
    assert.equal(system.includes(guidanceInstructions('en')), false);
    assert.equal(sample.metadata.guidance_lang, 'hi');
  });

  test('a row with no target still exports the answer', () => {
    const sample = buildSftSample({ ...base, lang: 'en', targetIndex: null });
    assert.equal(sample.messages[2].content, base.explanation);
    assert.equal(sample.metadata.target_index, null);
  });

  test('rows captured before the column existed default to Hindi', () => {
    assert.equal(normalizeGuidanceLang(null), 'hi');
    assert.equal(normalizeGuidanceLang(undefined), 'hi');
    assert.equal(normalizeGuidanceLang('hi'), 'hi');
    assert.equal(normalizeGuidanceLang('en'), 'en');
    assert.equal(normalizeGuidanceLang('de'), 'hi');
  });

  test('an English row answered in Devanagari is not trainable', () => {
    assert.equal(
      teachesItsLanguage({ lang: 'en', explanation: 'यहाँ दबाएं।' }),
      false,
    );
    assert.equal(
      teachesItsLanguage({ lang: 'en', explanation: base.explanation }),
      true,
    );
    // Hinglish rows are Latin script by design, so they are accepted as they are.
    assert.equal(
      teachesItsLanguage({ lang: 'hi', explanation: 'Yahan dabayein.' }),
      true,
    );
    assert.equal(
      teachesItsLanguage({ lang: 'hi', explanation: 'वीडियो कॉल यहाँ।' }),
      true,
    );
    assert.equal(teachesItsLanguage({ lang: 'hi', explanation: '   ' }), false);
    assert.equal(teachesItsLanguage({ lang: 'en', explanation: null }), false);
  });

  test('the export reports what it kept and what it dropped', () => {
    const rows = [
      { lang: 'hi' as const, explanation: 'Yahan dabayein.' },
      { lang: 'hi' as const, explanation: 'वीडियो कॉल यहाँ।' },
      { lang: 'en' as const, explanation: 'Tap Video Call.' },
      { lang: 'en' as const, explanation: 'यहाँ दबाएं।' },
    ];

    const { trainable, skippedWrongScript } = partitionTrainable(rows);
    assert.equal(trainable.length, 3);
    assert.equal(skippedWrongScript.length, 1);
    assert.deepEqual(summarizeLanguageCoverage(trainable), { hi: 2, en: 1 });
  });

  test('a DPO correction contrasts in the elder\u2019s own language', () => {
    const english = buildDpoSample({
      ...base,
      lang: 'en',
      targetIndex: 1,
      rejectedIndex: 0,
    });
    assert.equal(
      english.rejected[0].content,
      `${REJECTED_GUIDANCE_COPY.en} TARGET:0`,
    );
    assert.equal(english.chosen[0].content, `${base.explanation} TARGET:1`);
    assert.equal(
      english.prompt[0].content.includes(guidanceInstructions('en')),
      true,
    );
    assert.equal(english.metadata.guidance_lang, 'en');

    const hindi = buildDpoSample({
      ...base,
      lang: 'hi',
      targetIndex: 1,
      rejectedIndex: 0,
    });
    assert.equal(
      hindi.rejected[0].content,
      `${REJECTED_GUIDANCE_COPY.hi} TARGET:0`,
    );
    assert.equal(hindi.prompt[0].content.includes(guidanceInstructions('hi')), true);
  });
});
