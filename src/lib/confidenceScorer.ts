import { ELDER_INTENTS } from './intentDictionary';
import { isNoiseElement } from './semanticValidator';

export interface ConfidenceScore {
  score: number; // 0 to 100
  targetIndex: number | null;
  reasons: string[];
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
  uiElements: string[] = []
): ConfidenceScore {
  let score = 0;
  const reasons: string[] = [];

  const targetMatch = output.match(/TARGET:\s*(\d+)/i);
  if (!targetMatch) {
    return {
      score: 20,
      targetIndex: null,
      reasons: ['No TARGET tag found in output']
    };
  }

  const targetIndex = parseInt(targetMatch[1], 10);

  // 1. Bounds Check
  if (uiElements.length > 0) {
    if (targetIndex < 0 || targetIndex >= uiElements.length) {
      return {
        score: 10,
        targetIndex,
        reasons: ['TARGET index is out of screen bounds']
      };
    }
    score += 35;
    reasons.push('Valid in-bounds target index (+35)');

    const targetEl = uiElements[targetIndex];
    const cleanEl = targetEl
      .replace(/^\d+:\s*/, '')
      .replace(/^\[below-fold\]\s*/i, '')
      .trim();
    const lowerClean = cleanEl.toLowerCase();

    // 2. Noise Check: Penalize targeting preview counters or timestamps
    if (isNoiseElement(lowerClean)) {
      score -= 35;
      reasons.push('Targeted noise element (timestamps/counters) (-35)');
    }

    // 3. Interactive Role Check
    const isActionable =
      cleanEl.startsWith('[BUTTON]') ||
      cleanEl.startsWith('[INPUT]') ||
      cleanEl.startsWith('[TOGGLE]');

    if (isActionable) {
      score += 30;
      reasons.push('Target is an interactive actionable element (+30)');
    } else {
      score -= 15;
      reasons.push('Target is static non-clickable text (-15)');
    }

    // 4. Intent Semantic Alignment Check
    const qLower = question.toLowerCase();
    const matchingIntents = ELDER_INTENTS.filter((intent) =>
      intent.queryPatterns.some((pattern) => {
        const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?:^|[\\s,.\\-?!])${escapedPattern}(?:[\\s,.\\-?!]|$)`, 'i');
        return regex.test(qLower) || qLower === pattern;
      })
    );

    if (matchingIntents.length > 0) {
      const intentMatches = matchingIntents.some((intent) =>
        intent.elementKeywords.some((k) => lowerClean.includes(k.toLowerCase()))
      );

      if (intentMatches) {
        score += 25;
        reasons.push('Target matches question intent keywords (+25)');
      } else {
        const qWords = qLower.split(/[\s,._\-?!]+/).filter((w) => w.length >= 3);
        const wordMatch = qWords.some((w) => lowerClean.includes(w));
        if (wordMatch) {
          score += 15;
          reasons.push('Target matches query specific entity (+15)');
        }
      }
    } else {
      score += 15;
    }

    // 5. Explanation internal consistency
    const cleanExplanation = output.replace(/TARGET:\s*\d+/i, '').trim().toLowerCase();
    const commonActionVerbs = ['कॉल', 'दबाएं', 'भेजें', 'खोजें', 'पे', 'pay', 'call', 'search'];
    if (commonActionVerbs.some((v) => cleanExplanation.includes(v))) {
      score += 10;
      reasons.push('Explanation contains clear Hinglish action instruction (+10)');
    }
  } else {
    score = 50;
    if (targetMatch) score += 30;
  }

  const normalizedScore = Math.max(0, Math.min(100, score));

  return {
    score: normalizedScore,
    targetIndex,
    reasons
  };
}
