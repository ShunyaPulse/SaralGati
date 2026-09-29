import { type ThreatCategory } from '../fraudSentinel';

export type OfflineThreatLevel = 'DANGEROUS' | 'CRITICAL';
export type OfflineThreatCategory = Exclude<ThreatCategory, 'NONE'>;

export interface OfflineFraudRule {
  /** Stable id, mirroring the server rule id where one exists. */
  id: string;
  category: OfflineThreatCategory;
  level: OfflineThreatLevel;
  /** At least one of these must match the fragment. */
  patterns: string[];
  /** Every one of these must also match the fragment. */
  requires?: string[];
  /** Strip courtesy warnings ("never share this OTP") before matching. */
  strip_safe_warnings?: boolean;
}

/** One rule with its resolved alert copy, exactly as the device consumes it. */
export interface OfflineFraudAssetRule extends OfflineFraudRule {
  title: string;
  title_en: string;
  message_en: string;
  message_hi: string;
  safe_advice: string;
  safe_advice_hi: string;
}

export interface OfflineFraudAsset {
  version: number;
  generated_by: string;
  /** Applied to a fragment before matching when a rule opts in. */
  safe_warning_patterns: string[];
  rules: OfflineFraudAssetRule[];
}

export interface OfflineFraudMatch {
  ruleId: string;
  category: OfflineThreatCategory;
  level: OfflineThreatLevel;
  title: string;
  titleEn: string;
  messageHi: string;
  messageEn: string;
  safeAdvice: string;
  safeAdviceHi: string;
}

export const OFFLINE_FRAUD_RULES_VERSION = 1;

/**
 * Pattern sources duplicated from `fraudSentinel.ts`. They are kept here as
 * plain strings (not `RegExp`) because they are serialised into the Android
 * asset. A parity test asserts the offline ruleset never misses a scam the
 * server marks DANGEROUS/CRITICAL, which is the guard against drift.
 */
const OTP_TOKEN =
  '\\botp\\b|o\\.t\\.p|one[ -]?time (password|code)|verification code|verify code|security code|sms code|\\b2fa\\b|two[ -]?factor|ओटीपी|वन टाइम पासवर्ड';

const PIN_TOKEN =
  '\\b(?:upi|m|mpin|atm|card|bank|banking|transaction|debit|credit)[ -]?pin\\b|\\bmpin\\b|\\bpin\\b|पिन|यूपीआई';

const SHARE_VERB =
  '\\b(share|sharing|send|forward|tell|batao|bata do|bataiye|bhejo|bhej do|bhejna|read out|read it|padh kar|padhkar|disclose)\\b|भेज|बताओ|बता दो|बताएं|पढ़|साझा|शेयर';

const ENTER_VERB =
  '\\b(enter|entering|type|fill|submit|daal|dalo|daalo|daal do|likho|likh do|lagao|confirm)\\b|डाल|लिख|दर्ज';

const RECEIVE_TOKENS =
  '\\b(receive|receiving|refund|cashback|cash back|reward|prize|lottery|lucky (draw|winner)|winner|won|money back)\\b|paise (aayenge|aane|wapas|milenge)|paisa (aayega|wapas)|पैसे (आएंगे|आएगा|वापस|मिलेंगे)|कैशबैक|इनाम|लॉटरी|रिफंड';

const COLLECT_TOKENS =
  'collect request|request money|money request|payment request|request(ed)? .{0,20}(money|payment|paise)|approve (the )?(request|payment)|accept (the )?request|request accept|paise (bhejne|bhejo?) ki (request|rikwest)|पैसे भेजने की रिक्वेस्ट';

const QR_TOKENS =
  '\\bqr\\b|qr code|scan (this|the|yeh)? ?qr|qr scan|scan karke|स्कैन|क्यूआर';

const REMOTE_APP =
  '\\bany ?desk\\b|एनी ?डेस्क|\\bteam ?viewer\\b|टीम ?व्यूअर|\\brust ?desk\\b|\\bquick ?support\\b|क्विक सपोर्ट|\\bsupremo\\b|\\bultraviewer\\b|\\bairdroid\\b|\\bawesun\\b|screen ?shar(e|ing) (app|code|karo|करो)|स्क्रीन शेयर';

const REMOTE_CODE =
  '(screen|remote|connection|sharing|support|anydesk|teamviewer|rustdesk)[ -]?(sharing )?code|\\b(9|10)[ -]?digit (code|number)\\b|\\b\\d{9,10}\\b.{0,15}\\bcode\\b|\\bcode\\b.{0,15}(batao|bhejo|share|डाल|बताओ)';

const INSTALL_PRESSURE =
  '\\binstall\\b|\\bdownload\\b|\\bupdate\\b|इंस्टॉल|डाउनलोड|अपडेट';

const COERCION_CONTEXT =
  '\\b(bank|account|refund|kyc|verification|verify|money|paise|problem|help|madad|support|sahayata|sbi|hdfc|icici|axis|pnb)\\b|पैसे|खाता|मदद|बैंक|सहायता|रिफंड';

