/**
 * The shapes the anti-fraud sentinel speaks in. Kept apart from the engine so
 * the rule pack, the alert copy and the engine can all agree on them without
 * importing each other.
 */

export type ThreatLevel = 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS' | 'CRITICAL';

export type ThreatCategory =
  | 'NONE'
  | 'OTP_THEFT'
  | 'PAYMENT_FRAUD'
  | 'REMOTE_ACCESS'
  | 'PHISHING_IMPERSONATION'
  | 'MALVERTISING'
  | 'MALICIOUS_APK'
  | 'PRIVACY_RISK';

export type SentinelAction =
  | 'ALLOW'
  | 'SHOW_WARNING'
  | 'BLOCK_AND_INTERCEPT'
  | 'KILL_SESSION';

/**
 * Everything the sentinel is allowed to look at. All fields are optional, but
 * an empty input is still a valid (SAFE) analysis - the companion must never
 * fail open into a crash, only into a verdict.
 *
 * `ui_elements` keeps the client's original order: the two indexes in
 * `action_decision` refer to this array.
 */
export interface FraudSentinelInput {
  /** Numbered UI elements exactly as sent to /api/v1/agent/ask. */
  ui_elements?: string[];
  /** Free text visible on screen (notification body, chat text, page copy). */
  screen_text?: string;
  /** Individual messages, e.g. the last few WhatsApp messages. */
  messages?: string[];
  /** URLs on screen or received, probed for shorteners and phishing cues. */
  urls?: string[];
  /** What the elder asked / typed. */
  question?: string;
  /** Foreground app package, kept for logging context. */
  app_package?: string;
}

export interface FraudSentinelVerdict {
  threat_level: ThreatLevel;
  threat_category: ThreatCategory;
  confidence: number;
  detected_triggers: string[];
  action_decision: {
    action: SentinelAction;
    target_element_to_block: number | null;
    safe_action_index: number | null;
    safe_advice: string;
    /** The same advice in Devanagari, so a Hindi UI never reads mixed copy. */
    safe_advice_hi: string;
  };
  user_alert: {
    /** Hindi title (kept as `title` for companions that predate bilingual). */
    title: string;
    title_en: string;
    message_en: string;
    message_hi: string;
  };
  risk_reasoning: string;
}

/** One visible line of text the rules run against. */
export interface SentinelFragment {
  /** Normalised (lower-cased, whitespace-collapsed) text. */
  text: string;
  /** Index into `input.ui_elements`, or null for free text. */
  elementIndex: number | null;
}
