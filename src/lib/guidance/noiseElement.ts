/**
 * Furniture detection: which lines on an elder's screen are *not* controls.
 *
 * A chat list's "📹 Video call" preview, a "3 videos" counter, a "Yesterday"
 * separator and a status bar clock all look like labels, and pointing an elder
 * at one is a failed answer even when the sentence around it is fluent. The
 * rules live here rather than inside the validator because four layers need
 * them (the validator, the scorer, the intent dictionary and the dataset
 * generator) and they used to disagree.
 *
 * The preview patterns only apply to *static* text. WhatsApp's own in-chat
 * control is labelled exactly "Video call", and once the role tag is stripped
 * the two are indistinguishable, so an element the client reports as tappable
 * is never treated as a preview.
 */

import { isActionableElement, elementLabel } from './uiElement';

const PREVIEW_ONLY_REGEXES = [
  // `u` so an emoji prefix is one character and can actually be matched:
  // without it "📹 Missed call" was never recognised as a preview at all.
  /^[📹🎥📞📱]?\s*(video call|audio call|voice call|missed call|incoming call|outgoing call)$/iu,
  /^[📹🎥📞📱]\s*$/iu,
];

const NOISE_REGEXES = [
  /\b\d+\s*(videos?|photos?|messages?|audios?|items?)\b/i,
  /\b(yesterday|today|tomorrow)\b/i,
  /\b\d{1,2}:\d{2}\s*(am|pm)?\b/i,
  /\b(am|pm)\b/i,
  /\b(sent|delivered|read|typing\.\.\.|online|last seen)\b/i,
  ...PREVIEW_ONLY_REGEXES,
];

/** The label of an element, which is what these patterns are written against. */
export function noiseLabel(elementText: string): string {
  return elementLabel(elementText).toLowerCase();
}

/**
 * True when this line is furniture rather than a control. `actionable` may be
 * supplied by a caller that already knows the role (the validator reads it off
 * the raw element, before the role tag is stripped).
 */
export function isNoiseElement(
  elementText: string,
  options: { actionable?: boolean } = {},
): boolean {
  const label = noiseLabel(elementText);
  const actionable = options.actionable ?? isActionableElement(elementText);
  const applicable = actionable
    ? NOISE_REGEXES.filter((regex) => !PREVIEW_ONLY_REGEXES.includes(regex))
    : NOISE_REGEXES;
  return applicable.some((regex) => regex.test(label));
}
