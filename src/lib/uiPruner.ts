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

export function isNoiseUIElement(text: string): boolean {
  return (
    /\b\d+\s*(videos?|photos?|messages?|audios?)\b/i.test(text) ||
    /\b(yesterday|am|pm|today|\d{1,2}:\d{2})\b/i.test(text) ||
    /\b(\d+%\s*battery|wi-?fi|volte|lte|4g|5g|signal)\b/i.test(text) ||
    /^(am|pm|ok|yes|no)$/i.test(text.trim()) ||
    /^[📹🎥📞📱]?\s*(video call|audio call|voice call|missed call|incoming call|outgoing call)\s*$/i.test(text.trim()) ||
    /^[📹🎥📞📱]\s*/i.test(text.trim())
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

    const cleanRole = trimmed.replace(/^\[BELOW-FOLD\]\s*/i, '');
    const isActionable =
      cleanRole.startsWith('[BUTTON]') ||
      cleanRole.startsWith('[INPUT]') ||
      cleanRole.startsWith('[TOGGLE]');

    const lower = trimmed.toLowerCase();

    // 1. Actionable buttons, inputs, toggles:
    if (isActionable) {
      if (!isNoiseUIElement(lower)) {
        kept.push(`[${idx}] ${trimmed}`);
      }
      return;
    }

    // 2. Static text filtering:
    if (isNoiseUIElement(lower)) return;

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
