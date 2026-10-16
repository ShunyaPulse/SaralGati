/**
 * UI Tree Pruner for Elder Companion screen hierarchies.
 * 
 * Objectives:
 * 1. Reduce LLM prompt token consumption by 60-70% for sub-1.5s inference.
 * 2. Strictly preserve client indices [origIdx] so LLM TARGET references remain 100% accurate.
 * 3. Keep all actionable elements ([BUTTON], [INPUT], [TOGGLE]).
 * 4. Filter out status bar noise (battery %, signal, carrier names), timestamps, and preview message counters.
 * 5. Retain query-relevant keywords and top screen titles, while deduplicating repeated static [TEXT] lines.
 */

import { elementLabel, elementLabelLower, isActionableElement } from './uiElement';

const LEADING_INDEX_PATTERN = /^(?:\[\d+\]:?|\d+:)\s*/;

/** Pre-compiled combined noise regexes to avoid 6 separate regex evaluations per element. */
const NOISE_GENERAL_RE =
  /\b\d+\s*(?:videos?|photos?|messages?|audios?)\b|\b(?:yesterday|am|pm|today|\d{1,2}:\d{2})\b|\b(?:\d+%\s*battery|wi-?fi|volte|lte|4g|5g|signal)\b|^(?:am|pm)$/i;
const NOISE_CALL_PREVIEW_RE =
  /^[📹🎥📞📱]?\s*(?:video call|audio call|voice call|missed call|incoming call|outgoing call)$|^[📹🎥📞📱]\s*$/iu;

export function stripLeadingElementIndex(text: string): string {
  return text.trim().replace(LEADING_INDEX_PATTERN, '').trim();
}

export function isNoiseUIElement(text: string): boolean {
  const clean = elementLabel(text);
  return NOISE_GENERAL_RE.test(clean) || NOISE_CALL_PREVIEW_RE.test(clean);
}

export function pruneUITree(
  uiElements: string[],
  question?: string
): { formattedString: string; prunedCount: number; originalCount: number } {
  if (!uiElements || uiElements.length === 0) {
    return { formattedString: '', prunedCount: 0, originalCount: 0 };
  }

  const questionKeywords = question
    ? question
        .toLowerCase()
        .replace(/[^\w\s\u0900-\u097F]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    : [];

  const kept: string[] = [];
  const seenStaticLabels = new Set<string>();

  uiElements.forEach((el, idx) => {
    const normalized = stripLeadingElementIndex(el);
    if (!normalized) return;

    const isActionable = isActionableElement(normalized);

    // 1. Actionable buttons, inputs, toggles: ALWAYS keep (never prune or deduplicate buttons)
    if (isActionable) {
      kept.push(`[${idx}] ${normalized}`);
      return;
    }

    // 2. Static text filtering.
    if (isNoiseUIElement(normalized)) return;

    const lower = elementLabelLower(normalized);
    // Deduplicate identical static [TEXT] labels so repeated status badges do not bloat LLM tokens
    if (seenStaticLabels.has(lower)) return;

    // Retain if relevant to elder's query
    const matchesKeyword = questionKeywords.some((kw) => lower.includes(kw));

    // Retain top headers / title elements (usually first 3-4 text elements)
    const isTopHeader = idx < 4 && normalized.length < 60;

    if (matchesKeyword || isTopHeader) {
      seenStaticLabels.add(lower);
      kept.push(`[${idx}] ${normalized}`);
    }
  });

  // Fallback safeguard: if aggressive pruning removed too much, fallback to all elements
  const resultElements = kept.length > 0
    ? kept
    : uiElements.map((el, idx) => `[${idx}] ${stripLeadingElementIndex(el)}`);

  return {
    formattedString: resultElements.join('\n'),
    prunedCount: uiElements.length - resultElements.length,
    originalCount: uiElements.length,
  };
}
