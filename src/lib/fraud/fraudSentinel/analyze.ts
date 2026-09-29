/**
 * Autonomous Anti-Fraud Sentinel - the real-time scam shield for SaralGati.
 *
 * The Android companion sends the text it already sees (UI labels, message or
 * notification bodies, URLs, the elder's question) and gets back exactly one
 * JSON verdict the overlay can act on.
 *
 * Deliberately a deterministic rule ensemble rather than an LLM call: a scam
 * screen is a safety event, so it must be judged in milliseconds, keep working
 * when the models or network are down, and be reproducible for logs and tests.
 * Scam wording is repetitive ("OTP batao", "PIN daalo to receive money",
 * "AnyDesk install karo"), so patterns cover it well.
 *
 * Rules run per *fragment* (one UI element / message / URL), so urgency cannot
 * leak from one line into another and every trigger stays traceable to the
 * element the overlay should block. Only the direct theft vectors (OTP_THEFT,
 * PAYMENT_FRAUD, REMOTE_ACCESS) may reach CRITICAL; the rest cap at DANGEROUS,
 * so a loud advertisement never freezes the phone the way an OTP request does.
 */

import type { GuidanceLang } from '@/lib/guidance/guidanceLanguage';

import { ALERT_COPY } from './alertCopy';
import { SAFE_ESCAPE, SAFE_WARNING, URGENCY } from './patterns';
import {
  CATEGORY_PRIORITY,
  CATEGORY_SEVERITY_CAP,
  RULES,
  type FraudRule,
} from './rules';
import type {
  FraudSentinelInput,
  FraudSentinelVerdict,
  SentinelAction,
  SentinelFragment,
  ThreatCategory,
  ThreatLevel,
} from './types';

const MAX_FRAGMENT_CHARS = 4000;
const MAX_TRIGGERS = 12;
const MAX_TRIGGER_SNIPPET = 60;

