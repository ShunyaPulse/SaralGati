import type { ThreatCategory } from './types';

import {
  ACCESSIBILITY,
  APK_TOKEN,
  AUTHORITY_TOKEN,
  CAMERA_PERMISSION,
  CHALLAN_TOKEN,
  COERCION_CONTEXT,
  COLLECT_TOKENS,
  CONTACTS_PERMISSION,
  ENTER_VERB,
  INSTALL_PRESSURE,
  KYC_ACTION,
  KYC_TOKEN,
  LINK_TOKEN,
  MALVERT_CTA,
  MESSENGER_TOKEN,
  OTP_TOKEN,
  PIN_TOKEN,
  PRIZE_TOKEN,
  QR_TOKENS,
  RECEIVE_TOKENS,
  REMOTE_APP,
  REMOTE_CODE,
  SHARE_VERB,
  SIM_THREAT,
  SMS_PERMISSION,
  UNKNOWN_SOURCES,
  URGENCY,
  UTILITY_THREAT,
  VIRUS_CLAIM,
} from './patterns';

export interface FraudRule {
  /** Stable id, used in logs and for dedupe. */
  id: string;
  category: Exclude<ThreatCategory, 'NONE'>;
  /** Human-readable trigger, surfaced in `detected_triggers`. */
  label: string;
  /** 4 = theft vector (may become CRITICAL), 3 = high, 2 = medium, 1 = hint. */
  severity: 1 | 2 | 3 | 4;
  patterns: RegExp[];
  /** Every entry must match the fragment for the rule to fire. */
  requires?: RegExp[];
  /** At least one entry must match the fragment. */
  requiresAny?: RegExp[];
  /** Escalate the *action* to KILL_SESSION if this rule decides a CRITICAL. */
  killSession?: boolean;
  /**
   * Match with courtesy warnings removed ("never share this OTP"). Without
   * this, a legitimate bank reminder reads as a request to share the very code
   * it warns about.
   */
  ignoreSafeWarnings?: boolean;
}