const APK_TOKEN =
  '\\.apk\\b|\\bapk\\b|unknown sources|install from (unknown|other) sources|अनजान स्रोत';

/** The "it was pushed onto the elder" half of the server's `apk-sideload` rule. */
const APK_SIDELOAD_CONTEXT =
  'unknown sources|install from (unknown|other) sources|अनजान स्रोत|whatsapp|telegram|व्हाट्सएप|टेलीग्राम|\\b(bhej|send|bhijwa|भेज)\\b|\\binstall\\b.{0,20}(this|ye|\\.apk|apk|kar)';

const UTILITY_THREAT =
  '(electricity|bijli|power|current|meter|बिजली|करंट).{0,60}(disconnect|disconnection|cut|kat|band|block|बंद|काट)|(disconnect|cut|kat|band|block|बंद|काट).{0,60}(electricity|bijli|power|current|meter|बिजली|करंट|connection|कनेक्शन)';

const SIM_THREAT =
  '(sim|सिम).{0,60}(block|blocked|band|deactivate|suspend|disconnect|बंद|ब्लॉक)|trai|दूरसंचार|सिम (बंद|ब्लॉक)';

/** Anything an elder can safely press to get out of a trap. */
export const OFFLINE_SAFE_ESCAPE =
  '\\b(cancel|close|decline|reject|deny|dismiss|ignore|no thanks|not now|back|exit|report|block)\\b|नहीं|बंद|वापस|रद्द|अस्वीकार|छोड़ें';

/**
 * Courtesy-warning phrases stripped before matching an opted-in rule, mirroring
 * `stripSafeWarnings` on the server. Only the warning phrase is dropped, so
 * "kisi ko na batao… ab OTP batao" still surfaces the real request.
 */
export const OFFLINE_SAFE_WARNING_PATTERNS = [
  'do not share[^.!?,\\u0964]*',
  "don'?t share[^.!?,\\u0964]*",
  'never share[^.!?,\\u0964]*',
  'not share[^.!?,\\u0964]*',
  'kisi ko (na|mat) [^.!?,\\u0964]*',
  'share na karein[^.!?,\\u0964]*',
  'किसी को न बताएं|किसी को न बताओ|साझा न करें|शेयर न करें',
];

/**
 * Curated, high-confidence subset. Each entry is a *combination* that only
 * really appears in a scam, so the device can warn without a model.
 */
export const OFFLINE_FRAUD_RULES: OfflineFraudRule[] = [
  {
    id: 'otp-share-request',
    category: 'OTP_THEFT',
    level: 'CRITICAL',
    patterns: [OTP_TOKEN],
    requires: [SHARE_VERB],
    strip_safe_warnings: true,
  },
  {
    id: 'otp-enter-for-reward',
    category: 'OTP_THEFT',
    level: 'CRITICAL',
    patterns: [OTP_TOKEN],
    requires: [ENTER_VERB, RECEIVE_TOKENS],
  },
  {
    id: 'pin-receive-trap',
    category: 'PAYMENT_FRAUD',
    level: 'CRITICAL',
    patterns: [PIN_TOKEN],
    requires: [RECEIVE_TOKENS],
    strip_safe_warnings: true,
  },
  {
    id: 'pin-share-request',
    category: 'PAYMENT_FRAUD',
    level: 'CRITICAL',
    patterns: [PIN_TOKEN],
    requires: [SHARE_VERB],
    strip_safe_warnings: true,
  },
  {
    id: 'pin-collect-request',
    category: 'PAYMENT_FRAUD',
    level: 'CRITICAL',
    patterns: [PIN_TOKEN],
    requires: [COLLECT_TOKENS],
  },
  {
    id: 'qr-receive-trap',
    category: 'PAYMENT_FRAUD',
    level: 'CRITICAL',
    patterns: [QR_TOKENS],
    requires: [RECEIVE_TOKENS],
  },
  {
    id: 'collect-request',
    category: 'PAYMENT_FRAUD',
    level: 'DANGEROUS',
    patterns: [COLLECT_TOKENS],
  },
  {
    id: 'remote-app-code-share',
    category: 'REMOTE_ACCESS',
    level: 'CRITICAL',
    patterns: [REMOTE_APP],
    requires: [REMOTE_CODE],
  },
  {
    id: 'remote-app-install-coercion',
    category: 'REMOTE_ACCESS',
    level: 'CRITICAL',
    patterns: [REMOTE_APP],
    requires: [INSTALL_PRESSURE, COERCION_CONTEXT],
  },
  {
    id: 'apk-sideload',
    category: 'MALICIOUS_APK',
    level: 'DANGEROUS',
    patterns: [APK_TOKEN],
    requires: [APK_SIDELOAD_CONTEXT],
  },
  {
    id: 'utility-cut-threat',
    category: 'PHISHING_IMPERSONATION',
    level: 'DANGEROUS',
    patterns: [UTILITY_THREAT],
  },
  {
    id: 'sim-block-threat',
    category: 'PHISHING_IMPERSONATION',
    level: 'DANGEROUS',
    patterns: [SIM_THREAT],
  },
];
