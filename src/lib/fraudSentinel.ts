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
  };
  user_alert: {
    title: string;
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

const MAX_FRAGMENT_CHARS = 4000;
const MAX_TRIGGERS = 12;
const MAX_TRIGGER_SNIPPET = 60;

/** Warnings that legitimately contain the scary words ("Do not share this OTP"). */
const SAFE_WARNING = new RegExp(
  [
    'do not share',
    "don'?t share",
    'never share',
    'not share',
    'kisi ko (na|mat) (batao|batana|share|de)',
    'share na karein',
    'kisi ke saath share na',
    'किसी को न बताएं',
    'किसी को न बताओ',
    'किसी के साथ साझा न करें',
    'साझा न करें',
  ].join('|'),
);

const OTP_TOKEN =
  /\botp\b|o\.t\.p|one[ -]?time (password|code)|verification code|verify code|security code|sms code|\b2fa\b|two[ -]?factor|ओटीपी|वन टाइम पासवर्ड/;

/** `\bpin\b` cannot match inside "spin"/"pincode", which is what we rely on. */
const PIN_TOKEN =
  /\b(?:upi|m|mpin|atm|card|bank|banking|transaction|debit|credit)[ -]?pin\b|\bmpin\b|\bpin\b|पिन|यूपीआई/;

const SHARE_VERB =
  /\b(share|sharing|send|forward|tell|batao|bata do|bataiye|bhejo|bhej do|bhejna|read out|read it|padh kar|padhkar|disclose)\b|भेज|बताओ|बता दो|बताएं|पढ़|साझा|शेयर/;

const ENTER_VERB =
  /\b(enter|entering|type|fill|submit|daal|dalo|daalo|daal do|likho|likh do|lagao|confirm)\b|डाल|लिख|दर्ज/;

/** Promises that only ever arrive on the receiving side of a scam. */
const RECEIVE_TOKENS =
  /\b(receive|receiving|refund|cashback|cash back|reward|prize|lottery|lucky (draw|winner)|winner|won|money back)\b|paise (aayenge|aane|wapas|milenge)|paisa (aayega|wapas)|पैसे (आएंगे|आएगा|वापस|मिलेंगे)|कैशबैक|इनाम|लॉटरी|रिफंड/;

const COLLECT_TOKENS =
  /collect request|request money|money request|payment request|request(ed)? .{0,20}(money|payment|paise)|approve (the )?(request|payment)|accept (the )?request|request accept|paise (bhejne|bhejo?) ki (request|rikwest)|पैसे भेजने की रिक्वेस्ट/;

const QR_TOKENS = /\bqr\b|qr code|scan (this|the|yeh)? ?qr|qr scan|scan karke|स्कैन|क्यूआर/;

const REMOTE_APP =
  /\bany ?desk\b|एनी ?डेस्क|\bteam ?viewer\b|टीम ?व्यूअर|\brust ?desk\b|\bquick ?support\b|क्विक सपोर्ट|\bsupremo\b|\bultraviewer\b|\bairdroid\b|\bawesun\b|screen ?shar(e|ing) (app|code|karo|करो)|स्क्रीन शेयर/;

const REMOTE_CODE =
  /(screen|remote|connection|sharing|support|anydesk|teamviewer|rustdesk)[ -]?(sharing )?code|\b(9|10)[ -]?digit (code|number)\b|\b\d{9,10}\b.{0,15}\bcode\b|\bcode\b.{0,15}(batao|bhejo|share|डाल|बताओ)/;

const ACCESSIBILITY =
  /accessibility (service|permission|settings|access)|enable accessibility|special (app )?access|device admin|एक्सेसिबिलिटी/;

const INSTALL_PRESSURE =
  /\binstall\b|\bdownload\b|\bupdate\b|इंस्टॉल|डाउनलोड|अपडेट/;

/** Contexts that turn "install this app" from an ad into a scam script. */
const COERCION_CONTEXT =
  /\b(bank|account|refund|kyc|verification|verify|money|paise|problem|help|madad|support|sahayata|sbi|hdfc|icici|axis|pnb)\b|पैसे|खाता|मदद|बैंक|सहायता|रिफंड/;

const KYC_TOKEN = /\bkyc\b|केवाईसी|know your customer/;

const KYC_ACTION =
  /\b(update|pending|expire[sd]?|verify|verification|complete|submit|blocked|suspend(ed)?)\b|अपडेट|पूरा|बंद|निलंबित|सत्यापन/;

const UTILITY_THREAT =
  /(electricity|bijli|power|current|meter|बिजली|करंट).{0,60}(disconnect|disconnection|cut|kat|band|block|बंद|काट)|(disconnect|cut|kat|band|block|बंद|काट).{0,60}(electricity|bijli|power|current|meter|बिजली|करंट|connection|कनेक्शन)/;

const SIM_THREAT =
  /(sim|सिम).{0,60}(block|blocked|band|deactivate|suspend|disconnect|बंद|ब्लॉक)|trai|दूरसंचार/;

const CHALLAN_TOKEN =
  /\bchallan\b|e[ -]?challan|चालान|parivahan|traffic (fine|violation)|वाहन|vehicle (fine|penalty)/;

const AUTHORITY_TOKEN =
  /\b(sbi|hdfc|icici|axis|kotak|pnb|bo[b]?|rbi|bank (officer|manager|staff|se))|income tax|cbi|customs|police|cyber cell|traffic police|customer care|helpline|government|सरकार|पुलिस|बैंक|आयकर/;

const LINK_TOKEN =
  /https?:\/\/|\bwww\.|\.xyz\b|\.top\b|\.club\b|\.online\b|bit\.ly|tinyurl|cutt\.ly|is\.gd|rb\.gy|shorturl|t\.co\/|wa\.me\/|click (here|this|karo|karein)|link par (click|tap|karo)|इस लिंक|लिंक पर (क्लिक|टैप)/;

const URGENCY =
  /\b(urgent|urgently|immediately|right now|last (date|day|chance|warning)|otherwise|or else|expire[sd]?|today itself|within \d+ (hours?|minutes?))\b|\baaj hi\b|\bturant\b|\bwarna\b|\babhi\b|band ho jayega|kat jayega|kaat denge|block ho jayega|block kar diya|आज ही|तुरंत|अभी|वरना|नहीं तो|बंद हो जाए|काट दिया जाएगा|काट देंगे|अंतिम|समय सीमा|धमकी/;

const VIRUS_CLAIM =
  /(phone|device|mobile|system|फोन|मोबाइल|डिवाइस).{0,40}(infected|virus|malware|hack(ed)?|at risk|damaged|खराब|वायरस|खतरे)|(virus|malware|वायरस).{0,40}(found|detected|मिला|है)|your (phone|device|battery) (is )?(damaged|dying|weak|infected)|battery (damaged|health|weak|issue)|junk files|memory (full|damaged)|slow (phone|device)|स्टोरेज (भर|फुल)|फोन (धीमा|स्लो)/;

const MALVERT_CTA =
  /\b(download|update|install|clean|fix|boost|scan|repair)\b.{0,30}(now|karo|karein|free|click|today|अभी)|\bspin\b|\bwheel\b|lucky (draw|spin|wheel)|100% (free|safe)|free (gift|recharge|data)|cleaner|booster|optimizer|इनाम जीतो|चकरी|स्पिन/;

const PRIZE_TOKEN =
  /\b(prize|reward|gift|winner|won|free|lottery|lucky)\b|इनाम|लॉटरी|गिफ्ट|फ्री|मुफ्त/;

const APK_TOKEN = /\.apk\b|\bapk\b|unknown sources|install from (unknown|other) sources|अनजान स्रोत/;

const UNKNOWN_SOURCES = /unknown sources|install from (unknown|other) sources|अनजान स्रोत/;

const MESSENGER_TOKEN = /whatsapp|telegram|व्हाट्सएप|टेलीग्राम/;

const SMS_PERMISSION =
  /(read|access|allow).{0,30}\b(sms|text messages)\b|\bsms permission\b|\bsms access\b|एसएमएस (पढ़|देख|अनुमति)/;

const CONTACTS_PERMISSION =
  /(read|access|allow|share|sync|see|view|dekh).{0,30}(contacts|contact list)|\bcontacts permission\b|संपर्क (देख|साझा|अनुमति|चाहिए)/;

const CAMERA_PERMISSION =
  /(allow|access|use|permit).{0,30}\bcamera\b|\bcamera permission\b|कैमरा (अनुमति|चालू)/;

/** Anything an elder can safely press to get out of a trap. */
const SAFE_ESCAPE =
  /\b(cancel|close|decline|reject|deny|dismiss|ignore|no thanks|not now|back|exit|report|block)\b|नहीं|बंद|वापस|रद्द|अस्वीकार|छोड़ें/;

interface FraudRule {
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

const RULES: FraudRule[] = [
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
const CATEGORY_SEVERITY_CAP: Record<Exclude<ThreatCategory, 'NONE'>, 4 | 3> = {
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
const CATEGORY_PRIORITY: Exclude<ThreatCategory, 'NONE'>[] = [
  'OTP_THEFT',
  'PAYMENT_FRAUD',
  'REMOTE_ACCESS',
  'PHISHING_IMPERSONATION',
  'MALICIOUS_APK',
  'MALVERTISING',
  'PRIVACY_RISK',
];

interface AlertCopy {
  title: string;
  message_en: string;
  message_hi: string;
  safe_advice: string;
}

/** One user-facing alert per category, in both languages. */
const ALERT_COPY: Record<ThreatCategory, AlertCopy> = {
  NONE: {
    title: 'Looks safe',
    message_en:
      'No fraud pattern was found here. Even so, never share your OTP, PIN, or bank details with anyone.',
    message_hi:
      'इस स्क्रीन पर धोखाधड़ी का कोई संकेत नहीं मिला। फिर भी OTP, पिन या बैंक की जानकारी किसी को न बताएं।',
    safe_advice: 'Continue as usual, and never share OTP or PIN with anyone.',
  },
  OTP_THEFT: {
    title: 'OTP किसी को न बताएं',
    message_en:
      'Someone is asking for your OTP or banking PIN. No bank, company, or government office ever asks for an OTP, and sharing it can empty your account. Do not share it with anyone.',
    message_hi:
      'कोई आपका OTP या बैंक पिन माँग रहा है। बैंक या सरकारी विभाग कभी OTP नहीं माँगते। OTP बता देने पर आपके खाते से पूरे पैसे निकल सकते हैं। किसी को भी OTP न बताएं।',
    safe_advice:
      'Do not share or enter the OTP; close this screen and call your bank or family on a number you already know.',
  },
  PAYMENT_FRAUD: {
    title: 'पैसे लेने के लिए PIN नहीं लगता',
    message_en:
      'This is a payment trap. Receiving money never needs a UPI PIN, a QR scan, or an approval - money coming in needs nothing. Press Decline or close the screen. Never enter your PIN for a refund, cashback, or prize.',
    message_hi:
      'यह पैसे ठगने की कोशिश है। पैसे लेने के लिए UPI पिन, QR स्कैन या request approve करना कभी ज़रूरी नहीं होता। पैसे आने के लिए पिन कभी नहीं डालते। request को Decline करें या स्क्रीन बंद कर दें। रिफंड, कैशबैक या इनाम के लिए पिन कभी न डालें।',
    safe_advice:
      'Decline the request and close the screen. Receiving money never needs a UPI PIN.',
  },
  REMOTE_ACCESS: {
    title: 'स्क्रीन शेयर ऐप से बचें',
    message_en:
      'A scammer wants to see and control your phone through an app like AnyDesk, TeamViewer, or RustDesk. Once connected they can read your OTPs and move your money. Do not install it and do not share any code.',
    message_hi:
      'कोई ठग AnyDesk, TeamViewer या RustDesk जैसी ऐप से आपके फोन को दूर से देखना और चलाना चाहता है। जुड़ जाने पर वह आपके OTP पढ़ सकता है और पैसे निकाल सकता है। यह ऐप इंस्टॉल न करें और कोई कोड किसी को न बताएं।',
    safe_advice:
      'Do not install the app or share any code; no bank ever asks for remote access.',
  },
  PHISHING_IMPERSONATION: {
    title: 'फर्जी चेतावनी वाला लिंक',
    message_en:
      'This is a fake urgent warning about electricity, SIM, KYC, or a challan. Government offices and banks never send such threats with links. Do not click the link or call the number; check only with the official app or office.',
    message_hi:
      'यह बिजली, सिम, KYC या चालान का डर दिखाकर भेजा गया फर्जी संदेश है। सरकारी विभाग और बैंक ऐसा लिंक भेजकर धमकी नहीं देते। लिंक पर क्लिक न करें और दिए नंबर पर कॉल न करें। जानकारी केवल असली विभाग या बैंक से लें।',
    safe_advice:
      'Ignore the link and the deadline; verify only through the official app or office.',
  },
  MALVERTISING: {
    title: 'फर्जी वायरस वाली चेतावनी',
    message_en:
      'This is a fake virus or battery warning made to scare you into installing something. Your phone is fine. Close it and do not tap Download or Update.',
    message_hi:
      'यह फोन में वायरस या बैटरी खराब होने की झूठी चेतावनी है, ताकि आप डरकर कुछ इंस्टॉल कर लें। आपका फोन ठीक है। इसे बंद कर दें और Download या Update पर टैप न करें।',
    safe_advice: 'Close this banner; never download or update from a warning.',
  },
  MALICIOUS_APK: {
    title: 'बाहर से ऐप इंस्टॉल न करें',
    message_en:
      'Someone is sending you an APK to install from unknown sources. Such apps can steal your OTPs and money. Only install apps from the Play Store, and ask family first.',
    message_hi:
      'कोई आपको WhatsApp या अनजान जगह से APK फाइल इंस्टॉल करने को कह रहा है। ऐसी ऐप आपके OTP और पैसे चुरा सकती है। अनजान स्रोत से ऐप इंस्टॉल न करें। ऐप केवल Play Store से लें और परिवार से पूछें।',
    safe_advice: 'Do not install it; install apps only from the Play Store.',
  },
  PRIVACY_RISK: {
    title: 'बिना ज़रूरत की अनुमति',
    message_en:
      'This app is asking for contacts, SMS, or camera access it does not need. Such permissions let it read your OTPs or leak your details. Tap Deny, and ask family before allowing.',
    message_hi:
      'यह ऐप आपके संपर्क, SMS या कैमरा की अनुमति माँग रही है जिसकी उसे ज़रूरत नहीं है। ऐसी अनुमति से आपके OTP पढ़े जा सकते हैं। Deny दबाएं और परिवार से पूछकर ही अनुमति दें।',
    safe_advice: 'Tap Deny; allow only what you understand and need.',
  },
};

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
    },
    user_alert: {
      title: copy.title,
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
    },
    user_alert: {
      title: copy.title,
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
export function sentinelExplanation(verdict: FraudSentinelVerdict): string {
  return verdict.user_alert.message_hi;
}
