import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GUIDANCE_INSTRUCTIONS,
  buildAskSystemPrompt,
  guidanceInstructions,
} from './guidancePrompt';

/**
 * This prompt is what production sends and what the self-learning export
 * rebuilds for training. If they diverge - or if the English branch quietly
 * lets the model answer in Hindi - the fine-tuned adapter learns to ignore the
 * language the elder chose.
 */

const DEVANAGARI = /[\u0900-\u097F]/;

describe('the guidance prompt is written once, per language', () => {
  test('the English branch asks for English and forbids Hindi', () => {
    const english = guidanceInstructions('en');
    assert.match(english, /English sentences/);
    assert.match(english, /never in Hindi or Devanagari/);
    assert.doesNotMatch(english, /Hinglish/);
  });

  test('the Hindi branch asks for Hinglish', () => {
    const hindi = guidanceInstructions('hi');
    assert.match(hindi, /Hinglish/);
    assert.match(hindi, /Hindi written in English script/);
  });

  test('both languages share the same grounding rules', () => {
    for (const lang of ['hi', 'en'] as const) {
      const instructions = guidanceInstructions(lang);
      assert.match(instructions, /\[BUTTON\]/);
      assert.match(instructions, /\[INPUT\]/);
      assert.match(instructions, /\[TOGGLE\]/);
      assert.match(instructions, /TARGET:\[index\]/);
      assert.equal(instructions, GUIDANCE_INSTRUCTIONS[lang]);
    }
  });

  test('the prompt carries the screen the model is asked about', () => {
    const prompt = buildAskSystemPrompt({
      lang: 'en',
      appPackage: 'com.whatsapp',
      elementsBlock: '[0] [BUTTON] Video Call\n[1] [TEXT] Recent chats',
    });

    assert.match(prompt, /Android app: com\.whatsapp/);
    assert.match(prompt, /\[0\] \[BUTTON\] Video Call/);
    assert.match(prompt, /Instructions:\n1\. Answer the user's question in 1 or 2 simple, comforting English sentences/);
    assert.doesNotMatch(prompt, /Few-shot/);
    assert.ok(!DEVANAGARI.test(prompt));
  });

  test('habits and few-shots extend the prompt without touching the rules', () => {
    const withExtras = buildAskSystemPrompt({
      lang: 'hi',
      appPackage: 'com.google.android.dialer',
      elementsBlock: '[0] [BUTTON] Keypad Dial',
      habitsBlock: '\n\nKnown User Habits:\n- contact: Doctor Sharma',
      fewShotsBlock: 'Example 1: tap the dial pad.',
    });

    assert.match(withExtras, /Known User Habits/);
    assert.match(withExtras, /Few-shot Grounding Examples:\nExample 1/);
    assert.ok(withExtras.includes(guidanceInstructions('hi')));
    assert.ok(withExtras.endsWith('Example 1: tap the dial pad.'));
  });
});
