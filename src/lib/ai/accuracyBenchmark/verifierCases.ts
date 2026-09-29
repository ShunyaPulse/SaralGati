import { groundAnswer } from '../answerGrounding';
import { isNoiseElement } from '@/lib/guidance/semanticValidator';
import type { GuidanceCase } from './fixtures';

/**
 * The verifier half of the benchmark: the ways a labelled answer is damaged,
 * and the helpers that build those damaged answers out of a case.
 *
 * `runVerifier` in `index.ts` scores them; everything here is a pure function of
 * the case it is handed, which is what lets the damage be derived from the
 * fixture instead of hand-written per case.
 */

export type PerturbationKind =
  | 'gold'
  | 'off_by_one'
  | 'out_of_bounds'
  | 'names_other_element'
  | 'noise_target';

export interface VerifierCaseResult {
  caseId: string;
  kind: PerturbationKind;
  /** What the verifier says the spotlight should be. */
  targetIndex: number | null;
  /** What the damaged answer asked for. */
  rawTargetIndex: number | null;
  contradictsTarget: boolean;
  passed: boolean;
  /** Why it passed or failed, for the failure report. */
  detail: string;
}

export interface VerifierKindReport {
  kind: PerturbationKind;
  total: number;
  passed: number;
  rate: number;
  failures: VerifierCaseResult[];
}

export interface VerifierReport {
  total: number;
  passed: number;
  rate: number;
  kinds: VerifierKindReport[];
  /** Wrong indices that grounding repaired back to the right element. */
  repaired: number;
  /** Wrong indices that were flagged as contradicting their own sentence. */
  flagged: number;
}

/** Element text without the list index and role tag, for building a sentence. */
export function spokenLabel(element: string): string {
  return element
    .replace(/^\d+:\s*/, '')
    .replace(/^\[BELOW-FOLD\]\s*/i, '')
    .replace(/^\[[^\]]*\]\s*/g, '')
    .trim();
}

/** "Yahan \"Calls\" par dabayein." - a sentence that names one element. */
export function names(label: string, index: number): string {
  return `Yahan "${label}" par dabayein. TARGET:${index}`;
}

/** The four-letter stem of a word, so "contacts" and "contact" compare equal. */
function stem(word: string): string {
  return word.slice(0, 4);
}

/** Words a sentence could use to name this element. */
function labelStems(element: string): Set<string> {
  return new Set(
    spokenLabel(element)
      .toLowerCase()
      .split(/[^a-z0-9\u0900-\u097F]+/)
      .filter((word) => word.length >= 3)
      .map(stem),
  );
}

/**
 * The other element a damaged sentence can name, or null when there is none.
 *
 * A candidate is skipped when it cannot be named in a sentence at all (a bare
 * keypad digit, whose label is one character), and when it shares a word with
 * the labelled target: naming it is not a contradiction, because "Search
 * contacts" against "Create new contact" is the same word, and no rule that
 * reads the sentence could ever tell the two apart. Asserting a flag there would
 * be asserting a false positive.
 */
export function otherElementIndex(elements: string[], expected: number): number | null {
  const targetStems = labelStems(elements[expected]);
  for (let index = 0; index < elements.length; index += 1) {
    if (index === expected) continue;
    const stripped = elements[index].replace(/^\d+:\s*/, '');
    if (!/^\[(BUTTON|INPUT|TOGGLE)\]/i.test(stripped)) continue;
    const stems = labelStems(elements[index]);
    if (stems.size === 0) continue;
    if ([...stems].some((word) => targetStems.has(word))) continue;
    return index;
  }
  return null;
}

/** The first element on the screen that is furniture rather than a control. */
export function noiseElementIndex(elements: string[]): number | null {
  for (let index = 0; index < elements.length; index += 1) {
    if (isNoiseElement(elements[index], { actionable: false })) return index;
  }
  return null;
}

export function checkVerifierCase(
  testCase: GuidanceCase,
  kind: PerturbationKind,
  text: string,
  rawTargetIndex: number | null,
  passes: (result: ReturnType<typeof groundAnswer>) => { passed: boolean; detail: string },
): VerifierCaseResult | null {
  if (rawTargetIndex === null) return null;
  const result = groundAnswer({
    text,
    question: testCase.question,
    uiElements: testCase.elements,
    lang: testCase.lang ?? 'hi',
  });
  const verdict = passes(result);
  return {
    caseId: testCase.id,
    kind,
    targetIndex: result.targetIndex,
    rawTargetIndex: result.rawTargetIndex,
    contradictsTarget: result.contradictsTarget,
    passed: verdict.passed,
    detail: verdict.detail,
  };
}
