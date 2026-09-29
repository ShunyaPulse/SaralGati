import { matchElderIntent } from '../intentDictionary';
import type { GuidanceLang } from '../guidanceLanguage';
import { elementLabelLower, isActionableElement } from '../uiElement';
import { FAST_PATH_COPY, type FastPathCopyKey } from './copy';

export interface FastPathMatch {
  /** Sentence the companion app speaks to the elder, in their language. */
  explanation: string;
  /** Index into the caller's `uiElements` array that should be spotlighted. */
  index: number;
}
/**
 * Labels that are dynamic furniture rather than targets: an elder asking
 * "video call" should not be pointed at "3 videos" or a "12:30" timestamp.
 * Takes the label, not the raw line, so index prefixes cannot hide it.
 */
function isNoiseLabel(label: string): boolean {
  return (
    /\b\d+\s*(videos?|photos?|messages?|audios?)\b/i.test(label) ||
    /\b(yesterday|am|pm|today)\b/i.test(label)
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
    if (!isActionableElement(el)) return false;
    const txt = elementLabelLower(el);
    if (isNoiseLabel(txt)) return false;
    return keywords.some((k) => txt.includes(k.toLowerCase()));
  });

  if (interactiveIdx !== -1) return interactiveIdx;

  if (!requireActionable) {
    return uiElements.findIndex((el: string) => {
      const txt = elementLabelLower(el);
      if (isNoiseLabel(txt)) return false;
      return keywords.some((k) => txt.includes(k.toLowerCase()));
    });
  }

  return -1;
}

/**
 * Words in a "call someone" sentence that name no person. A dialer question is
 * usually three parts - an action (call/dial), a target (number/phone) and
 * filler (lagao/karo/ko) - and none of them is a name to look for on screen.
 */
const CALL_ACTION_WORDS = new Set([
  'call',
  'calls',
  'phone',
  'dial',
  'dialer',
  'number',
  'lagao',
  'lagaye',
  'lagana',
  'lagani',
  'milao',
  'milaye',
  'bajao',
  'ghanti',
  'karo',
  'karna',
  'karni',
  'karne',
  'karke',
  'hai',
  'hain',
  'ho',
  'mujhe',
  'mera',
  'meri',
  'ko',
  'se',
  'ka',
  'ki',
  'ke',
  'par',
  'please',
  'the',
  'now',
  'फोन',
  'कॉल',
  'नंबर',
  'डायल',
  'लगाओ',
  'करो',
  'करना',
  'मिलाओ',
]);

/**
 * The call button of a person the elder named, or -1.
 *
 * "Amit ko phone lagao" on a screen that already shows Amit's row must tap
 * "Call Amit Beta", not send the elder to the keypad to type a number the
 * screen is holding. The name is whatever in the sentence is not an action,
 * target or filler word, so no person name has to be hardcoded.
 */
function callButtonForNamedContact(
  questionLower: string,
  uiElements: string[],
): number {
  const names = questionLower
    .split(/[^a-z0-9\u0900-\u097F]+/)
    .filter((token) => token.length >= 3 && !CALL_ACTION_WORDS.has(token));
  if (names.length === 0) return -1;

  return uiElements.findIndex((element) => {
    if (!isActionableElement(element)) return false;
    const label = elementLabelLower(element);
    if (!label.includes('call')) return false;
    return names.some((name) => label.includes(name));
  });
}

