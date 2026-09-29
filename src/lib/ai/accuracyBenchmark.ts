/**
 * An offline accuracy benchmark for the guidance stack.
 *
 * Every accuracy claim in this repo used to rest on a handful of pinned
 * examples. That is enough to stop a specific bug coming back, and not enough
 * to answer the only question that matters here: *how often does the companion
 * point the elder at the right button?* This module answers it with no network,
 * no model call and no cost - the deterministic engines (fast path, intent
 * dictionary, semantic validator, confidence scorer, BM25 retrieval) are pure
 * functions of a screen and a question, so they can be scored against labelled
 * cases on every commit.
 *
 * Three numbers come out of it, and they are the ones to move:
 *
 * 1. **Deterministic accuracy / coverage.** The fast path and the intent
 *    dictionary answer *before* the model runs and their answer is delivered
 *    unchecked, so a wrong one is not repaired by anything. Precision here is a
 *    correctness metric, coverage is a latency metric (an answered question
 *    never pays for inference).
 * 2. **Verifier behaviour under perturbation.** A labelled answer is
 *    deliberately damaged - index off by one, an index that is not on the
 *    screen, a sentence naming a different element, a call-preview line - and
 *    `groundAnswer` has to repair it, refuse it, or at least flag it. This is
 *    the measurement that says whether the verifier earns its place.
 * 3. **Retrieval hit rate.** Whether the examples handed to the model are the
 *    ones about the app the elder is looking at.
 *
 * Fixtures are written the way a device sends a screen (index-prefixed,
 * role-tagged lines) and the way an elder speaks (imperative, mostly Hinglish).
 */

import { matchFastPathRule } from '@/lib/guidance/agentFastPath';
import { groundAnswer } from './answerGrounding';
import { formatRelevantFewShots } from './fewShotGrounding';
import type { GuidanceLang } from '@/lib/guidance/guidanceLanguage';
import { matchElderIntent } from '@/lib/guidance/intentDictionary';
import { isNoiseElement } from '@/lib/guidance/semanticValidator';

export interface GuidanceCase {
  id: string;
  appPackage: string;
  question: string;
  /** Screen exactly as the companion sends it. */
  elements: string[];
  /**
   * The element the elder actually needs, or null when nothing should be
   * tapped. A deterministic engine that answers a null case is a false
   * positive: it short-circuits the model and the spotlight goes somewhere
   * unrelated.
   */
  expectedIndex: number | null;
  lang?: GuidanceLang;
  /** Why the case exists, so a failure is readable without the diff. */
  note?: string;
}

