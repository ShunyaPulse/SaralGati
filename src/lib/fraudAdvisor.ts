/**
 * Second opinion for the anti-fraud sentinel, served by the fine-tuned LoRA.
 *
 * The deterministic rules stay authoritative and always run first. This module
 * only ever *raises* a verdict, and only when the rules were demonstrably unsure
 * (SUSPICIOUS, a DANGEROUS verdict resting on a single rule, or a SAFE screen
 * that still looks scam-shaped). That is what gives the fraud half of the
 * self-learning flywheel a production consumer: the flywheel captures labelled
 * cases in `fraud_training_cases`, `/api/v1/agent/training-data?type=fraud`
 * exports them, the Kaggle pipeline trains them into the adapter, and this
 * advisor asks that adapter the exact same question production asks.
 *
 * The system prompt and the user payload below are deliberately identical to
 * what the training export emits - if they drift, the adapter stops helping.
 *
 * The advisor is optional at runtime: with no Cloudflare credentials, on a slow
 * model, or on any malformed reply, it returns nothing and the elder gets the
 * deterministic verdict.
 */

import { z } from 'zod';

import {
  analyzeForFraud,
  escalateFraudVerdict,
  matchFraudRules,
  type FraudSentinelInput,
  type FraudSentinelVerdict,
  type ThreatCategory,
  type ThreatLevel,
} from './fraudSentinel';

/**
 * The prompt the fraud analyst was trained with. Exported so the training-data
 * export and this advisor can never drift apart - the adapter is only useful
 * here because production sends the identical prompt.
 */
export const FRAUD_ANALYST_SYSTEM_PROMPT = `You are SaralGati's anti-fraud analyst for Indian elders.
You receive the visible signals of one Android screen or message batch: UI element labels, URLs, SMS/notification text and the elder's question.
Classify the threat into exactly one level (SAFE, SUSPICIOUS, DANGEROUS, CRITICAL) and one category among OTP_THEFT, PAYMENT_FRAUD, REMOTE_ACCESS, PHISHING_IMPERSONATION, MALVERTISING, MALICIOUS_APK, PRIVACY_RISK, NONE.
Rules: receiving money never needs a UPI PIN or OTP; only theft vectors (OTP theft, payment fraud, remote access, malicious APK) may reach CRITICAL; never mark a screen DANGEROUS on a single weak keyword when a benign explanation exists.
Respond ONLY with JSON: {"threat_level":"...","threat_category":"...","risk_reasoning":"one short sentence"}.`;

/** How long the polling companion waits before falling back to the rules. */
export const ADVISOR_TIMEOUT_MS = 3000;

/**
 * The interactive paths (/ask, /explain) have a sub-second budget and an elder
 * waiting on spoken guidance, so a stalled model must not hold the answer back.
 * The rules have already decided by then - the advisor only sharpens them.
 */
export const INTERACTIVE_ADVISOR_TIMEOUT_MS = 900;

/** Below this much visible text there is no signal worth a model call. */
const MIN_ADVISOR_CHARS = 12;

/**
 * Scam-shaped surface the rules did not match: a link, an APK, a secret, a
 * panic verb. A clean screen that still carries one of these is exactly the
 * case the rules are known to miss, so it is worth a second opinion.
 */
const RISK_SURFACE =
  /https?:\/\/|\.apk\b|\botp\b|\bupi\b|\bpin\b|\bkyc\b|anydesk|teamviewer|quick support|lottery|prize|refund|unlock|suspend|\bblocked\b|\bverify\b|ओटीपी|पिन|केवाईसी|लॉटरी|इनाम|खाता/;

const advisorVerdictSchema = z.object({
  threat_level: z.enum(['SAFE', 'SUSPICIOUS', 'DANGEROUS', 'CRITICAL']),
  threat_category: z.enum([
    'OTP_THEFT',
    'PAYMENT_FRAUD',
    'REMOTE_ACCESS',
    'PHISHING_IMPERSONATION',
    'MALVERTISING',
    'MALICIOUS_APK',
    'PRIVACY_RISK',
    'NONE',
  ]),
  risk_reasoning: z.string().min(1).max(400),
});

export interface FraudSecondOpinion {
  level: ThreatLevel;
  category: Exclude<ThreatCategory, 'NONE'>;
  reasoning: string;
  /** Model or adapter that answered, kept in the verdict's audit trail. */
  source: string;
}

