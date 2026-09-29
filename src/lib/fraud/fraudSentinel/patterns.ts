/**
 * The sentinel's pattern vocabulary: one named expression per scam signal.
 *
 * Rules are written against these names instead of inline literals, so adding a
 * wording (a new Hindi phrase, a new shortener domain) does not mean editing the
 * rules themselves.
 *
 * Every pattern is matched against normalised text (lower-cased, whitespace
 * collapsed), which is why the Devanagari and Latin spellings sit side by side.
 */

/** Warnings that legitimately contain the scary words ("Do not share this OTP"). */
export const SAFE_WARNING = new RegExp(
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

export const OTP_TOKEN =
  /\botp\b|o\.t\.p|one[ -]?time (password|code)|verification code|verify code|security code|sms code|\b2fa\b|two[ -]?factor|ओटीपी|वन टाइम पासवर्ड/;

/** `\bpin\b` cannot match inside "spin"/"pincode", which is what we rely on. */
export const PIN_TOKEN =
  /\b(?:upi|m|mpin|atm|card|bank|banking|transaction|debit|credit)[ -]?pin\b|\bmpin\b|\bpin\b|पिन|यूपीआई/;

export const SHARE_VERB =
  /\b(share|sharing|send|forward|tell|batao|bata do|bataiye|bhejo|bhej do|bhejna|read out|read it|padh kar|padhkar|disclose)\b|भेज|बताओ|बता दो|बताएं|पढ़|साझा|शेयर/;

export const ENTER_VERB =
  /\b(enter|entering|type|fill|submit|daal|dalo|daalo|daal do|likho|likh do|lagao|confirm)\b|डाल|लिख|दर्ज/;

/** Promises that only ever arrive on the receiving side of a scam. */
export const RECEIVE_TOKENS =
  /\b(receive|receiving|refund|cashback|cash back|reward|prize|lottery|lucky (draw|winner)|winner|won|money back)\b|paise (aayenge|aane|wapas|milenge)|paisa (aayega|wapas)|पैसे (आएंगे|आएगा|वापस|मिलेंगे)|कैशबैक|इनाम|लॉटरी|रिफंड/;

export const COLLECT_TOKENS =
  /collect request|request money|money request|payment request|request(ed)? .{0,20}(money|payment|paise)|approve (the )?(request|payment)|accept (the )?request|request accept|paise (bhejne|bhejo?) ki (request|rikwest)|पैसे भेजने की रिक्वेस्ट/;

export const QR_TOKENS = /\bqr\b|qr code|scan (this|the|yeh)? ?qr|qr scan|scan karke|स्कैन|क्यूआर/;

export const REMOTE_APP =
  /\bany ?desk\b|एनी ?डेस्क|\bteam ?viewer\b|टीम ?व्यूअर|\brust ?desk\b|\bquick ?support\b|क्विक सपोर्ट|\bsupremo\b|\bultraviewer\b|\bairdroid\b|\bawesun\b|screen ?shar(e|ing) (app|code|karo|करो)|स्क्रीन शेयर/;

export const REMOTE_CODE =
  /(screen|remote|connection|sharing|support|anydesk|teamviewer|rustdesk)[ -]?(sharing )?code|\b(9|10)[ -]?digit (code|number)\b|\b\d{9,10}\b.{0,15}\bcode\b|\bcode\b.{0,15}(batao|bhejo|share|डाल|बताओ)/;

export const ACCESSIBILITY =
  /accessibility (service|permission|settings|access)|enable accessibility|special (app )?access|device admin|एक्सेसिबिलिटी/;

export const INSTALL_PRESSURE =
  /\binstall\b|\bdownload\b|\bupdate\b|इंस्टॉल|डाउनलोड|अपडेट/;

/** Contexts that turn "install this app" from an ad into a scam script. */
export const COERCION_CONTEXT =
  /\b(bank|account|refund|kyc|verification|verify|money|paise|problem|help|madad|support|sahayata|sbi|hdfc|icici|axis|pnb)\b|पैसे|खाता|मदद|बैंक|सहायता|रिफंड/;

export const KYC_TOKEN = /\bkyc\b|केवाईसी|know your customer/;

export const KYC_ACTION =
  /\b(update|pending|expire[sd]?|verify|verification|complete|submit|blocked|suspend(ed)?)\b|अपडेट|पूरा|बंद|निलंबित|सत्यापन/;

export const UTILITY_THREAT =
  /(electricity|bijli|power|current|meter|बिजली|करंट).{0,60}(disconnect|disconnection|cut|kat|band|block|बंद|काट)|(disconnect|cut|kat|band|block|बंद|काट).{0,60}(electricity|bijli|power|current|meter|बिजली|करंट|connection|कनेक्शन)/;

export const SIM_THREAT =
  /(sim|सिम).{0,60}(block|blocked|band|deactivate|suspend|disconnect|बंद|ब्लॉक)|trai|दूरसंचार/;

export const CHALLAN_TOKEN =
  /\bchallan\b|e[ -]?challan|चालान|parivahan|traffic (fine|violation)|वाहन|vehicle (fine|penalty)/;

export const AUTHORITY_TOKEN =
  /\b(sbi|hdfc|icici|axis|kotak|pnb|bo[b]?|rbi|bank (officer|manager|staff|se))|income tax|cbi|customs|police|cyber cell|traffic police|customer care|helpline|government|सरकार|पुलिस|बैंक|आयकर/;

export const LINK_TOKEN =
  /https?:\/\/|\bwww\.|\.xyz\b|\.top\b|\.club\b|\.online\b|bit\.ly|tinyurl|cutt\.ly|is\.gd|rb\.gy|shorturl|t\.co\/|wa\.me\/|click (here|this|karo|karein)|link par (click|tap|karo)|इस लिंक|लिंक पर (क्लिक|टैप)/;

export const URGENCY =
  /\b(urgent|urgently|immediately|right now|last (date|day|chance|warning)|otherwise|or else|expire[sd]?|today itself|within \d+ (hours?|minutes?))\b|\baaj hi\b|\bturant\b|\bwarna\b|\babhi\b|band ho jayega|kat jayega|kaat denge|block ho jayega|block kar diya|आज ही|तुरंत|अभी|वरना|नहीं तो|बंद हो जाए|काट दिया जाएगा|काट देंगे|अंतिम|समय सीमा|धमकी/;

export const VIRUS_CLAIM =
  /(phone|device|mobile|system|फोन|मोबाइल|डिवाइस).{0,40}(infected|virus|malware|hack(ed)?|at risk|damaged|खराब|वायरस|खतरे)|(virus|malware|वायरस).{0,40}(found|detected|मिला|है)|your (phone|device|battery) (is )?(damaged|dying|weak|infected)|battery (damaged|health|weak|issue)|junk files|memory (full|damaged)|slow (phone|device)|स्टोरेज (भर|फुल)|फोन (धीमा|स्लो)/;

export const MALVERT_CTA =
  /\b(download|update|install|clean|fix|boost|scan|repair)\b.{0,30}(now|karo|karein|free|click|today|अभी)|\bspin\b|\bwheel\b|lucky (draw|spin|wheel)|100% (free|safe)|free (gift|recharge|data)|cleaner|booster|optimizer|इनाम जीतो|चकरी|स्पिन/;

export const PRIZE_TOKEN =
  /\b(prize|reward|gift|winner|won|free|lottery|lucky)\b|इनाम|लॉटरी|गिफ्ट|फ्री|मुफ्त/;

export const APK_TOKEN = /\.apk\b|\bapk\b|unknown sources|install from (unknown|other) sources|अनजान स्रोत/;

export const UNKNOWN_SOURCES = /unknown sources|install from (unknown|other) sources|अनजान स्रोत/;

export const MESSENGER_TOKEN = /whatsapp|telegram|व्हाट्सएप|टेलीग्राम/;

export const SMS_PERMISSION =
  /(read|access|allow).{0,30}\b(sms|text messages)\b|\bsms permission\b|\bsms access\b|एसएमएस (पढ़|देख|अनुमति)/;

export const CONTACTS_PERMISSION =
  /(read|access|allow|share|sync|see|view|dekh).{0,30}(contacts|contact list)|\bcontacts permission\b|संपर्क (देख|साझा|अनुमति|चाहिए)/;

export const CAMERA_PERMISSION =
  /(allow|access|use|permit).{0,30}\bcamera\b|\bcamera permission\b|कैमरा (अनुमति|चालू)/;

/** Anything an elder can safely press to get out of a trap. */
export const SAFE_ESCAPE =
  /\b(cancel|close|decline|reject|deny|dismiss|ignore|no thanks|not now|back|exit|report|block)\b|नहीं|बंद|वापस|रद्द|अस्वीकार|छोड़ें/;