export const GUIDANCE_CASES: GuidanceCase[] = [
  // --- Communication -------------------------------------------------------
  {
    id: 'whatsapp-chat-video-call',
    appPackage: 'com.whatsapp',
    question: 'Ramesh ko video call lagao',
    elements: [
      '0:[BUTTON] Navigate up',
      '1:[TEXT] Ramesh Kumar (online)',
      '2:[BUTTON] Video call',
      '3:[BUTTON] Voice call',
      '4:[BUTTON] More options',
    ],
    expectedIndex: 2,
  },
  {
    id: 'whatsapp-chat-voice-call',
    appPackage: 'com.whatsapp',
    question: 'Ramesh se baat karni hai',
    elements: [
      '0:[BUTTON] Navigate up',
      '1:[TEXT] Ramesh Kumar (online)',
      '2:[BUTTON] Video call',
      '3:[BUTTON] Voice call',
      '4:[BUTTON] More options',
    ],
    expectedIndex: 3,
  },
  {
    id: 'whatsapp-list-video-call',
    appPackage: 'com.whatsapp',
    question: 'mujhe video call karni hai',
    elements: [
      '0:[TEXT] WhatsApp',
      '1:[BUTTON] Camera',
      '2:[BUTTON] Search',
      '3:[TEXT] Chats (5 unread)',
      '4:[BUTTON] Updates',
      '5:[BUTTON] Calls',
    ],
    expectedIndex: 5,
  },
  {
    id: 'whatsapp-list-preview-is-not-the-target',
    appPackage: 'com.whatsapp',
    question: 'video call karni hai',
    elements: [
      '0:[TEXT] Chats (5 unread)',
      '1:[TEXT] 📹 Video call',
      '2:[BUTTON] Calls',
      '3:[BUTTON] New chat',
    ],
    expectedIndex: 2,
    note: 'A call preview is status text; the real control is the Calls tab. A tappable "Video call" must not be confused with it either.',
  },
  {
    id: 'whatsapp-list-new-chat',
    appPackage: 'com.whatsapp',
    question: 'naya message bhejna hai',
    elements: [
      '0:[TEXT] WhatsApp',
      '1:[BUTTON] Camera',
      '2:[BUTTON] Search',
      '3:[BUTTON] New chat',
      '4:[BUTTON] Updates',
      '5:[BUTTON] Calls',
    ],
    expectedIndex: 3,
  },
  {
    id: 'whatsapp-list-status',
    appPackage: 'com.whatsapp',
    question: 'status dekhna hai',
    elements: [
      '0:[TEXT] WhatsApp',
      '1:[BUTTON] Camera',
      '2:[BUTTON] Search',
      '3:[BUTTON] New chat',
      '4:[BUTTON] Updates',
      '5:[BUTTON] Calls',
    ],
    expectedIndex: 4,
  },
  {
    id: 'dialer-call-contact',
    appPackage: 'com.google.android.dialer',
    question: 'Amit ko phone lagao',
    elements: [
      '0:[INPUT] Search contacts',
      '1:[TEXT] Amit Beta (+91 9876543210)',
      '2:[BUTTON] Call Amit Beta',
      '3:[BUTTON] Keypad',
    ],
    expectedIndex: 2,
  },
  {
    id: 'dialer-keypad',
    appPackage: 'com.google.android.dialer',
    question: 'number dial karke call karo',
    elements: [
      '0:[TEXT] 9820112233',
      '1:[BUTTON] 1',
      '2:[BUTTON] 2',
      '3:[BUTTON] Call SIM 1',
    ],
    expectedIndex: 3,
  },
  {
    id: 'messages-read-otp',
    appPackage: 'com.google.android.apps.messaging',
    question: 'bank ka OTP dikhao',
    elements: [
      '0:[INPUT] Search conversations',
      '1:[BUTTON] SBI-UPI: OTP for Rs 500 is 839210 (Unread)',
      '2:[BUTTON] Start chat',
    ],
    expectedIndex: 1,
  },
  {
    id: 'contacts-create',
    appPackage: 'com.android.contacts',
    question: 'naya number save karo',
    elements: ['0:[INPUT] Search contacts', '1:[BUTTON] Create new contact'],
    expectedIndex: 1,
  },
  {
    id: 'messaging-block-spam',
    appPackage: 'com.google.android.apps.messaging',
    question: 'is number ko block karo',
    elements: ['0:[BUTTON] Block', '1:[BUTTON] Report spam', '2:[BUTTON] Call'],
    expectedIndex: 0,
  },

  // --- Media ---------------------------------------------------------------
  {
    id: 'youtube-search',
    appPackage: 'com.google.android.youtube',
    question: 'bhajan dhoondho',
    elements: [
      '0:[BUTTON] Cast',
      '1:[BUTTON] Notifications',
      '2:[BUTTON] Search YouTube',
      '3:[TEXT] Trending bhajan 2026',
    ],
    expectedIndex: 2,
  },
  {
    id: 'youtube-counter-is-not-the-target',
    appPackage: 'com.google.android.youtube',
    question: 'video dhoondhni hai',
    elements: ['0:[TEXT] 4 videos', '1:[BUTTON] Search YouTube', '2:[BUTTON] Shorts'],
    expectedIndex: 1,
    note: 'A "4 videos" counter is furniture, not a search button.',
  },
  {
    id: 'youtube-subscribe',
    appPackage: 'com.google.android.youtube',
    question: 'ye channel join karna hai',
    elements: [
      '0:[TEXT] Bhakti Sagar Mandir',
      '1:[BUTTON] Subscribe',
      '2:[BUTTON] Like this video',
      '3:[BUTTON] Share',
    ],
    expectedIndex: 1,
  },
  {
    id: 'photos-delete',
    appPackage: 'com.google.android.apps.photos',
    question: 'ye bekaar photo hata do',
    elements: [
      '0:[BUTTON] Share photo',
      '1:[BUTTON] Edit',
      '2:[BUTTON] Delete',
      '3:[BUTTON] More options',
    ],
    expectedIndex: 2,
  },
  {
    id: 'facebook-like',
    appPackage: 'com.facebook.katana',
    question: 'ye photo achhi lagi',
    elements: ['0:[BUTTON] Like', '1:[BUTTON] Comment', '2:[BUTTON] Share', '3:[TEXT] Ramesh and 5 others'],
    expectedIndex: 0,
  },

  // --- Money ---------------------------------------------------------------
  {
    id: 'paytm-scan-and-pay',
    appPackage: 'net.one97.paytm',
    question: 'dukan par QR scan karke paise dene hain',
    elements: [
      '0:[BUTTON] Scan & Pay any QR',
      '1:[BUTTON] To Mobile Number',
      '2:[BUTTON] To Bank A/c',
      '3:[TEXT] Flat 50 cashback',
    ],
    expectedIndex: 0,
  },
  {
    id: 'paytm-balance',
    appPackage: 'net.one97.paytm',
    question: 'khate mein kitne paise bache hain',
    elements: [
      '0:[BUTTON] Scan QR',
      '1:[BUTTON] Check Balance & History',
      '2:[BUTTON] Personal Loan',
      '3:[TEXT] My UPI ID',
    ],
    expectedIndex: 1,
  },
  {
    id: 'phonepe-electricity-bill',
    appPackage: 'com.phonepe.app',
    question: 'bijli ka bill bharna hai',
    elements: [
      '0:[BUTTON] Mobile Recharge',
      '1:[BUTTON] Electricity Bill',
      '2:[BUTTON] DTH',
      '3:[TEXT] Recharge & Pay Bills',
    ],
    expectedIndex: 1,
  },
  {
    id: 'amazon-track-order',
    appPackage: 'in.amazon.mShop.android.shopping',
    question: 'mera parcel track karo',
    elements: [
      '0:[BUTTON] Open Menu',
      '1:[INPUT] Search Amazon.in',
      '2:[BUTTON] Returns & Orders',
      '3:[BUTTON] Cart',
    ],
    expectedIndex: 2,
  },
  {
    id: 'zomato-order-food',
    appPackage: 'com.application.zomato',
    question: 'roti sabji order karni hai',
    elements: [
      '0:[INPUT] Restaurant name or a dish...',
      '1:[BUTTON] Pure Veg mode',
      '2:[BUTTON] View Cart',
      '3:[TEXT] Great Offers',
    ],
    expectedIndex: 0,
  },

  // --- Travel & health -----------------------------------------------------
  {
    id: 'irctc-pnr',
    appPackage: 'cris.org.in.prs.ima',
    question: 'ticket confirm hui ya nahi check karo',
    elements: [
      '0:[BUTTON] Train Booking',
      '1:[BUTTON] PNR Enquiry',
      '2:[BUTTON] Cancel Ticket',
      '3:[TEXT] IRCTC Official',
    ],
    expectedIndex: 1,
  },
  {
    id: 'maps-directions',
    appPackage: 'com.google.android.apps.maps',
    question: 'hospital ka rasta batao',
    elements: [
      '0:[INPUT] Search here',
      '1:[BUTTON] Directions to Hospital',
      '2:[BUTTON] Start Navigation',
      '3:[TEXT] 12 mins via Ring Road',
    ],
    expectedIndex: 1,
  },
  {
    id: 'ola-book-ride',
    appPackage: 'com.olacabs.customer',
    question: 'station ke liye auto bula do',
    elements: ['0:[INPUT] Where to go?', '1:[BUTTON] Daily Rides', '2:[BUTTON] Rentals', '3:[TEXT] Welcome back'],
    expectedIndex: 0,
  },
  {
    id: 'pharmeasy-order-medicine',
    appPackage: 'com.aranoah.healthkart.plus',
    question: 'sugar ki dawai mangwani hai',
    elements: [
      '0:[INPUT] Search medicines and health products',
      '1:[BUTTON] Consult Doctor',
      '2:[BUTTON] Lab Tests',
      '3:[BUTTON] Cart',
    ],
    expectedIndex: 0,
  },

  // --- System --------------------------------------------------------------
  {
    id: 'settings-font-size',
    appPackage: 'com.android.settings',
    question: 'akshar bade karne hain',
    elements: [
      '0:[BUTTON] Network & internet',
      '1:[BUTTON] Display & brightness (Font size, Theme)',
      '2:[BUTTON] Sound & vibration',
      '3:[TEXT] Android Version',
    ],
    expectedIndex: 1,
  },
  {
    id: 'settings-wifi',
    appPackage: 'com.android.settings',
    question: 'wifi chalu karo',
    elements: [
      '0:[BUTTON] Airplane mode',
      '1:[TOGGLE] Wi-Fi Off',
      '2:[BUTTON] Bluetooth',
      '3:[TEXT] Internet settings',
    ],
    expectedIndex: 1,
  },

  // --- English mode --------------------------------------------------------
  {
    id: 'en-whatsapp-video-call',
    appPackage: 'com.whatsapp',
    question: 'make a video call to Ramesh',
    lang: 'en',
    elements: [
      '0:[BUTTON] Navigate up',
      '1:[TEXT] Ramesh Kumar (online)',
      '2:[BUTTON] Video call',
      '3:[BUTTON] Voice call',
    ],
    expectedIndex: 2,
  },
  {
    id: 'en-paytm-balance',
    appPackage: 'net.one97.paytm',
    question: 'show my balance',
    lang: 'en',
    elements: [
      '0:[BUTTON] Scan QR',
      '1:[BUTTON] Check Balance & History',
      '2:[BUTTON] Personal Loan',
    ],
    expectedIndex: 1,
  },

  // --- Nothing to tap ------------------------------------------------------
  {
    id: 'nothing-to-tap-ok-only',
    appPackage: 'com.unknown.bankapp',
    question: 'ye screen khol do',
    elements: ['0:[BUTTON] OK', '1:[BUTTON] Cancel'],
    expectedIndex: null,
    note: 'A yes/no dialog has no "next step" button; the spotlight must not be sent to OK.',
  },
];

