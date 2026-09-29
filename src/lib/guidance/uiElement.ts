/**
 * One place that knows how to read a screen element.
 *
 * The companion sends elements as `"[BUTTON] Calls"`, while the flywheel asks
 * its scenario generator for `"[3] [BUTTON] Calls"` so the prompt numbering is
 * explicit. Every layer that parsed elements itself used a prefix-anchored
 * regex (`/^\[BUTTON\]/`), which is correct for the first format and silently
 * wrong for the second: a real button read as static text, a message preview
 * read as a control, a noise guard that never fired. That is invisible at
 * runtime - the fast path simply degrades to a worse element - and it feeds
 * wrong labels into training, so it is worth one shared parser with tests
 * rather than five private regexes.
 *
 * Accepted shapes (all equivalent):
 *   "[BUTTON] Calls"
 *   "[3] [BUTTON] Calls"
 *   "3:[BUTTON] Calls"
 *   "[BELOW-FOLD] [BUTTON] Calls"  (optionally with either index form)
 */

/** Roles the accessibility service emits, in its own vocabulary. */
export type ElementRole = 'BUTTON' | 'INPUT' | 'TOGGLE' | 'TEXT';

const ROLE_PATTERN = /^\[(BUTTON|INPUT|TOGGLE|TEXT)\]/i;
/** "[3] " or "3:" or "[3]: " prefixes, and the below-fold marker. */
const PREFIX_PATTERN = /^(?:\[\d+\]|\d+:)\s*/;
const BELOW_FOLD_PATTERN = /^\[BELOW-FOLD\]\s*/i;

/** The string with its index prefix and folding marker removed. */
export function stripElementPrefix(element: string): string {
  let rest = element.trim();
  // The folding marker may sit before or after the index.
  for (let pass = 0; pass < 3; pass += 1) {
    const next = rest
      .replace(PREFIX_PATTERN, '')
      .replace(BELOW_FOLD_PATTERN, '');
    if (next === rest) break;
    rest = next;
  }
  return rest.trim();
}

/** The element's role, or null when the line carries no role tag. */
export function elementRole(element: string): ElementRole | null {
  const match = ROLE_PATTERN.exec(stripElementPrefix(element));
  return match ? (match[1].toUpperCase() as ElementRole) : null;
}

/** True when the client told us this element accepts a tap or typing. */
export function isActionableElement(element: string): boolean {
  const role = elementRole(element);
  return role === 'BUTTON' || role === 'INPUT' || role === 'TOGGLE';
}

/** True when the element is plain, non-interactive text. */
export function isStaticTextElement(element: string): boolean {
  return elementRole(element) === 'TEXT';
}

/** The spoken label: no index, no folding marker, no role tag. */
export function elementLabel(element: string): string {
  return stripElementPrefix(element).replace(ROLE_PATTERN, '').trim();
}

/** The label lower-cased, which is what every matcher compares. */
export function elementLabelLower(element: string): string {
  return elementLabel(element).toLowerCase();
}