export const RULES: FraudRule[] = [
  // ---- OTP_THEFT -----------------------------------------------------------
  {
    id: 'otp-share-request',
    category: 'OTP_THEFT',
    label: 'OTP / 2FA code asked to be shared',
    severity: 4,
    patterns: [OTP_TOKEN],
    requires: [SHARE_VERB],
    ignoreSafeWarnings: true,
  },
  {
    id: 'otp-enter-for-reward',
    category: 'OTP_THEFT',
    label: 'OTP asked to be entered for a reward / verification',
    severity: 4,
    patterns: [OTP_TOKEN],
    requires: [ENTER_VERB],
    requiresAny: [RECEIVE_TOKENS, KYC_ACTION],
  },
  {
    id: 'otp-mention',
    category: 'OTP_THEFT',
    label: 'OTP mentioned - never share it with anyone',
    severity: 1,
    patterns: [OTP_TOKEN],
  },

  // ---- PAYMENT_FRAUD -------------------------------------------------------
  // Receiving money NEVER needs a UPI PIN, a QR scan or an approval, so any
  // "receive + PIN" combination is theft, not a payment.
  {
    id: 'pin-receive-trap',
    category: 'PAYMENT_FRAUD',
    label: 'UPI PIN asked to receive money / cashback / refund',
    severity: 4,
    patterns: [PIN_TOKEN],
    requiresAny: [RECEIVE_TOKENS],
    killSession: true,
    ignoreSafeWarnings: true,
  },
  {
    id: 'pin-share-request',
    category: 'PAYMENT_FRAUD',
    label: 'UPI / ATM PIN asked to be shared',
    severity: 4,
    patterns: [PIN_TOKEN],
    requires: [SHARE_VERB],
    killSession: true,
    ignoreSafeWarnings: true,
  },
  {
    id: 'pin-collect-request',
    category: 'PAYMENT_FRAUD',
    label: 'Collect request plus PIN - the money leaves, not arrives',
    severity: 4,
    patterns: [PIN_TOKEN],
    requiresAny: [COLLECT_TOKENS],
    killSession: true,
  },
  {
    id: 'collect-request',
    category: 'PAYMENT_FRAUD',
    label: 'Money request / collect request to be approved',
    severity: 3,
    patterns: [COLLECT_TOKENS],
  },
  {
    id: 'pay-first-to-receive',
    category: 'PAYMENT_FRAUD',
    label: 'Pay / deposit first to receive money',
    severity: 3,
    patterns: [RECEIVE_TOKENS],
    requiresAny: [
      /\b(pehle|first|deposit|security|charge|fees|bhejo|bhej do|transfer|jama|advance)\b|पहले|जमा|शुल्क/,
    ],
  },
  {
    id: 'qr-receive-trap',
    category: 'PAYMENT_FRAUD',
    label: 'QR scan claimed to be needed to receive money',
    severity: 4,
    patterns: [QR_TOKENS],
    requiresAny: [RECEIVE_TOKENS],
    killSession: true,
  },
  {
    id: 'cashback-bait',
    category: 'PAYMENT_FRAUD',
    label: 'Cashback / prize bait asking to act',
    severity: 2,
    patterns: [RECEIVE_TOKENS],
    requiresAny: [ENTER_VERB, SHARE_VERB, /\b(claim|click|link|अभी|जल्दी)\b|क्लेम|लिंक/],
  },
  {
    // A payment app legitimately asks for a UPI PIN while *sending* money, so
    // this stays SUSPICIOUS (advisory) instead of blocking a real payment.
    id: 'pin-enter',
    category: 'PAYMENT_FRAUD',
    label: 'PIN entry requested - check the payee before entering',
    severity: 2,
    patterns: [PIN_TOKEN],
    requires: [ENTER_VERB],
    ignoreSafeWarnings: true,
  },

  // ---- REMOTE_ACCESS -------------------------------------------------------
  {
    id: 'remote-app-code-share',
    category: 'REMOTE_ACCESS',
    label: 'Remote-control app plus code sharing',
    severity: 4,
    patterns: [REMOTE_APP],
    requiresAny: [REMOTE_CODE],
    killSession: true,
  },
  {
    id: 'remote-app-install-coercion',
    category: 'REMOTE_ACCESS',
    label: 'Remote-control app pushed as bank / support fix',
    severity: 4,
    patterns: [REMOTE_APP],
    requires: [INSTALL_PRESSURE],
    requiresAny: [COERCION_CONTEXT],
    killSession: true,
  },
  {
    id: 'remote-code-share',
    category: 'REMOTE_ACCESS',
    label: 'Screen-sharing / connection code asked to be shared',
    severity: 3,
    patterns: [REMOTE_CODE],
  },
  {
    id: 'accessibility-unlock',
    category: 'REMOTE_ACCESS',
    label: 'Accessibility / device-admin access requested',
    severity: 3,
    patterns: [ACCESSIBILITY],
  },
  {
    // Installing AnyDesk with family is legitimate; the name alone is only a
    // warning so a real tech-support session is not blocked outright.
    id: 'remote-app-mention',
    category: 'REMOTE_ACCESS',
    label: 'Remote-control app mentioned',
    severity: 2,
    patterns: [REMOTE_APP],
  },

  // ---- PHISHING_IMPERSONATION ---------------------------------------------
  {
    id: 'utility-cut-threat',
    category: 'PHISHING_IMPERSONATION',
    label: 'Electricity / connection cut-off threat',
    severity: 3,
    patterns: [UTILITY_THREAT],
  },
  {
    id: 'sim-block-threat',
    category: 'PHISHING_IMPERSONATION',
    label: 'SIM block / deactivation threat',
    severity: 3,
    patterns: [SIM_THREAT],
  },
  {
    id: 'kyc-threat',
    category: 'PHISHING_IMPERSONATION',
    label: 'Fake KYC / account-block notice',
    severity: 2,
    patterns: [KYC_TOKEN],
    requiresAny: [KYC_ACTION],
  },
  {
    id: 'challan-threat',
    category: 'PHISHING_IMPERSONATION',
    label: 'Traffic challan notice with a link / deadline',
    severity: 2,
    patterns: [CHALLAN_TOKEN],
    requiresAny: [LINK_TOKEN, URGENCY, /\bpay\b|bhugtan|भुगतान|जुर्माना/],
  },
  {
    id: 'authority-impersonation',
    category: 'PHISHING_IMPERSONATION',
    label: 'Bank / police / helpline impersonation with pressure',
    severity: 2,
    patterns: [AUTHORITY_TOKEN],
    requiresAny: [URGENCY, LINK_TOKEN, /\bmoney|paise|पैसे|\botp\b|\bpin\b|details|kyc|refund\b/],
  },

  // ---- MALVERTISING --------------------------------------------------------
  {
    id: 'fake-virus-warning',
    category: 'MALVERTISING',
    label: 'Fake virus / battery / storage warning',
    severity: 3,
    patterns: [VIRUS_CLAIM],
  },
  {
    id: 'spin-wheel-trap',
    category: 'MALVERTISING',
    label: 'Lucky spin / wheel prize trap',
    severity: 3,
    patterns: [MALVERT_CTA],
    requiresAny: [PRIZE_TOKEN, /\bspin\b|\bwheel\b|चकरी|स्पिन/],
  },
  {
    id: 'deceptive-cta',
    category: 'MALVERTISING',
    label: 'Deceptive Download / Update / Clean banner',
    severity: 2,
    patterns: [MALVERT_CTA],
    requiresAny: [VIRUS_CLAIM, /\b(free|clean|boost|fix)\b|फ्री|साफ|ठीक/],
  },

  // ---- MALICIOUS_APK -------------------------------------------------------
  {
    id: 'apk-sideload',
    category: 'MALICIOUS_APK',
    label: 'APK to be installed from a chat / unknown source',
    severity: 3,
    patterns: [APK_TOKEN],
    requiresAny: [
      UNKNOWN_SOURCES,
      MESSENGER_TOKEN,
      /\b(bhej|send|bhijwa|भेज)\b/,
      /\binstall\b.{0,20}(this|ye|\.apk|apk|kar)/,
    ],
  },
  {
    id: 'unknown-sources-instruction',
    category: 'MALICIOUS_APK',
    label: 'Unknown sources / side-load permission instruction',
    severity: 3,
    patterns: [UNKNOWN_SOURCES],
    requiresAny: [INSTALL_PRESSURE, /\b(enable|allow|turn on|permission)\b|चालू|अनुमति/],
  },

  // ---- PRIVACY_RISK --------------------------------------------------------
  {
    id: 'sms-permission',
    category: 'PRIVACY_RISK',
    label: 'SMS read access requested',
    severity: 2,
    patterns: [SMS_PERMISSION],
  },
  {
    id: 'contacts-permission',
    category: 'PRIVACY_RISK',
    label: 'Contacts access requested',
    severity: 2,
    patterns: [CONTACTS_PERMISSION],
  },
  {
    id: 'camera-permission',
    category: 'PRIVACY_RISK',
    label: 'Camera access requested',
    severity: 1,
    patterns: [CAMERA_PERMISSION],
  },
];

/**
 * Only the direct theft vectors may reach CRITICAL. Everything else tops out at
 * DANGEROUS (block + intercept) even when urgency is piled on, so a loud
 * advertisement can never freeze the phone the way an OTP request does.
 */
export const CATEGORY_SEVERITY_CAP: Record<Exclude<ThreatCategory, 'NONE'>, 4 | 3> = {
  OTP_THEFT: 4,
  PAYMENT_FRAUD: 4,
  REMOTE_ACCESS: 4,
  PHISHING_IMPERSONATION: 3,
  MALVERTISING: 3,
  MALICIOUS_APK: 3,
  PRIVACY_RISK: 3,
};

/**
 * Tie-breaker order when two categories fire at the same severity: the money /
 * code vectors win because the required reaction is the strongest.
 */
export const CATEGORY_PRIORITY: Exclude<ThreatCategory, 'NONE'>[] = [
  'OTP_THEFT',
  'PAYMENT_FRAUD',
  'REMOTE_ACCESS',
  'PHISHING_IMPERSONATION',
  'MALICIOUS_APK',
  'MALVERTISING',
  'PRIVACY_RISK',
];
