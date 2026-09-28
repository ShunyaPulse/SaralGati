import { ELDER_INTENTS, matchQueryPattern } from "./intentDictionary";
import { isNoiseElement } from "./semanticValidator";
import { hasDevanagari, type GuidanceLang } from "./guidanceLanguage";

export interface ConfidenceScore {
  score: number; // 0 to 100
  targetIndex: number | null;
  reasons: string[];
  /**
   * The sentence names a different on-screen element than the one it points at.
   * A score is a matter of degree; this is a fact, and the cache gate needs the
   * fact (a 25-point penalty is not always enough to drop an answer below the
   * floor, because an in-bounds actionable target already scores 65).
   */
  contradictsTarget: boolean;
}

/**
 * The score an answer must reach before it may be promoted into the 7-day
 * global screen cache. Reaching an in-bounds actionable element alone scores
 * 65, so this floor is exactly "an answer that points at something tappable and
 * is not contradicted by its own sentence". Without it a weak answer (no
 * validated target, or one naming a different button) was cached for a week and
 * replayed to every elder on that screen - a single bad answer, amplified.
 *
 * Answers promoted by `/api/v1/agent/feedback` are unaffected: those were
 * confirmed by the elder actually tapping the button.
 */
export const MIN_PROMOTABLE_CONFIDENCE = 50;

/** Words that describe *any* button, so sharing one identifies nothing. */
const GENERIC_TOKENS = new Set([
  'button',
  'buttons',
  'option',
  'options',
  'next',
  'back',
  'done',
  'close',
  'cancel',
  'continue',
  'submit',
  'confirm',
  'allow',
  'deny',
  'skip',
  'menu',
  'more',
  'home',
  'search',
  'send',
  'call',
  'calls',
  'this',
  'that',
  'here',
  'there',
  'with',
  'your',
  'you',
  'what',
  'which',
  'should',
  'must',
  'yahan',
  'dabayein',
  'karein',
  'karna',
  'karne',
  'liye',
  'screen',
  'please',
  'elder',
]);

/** Short tokens that still name one specific thing on an elder's screen. */
const SHORT_SPECIFIC_TOKEN = /^(otp|pin|upi|kyc|apk|sim|net)$/;

/** Split a sentence into comparable words, Latin or Devanagari. */
const TOKEN_SPLITTER = /[^a-z0-9\u0900-\u097F]+/;

/**
 * Tokens of a screen element that are specific enough to identify it. Role tags
 * are stripped first and generic button words dropped, so `[BUTTON] Calls`
 * contributes nothing while `[BUTTON] Electricity Bill` contributes the two
 * words that make it the only element an answer could mean.
 */
function identifyingTokens(elementText: string): string[] {
  return elementText
    .replace(/^\[BELOW-FOLD\]\s*/i, '')
    .replace(/^\[.*?\]\s*/g, '')
    .toLowerCase()
    .split(TOKEN_SPLITTER)
    .filter((token) => token.length >= 4 || SHORT_SPECIFIC_TOKEN.test(token))
    .filter((token) => !GENERIC_TOKENS.has(token));
}

/**
 * Every word of a label, generic ones included. Used to decide whether the
 * sentence is talking about the *target*: a target labelled "Calls" and a
 * sentence that says "Calls par dabayein" agree, even though "calls" is far too
 * generic to distinguish it from anything else on the screen.
 */
function labelTokens(elementText: string): string[] {
  return elementText
    .replace(/^\[BELOW-FOLD\]\s*/i, '')
    .replace(/^\[.*?\]\s*/g, '')
    .toLowerCase()
    .split(TOKEN_SPLITTER)
    .filter((token) => token.length >= 3);
}

/** Whether the sentence mentions any of the given tokens. */
function mentions(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
}
/**
 * Calculates an objective grounding confidence score (0 to 100) for a model's generated output.
 * Evaluates:
 * 1. TARGET tag existence & in-bounds validity
 * 2. Actionable role check ([BUTTON], [INPUT], [TOGGLE] vs static text)
 * 3. Question intent semantic alignment
 * 4. Noise element penalties (media previews/timestamps)
 * 5. Explanation-target internal consistency
 */
