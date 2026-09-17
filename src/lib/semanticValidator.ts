import { ELDER_INTENTS, matchElderIntent } from './intentDictionary';

export interface SemanticValidationResult {
  isValid: boolean;
  validatedIndex: number | null;
  status: 'accepted' | 'recovered_intent' | 'recovered_role' | 'rejected_noise' | 'no_target';
  reason?: string;
  originalIndex: number | null;
}

const NOISE_REGEXES = [
  /\b\d+\s*(videos?|photos?|messages?|audios?|items?)\b/i,
  /\b(yesterday|today|tomorrow)\b/i,
  /\b\d{1,2}:\d{2}\s*(am|pm)?\b/i,
  /\b(am|pm)\b/i,
  /\b(sent|delivered|read|typing\.\.\.|online|last seen)\b/i,
  // Global message preview/subtitle noise (e.g. "📹 Video call", "Missed video call", "Audio call")
  /(?:^|\]\s*)[📹🎥📞📱]?\s*(video call|audio call|voice call|missed call|incoming call|outgoing call)\s*$/i,
  /(?:^|\]\s*)[📹🎥📞📱]\s*/i
];

function cleanElementText(text: string): string {
  return text.replace(/^\d+:\s*/, '').replace(/^\[below-fold\]\s*/i, '').trim().toLowerCase();
}

export function isNoiseElement(elementText: string): boolean {
  const lower = cleanElementText(elementText);
  return NOISE_REGEXES.some((regex) => regex.test(lower));
}

// Universal affirmative/navigational keywords acceptable for generic confirmation steps
const UNIVERSAL_ACTION_KEYWORDS = [
  'ok', 'done', 'continue', 'next', 'proceed', 'submit', 'confirm', 'allow',
  'आगे', 'ठीक', 'स्वीकार', 'आगे बढ़ें', 'पुष्टि'
];

/**
 * Post-LLM Semantic Target Validator
 * Verifies that the element selected by the LLM (or target index) is semantically
 * compatible with the user's question, strictly interactive ([BUTTON], [INPUT], [TOGGLE]),
 * and free of media/preview/timestamp noise.
 * 
 * If a hallucination or mismatch is detected, attempts recovery via verified intent dictionary.
 */
export function validateSemanticTarget(
  question: string,
  rawTargetIndex: number | null,
  uiElements: string[],
  llmExplanation: string = ''
): SemanticValidationResult {
  const qLower = question.toLowerCase();

  // 1. Check for null or out-of-bounds target index
  if (rawTargetIndex === null || rawTargetIndex < 0 || rawTargetIndex >= uiElements.length) {
    const recovery = matchElderIntent(question, uiElements);
    if (recovery.highlightIndex !== null) {
      return {
        isValid: true,
        validatedIndex: recovery.highlightIndex,
        status: 'recovered_intent',
        reason: 'LLM omitted target tag or index was out of bounds; recovered via verified intent dictionary',
        originalIndex: rawTargetIndex
      };
    }
    return {
      isValid: false,
      validatedIndex: null,
      status: 'no_target',
      reason: 'No target index provided and no screen elements matched intent',
      originalIndex: rawTargetIndex
    };
  }

  const targetEl = uiElements[rawTargetIndex];
  const targetClean = cleanElementText(targetEl);

  // 2. Reject noise elements (e.g. "3 videos", "Yesterday", "10:45 AM")
  if (isNoiseElement(targetClean)) {
    const recovery = matchElderIntent(question, uiElements);
    return {
      isValid: recovery.highlightIndex !== null,
      validatedIndex: recovery.highlightIndex,
      status: recovery.highlightIndex !== null ? 'recovered_intent' : 'rejected_noise',
      reason: `LLM targeted noise element: "${targetEl}"`,
      originalIndex: rawTargetIndex
    };
  }

  // 3. Interactive Role Check
  // If user is asking for an action and LLM targeted static [TEXT]
  const isTargetActionable =
    targetClean.startsWith('[button]') ||
    targetClean.startsWith('[input]') ||
    targetClean.startsWith('[toggle]');

  if (!isTargetActionable) {
    // If target is [TEXT], check if there is an actionable element matching the intent
    const recovery = matchElderIntent(question, uiElements);
    if (recovery.highlightIndex !== null && recovery.highlightIndex !== rawTargetIndex) {
      return {
        isValid: true,
        validatedIndex: recovery.highlightIndex,
        status: 'recovered_role',
        reason: `LLM targeted static text "${targetEl}"; upgraded to actionable element "${uiElements[recovery.highlightIndex]}"`,
        originalIndex: rawTargetIndex
      };
    }
  }

  // 4. Semantic Alignment Check: Match question intent against target element
  const triggeredIntents = ELDER_INTENTS.filter((intent) =>
    intent.queryPatterns.some((pattern) => qLower.includes(pattern))
  );

  if (triggeredIntents.length > 0) {
    // Does the target element match any keyword of the triggered intents?
    const matchesIntentKeywords = triggeredIntents.some((intent) =>
      intent.elementKeywords.some((keyword) => targetClean.includes(keyword.toLowerCase()))
    );

    if (matchesIntentKeywords) {
      return {
        isValid: true,
        validatedIndex: rawTargetIndex,
        status: 'accepted',
        reason: 'Target element semantically aligns with question intent keywords',
        originalIndex: rawTargetIndex
      };
    }

    // Check universal action words (e.g. 'Proceed', 'Next', 'Continue')
    const matchesUniversal = UNIVERSAL_ACTION_KEYWORDS.some((k) => new RegExp(`\\\b${k}\\\b`, 'i').test(targetClean));
    if (matchesUniversal) {
      return {
        isValid: true,
        validatedIndex: rawTargetIndex,
        status: 'accepted',
        reason: 'Target element matches universal action/confirmation keyword',
        originalIndex: rawTargetIndex
      };
    }

    // Check direct word overlap with question (e.g. contact name or specific topic)
    const qWords = qLower.split(/[\s,._\-?!]+/).filter((w) => w.length >= 3);
    const matchesQuestionWord = qWords.some((w) => new RegExp(`\\\b${w}\\\b`, 'i').test(targetClean));

    if (matchesQuestionWord) {
      return {
        isValid: true,
        validatedIndex: rawTargetIndex,
        status: 'accepted',
        reason: 'Target element contains specific entity/keyword from question',
        originalIndex: rawTargetIndex
      };
    }

    // If intent was detected but target has zero semantic overlap -> Hallucination!
    const recovery = matchElderIntent(question, uiElements);
    if (recovery.highlightIndex !== null && recovery.highlightIndex !== rawTargetIndex) {
      return {
        isValid: true,
        validatedIndex: recovery.highlightIndex,
        status: 'recovered_intent',
        reason: `LLM targeted irrelevant element "${targetEl}"; recovered to verified intent match "${uiElements[recovery.highlightIndex]}"`,
        originalIndex: rawTargetIndex
      };
    }
  }

  // If no specific intent was triggered or it is a general question, accept target if it's actionable and not noise
  return {
    isValid: isTargetActionable,
    validatedIndex: isTargetActionable ? rawTargetIndex : null,
    status: isTargetActionable ? 'accepted' : 'no_target',
    reason: isTargetActionable ? 'General actionable element accepted' : 'Non-actionable element dropped',
    originalIndex: rawTargetIndex
  };
}
