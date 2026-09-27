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