export interface DeterministicCaseResult {
  id: string;
  source: 'fast_path' | 'intent_dictionary' | 'unanswered';
  index: number | null;
  expectedIndex: number | null;
  correct: boolean;
}

export interface DeterministicReport {
  total: number;
  answered: number;
  correct: number;
  /** Correct / answered - the fast layers are delivered unchecked. */
  precision: number;
  /** Answered / total - the share of questions that never pay for inference. */
  coverage: number;
  /** Cases where nothing should be tapped but an engine pointed somewhere. */
  falsePositives: DeterministicCaseResult[];
  failures: DeterministicCaseResult[];
  /**
   * Questions a real element was expected for that still fall through to the
   * models. Named so the coverage number is actionable rather than a score to
   * watch: each one is a case where the deterministic layers could be taught
   * the flow for free.
   */
  unanswered: DeterministicCaseResult[];
  results: DeterministicCaseResult[];
}

/**
 * The deterministic engines as `/ask` runs them: fast path first (it wins
 * outright), then the intent dictionary.
 */
export function runDeterministic(
  cases: GuidanceCase[] = GUIDANCE_CASES,
): DeterministicReport {
  const results: DeterministicCaseResult[] = [];

  for (const testCase of cases) {
    const lang = testCase.lang ?? 'hi';
    const fastPath = matchFastPathRule(
      testCase.appPackage,
      testCase.question,
      testCase.elements,
      lang,
    );

    let source: DeterministicCaseResult['source'] = 'unanswered';
    let index: number | null = null;

    if (fastPath) {
      source = 'fast_path';
      index = fastPath.index;
    } else {
      const intent = matchElderIntent(testCase.question, testCase.elements, lang);
      if (intent.highlightIndex !== null) {
        source = 'intent_dictionary';
        index = intent.highlightIndex;
      }
    }

    results.push({
      id: testCase.id,
      source,
      index,
      expectedIndex: testCase.expectedIndex,
      correct: index !== null && index === testCase.expectedIndex,
    });
  }

  const answered = results.filter((result) => result.index !== null);
  const correct = results.filter((result) => result.correct);
  const falsePositives = results.filter(
    (result) => result.index !== null && result.expectedIndex === null,
  );
  const failures = results.filter(
    (result) =>
      result.index !== null &&
      result.expectedIndex !== null &&
      result.index !== result.expectedIndex,
  );
  const unanswered = results.filter(
    (result) => result.index === null && result.expectedIndex !== null,
  );

  return {
    total: results.length,
    answered: answered.length,
    correct: correct.length,
    precision: answered.length === 0 ? 1 : correct.length / answered.length,
    coverage: results.length === 0 ? 0 : answered.length / results.length,
    falsePositives,
    failures,
    unanswered,
    results,
  };
}

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
function spokenLabel(element: string): string {
  return element
    .replace(/^\d+:\s*/, '')
    .replace(/^\[BELOW-FOLD\]\s*/i, '')
    .replace(/^\[[^\]]*\]\s*/g, '')
    .trim();
}

