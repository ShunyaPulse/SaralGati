import { type FewShotExample } from './examples';

/**
 * Retrieval for the few-shot block.
 *
 * This used to be a raw "how many words overlap" count, which is the textbook
 * weak retriever: every word counted the same whether it was distinctive or
 * noise, and a long example accumulated matches just by being long. It is now
 * **BM25** - the standard sparse retrieval ranking (Robertson & Zaragoza), and
 * the same ranking that powered two decades of production search engines - with
 * term saturation, document-length normalisation and inverse document
 * frequency. A rare, distinctive word such as "bijli" or "AnyDesk" moves an
 * example to the top; "hai" or "photo" (which appears in many examples) does
 * not. It is free, deterministic, and needs no embedding endpoint.
 *
 * The document indexed per example is the screen (question + element labels +
 * category) and *not* the answer: retrieving by answer wording pulls in the
 * examples that merely phrase a sentence like the query, which is exactly the
 * wrong reason to show a model a grounding example.
 */

/** Standard BM25 constants: k1 saturates term frequency, b normalises length. */
const BM25_K1 = 1.2;
const BM25_B = 0.75;

/** Additive prior for "this example is from the app the elder is looking at". */
export const APP_PACKAGE_PRIOR = 3;

/** Hinglish + English stop-words: they carry no retrieval signal. */
const STOP_WORDS = new Set([
  "hai",
  "hain",
  "ho",
  "ka",
  "ki",
  "ke",
  "ko",
  "se",
  "karo",
  "kar",
  "kaise",
  "karni",
  "karna",
  "mein",
  "par",
  "aur",
  "wala",
  "wali",
  "kya",
  "mujhe",
  "mera",
  "meri",
  "yeh",
  "ye",
  "is",
  "us",
  "the",
  "for",
  "and",
  "how",
  "this",
  "that",
  "you",
  "your",
  "with",
  "from",
  "can",
]);

/** Latin + Devanagari word characters; everything else is a separator. */
const RETRIEVAL_TOKEN_SPLITTER = /[^a-z0-9\u0900-\u097F]+/;

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(RETRIEVAL_TOKEN_SPLITTER)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

/** The searchable text of one worked example. */
export function exampleDocument(example: FewShotExample): string[] {
  return tokenize(
    [example.question, example.category, ...example.elements].join(" "),
  );
}

/**
 * BM25 score of one query against a small corpus. Plain arrays rather than a
 * reusable index because the corpus is 21 lines long: this runs in microseconds
 * on every request, which is why the retrieval upgrade is free.
 */
export function bm25(query: string[], documents: string[][]): number[] {
  const total = documents.length;
  const documentFrequencies = new Map<string, number>();
  const termFrequencies = documents.map((document) => {
    const frequencies = new Map<string, number>();
    for (const term of document) {
      frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
    }
    for (const term of frequencies.keys()) {
      documentFrequencies.set(term, (documentFrequencies.get(term) ?? 0) + 1);
    }
    return frequencies;
  });
  const averageLength =
    documents.reduce((sum, document) => sum + document.length, 0) /
    Math.max(1, total);

  return documents.map((document, index) => {
    const frequencies = termFrequencies[index];
    let score = 0;
    for (const term of new Set(query)) {
      const frequency = frequencies.get(term) ?? 0;
      if (frequency === 0) continue;
      const documentFrequency = documentFrequencies.get(term) ?? 0;
      // BM25's probabilistic idf, with the +0.5 smoothing that keeps a term
      // appearing in every example from scoring negative.
      const idf = Math.log(
        1 + (total - documentFrequency + 0.5) / (documentFrequency + 0.5),
      );
      const lengthNorm =
        1 - BM25_B + (BM25_B * document.length) / (averageLength || 1);
      score +=
        idf *
        ((frequency * (BM25_K1 + 1)) / (frequency + BM25_K1 * lengthNorm));
    }
    return score;
  });
}
