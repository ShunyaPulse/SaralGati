import crypto from "crypto";
import type { GuidanceLang } from "./guidanceLanguage";

/**
 * The Redis key for one screen's answer.
 *
 * Two routes build it: `/api/v1/agent/ask` reads and writes it, and
 * `/api/v1/agent/feedback` promotes a verified answer into it or evicts a bad
 * one. They must agree byte for byte, or the learning loop silently writes to a
 * key nobody reads.
 *
 * The language is part of the key: an answer written for a Hindi elder is not
 * an answer for an English one, and a shared key was exactly why choosing
 * "Everything in English" still spoke Hindi from cache.
 *
 * `historyHash` is only known to the ask route (the elder's conversation
 * history is part of the question's identity), so a promotion made from
 * feedback is only visible to follow-up questions that carried no history.
 */

/** The question normalisation both routes share before hashing. */
export function normalizeScreenQuestion(question: string): string {
  return question
    .trim()
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * List index, folding marker and role tag are control data, never spoken. The
 * index is stripped first: the companion's own format is `3:[BUTTON] Calls`, so
 * a leading `3:` would otherwise stop every other anchor from matching.
 */
function cleanElementLabel(elementLabel: string): string {
  return elementLabel
    .replace(/^\d+:\s*/, "")
    .replace(/^\[BELOW-FOLD\]\s*/i, "")
    .replace(/^\[[^\]]*\]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

/**
 * The spoken line for a *corrected* answer - the one the elder reached by
 * tapping a different button than the model suggested.
 *
 * A correction used to be cached with the generic placeholder "Tap here.",
 * which names nothing: the elder then hears a sentence that would fit any button
 * on any screen, for the next 30 days, on every phone that shares the screen.
 * Quoting the element's own label back is free, deterministic, and turns the
 * correction into an answer about the button the elder actually chose. The
 * placeholder remains only for an index the client no longer reports.
 */
export function correctionExplanation(params: {
  elementLabel: string | null | undefined;
  lang: GuidanceLang;
}): string {
  const label = cleanElementLabel(params.elementLabel ?? "");
  if (!label) return params.lang === "en" ? "Tap here." : "Yahan dabayein.";
  return params.lang === "en"
    ? `Tap "${label}" here.`
    : `Yahan "${label}" par dabayein.`;
}

export function screenCacheKey(params: {
  lang: GuidanceLang;
  appPackage: string;
  screenHash: string;
  normalizedQuestion: string;
  /** "" (or omitted) when the question carried no conversation history. */
  historyHash?: string;
}): string {
  const raw = `${params.lang}:${params.appPackage}:${params.screenHash}:${params.normalizedQuestion}${params.historyHash ?? ""}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return `screen_cache:${hash}`;
}