export function matchFastPathRule(
  appPackage: string,
  question: string,
  uiElements: string[],
  lang: GuidanceLang = 'hi',
): FastPathMatch | null {
  const questionLower = question.toLowerCase();

  let fpMatch = false;
  let fpCopy: FastPathCopyKey | null = null;
  /** Set only by the intent-dictionary fallback, which already localizes. */
  let fpIntentExplanation = '';
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
        fpCopy = 'whatsappVideoCallButton';
        fpMatch = true;
      } else {
        idx = findUIIndex(uiElements, ['calls', 'कॉल', 'call']);
        if (idx !== -1) {
          fpIndex = idx;
          fpCopy = 'whatsappCallsTabForVideo';
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
        fpCopy = 'whatsappVoiceCallButton';
        fpMatch = true;
      } else {
        idx = findUIIndex(uiElements, ['calls', 'call', 'कॉल']);
        if (idx !== -1) {
          fpIndex = idx;
          fpCopy = 'whatsappCallsTab';
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
        fpCopy = 'whatsappStatus';
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
        fpCopy = 'whatsappNewMessage';
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
      // The person's own call button first, then the keypad to type a number,
      // then the call button for an already-entered number.
      const namedIndex = callButtonForNamedContact(questionLower, uiElements);
      if (namedIndex !== -1) {
        fpIndex = namedIndex;
        fpCopy = 'dialerCallContact';
        fpMatch = true;
      } else {
        fpIndex = findUIIndex(uiElements, ['keypad', 'dialpad', 'dial', 'कॉल', 'key']);
        if (fpIndex !== -1) {
          fpCopy = 'dialerKeypad';
          fpMatch = true;
        } else {
          fpIndex = findUIIndex(uiElements, ['call sim', 'call']);
          if (fpIndex !== -1) {
            fpCopy = 'dialerPlaceCall';
            fpMatch = true;
          }
        }
      }
    } else if (
      questionLower.includes('contact') ||
      questionLower.includes('संपर्क')
    ) {
      fpIndex = findUIIndex(uiElements, ['contact', 'संपर्क']);
      if (fpIndex !== -1) {
        fpCopy = 'dialerContacts';
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
        fpCopy = 'facebookPost';
        fpMatch = true;
      }
    } else if (
      questionLower.includes('video') ||
      questionLower.includes('watch')
    ) {
      fpIndex = findUIIndex(uiElements, ['video', 'watch', 'वीडियो']);
      if (fpIndex !== -1) {
        fpCopy = 'facebookVideo';
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
        fpCopy = 'youtubeSearch';
        fpMatch = true;
      }
    } else if (questionLower.includes('shorts')) {
      fpIndex = findUIIndex(uiElements, ['shorts']);
      if (fpIndex !== -1) {
        fpCopy = 'youtubeShorts';
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
        fpCopy = 'photosShare';
        fpMatch = true;
      }
    } else if (
      questionLower.includes('delete') ||
      questionLower.includes('hatao') ||
      questionLower.includes('डिलीट')
    ) {
      fpIndex = findUIIndex(uiElements, ['delete', 'trash', 'डिलीट']);
      if (fpIndex !== -1) {
        fpCopy = 'photosDelete';
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
        fpCopy = 'smsNewMessage';
        fpMatch = true;
      }
    } else if (
      questionLower.includes('otp') ||
      questionLower.includes('code')
    ) {
      fpIndex = findUIIndex(uiElements, ['unread', 'otp', 'message']);
      if (fpIndex !== -1) {
        fpCopy = 'smsReadMessage';
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
        fpCopy = 'contactsAdd';
        fpMatch = true;
      }
    } else if (
      questionLower.includes('search') ||
      questionLower.includes('khoj')
    ) {
      fpIndex = findUIIndex(uiElements, ['search', 'खोज']);
      if (fpIndex !== -1) {
        fpCopy = 'contactsSearch';
        fpMatch = true;
      }
    }
  }

  // Nothing app-specific matched: fall back to the generic elder intent
  // dictionary, which works across any package and localizes on its own.
  if (!fpMatch) {
    const intentFastMatch = matchElderIntent(question, uiElements, lang);
    if (
      intentFastMatch.highlightIndex !== null &&
      intentFastMatch.matchedIntent !== null
    ) {
      fpIndex = intentFastMatch.highlightIndex;
      fpIntentExplanation = intentFastMatch.explanation;
      fpMatch = true;
    }
  }

  if (!fpMatch) return null;
  return {
    explanation: fpCopy ? FAST_PATH_COPY[fpCopy][lang] : fpIntentExplanation,
    index: fpIndex,
  };
}
