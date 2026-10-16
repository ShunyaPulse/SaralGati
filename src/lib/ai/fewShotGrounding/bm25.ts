import { type FewShotExample } from './examples';

/**
 * SOTA Hybrid Retrieval for the Few-Shot Grounding Block:
 * 1. **BM25+ (Lv & Zhai, CIKM 2011)** with lower-bounding parameter δ = 1.0 so
 *    long screen descriptions with many UI elements do not unfairly penalize
 *    single-term matches.
 * 2. **Hinglish Phonetic Canonicalization** (`CANONICAL_HINGLISH_MAP`) so common
 *    Romanized Hindi spelling variations spoken/typed by Indian elders
 *    (e.g. "bijlee" vs "bijli", "vedeo" vs "video", "balence" vs "balance",
 *    "dawai" vs "dawa") map to a unified lexical token.
 * 3. **Character Trigram (3-gram) Subword Jaccard Fallback** so typo-heavy elder
 *    queries (e.g. "electrcity", "whatsap", "bhajn") still retrieve the matching
 *    app/intent example in microseconds with zero external embedding latency.
 */

/** Standard BM25+ constants: k1 saturates term frequency, b normalises length, delta lower-bounds TF. */
const BM25_K1 = 1.2;
const BM25_B = 0.75;
const BM25_DELTA = 1.0;

/** Subword character-trigram similarity threshold and weight for typo resilience. */
const SUBWORD_MIN_JACCARD = 0.45;
const SUBWORD_WEIGHT = 0.65;

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

/**
 * Phonetic & morphological equivalences across Hinglish / elder typing.
 * Maps common variants to the canonical token used in examples.
 */
const CANONICAL_HINGLISH_MAP: Record<string, string> = {
  bijlee: "bijli",
  bijali: "bijli",
  vidyut: "bijli",
  vedeo: "video",
  vidio: "video",
  vidoe: "video",
  mesage: "message",
  massage: "message",
  msg: "message",
  msj: "message",
  balence: "balance",
  balans: "balance",
  dawai: "dawa",
  dawaai: "dawa",
  davai: "dawa",
  medicin: "medicine",
  penseon: "pension",
  penshan: "pension",
  khata: "khate",
  khaata: "khate",
  khaate: "khate",
  paisey: "paise",
  paisa: "paise",
  recharj: "recharge",
  richarge: "recharge",
  tikat: "ticket",
  tiket: "ticket",
  docter: "doctor",
  daktar: "doctor",
  ফোন: "phone",
  fone: "phone",
};

/** Latin + Devanagari word characters; everything else is a separator. */
const RETRIEVAL_TOKEN_SPLITTER = /[^a-z0-9\u0900-\u097F]+/;

export function canonicalizeToken(token: string): string {
  return CANONICAL_HINGLISH_MAP[token] ?? token;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(RETRIEVAL_TOKEN_SPLITTER)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
    .map(canonicalizeToken);
}

/** Character 3-grams of a token for typo-resilient subword matching. */
function charTrigrams(token: string): Set<string> {
  const padded = `^${token}$`;
  const grams = new Set<string>();
  for (let i = 0; i <= padded.length - 3; i += 1) {
    grams.add(padded.slice(i, i + 3));
  }
  return grams;
}

/** Jaccard similarity between two character trigram sets (0 to 1). */
function trigramJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const gram of a) {
    if (b.has(gram)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/** The searchable text of one worked example. */
export function exampleDocument(example: FewShotExample): string[] {
  return tokenize(
    [example.question, example.category, ...example.elements].join(" "),
  );
}

/**
 * Hybrid BM25+ score with character-trigram subword fallback against a small corpus.
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

  const uniqueQueryTerms = [...new Set(query)];
  const queryTrigrams = new Map<string, Set<string>>();
  for (const term of uniqueQueryTerms) {
    if (term.length >= 4) {
      queryTrigrams.set(term, charTrigrams(term));
    }
  }

  return documents.map((document, index) => {
    const frequencies = termFrequencies[index];
    let score = 0;
    for (const term of uniqueQueryTerms) {
      const frequency = frequencies.get(term) ?? 0;
      if (frequency > 0) {
        const documentFrequency = documentFrequencies.get(term) ?? 0;
        const idf = Math.log(
          1 + (total - documentFrequency + 0.5) / (documentFrequency + 0.5),
        );
        const lengthNorm =
          1 - BM25_B + (BM25_B * document.length) / (averageLength || 1);
        // BM25+ lower-bounded TF saturation (+ BM25_DELTA)
        score +=
          idf *
          ((frequency * (BM25_K1 + 1)) / (frequency + BM25_K1 * lengthNorm) +
            BM25_DELTA);
        continue;
      }

      // Subword fallback for typo-heavy tokens (>= 4 chars)
      const qGrams = queryTrigrams.get(term);
      if (!qGrams) continue;

      let bestSim = 0;
      let matchedDocTerm: string | null = null;
      for (const docTerm of frequencies.keys()) {
        if (docTerm.length < 4 || Math.abs(docTerm.length - term.length) > 2) {
          continue;
        }
        const sim = trigramJaccard(qGrams, charTrigrams(docTerm));
        if (sim > bestSim) {
          bestSim = sim;
          matchedDocTerm = docTerm;
        }
      }

      if (bestSim >= SUBWORD_MIN_JACCARD && matchedDocTerm) {
        const df = documentFrequencies.get(matchedDocTerm) ?? 1;
        const idf = Math.log(1 + (total - df + 0.5) / (df + 0.5));
        score += idf * bestSim * SUBWORD_WEIGHT;
      }
    }
    return score;
  });
}
