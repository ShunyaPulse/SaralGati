import type { GuidanceLang } from '@/lib/guidance/guidanceLanguage';
import { isNoiseElement } from '@/lib/guidance/noiseElement';
import {
  elementLabelLower,
  isActionableElement,
  isStaticTextElement,
} from '@/lib/guidance/uiElement';

import { getIntentExplanation } from './explanations';
import { ELDER_INTENTS } from './intents';
import type { IntentDefinition } from './types';

/**
 * Matches an elder's question to the best matching interactive element on the screen.
 * Prioritizes actionable elements ([BUTTON], [INPUT], [TOGGLE]) over static [TEXT],
 * and filters media/preview noise (e.g., '3 videos', timestamps).
 */
export function matchQueryPattern(qLower: string, pattern: string): boolean {
  const p = pattern.toLowerCase().trim();
  if (qLower === p) return true;
  const normalizedQ = ' ' + qLower.replace(/[\s,.\-?!]+/g, ' ').trim() + ' ';
  return normalizedQ.includes(' ' + p + ' ');
}

/**
 * Words that carry no element signal. This list only decides how much a bonus
 * is worth, never whether an element is eligible.
 */
const WEAK_QUESTION_TOKENS = new Set([
  'hai',
  'hain',
  'karo',
  'karna',
  'karni',
  'karne',
  'kaise',
  'mein',
  'mera',
  'meri',
  'mujhe',
  'kya',
  'ye',
  'yeh',
  'is',
  'us',
  'par',
  'aur',
  'ke',
  'ki',
  'ka',
  'ko',
  'se',
  'do',
  'dedo',
  'the',
  'for',
  'and',
  'this',
  'that',
  'please',
]);

/** Question words worth matching against an element label. */
function questionTokens(qLower: string): string[] {
  return qLower
    .split(/[^a-z0-9\u0900-\u097F]+/)
    .filter((token) => token.length >= 3 && !WEAK_QUESTION_TOKENS.has(token));
}

/**
 * Pick the element an intent points at - the *best* one, not the first one.
 *
 * First-match was a real source of wrong spotlights: for "Ramesh se baat karni
 * hai" the `call` intent's keyword "call" is inside "Video call", so the elder
 * asking for a voice call was pointed at the video call button simply because
 * it came first on the screen. The score below weighs three signals:
 *
 * - how specific the intent's matched keyword is (`voice call` beats `call`),
 * - whether the element quotes the *query pattern* that made this intent fire
 *   ("bijli ka bill" must choose "Electricity Bill", not "Mobile Recharge"),
 * - whether it quotes the elder's own words ("Amit", "hospital").
 *
 * An element that only matches the elder's words is never enough on its own -
 * "ticket" appears in "Cancel Ticket" on a screen the elder asked about PNR
 * status, which is why the dictionary signal carries the most weight.
 */
function scoreElement(
  label: string,
  intent: IntentDefinition,
  matchedPattern: string,
  tokens: string[],
): number {
  const keywordLength = intent.elementKeywords
    .filter((keyword) => label.includes(keyword))
    .reduce((longest, keyword) => Math.max(longest, keyword.length), 0);
  if (keywordLength === 0) return 0;

  const patternBonus = matchedPattern
    .split(/[^a-z0-9\u0900-\u097F]+/)
    .filter((token) => token.length >= 3 && label.includes(token))
    .reduce((sum, token) => sum + token.length, 0);
  const questionBonus = tokens
    .filter((token) => label.includes(token))
    .reduce((sum, token) => sum + token.length, 0);

  return 4 * patternBonus + 2 * questionBonus + 2 * keywordLength;
}

/**
 * The best-scoring element for one intent, or null when nothing on the screen
 * matches it. Index order only breaks exact ties, so a curated screen keeps a
 * deterministic answer.
 */