function normalizeText(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Split the input into independently-judged fragments and remember where each
 * one came from, so a verdict can name the element to block.
 */
export function collectFragments(input: FraudSentinelInput): SentinelFragment[] {
  const fragments: SentinelFragment[] = [];

  const pushLines = (value: unknown, elementIndex: number | null) => {
    if (typeof value !== 'string') return;
    for (const line of value.split(/\r?\n/)) {
      const text = normalizeText(line).slice(0, MAX_FRAGMENT_CHARS);
      if (text) fragments.push({ text, elementIndex });
    }
  };

  for (const [index, element] of (input.ui_elements ?? []).entries()) {
    pushLines(element, index);
  }
  pushLines(input.screen_text, null);
  for (const message of input.messages ?? []) {
    pushLines(message, null);
  }
  for (const url of input.urls ?? []) {
    pushLines(url, null);
  }
  pushLines(input.question, null);

  return fragments;
}

/**
 * Remove courtesy warnings from a fragment. Only the warning verb phrase is
 * dropped, not the whole sentence: "kisi ko na batao... ab OTP batao" must keep
 * the second, real request visible.
 */
function stripSafeWarnings(text: string): string {
  return text
    .replace(/do not share[^.!?]*/g, ' ')
    .replace(/don'?t share[^.!?]*/g, ' ')
    .replace(/never share[^.!?]*/g, ' ')
    .replace(/not share[^.!?]*/g, ' ')
    .replace(/kisi ko (na|mat) [^.!?]*/g, ' ')
    .replace(/share na karein[^.!?]*/g, ' ')
    .replace(/किसी को न बताएं|किसी को न बताओ|साझा न करें|शेयर न करें/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface RuleMatch {
  rule: FraudRule;
  severity: number;
  snippet: string;
  elementIndex: number | null;
}

function matchesRule(fragment: SentinelFragment, rule: FraudRule): string | null {
  const text = rule.ignoreSafeWarnings ? stripSafeWarnings(fragment.text) : fragment.text;
  if (!text) return null;

  if (rule.requires && !rule.requires.every((pattern) => pattern.test(text))) {
    return null;
  }
  if (rule.requiresAny && !rule.requiresAny.some((pattern) => pattern.test(text))) {
    return null;
  }
  for (const pattern of rule.patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

function truncateSnippet(snippet: string): string {
  const clean = snippet.replace(/\s+/g, ' ').trim();
  return clean.length > MAX_TRIGGER_SNIPPET
    ? `${clean.slice(0, MAX_TRIGGER_SNIPPET - 1)}…`
    : clean;
}

/** Strongest occurrence of each rule, keyed by rule id. */
function matchFragments(fragments: SentinelFragment[]): RuleMatch[] {
  const matches = new Map<string, RuleMatch>();

  for (const fragment of fragments) {
    const urgent = URGENCY.test(fragment.text);

    for (const rule of RULES) {
      const snippet = matchesRule(fragment, rule);
      if (!snippet) continue;

      // Severity 1-2 rules include "never share this OTP" reminders, so an
      // explicit warning inside the same fragment clears them. Share / receive
      // *requests* are never cleared by that phrase - a scam often fakes it.
      if (rule.severity <= 2 && SAFE_WARNING.test(fragment.text)) continue;

      let severity: number = rule.severity;
      if (urgent && severity >= 2) severity += 1;
      severity = Math.min(severity, CATEGORY_SEVERITY_CAP[rule.category]);

      const existing = matches.get(rule.id);
      if (!existing || severity > existing.severity) {
        matches.set(rule.id, { rule, severity, snippet, elementIndex: fragment.elementIndex });
      }
    }
  }

  return [...matches.values()];
}

/** Which rules fire for one input. Exported so tests can pin rule-level detail. */
export function matchFraudRules(input: FraudSentinelInput): RuleMatch[] {
  return matchFragments(collectFragments(input));
}

/** Highest capped severity reached by each category. */
function scoreByCategory(matches: RuleMatch[]): Map<Exclude<ThreatCategory, 'NONE'>, number> {
  const scores = new Map<Exclude<ThreatCategory, 'NONE'>, number>();
  for (const match of matches) {
    scores.set(match.rule.category, Math.max(scores.get(match.rule.category) ?? 0, match.severity));
  }
  return scores;
}

/** Winning category and severity, or null when nothing matched. */
function pickPrimaryCategory(
  scores: Map<Exclude<ThreatCategory, 'NONE'>, number>,
): { category: Exclude<ThreatCategory, 'NONE'>; severity: number } | null {
  let winner: { category: Exclude<ThreatCategory, 'NONE'>; severity: number } | null = null;

  for (const category of CATEGORY_PRIORITY) {
    const severity = scores.get(category) ?? 0;
    if (severity > (winner?.severity ?? 0)) {
      winner = { category, severity };
    }
  }

  return winner;
}

/** The one table mapping a detection's severity to the level and the action. */
function decide(severity: number, killSession: boolean): { level: ThreatLevel; action: SentinelAction } {
  if (severity >= 4) {
    return { level: 'CRITICAL', action: killSession ? 'KILL_SESSION' : 'BLOCK_AND_INTERCEPT' };
  }
  if (severity === 3) return { level: 'DANGEROUS', action: 'BLOCK_AND_INTERCEPT' };
  return { level: 'SUSPICIOUS', action: 'SHOW_WARNING' };
}

/** A clean screen is judged confidently; a detection scales with its severity. */
const SAFE_CONFIDENCE = 0.9;

function computeConfidence(severity: number, triggerCount: number): number {
  const raw = 0.55 + 0.1 * severity + 0.03 * Math.max(0, triggerCount - 1);
  return Math.min(0.98, Math.round(raw * 100) / 100);
}

/** First element the elder can press to escape, or null when none is visible. */
function findSafeActionIndex(
  uiElements: string[],
  blockedIndex: number | null,
): number | null {
  for (const [index, element] of uiElements.entries()) {
    if (index === blockedIndex) continue;
    if (SAFE_ESCAPE.test(normalizeText(element))) return index;
  }
  return null;
}

/** The ALLOW verdict, also used for an empty input: never a crash, never a guess. */
function safeVerdict(fragmentCount: number, elementCount: number): FraudSentinelVerdict {
  const copy = ALERT_COPY.NONE;
  return {
    threat_level: 'SAFE',
    threat_category: 'NONE',
    confidence: SAFE_CONFIDENCE,
    detected_triggers: [],
    action_decision: {
      action: 'ALLOW',
      target_element_to_block: null,
      safe_action_index: null,
      safe_advice: copy.safe_advice,
      safe_advice_hi: copy.safe_advice_hi,
    },
    user_alert: {
      title: copy.title,
      title_en: copy.title_en,
      message_en: copy.message_en,
      message_hi: copy.message_hi,
    },
    risk_reasoning: `No fraud rule fired across ${fragmentCount} fragment(s) (${elementCount} screen element(s)).`,
  };
}

/**
 * The verdict. Deterministic: identical input always produces identical JSON,
 * which is what lets the companion cache/dedupe warnings and lets tests pin
 * every category.
 */
export function analyzeForFraud(input: FraudSentinelInput): FraudSentinelVerdict {
  const uiElements = input.ui_elements ?? [];
  const fragments = collectFragments(input);
  const matches = matchFragments(fragments);
  const scores = scoreByCategory(matches);
  const primary = pickPrimaryCategory(scores);

  if (!primary) return safeVerdict(fragments.length, uiElements.length);

  // Two independent trap families on one screen is the classic "distraction"
  // scam script, so it is worth one extra notch - capped like everything else.
  const activeCategories = [...scores.values()].filter((severity) => severity >= 2).length;
  const severity = Math.min(
    primary.severity + (activeCategories >= 2 ? 1 : 0),
    CATEGORY_SEVERITY_CAP[primary.category],
  );

  // KILL_SESSION is reserved for rules that catch a theft mid-flight (a PIN
  // being entered, a remote-control code being shared).
  const killSession = matches.some(
    (match) => match.rule.killSession === true && match.severity >= 4,
  );
  const { level, action } = decide(severity, killSession);
  const copy = ALERT_COPY[primary.category];

  // Block the element with the strongest evidence; free text stays un-targeted
  // because there is nothing for the overlay to paint.
  const elementMatches = matches
    .filter((match): match is RuleMatch & { elementIndex: number } => match.elementIndex !== null)
    .sort((a, b) => b.severity - a.severity || a.elementIndex - b.elementIndex);
  const targetElementToBlock = elementMatches[0]?.elementIndex ?? null;
  const safeActionIndex = findSafeActionIndex(uiElements, targetElementToBlock);

  const triggers = matches
    .sort((a, b) => b.severity - a.severity)
    .slice(0, MAX_TRIGGERS)
    .map((match) => `${match.rule.category}: ${match.rule.label} ("${truncateSnippet(match.snippet)}")`);

  const detail = [...scores.entries()]
    .map(([category, value]) => `${category}=${value}`)
    .join(', ');

  return {
    threat_level: level,
    threat_category: primary.category,
    confidence: computeConfidence(severity, triggers.length),
    detected_triggers: triggers,
    action_decision: {
      action,
      target_element_to_block: targetElementToBlock,
      safe_action_index: safeActionIndex,
      safe_advice: copy.safe_advice,
      safe_advice_hi: copy.safe_advice_hi,
    },
    user_alert: {
      title: copy.title,
      title_en: copy.title_en,
      message_en: copy.message_en,
      message_hi: copy.message_hi,
    },
    risk_reasoning: [
      `Matched ${matches.length} rule(s): ${detail}`,
      `primary ${primary.category} severity ${severity} -> ${level}`,
      activeCategories >= 2 ? `multi-category escalation (${activeCategories} families)` : null,
      killSession ? 'session kill selected' : null,
      targetElementToBlock !== null ? `block element #${targetElementToBlock}` : null,
      safeActionIndex !== null ? `safe element #${safeActionIndex}` : null,
    ]
      .filter(Boolean)
      .join('; '),
  };
}

/**
 * Whether /api/v1/agent/ask should stop and warn instead of guiding the elder
 * through the screen. SUSPICIOUS stays advisory - it is attached to the normal
 * answer rather than replacing it - because e.g. a legitimate UPI PIN screen
 * must still be explainable.
 */
export function shouldInterceptFraud(verdict: FraudSentinelVerdict): boolean {
  return verdict.threat_level === 'DANGEROUS' || verdict.threat_level === 'CRITICAL';
}

/**
 * The line the elder sees and hears when the sentinel intercepts. Devanagari is
 * deliberate: it is the script every Hindi TTS engine pronounces correctly.
 */
export function sentinelExplanation(
  verdict: FraudSentinelVerdict,
  lang: GuidanceLang = 'hi',
): string {
  return lang === 'en'
    ? verdict.user_alert.message_en
    : verdict.user_alert.message_hi;
}

/** Ordering used by escalation: a verdict may only ever move up this scale. */
const LEVEL_RANK: Record<ThreatLevel, number> = {
  SAFE: 0,
  SUSPICIOUS: 1,
  DANGEROUS: 2,
  CRITICAL: 3,
};

/**
 * Raise a deterministic verdict on a second opinion - strictly one way.
 *
 * A level at or below the current verdict is ignored and the original object is
 * returned untouched, so a model can never talk the sentinel out of a warning it
 * already decided on. Alert copy, the action and the safe-exit lookup stay in
 * this module, so an escalated verdict reads exactly like a rule-driven one to
 * the elder, and the reason for the escalation is appended to the audit trail
 * instead of being invented as a new response field.
 */
export function escalateFraudVerdict(
  verdict: FraudSentinelVerdict,
  escalation: {
    level: ThreatLevel;
    category: Exclude<ThreatCategory, 'NONE'>;
    reasoning: string;
    source: string;
  },
  uiElements: string[] = [],
): FraudSentinelVerdict {
  // Only theft vectors may reach CRITICAL - the same table the rules answer to.
  const level =
    escalation.level === 'CRITICAL' &&
    CATEGORY_SEVERITY_CAP[escalation.category] < 4
      ? 'DANGEROUS'
      : escalation.level;

  if (LEVEL_RANK[level] <= LEVEL_RANK[verdict.threat_level]) return verdict;

  const copy = ALERT_COPY[escalation.category];
  // KILL_SESSION stays reserved for a rule that caught a theft mid-flight, so an
  // opinion alone can never kill the elder's session.
  const action: SentinelAction =
    level === 'SUSPICIOUS' ? 'SHOW_WARNING' : 'BLOCK_AND_INTERCEPT';
  const safeActionIndex =
    verdict.action_decision.safe_action_index ??
    findSafeActionIndex(uiElements, verdict.action_decision.target_element_to_block);

  // Corroboration by two independent systems counts like one extra rule.
  const opinionSeverity = level === 'CRITICAL' ? 4 : level === 'DANGEROUS' ? 3 : 2;

  return {
    threat_level: level,
    threat_category: escalation.category,
    confidence: Math.max(
      verdict.confidence,
      computeConfidence(opinionSeverity, verdict.detected_triggers.length + 1),
    ),
    detected_triggers: [
      ...verdict.detected_triggers.slice(0, MAX_TRIGGERS - 1),
      `SECOND_OPINION (${escalation.source}): ${level}/${escalation.category} ` +
        `("${truncateSnippet(escalation.reasoning)}")`,
    ],
    action_decision: {
      action,
      target_element_to_block: verdict.action_decision.target_element_to_block,
      safe_action_index: safeActionIndex,
      safe_advice: copy.safe_advice,
      safe_advice_hi: copy.safe_advice_hi,
    },
    user_alert: {
      title: copy.title,
      title_en: copy.title_en,
      message_en: copy.message_en,
      message_hi: copy.message_hi,
    },
    risk_reasoning:
      `${verdict.risk_reasoning}; second opinion (${escalation.source}) raised the ` +
      `verdict to ${level}/${escalation.category}: ${escalation.reasoning}`,
  };
}
