import { FlowStep, MultiStepFlowDefinition } from './types';
import { COMMUNICATION_PLAYBOOKS } from './communication';
import { FINANCE_UPI_PLAYBOOKS } from './finance_upi';
import { HEALTH_MEDICAL_PLAYBOOKS } from './health_medical';
import { TRAVEL_TRANSIT_PLAYBOOKS } from './travel_transit';
import { ECOMMERCE_FOOD_PLAYBOOKS } from './ecommerce_food';
import { SYSTEM_ACCESSIBILITY_PLAYBOOKS } from './system_accessibility';
import { GOVERNMENT_DEVOTION_PLAYBOOKS } from './government_devotion';

export * from './types';

export const ALL_PLAYBOOKS: MultiStepFlowDefinition[] = [
  ...COMMUNICATION_PLAYBOOKS,
  ...FINANCE_UPI_PLAYBOOKS,
  ...HEALTH_MEDICAL_PLAYBOOKS,
  ...TRAVEL_TRANSIT_PLAYBOOKS,
  ...ECOMMERCE_FOOD_PLAYBOOKS,
  ...SYSTEM_ACCESSIBILITY_PLAYBOOKS,
  ...GOVERNMENT_DEVOTION_PLAYBOOKS,
];

// O(1) lookup by flowId
const PLAYBOOK_BY_ID = new Map<string, MultiStepFlowDefinition>();
for (const pb of ALL_PLAYBOOKS) {
  PLAYBOOK_BY_ID.set(pb.id, pb);
}

const STOP_WORDS = new Set([
  'ka', 'ki', 'ke', 'ko', 'me', 'mein', 'se', 'par', 'karo', 'karna', 'kar',
  'do', 'de', 'hai', 'hain', 'ho', 'kijiye', 'ye', 'wo', 'apna', 'apni', 'aur',
  'kahan', 'kab', 'kisko', 'ek', 'to', 'the', 'a', 'an', 'in', 'on', 'at', 'for',
  'liye', 'mera', 'meri', 'mere', 'kya'
]);

const GENERIC_VERBS = new Set([
  'check', 'dekhna', 'dekho', 'kholo', 'open', 'batao', 'chalao', 'karo', 'karna'
]);

function stemHindi(word: string): string {
  if (word.length <= 3) return word;
  return word.replace(/(wana|wao|ao|na|ne|ni|ye|yo|o|e|i|a)$/, '');
}

function extractKeyTokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,._\-?!/\\()]+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

function tokenMatches(t1: string, t2: string): boolean {
  if (t1 === t2) return true;
  if (t1.startsWith(t2) || t2.startsWith(t1)) return true;
  const s1 = stemHindi(t1);
  const s2 = stemHindi(t2);
  if (s1.length >= 3 && s2.length >= 3 && (s1 === s2 || s1.startsWith(s2) || s2.startsWith(s1))) {
    return true;
  }
  return false;
}

// Inverted keyword index for fast candidate pre-filtering
const INVERTED_TOKEN_INDEX = new Map<string, MultiStepFlowDefinition[]>();

for (const pb of ALL_PLAYBOOKS) {
  const seenTokens = new Set<string>();
  for (const pattern of pb.triggerPatterns) {
    const tokens = extractKeyTokens(pattern);
    for (const token of tokens) {
      const stem = stemHindi(token);
      if (!seenTokens.has(stem)) {
        seenTokens.add(stem);
        const list = INVERTED_TOKEN_INDEX.get(stem) || [];
        list.push(pb);
        INVERTED_TOKEN_INDEX.set(stem, list);
      }
    }
  }
}

/**
 * Retrieve a playbook by its unique ID in O(1) time.
 */
export function getPlaybookById(id: string): MultiStepFlowDefinition | undefined {
  return PLAYBOOK_BY_ID.get(id);
}

/**
 * Find the most relevant playbook for a given user question.
 * Uses exact substring matching, inverted token indexing, and Hindi/Hinglish morphological stemming.
 */
export function findMatchingPlaybook(question: string): MultiStepFlowDefinition | null {
  if (!question) return null;
  const qLower = question.toLowerCase().trim();

  // 1. Direct exact substring match (highest precision)
  for (const pb of ALL_PLAYBOOKS) {
    if (pb.triggerPatterns.some((pattern) => qLower.includes(pattern.toLowerCase()))) {
      return pb;
    }
  }

  // 2. Token-level matching with inverted index pre-filtering
  const qTokens = extractKeyTokens(qLower);
  if (qTokens.length === 0) return null;

  // Filter candidates through inverted token index
  const candidateSet = new Set<MultiStepFlowDefinition>();
  for (const token of qTokens) {
    const stem = stemHindi(token);
    const list = INVERTED_TOKEN_INDEX.get(stem);
    if (list) {
      for (const pb of list) candidateSet.add(pb);
    }
  }

  const candidatePool = candidateSet.size > 0 ? Array.from(candidateSet) : ALL_PLAYBOOKS;

  let bestMatch: MultiStepFlowDefinition | null = null;
  let maxScore = 0;

  for (const pb of candidatePool) {
    for (const pattern of pb.triggerPatterns) {
      const pTokens = extractKeyTokens(pattern);
      if (pTokens.length === 0) continue;

      let matchedCount = 0;
      let nonGenericMatches = 0;

      for (const pt of pTokens) {
        if (qTokens.some((qt) => tokenMatches(qt, pt))) {
          matchedCount++;
          if (!GENERIC_VERBS.has(pt)) {
            nonGenericMatches++;
          }
        }
      }

      if (matchedCount >= 2 && nonGenericMatches >= 1) {
        // Multi-token match with at least one substantive noun/subject
        const score = matchedCount * 10 + (matchedCount / pTokens.length) * 5;
        if (score > maxScore) {
          maxScore = score;
          bestMatch = pb;
        }
      } else if (pTokens.length === 1 && matchedCount === 1 && !GENERIC_VERBS.has(pTokens[0])) {
        // Distinctive single keyword
        const score = 8;
        if (score > maxScore) {
          maxScore = score;
          bestMatch = pb;
        }
      }
    }
  }

  return bestMatch;
}