/** "Yahan \"Calls\" par dabayein." - a sentence that names one element. */
function names(label: string, index: number): string {
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
function otherElementIndex(elements: string[], expected: number): number | null {
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
function noiseElementIndex(elements: string[]): number | null {
  for (let index = 0; index < elements.length; index += 1) {
    if (isNoiseElement(elements[index], { actionable: false })) return index;
  }
  return null;
}

function checkVerifierCase(
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

/**
 * Damage a labelled answer five ways and check that grounding either repairs,
 * refuses or at least flags it. Every perturbation is derived from the case
 * itself, so the benchmark grows with the fixture list.
 */
export function runVerifier(
  cases: GuidanceCase[] = GUIDANCE_CASES,
): VerifierReport {
  const results: VerifierCaseResult[] = [];

  for (const testCase of cases) {
    const expected = testCase.expectedIndex;
    if (expected === null) continue;
    const label = spokenLabel(testCase.elements[expected]);

    // 1. A correct, well-named answer must survive untouched.
    results.push(
      checkVerifierCase(testCase, 'gold', names(label, expected), expected, (result) => ({
        passed: result.targetIndex === expected && !result.contradictsTarget,
        detail: `gold answer delivered as ${result.targetIndex}`,
      }))!,
    );

    // 2. The right sentence, the wrong index: it must be repaired or flagged.
    const offByOne = expected + 1 < testCase.elements.length ? expected + 1 : expected - 1;
    if (offByOne >= 0 && offByOne !== expected) {
      results.push(
        checkVerifierCase(
          testCase,
          'off_by_one',
          names(label, offByOne),
          offByOne,
          (result) => ({
            passed: result.targetIndex === expected || result.contradictsTarget,
            detail:
              result.targetIndex === expected
                ? 'repaired to the named element'
                : `delivered ${result.targetIndex} (expected ${expected}) without flagging it`,
          }),
        )!,
      );
    }

    // 3. An index that is not on the screen must never be delivered.
    results.push(
      checkVerifierCase(testCase, 'out_of_bounds', names(label, 99), 99, (result) => ({
        passed:
          result.targetIndex === null ||
          (result.targetIndex >= 0 && result.targetIndex < testCase.elements.length),
        detail: `out-of-bounds 99 delivered as ${result.targetIndex}`,
      }))!,
    );

    // 4. A sentence naming a different control than it points at is the way a
    //    model is confidently wrong; it has to be flagged.
    const other = otherElementIndex(testCase.elements, expected);
    if (other !== null) {
      results.push(
        checkVerifierCase(
          testCase,
          'names_other_element',
          names(spokenLabel(testCase.elements[other]), expected),
          expected,
          (result) => ({
            passed: result.contradictsTarget,
            detail: `naming "${spokenLabel(testCase.elements[other])}" while pointing at ${expected}${
              result.contradictsTarget ? ' was flagged' : ' went unflagged'
            }`,
          }),
        )!,
      );
    }

    // 5. Furniture is not a control, even when the model targets it.
    const noiseIndex = noiseElementIndex(testCase.elements);
    if (noiseIndex !== null && noiseIndex !== expected) {
      results.push(
        checkVerifierCase(
          testCase,
          'noise_target',
          names(spokenLabel(testCase.elements[noiseIndex]), noiseIndex),
          noiseIndex,
          (result) => ({
            passed: result.targetIndex !== noiseIndex,
            detail: `furniture element ${noiseIndex} delivered as ${result.targetIndex}`,
          }),
        )!,
      );
    }
  }

  const kinds: PerturbationKind[] = [
    'gold',
    'off_by_one',
    'out_of_bounds',
    'names_other_element',
    'noise_target',
  ];
  const kindReports = kinds
    .map((kind) => {
      const forKind = results.filter((result) => result.kind === kind);
      const passed = forKind.filter((result) => result.passed);
      return {
        kind,
        total: forKind.length,
        passed: passed.length,
        rate: forKind.length === 0 ? 1 : passed.length / forKind.length,
        failures: forKind.filter((result) => !result.passed),
      };
    })
    .filter((report) => report.total > 0);

  const passed = results.filter((result) => result.passed).length;

  return {
    total: results.length,
    passed,
    rate: results.length === 0 ? 1 : passed / results.length,
    kinds: kindReports,
    repaired: results.filter(
      (result) => result.kind === 'off_by_one' && result.targetIndex !== result.rawTargetIndex,
    ).length,
    flagged: results.filter((result) => result.contradictsTarget).length,
  };
}

export interface RetrievalCaseResult {
  caseId: string;
  appPackage: string;
  top1: boolean;
  top3: boolean;
  seen: string[];
}

export interface RetrievalReport {
  total: number;
  top1: number;
  top3: number;
  top1Rate: number;
  top3Rate: number;
  failures: RetrievalCaseResult[];
}

/**
 * Whether the examples handed to the model are about the app on screen. The
 * corpus is small and curated, so this measures *ranking*, not generalisation:
 * a regression that lets a WhatsApp example outrank an IRCTC one for a PNR
 * question shows up here immediately.
 */
export function runRetrieval(
  cases: GuidanceCase[] = GUIDANCE_CASES,
): RetrievalReport {
  const results: RetrievalCaseResult[] = cases.map((testCase) => {
    const block = formatRelevantFewShots(
      testCase.appPackage,
      testCase.question,
      3,
      testCase.lang ?? 'hi',
    );
    const seen = block
      .split('\n\n')
      .map((entry) => entry.split('\n')[0].replace(/^Example \d+ \((.*)\):$/, '$1'));
    const matches = (entry: string | undefined) =>
      entry !== undefined &&
      (entry.includes(testCase.appPackage) || testCase.appPackage.includes(entry));
    return {
      caseId: testCase.id,
      appPackage: testCase.appPackage,
      top1: matches(seen[0]),
      top3: seen.some(matches),
      seen,
    };
  });

  const top1 = results.filter((result) => result.top1).length;
  const top3 = results.filter((result) => result.top3).length;

  return {
    total: results.length,
    top1,
    top3,
    top1Rate: results.length === 0 ? 1 : top1 / results.length,
    top3Rate: results.length === 0 ? 1 : top3 / results.length,
    failures: results.filter((result) => !result.top3),
  };
}

export interface BenchmarkReport {
  deterministic: DeterministicReport;
  verifier: VerifierReport;
  retrieval: RetrievalReport;
}

export function runGuidanceBenchmark(
  cases: GuidanceCase[] = GUIDANCE_CASES,
): BenchmarkReport {
  return {
    deterministic: runDeterministic(cases),
    verifier: runVerifier(cases),
    retrieval: runRetrieval(cases),
  };
}

/**
 * Regression floors, measured and then set just below what the stack achieves
 * (`npm run bench:guidance` prints the live numbers). They are deliberately not
 * set to 1: a benchmark that can only ever pass or fail on day one stops being
 * useful the first time a fixture is added.
 */
export const BENCHMARK_THRESHOLDS = {
  deterministicPrecision: 0.95,
  deterministicCoverage: 0.65,
  verifierGoldSurvival: 0.95,
  verifierOverall: 0.9,
  retrievalTop1: 0.9,
};

/** A printable report, so the CLI script and the tests share one format. */
export function formatBenchmarkReport(report: BenchmarkReport): string {
  const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const lines: string[] = [];

  const { deterministic, verifier, retrieval } = report;

  lines.push('SaralGati guidance accuracy benchmark');
  lines.push('='.repeat(60));
  lines.push(
    `cases: ${deterministic.total} | deterministic: ${deterministic.correct}/${deterministic.answered} ` +
      `answered correct (precision ${percent(deterministic.precision)}), ` +
      `coverage ${percent(deterministic.coverage)}`,
  );
  lines.push(
    `verifier: ${verifier.passed}/${verifier.total} perturbations handled (${percent(verifier.rate)}), ` +
      `${verifier.repaired} repaired, ${verifier.flagged} flagged`,
  );
  for (const kind of verifier.kinds) {
    lines.push(`  - ${kind.kind.padEnd(20)} ${kind.passed}/${kind.total} (${percent(kind.rate)})`);
  }
  lines.push(
    `retrieval: top-1 ${percent(retrieval.top1Rate)} | top-3 ${percent(retrieval.top3Rate)}`,
  );

  if (deterministic.failures.length > 0) {
    lines.push('');
    lines.push('Deterministic misses (delivered unchecked, so each one is a wrong answer):');
    for (const failure of deterministic.failures) {
      lines.push(
        `  - ${failure.id}: got ${failure.index}, expected ${failure.expectedIndex} (${failure.source})`,
      );
    }
  }
  if (deterministic.falsePositives.length > 0) {
    lines.push('');
    lines.push('Deterministic false positives (nothing should have been spotlighted):');
    for (const failure of deterministic.falsePositives) {
      lines.push(`  - ${failure.id}: pointed at ${failure.index} (${failure.source})`);
    }
  }
  if (deterministic.unanswered.length > 0) {
    lines.push('');
    lines.push('Still unanswered (a real element exists, but only the models can find it):');
    for (const gap of deterministic.unanswered) {
      lines.push(`  - ${gap.id}: expected ${gap.expectedIndex}`);
    }
  }
  const verifierFailures = verifier.kinds.flatMap((kind) => kind.failures);
  if (verifierFailures.length > 0) {
    lines.push('');
    lines.push('Verifier misses:');
    for (const failure of verifierFailures) {
      lines.push(`  - ${failure.caseId} [${failure.kind}]: ${failure.detail}`);
    }
  }
  if (retrieval.failures.length > 0) {
    lines.push('');
    lines.push('Retrieval misses (no example for the app on screen in the top 3):');
    for (const failure of retrieval.failures) {
      lines.push(`  - ${failure.caseId}: ${failure.appPackage} | got ${failure.seen.join(', ')}`);
    }
  }

  return lines.join('\n');
}
