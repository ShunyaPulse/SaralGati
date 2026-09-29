/**
 * UI Tree Pruner for Elder Companion screen hierarchies.
 * 
 * Objectives:
 * 1. Reduce LLM prompt token consumption by 60-70% for sub-1.5s inference.
 * 2. Strictly preserve client indices [origIdx] so LLM TARGET references remain 100% accurate.
 * 3. Keep all actionable elements ([BUTTON], [INPUT], [TOGGLE]).
 * 4. Filter out status bar noise (battery %, signal, carrier names), timestamps, and preview message counters.
 * 5. Retain query-relevant keywords and top screen titles.
 */

import { elementLabel, elementLabelLower, isActionableElement } from './uiElement';

export function isNoiseUIElement(text: string): boolean {
  // The label, not the raw line: an index prefix or a role tag in front of a
  // timestamp used to stop these patterns from matching at all.
  const clean = elementLabel(text);
  return (
    /\b\d+\s*(videos?|photos?|messages?|audios?)\b/i.test(clean) ||
    /\b(yesterday|am|pm|today|\d{1,2}:\d{2})\b/i.test(clean) ||
    /\b(\d+%\s*battery|wi-?fi|volte|lte|4g|5g|signal)\b/i.test(clean) ||
    /^(am|pm)$/i.test(clean) ||
    // `u` so an emoji prefix is one character and can actually be matched.
    /^[📹🎥📞📱]?\s*(video call|audio call|voice call|missed call|incoming call|outgoing call)$/iu.test(clean) ||
    /^[📹🎥📞📱]\s*$/iu.test(clean)
  );
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

  uiElements.forEach((el, idx) => {
    const trimmed = el.trim();
    if (!trimmed) return;

    const isActionable = isActionableElement(trimmed);

    const lower = elementLabelLower(trimmed);

    // 1. Actionable buttons, inputs, toggles: ALWAYS keep (never prune buttons like OK, Yes, No)
    if (isActionable) {
      kept.push(`[${idx}] ${trimmed}`);
      return;
    }

    // 2. Static text filtering. An element the client called tappable is never
    //    furniture, so a real "Video call" button survives the preview patterns.
    if (!isActionable && isNoiseUIElement(trimmed)) return;

    // Retain if relevant to elder's query
    const matchesKeyword = questionKeywords.some((kw) => lower.includes(kw));

    // Retain top headers / title elements (usually first 3-4 text elements)
    const isTopHeader = idx < 4 && trimmed.length < 60;

    if (matchesKeyword || isTopHeader) {
      kept.push(`[${idx}] ${trimmed}`);
    }
  });

  // Fallback safeguard: if aggressive pruning removed too much, fallback to all elements
  const resultElements = kept.length > 0
    ? kept
    : uiElements.map((el, idx) => `[${idx}] ${el}`);

  return {
    formattedString: resultElements.join('\n'),
    prunedCount: uiElements.length - resultElements.length,
    originalCount: uiElements.length,
  };
}