/** Everything the model is allowed to see, in the training export's own order. */
function advisorText(input: FraudSentinelInput): string {
  return [
    input.question,
    input.screen_text,
    ...(input.messages ?? []),
    ...(input.ui_elements ?? []),
    ...(input.urls ?? []),
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join('\n');
}

/**
 * The exact user payload the training export emits for a fraud case, so the
 * adapter sees production input in the same shape it was trained on.
 */
export function buildFraudAdvisorInput(input: FraudSentinelInput): string {
  return JSON.stringify({
    app_package: input.app_package ?? null,
    signals: {
      question: input.question ?? '',
      ui_elements: input.ui_elements ?? [],
      messages: input.messages ?? [],
      urls: input.urls ?? [],
      screen_text: input.screen_text ?? '',
    },
  });
}

/**
 * Whether a verdict is uncertain enough to be worth a second opinion. CRITICAL
 * and multi-rule DANGEROUS verdicts are already decisive, and a plain SAFE
 * screen with no scam-shaped surface never pays for a model call.
 */
export function needsSecondOpinion(
  verdict: FraudSentinelVerdict,
  input: FraudSentinelInput,
): boolean {
  if (verdict.threat_level === 'CRITICAL') return false;
  if (verdict.threat_level === 'SUSPICIOUS') return true;
  if (verdict.threat_level === 'DANGEROUS') {
    return matchFraudRules(input).length <= 1;
  }
  const text = advisorText(input);
  return (
    text.length >= MIN_ADVISOR_CHARS && RISK_SURFACE.test(text.toLowerCase())
  );
}

/** Model replies are prose-wrapped often enough to be worth a defensive strip. */
function extractJson(text: string): string {
  const fenced = text.replace(/```(?:json)?/gi, '').trim();
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  return start >= 0 && end > start ? fenced.slice(start, end + 1) : fenced;
}

/**
 * Ask the fine-tuned LoRA for its own read on the screen. Returns null whenever
 * the advisor is unavailable or its answer cannot be trusted - never throws,
 * because a scam shield must not depend on a model being reachable.
 */
export async function getFraudSecondOpinion(
  verdict: FraudSentinelVerdict,
  input: FraudSentinelInput,
  timeoutMs: number = ADVISOR_TIMEOUT_MS,
): Promise<FraudSecondOpinion | null> {
  if (!needsSecondOpinion(verdict, input)) return null;

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const loraName = process.env.CLOUDFLARE_LORA_NAME;
  if (!accountId || !apiToken || !loraName) return null;

  const baseModel =
    process.env.CLOUDFLARE_BASE_MODEL || '@cf/meta/llama-3.1-8b-instruct-fast';

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${baseModel}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: FRAUD_ANALYST_SYSTEM_PROMPT },
            { role: 'user', content: buildFraudAdvisorInput(input) },
          ],
          lora: loraName,
          max_tokens: 160,
          temperature: 0,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      },
    );

    if (!response.ok) {
      console.warn(`[Fraud Advisor] Cloudflare returned ${response.status}.`);
      return null;
    }

    const result = await response.json();
    const text =
      result?.result?.response ?? result?.result?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) return null;

    const parsed = advisorVerdictSchema.safeParse(
      JSON.parse(extractJson(text)),
    );
    if (!parsed.success) {
      console.warn('[Fraud Advisor] Unusable model output ignored.');
      return null;
    }
    // A raised level with no category has no alert copy to show, so it is not a
    // usable escalation.
    if (parsed.data.threat_category === 'NONE') return null;

    return {
      level: parsed.data.threat_level,
      category: parsed.data.threat_category,
      reasoning: parsed.data.risk_reasoning.trim(),
      source: `${loraName} (second opinion)`,
    };
  } catch (error) {
    console.warn(
      '[Fraud Advisor] second opinion unavailable:',
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * The sentinel production actually calls: deterministic rules, plus a one-way
 * second opinion. Always resolves to a usable verdict.
 */
export async function analyzeForFraudWithAdvisor(
  input: FraudSentinelInput,
  options: { timeoutMs?: number } = {},
): Promise<FraudSentinelVerdict> {
  const verdict = analyzeForFraud(input);

  let advice: FraudSecondOpinion | null = null;
  try {
    advice = await getFraudSecondOpinion(
      verdict,
      input,
      options.timeoutMs ?? ADVISOR_TIMEOUT_MS,
    );
  } catch {
    advice = null;
  }
  if (!advice) return verdict;

  const escalated = escalateFraudVerdict(
    verdict,
    advice,
    input.ui_elements ?? [],
  );
  if (escalated !== verdict) {
    console.warn(
      `[Fraud Advisor] escalated ${verdict.threat_level}/${verdict.threat_category} ` +
        `to ${escalated.threat_level}/${escalated.threat_category}: ${advice.reasoning}`,
    );
  }
  return escalated;
}