export function scoreOutputConfidence(
  output: string,
  question: string,
  uiElements: string[] = [],
  lang: GuidanceLang = "hi",
): ConfidenceScore {
  let score = 0;
  let contradictsTarget = false;
  const reasons: string[] = [];

  const targetMatch = output.match(/TARGET:\s*(\d+)/i);
  if (!targetMatch) {
    return {
      score: 20,
      targetIndex: null,
      reasons: ["No TARGET tag found in output"],
      contradictsTarget: false,
    };
  }

  const targetIndex = parseInt(targetMatch[1], 10);

  // 1. Bounds Check
  if (uiElements.length > 0) {
    if (targetIndex < 0 || targetIndex >= uiElements.length) {
      return {
        score: 10,
        targetIndex,
        reasons: ["TARGET index is out of screen bounds"],
        contradictsTarget: false,
      };
    }
    score += 35;
    reasons.push("Valid in-bounds target index (+35)");

    const targetEl = uiElements[targetIndex];
    const cleanEl = targetEl
      .replace(/^\d+:\s*/, "")
      .replace(/^\[below-fold\]\s*/i, "")
      .trim();
    const lowerClean = cleanEl.toLowerCase();
    // The spoken sentence, without its control tag: what the elder actually hears.
    const cleanExplanation = output
      .replace(/TARGET:\s*\d+/gi, "")
      .trim()
      .toLowerCase();

    // 2. Noise Check: Penalize targeting preview counters or timestamps
    if (isNoiseElement(lowerClean)) {
      score -= 35;
      reasons.push("Targeted noise element (timestamps/counters) (-35)");
    }

    // 3. Interactive Role Check
    const isActionable =
      cleanEl.startsWith("[BUTTON]") ||
      cleanEl.startsWith("[INPUT]") ||
      cleanEl.startsWith("[TOGGLE]");

    if (isActionable) {
      score += 30;
      reasons.push("Target is an interactive actionable element (+30)");
    } else {
      score -= 15;
      reasons.push("Target is static non-clickable text (-15)");
    }

    // 4. Intent Semantic Alignment Check
    const qLower = question.toLowerCase();
    const matchingIntents = ELDER_INTENTS.filter((intent) =>
      intent.queryPatterns.some((pattern) =>
        matchQueryPattern(qLower, pattern),
      ),
    );

    if (matchingIntents.length > 0) {
      const intentMatches = matchingIntents.some((intent) =>
        intent.elementKeywords.some((k) =>
          lowerClean.includes(k.toLowerCase()),
        ),
      );

      if (intentMatches) {
        score += 25;
        reasons.push("Target matches question intent keywords (+25)");
      } else {
        const STOP_WORDS = new Set([
          "hai",
          "hain",
          "karo",
          "kaise",
          "karni",
          "karna",
          "mein",
          "par",
          "aur",
          "wala",
          "wali",
          "kya",
          "the",
          "for",
          "and",
          "how",
          "this",
          "that",
          "kahan",
          "kab",
          "kyon",
        ]);
        const qWords = qLower
          .split(/[\s,._\-?!]+/)
          .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
        const wordMatch = qWords.some((w) => lowerClean.includes(w));
        if (wordMatch) {
          score += 15;
          reasons.push("Target matches query specific entity (+15)");
        }
      }
    } else {
      score += 15;
    }

    // 5. Explanation / target agreement. The elder hears the sentence and looks
    //    at the spotlight, so an answer that names a *different* element on the
    //    same screen is not an answer about the highlighted one - it is the
    //    most common way a model is confidently wrong. Only a specific mention
    //    counts, so a generic "tap the button" is never punished, and a
    //    sentence that names the target is never punished either.
    //
    //    The check used to be skipped whenever the *target* was generic
    //    ("Calls", "Search"), which meant the two most dangerous shapes -
    //    naming "Camera" while pointing at Calls, naming "New chat" while
    //    pointing at Calls - passed unflagged exactly because the right answer
    //    was a one-word tab. Reading the target generously instead (any word of
    //    its label counts as agreement) keeps a correct sentence safe without
    //    going blind on short labels.
    const targetWords = labelTokens(targetEl);
    if (!mentions(cleanExplanation, targetWords)) {
      const otherTokens = uiElements
        .filter((_, index) => index !== targetIndex)
        .flatMap((element) => identifyingTokens(element))
        .filter((token) => !targetWords.includes(token));
      if (mentions(cleanExplanation, otherTokens)) {
        score -= 25;
        contradictsTarget = true;
        reasons.push(
          "Explanation names a different element than the highlighted target (-25)",
        );
      }
    }

    // 6. Explanation internal consistency
    const commonActionVerbs = [
      "कॉल",
      "दबाएं",
      "भेजें",
      "खोजें",
      "पे",
      "pay",
      "call",
      "search",
      "tap",
      "open",
      "press",
      "select",
      "click",
      "enter",
    ];
    if (commonActionVerbs.some((v) => cleanExplanation.includes(v))) {
      score += 10;
      reasons.push("Explanation contains a clear action instruction (+10)");
    }
  } else {
    score = 50;
    if (targetMatch) score += 30;
  }

  // 7. Language match. The elder chose a language, so an answer written in the
  //    other script is a worse answer even when it points at the right button.
  //    Latin-script Hinglish cannot be detected this way, which is fine: the
  //    penalty only has to beat the other engine's score in arbitration.
  if (lang === "en" && hasDevanagari(output)) {
    score -= 30;
    reasons.push(
      "Answer is in Hindi although English guidance was requested (-30)",
    );
  }

  const normalizedScore = Math.max(0, Math.min(100, score));

  return {
    score: normalizedScore,
    targetIndex,
    reasons,
    contradictsTarget,
  };
}