function bestElementFor(
  entry: { intent: IntentDefinition; matchedText: string },
  uiElements: string[],
  qLower: string,
  requireActionable: boolean,
  skipStaticText = false,
): number | null {
  const tokens = questionTokens(qLower);
  let bestIndex: number | null = null;
  let bestScore = 0;

  for (let i = 0; i < uiElements.length; i++) {
    const element = uiElements[i];
    // Furniture is never a target, and neither is a preview line the client
    // called static text: that is how a "📹 Video call" subtitle used to be
    // "recovered" as the answer to a video call question.
    if (isNoiseElement(element)) continue;
    if (requireActionable && !isActionableElement(element)) continue;
    if (skipStaticText && isStaticTextElement(element)) continue;

    const score = scoreElement(
      elementLabelLower(element),
      entry.intent,
      entry.matchedText,
      tokens,
    );
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

export function matchElderIntent(
  question: string,
  uiElements: string[],
  lang: GuidanceLang = 'hi'
): { highlightIndex: number | null; matchedIntent: IntentDefinition | null; explanation: string } {
  const qLower = question.toLowerCase();

  // If the user is asking a question (how, what, where, kaise, kahan), bypass fast-path and let the LLM explain it.
  const isQuestion = /\b(kaise|kahan|kaha|kya|kyu|kaun|how|what|where|why|who)\b/i.test(qLower);
  if (isQuestion) {
    return { highlightIndex: null, matchedIntent: null, explanation: '' };
  }

  // Safety check: Avoid fast-path false positives on long, conversational questions
  if (qLower.split(' ').length > 18) {
    return { highlightIndex: null, matchedIntent: null, explanation: '' };
  }

  // Find all intents triggered by the user's question, sorted by longest matched pattern (most specific wins)
  const matchingIntents = ELDER_INTENTS
    .map((intent) => {
      const longestMatch = intent.queryPatterns
        .filter((pattern) => matchQueryPattern(qLower, pattern))
        .sort((a, b) => b.length - a.length)[0];
      return { intent, matchLength: longestMatch ? longestMatch.length : 0, matchedText: longestMatch || '' };
    })
    .filter((m) => m.matchLength > 0)
    .sort((a, b) => b.matchLength - a.matchLength);

  // Anti-Overmatching Guard: If the user's query is long (complex) but the best intent match is just a single short word, bypass fast-path.
  // This prevents "wallpaper par bhagwan ki photo lagao" from triggering camera_photo intent just because of the word "photo".
  if (matchingIntents.length > 0) {
    const bestMatch = matchingIntents[0];
    const wordCount = qLower.split(/[\s,.?!]+/).filter(w => w.length > 0).length;
    if (wordCount > 4 && bestMatch.matchLength <= 6 && !bestMatch.matchedText.includes(' ')) {
      return { highlightIndex: null, matchedIntent: null, explanation: '' };
    }
  }

  const sortedIntents = matchingIntents.map((m) => m.intent);

  if (sortedIntents.length === 0) {
    return {
      highlightIndex: null,
      matchedIntent: null,
      explanation:
        lang === 'en'
          ? 'Please look carefully at the options shown on the screen.'
          : 'Screen par diye gaye vikalpon ko dhyan se dekhein.',
    };
  }

  // Pass 1: actionable elements only ([BUTTON], [INPUT], [TOGGLE]). The best
  // matching element wins, not the first one encountered - see scoreElement.
  for (const entry of matchingIntents) {
    const best = bestElementFor(entry, uiElements, qLower, true);
    if (best !== null) {
      return {
        highlightIndex: best,
        matchedIntent: entry.intent,
        explanation: getIntentExplanation(entry.intent, lang),
      };
    }
  }

  // Pass 2: fallback to any element (strictly excluding static [TEXT] if user asked for an action)
  for (const entry of matchingIntents) {
    const skipText =
      entry.intent.id === 'call' ||
      entry.intent.id === 'video_call' ||
      entry.intent.id === 'payment_upi';
    const best = bestElementFor(entry, uiElements, qLower, false, skipText);
    if (best !== null) {
      return {
        highlightIndex: best,
        matchedIntent: entry.intent,
        explanation: getIntentExplanation(entry.intent, lang),
      };
    }
  }

  return {
    highlightIndex: null,
    matchedIntent: sortedIntents[0],
    explanation: getIntentExplanation(sortedIntents[0], lang)
  };
}
