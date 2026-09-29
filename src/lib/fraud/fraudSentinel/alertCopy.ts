import type { ThreatCategory } from './types';

export interface AlertCopy {
  /** Hindi title, also shipped as `user_alert.title` for older companions. */
  title: string;
  title_en: string;
  message_en: string;
  message_hi: string;
  safe_advice: string;
  safe_advice_hi: string;
}

/**
 * One user-facing alert per category, in both languages. Exported so the
 * on-device offline ruleset (and its generated Android asset) reuse the exact
 * same wording instead of drifting into a second copy.
 */
export const ALERT_COPY: Record<ThreatCategory, AlertCopy> = {
  NONE: {
    title: 'Looks safe',
    title_en: 'Looks safe',
    message_en:
      'No fraud pattern was found here. Even so, never share your OTP, PIN, or bank details with anyone.',
    message_hi:
      'इस स्क्रीन पर धोखाधड़ी का कोई संकेत नहीं मिला। फिर भी OTP, पिन या बैंक की जानकारी किसी को न बताएं।',
    safe_advice: 'Continue as usual, and never share OTP or PIN with anyone.',
    safe_advice_hi: 'जैसे चल रहे थे वैसे ही चलाएं, और OTP या पिन किसी को न बताएं।',
  },
  OTP_THEFT: {
    title: 'OTP किसी को न बताएं',
    title_en: 'Do not share your OTP',
    message_en:
      'Someone is asking for your OTP or banking PIN. No bank, company, or government office ever asks for an OTP, and sharing it can empty your account. Do not share it with anyone.',
    message_hi:
      'कोई आपका OTP या बैंक पिन माँग रहा है। बैंक या सरकारी विभाग कभी OTP नहीं माँगते। OTP बता देने पर आपके खाते से पूरे पैसे निकल सकते हैं। किसी को भी OTP न बताएं।',
    safe_advice:
      'Do not share or enter the OTP; close this screen and call your bank or family on a number you already know.',
    safe_advice_hi:
      'OTP न बताएं और न ही डालें; यह स्क्रीन बंद करें और बैंक या परिवार को उसी नंबर पर कॉल करें जो आपको पहले से पता है।',
  },
  PAYMENT_FRAUD: {
    title: 'पैसे लेने के लिए PIN नहीं लगता',
    title_en: 'Receiving money never needs a PIN',
    message_en:
      'This is a payment trap. Receiving money never needs a UPI PIN, a QR scan, or an approval - money coming in needs nothing. Press Decline or close the screen. Never enter your PIN for a refund, cashback, or prize.',
    message_hi:
      'यह पैसे ठगने की कोशिश है। पैसे लेने के लिए UPI पिन, QR स्कैन या request approve करना कभी ज़रूरी नहीं होता। पैसे आने के लिए पिन कभी नहीं डालते। request को Decline करें या स्क्रीन बंद कर दें। रिफंड, कैशबैक या इनाम के लिए पिन कभी न डालें।',
    safe_advice:
      'Decline the request and close the screen. Receiving money never needs a UPI PIN.',
    safe_advice_hi:
      'request को Decline करें और स्क्रीन बंद कर दें। पैसे लेने के लिए UPI पिन कभी नहीं लगता।',
  },
  REMOTE_ACCESS: {
    title: 'स्क्रीन शेयर ऐप से बचें',
    title_en: 'Avoid screen-sharing apps',
    message_en:
      'A scammer wants to see and control your phone through an app like AnyDesk, TeamViewer, or RustDesk. Once connected they can read your OTPs and move your money. Do not install it and do not share any code.',
    message_hi:
      'कोई ठग AnyDesk, TeamViewer या RustDesk जैसी ऐप से आपके फोन को दूर से देखना और चलाना चाहता है। जुड़ जाने पर वह आपके OTP पढ़ सकता है और पैसे निकाल सकता है। यह ऐप इंस्टॉल न करें और कोई कोड किसी को न बताएं।',
    safe_advice:
      'Do not install the app or share any code; no bank ever asks for remote access.',
    safe_advice_hi:
      'ऐप इंस्टॉल न करें और कोई कोड किसी को न बताएं; कोई बैंक दूर से फोन चलाने को नहीं कहता।',
  },
  PHISHING_IMPERSONATION: {
    title: 'फर्जी चेतावनी वाला लिंक',
    title_en: 'Fake warning link',
    message_en:
      'This is a fake urgent warning about electricity, SIM, KYC, or a challan. Government offices and banks never send such threats with links. Do not click the link or call the number; check only with the official app or office.',
    message_hi:
      'यह बिजली, सिम, KYC या चालान का डर दिखाकर भेजा गया फर्जी संदेश है। सरकारी विभाग और बैंक ऐसा लिंक भेजकर धमकी नहीं देते। लिंक पर क्लिक न करें और दिए नंबर पर कॉल न करें। जानकारी केवल असली विभाग या बैंक से लें।',
    safe_advice:
      'Ignore the link and the deadline; verify only through the official app or office.',
    safe_advice_hi:
      'लिंक और समय-सीमा को अनदेखा करें; जानकारी केवल असली ऐप या दफ़्तर से जांचें।',
  },
  MALVERTISING: {
    title: 'फर्जी वायरस वाली चेतावनी',
    title_en: 'Fake virus warning',
    message_en:
      'This is a fake virus or battery warning made to scare you into installing something. Your phone is fine. Close it and do not tap Download or Update.',
    message_hi:
      'यह फोन में वायरस या बैटरी खराब होने की झूठी चेतावनी है, ताकि आप डरकर कुछ इंस्टॉल कर लें। आपका फोन ठीक है। इसे बंद कर दें और Download या Update पर टैप न करें।',
    safe_advice: 'Close this banner; never download or update from a warning.',
    safe_advice_hi: 'इस बैनर को बंद करें; किसी चेतावनी से कुछ डाउनलोड या अपडेट न करें।',
  },
  MALICIOUS_APK: {
    title: 'बाहर से ऐप इंस्टॉल न करें',
    title_en: 'Do not install apps from outside',
    message_en:
      'Someone is sending you an APK to install from unknown sources. Such apps can steal your OTPs and money. Only install apps from the Play Store, and ask family first.',
    message_hi:
      'कोई आपको WhatsApp या अनजान जगह से APK फाइल इंस्टॉल करने को कह रहा है। ऐसी ऐप आपके OTP और पैसे चुरा सकती है। अनजान स्रोत से ऐप इंस्टॉल न करें। ऐप केवल Play Store से लें और परिवार से पूछें।',
    safe_advice: 'Do not install it; install apps only from the Play Store.',
    safe_advice_hi: 'इसे इंस्टॉल न करें; ऐप केवल Play Store से इंस्टॉल करें।',
  },
  PRIVACY_RISK: {
    title: 'बिना ज़रूरत की अनुमति',
    title_en: 'Unnecessary permission request',
    message_en:
      'This app is asking for contacts, SMS, or camera access it does not need. Such permissions let it read your OTPs or leak your details. Tap Deny, and ask family before allowing.',
    message_hi:
      'यह ऐप आपके संपर्क, SMS या कैमरा की अनुमति माँग रही है जिसकी उसे ज़रूरत नहीं है। ऐसी अनुमति से आपके OTP पढ़े जा सकते हैं। Deny दबाएं और परिवार से पूछकर ही अनुमति दें।',
    safe_advice: 'Tap Deny; allow only what you understand and need.',
    safe_advice_hi: 'Deny दबाएं; जो समझ में आए और ज़रूरी हो वही अनुमति दें।',
  },
};
