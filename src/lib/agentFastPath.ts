import { matchElderIntent } from './intentDictionary';

/**
 * Deterministic, zero-latency answers for the questions elders ask most.
 *
 * This used to live inline in `POST /api/v1/agent/ask`, ~250 lines deep inside
 * the request handler, where it could not be exercised without a device token,
 * a database and Redis. It is a pure function of (app, question, on-screen
 * elements), so it lives here and the route just calls it.
 *
 * The rule chain is deliberately unchanged by that move: it is the ground truth
 * for the most common elderly flows, and the tests in
 * `agentFastPath.test.ts` pin its behaviour.
 */

export interface FastPathMatch {
  /** Hinglish sentence the companion app speaks to the elder. */
  explanation: string;
  /** Index into the caller's `uiElements` array that should be spotlighted. */
  index: number;
}

/**
 * Labels that are dynamic furniture rather than targets: an elder asking
 * "video call" should not be pointed at "3 videos" or a "12:30" timestamp.
 */
function isNoiseLabel(text: string): boolean {
  return (
    /\b\d+\s*(videos?|photos?|messages?|audios?)\b/i.test(text) ||
    /\b(yesterday|am|pm|today)\b/i.test(text)
  );
}

/**
 * First element mentioning any keyword. Actionable roles ([BUTTON], [INPUT],
 * [TOGGLE]) win over static [TEXT], because tapping text does nothing; pass
 * `requireActionable = false` for questions that are about reading a label.
 */
function findUIIndex(
  uiElements: string[],
  keywords: string[],
  requireActionable = true,
): number {
  const interactiveIdx = uiElements.findIndex((el: string) => {
    const clean = el.replace(/^\[BELOW-FOLD\]\s*/i, '');
    const isActionable = /^\[(BUTTON|INPUT|TOGGLE)\]/i.test(clean);
    if (!isActionable) return false;
    const txt = clean.toLowerCase();
    if (isNoiseLabel(txt)) return false;
    return keywords.some((k) => txt.includes(k.toLowerCase()));
  });

  if (interactiveIdx !== -1) return interactiveIdx;

  if (!requireActionable) {
    return uiElements.findIndex((el: string) => {
      const txt = el.toLowerCase();
      if (isNoiseLabel(txt)) return false;
      return keywords.some((k) => txt.includes(k.toLowerCase()));
    });
  }

  return -1;
}

