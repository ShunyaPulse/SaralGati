import type { GuidanceLang } from "@/lib/guidance/guidanceLanguage";
import { CRISP_FEW_SHOT_EXAMPLES, type FewShotExample } from "./examples";
import { APP_PACKAGE_PRIOR, bm25, exampleDocument, tokenize } from "./bm25";

/**
 * The few-shot grounding block handed to the models, and how its examples are
 * chosen.
 *
 * The corpus itself lives in `examples.ts` (a data change should not mean
 * editing retrieval code) and the BM25 ranking in `bm25.ts` (ranking is the
 * part worth reading on its own). This file keeps what the prompt actually
 * gets: the formatter, and the selector that ranks the corpus per request.
 *
 * The public API is unchanged: `formatRelevantFewShots`, `formatAll20FewShots`
 * and, re-exported below, `CRISP_FEW_SHOT_EXAMPLES` / `FewShotExample`.
 */

export { CRISP_FEW_SHOT_EXAMPLES };
export type { FewShotExample };

/**
 * Dynamically formats and selects the most relevant few-shot grounding examples.
 * Prioritizes matching appPackage and intent, keeping prompt concise (~250-350 tokens).
 */
export function formatRelevantFewShots(
  appPackage?: string,
  question?: string,
  count: number = 4,
  lang: GuidanceLang = "hi",
): string {
  const pkgLower = (appPackage || "").toLowerCase();

  const documents = CRISP_FEW_SHOT_EXAMPLES.map(exampleDocument);
  const query = tokenize(question || "");
  const scores = bm25(query, documents);

  const scored = CRISP_FEW_SHOT_EXAMPLES.map((example, index) => {
    const samePackage =
      pkgLower.length > 0 &&
      (example.appPackage.includes(pkgLower) ||
        pkgLower.includes(example.appPackage));
    return {
      example,
      score: scores[index] + (samePackage ? APP_PACKAGE_PRIOR : 0),
    };
  });

  // Stable sort: equal scores keep the curated order (example 1 first).
  scored.sort((a, b) => b.score - a.score);

  // Take top N examples
  const selected = scored.slice(0, count).map((s) => s.example);

  return selected
    .map(
      (ex, i) =>
        `Example ${i + 1} (${ex.appPackage}):
Screen:
${ex.elements.map((el) => `  ${el}`).join("\n")}
Question: "${ex.question}"
Answer: ${answerFor(ex, lang)}`,
    )
    .join("\n\n");
}

/**
 * Returns all 20 few-shot grounding examples formatted.
 */
export function formatAll20FewShots(lang: GuidanceLang = "hi"): string {
  return CRISP_FEW_SHOT_EXAMPLES.map(
    (ex, i) =>
      `Example ${i + 1} (${ex.appPackage}):
Screen:
${ex.elements.map((el) => `  ${el}`).join("\n")}
Question: "${ex.question}"
Answer: ${answerFor(ex, lang)}`,
  ).join("\n\n");
}

/** The example answer in the elder's language; the examples set the reply language. */
function answerFor(example: FewShotExample, lang: GuidanceLang): string {
  return lang === "en" ? example.responseEn : example.response;
}