export function matchFastPathRule(
  appPackage: string,
  question: string,
  uiElements: string[],
): FastPathMatch | null {
  const questionLower = question.toLowerCase();

  let fpMatch = false;
  let fpExplanation = '';
  let fpIndex = -1;

  if (appPackage === 'com.whatsapp') {
    if (
      /\bvideo\s*call\b/i.test(questionLower) ||
      questionLower.includes('वीडियो कॉल') ||
      (/\bvideo\b/i.test(questionLower) &&
        /\bcall\b|\bkaro\b|\blagao\b|\bkarni\b/i.test(questionLower))
    ) {
      let idx = findUIIndex(uiElements, ['video call', 'वीडियो कॉल', 'video_call']);
      if (idx !== -1) {
        fpIndex = idx;
        fpExplanation =
          'Video call karne ke liye yahan video call button par dabayein.';
        fpMatch = true;
      } else {
        idx = findUIIndex(uiElements, ['calls', 'कॉल', 'call']);
        if (idx !== -1) {
          fpIndex = idx;
          fpExplanation =
            'Video ya audio call lagane ke liye niche Calls par dabayein, ya jis vyakti se baat karni hai unki chat kholein.';
          fpMatch = true;
        }
      }
    } else if (
      questionLower.includes('call') ||
      questionLower.includes('कॉल') ||
      /\bphone\b(?!\s*pe)/i.test(questionLower) ||
      questionLower.includes('फोन')
    ) {
      let idx = findUIIndex(uiElements, ['audio call', 'voice call', 'कॉल']);
      if (idx !== -1) {
        fpIndex = idx;
        fpExplanation = 'Call karne ke liye yahan dabayein.';
        fpMatch = true;
      } else {
        idx = findUIIndex(uiElements, ['calls', 'call', 'कॉल']);
        if (idx !== -1) {
          fpIndex = idx;
          fpExplanation =
            'Call lagane ke liye niche Calls par dabayein, ya kisi ki chat kholein.';
          fpMatch = true;
        }
      }
    } else if (
      questionLower.includes('status') ||
      questionLower.includes('स्टेटस') ||
      questionLower.includes('update')
    ) {
      fpIndex = findUIIndex(uiElements, ['updates', 'status', 'स्टेटस', 'update']);
      if (fpIndex !== -1) {
        fpExplanation = 'Status (Updates) dekhne ke liye yahan dabayein.';
        fpMatch = true;
      }
    } else if (
      questionLower.includes('message') ||
      questionLower.includes('chat') ||
      questionLower.includes('मैसेज') ||
      questionLower.includes('new')
    ) {
      fpIndex = findUIIndex(uiElements, ['message', 'chat', 'new', 'मैसेज', 'नया']);
      if (fpIndex !== -1) {
        fpExplanation = 'Naya message bhejne ke liye yahan dabayein.';
        fpMatch = true;
      }
    }
  } else if (appPackage.includes('dialer')) {
    if (
      questionLower.includes('call') ||
      questionLower.includes('कॉल') ||
      questionLower.includes('phone') ||
      questionLower.includes('फोन') ||
      questionLower.includes('dial')
    ) {
      fpIndex = findUIIndex(uiElements, ['keypad', 'dialpad', 'dial', 'कॉल', 'key']);
      if (fpIndex !== -1) {
        fpExplanation = 'Number dial karne ke liye yahan dabayein.';
        fpMatch = true;
      }
    } else if (
      questionLower.includes('contact') ||
      questionLower.includes('संपर्क')
    ) {
      fpIndex = findUIIndex(uiElements, ['contact', 'संपर्क']);
      if (fpIndex !== -1) {
        fpExplanation = 'Sampark (Contacts) dekhne ke liye yahan dabayein.';
        fpMatch = true;
      }
    }
  } else if (
    appPackage.includes('facebook') ||
    appPackage.includes('katana')
  ) {
    if (
      questionLower.includes('photo') ||
      questionLower.includes('फोटो') ||
      questionLower.includes('post') ||
      questionLower.includes('पोस्ट') ||
      questionLower.includes('mind')
    ) {
      fpIndex = findUIIndex(uiElements, ['photo', 'फोटो', 'post', 'mind', 'create']);
      if (fpIndex !== -1) {
        fpExplanation = 'Photo ya post daalne ke liye yahan dabayein.';
        fpMatch = true;
      }
    } else if (
      questionLower.includes('video') ||
      questionLower.includes('watch')
    ) {
      fpIndex = findUIIndex(uiElements, ['video', 'watch', 'वीडियो']);
      if (fpIndex !== -1) {
        fpExplanation = 'Video dekhne ke liye yahan dabayein.';
        fpMatch = true;
      }
    }
  } else if (appPackage.includes('youtube')) {
    if (
      questionLower.includes('search') ||
      questionLower.includes('खोज') ||
      questionLower.includes('dhoondh')
    ) {
      fpIndex = findUIIndex(uiElements, ['search', 'खोज']);
      if (fpIndex !== -1) {
        fpExplanation = 'Video khojne ke liye yahan dabayein.';
        fpMatch = true;
      }
    } else if (questionLower.includes('shorts')) {
      fpIndex = findUIIndex(uiElements, ['shorts']);
      if (fpIndex !== -1) {
        fpExplanation = 'Shorts dekhne ke liye yahan dabayein.';
        fpMatch = true;
      }
    }
  } else if (
    appPackage.includes('photos') ||
    appPackage.includes('gallery')
  ) {
    if (
      questionLower.includes('share') ||
      questionLower.includes('bhejo') ||
      questionLower.includes('शेयर')
    ) {
      fpIndex = findUIIndex(uiElements, ['share', 'शेयर', 'send']);
      if (fpIndex !== -1) {
        fpExplanation =
          'Is photo ko kisi ko bhejne ke liye yahan share dabayein.';
        fpMatch = true;
      }
    } else if (
      questionLower.includes('delete') ||
      questionLower.includes('hatao') ||
      questionLower.includes('डिलीट')
    ) {
      fpIndex = findUIIndex(uiElements, ['delete', 'trash', 'डिलीट']);
      if (fpIndex !== -1) {
        fpExplanation = 'Is photo ko delete karne ke liye yahan dabayein.';
        fpMatch = true;
      }
    }
  } else if (
    appPackage.includes('messaging') ||
    appPackage.includes('sms')
  ) {
    if (
      questionLower.includes('message') ||
      questionLower.includes('sms') ||
      questionLower.includes('मैसेज')
    ) {
      fpIndex = findUIIndex(uiElements, ['start chat', 'new message', 'नया संदेश']);
      if (fpIndex !== -1) {
        fpExplanation = 'Naya message bhejne ke liye yahan click karein.';
        fpMatch = true;
      }
    } else if (
      questionLower.includes('otp') ||
      questionLower.includes('code')
    ) {
      fpIndex = findUIIndex(uiElements, ['unread', 'otp', 'message']);
      if (fpIndex !== -1) {
        fpExplanation = 'Apna message ya OTP padhne ke liye yahan dabayein.';
        fpMatch = true;
      }
    }
  } else if (appPackage.includes('contacts')) {
    if (
      questionLower.includes('add') ||
      questionLower.includes('naya') ||
      questionLower.includes('नया')
    ) {
      fpIndex = findUIIndex(uiElements, ['add', 'new', 'create', 'प्लस']);
      if (fpIndex !== -1) {
        fpExplanation = 'Naya number save karne ke liye yahan dabayein.';
        fpMatch = true;
      }
    } else if (
      questionLower.includes('search') ||
      questionLower.includes('khoj')
    ) {
      fpIndex = findUIIndex(uiElements, ['search', 'खोज']);
      if (fpIndex !== -1) {
        fpExplanation = 'Kisi ka number khojne ke liye yahan dabayein.';
        fpMatch = true;
      }
    }
  }

  // Nothing app-specific matched: fall back to the generic elder intent
  // dictionary, which works across any package.
  if (!fpMatch) {
    const intentFastMatch = matchElderIntent(question, uiElements);
    if (
      intentFastMatch.highlightIndex !== null &&
      intentFastMatch.matchedIntent !== null
    ) {
      fpIndex = intentFastMatch.highlightIndex;
      fpExplanation = intentFastMatch.explanation;
      fpMatch = true;
    }
  }

  if (!fpMatch) return null;
  return { explanation: fpExplanation, index: fpIndex };
}
