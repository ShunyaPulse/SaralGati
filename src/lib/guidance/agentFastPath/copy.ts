/**
 * Every sentence the fast path can speak, in one bilingual table.
 *
 * This is copy, not rules, so it lives apart from the matching engine in
 * `matching.ts`: a sentence can be fixed or a language added here without
 * touching the rule chain, and the type below is what makes the compiler
 * refuse a rule that only has one language.
 *
 * The table stays `as const` so `FastPathCopyKey` is a union of the real keys -
 * a typo'd key is a compile error rather than a silent fallback.
 */

/**
 * Every sentence this engine can speak, in both languages. Hinglish is spelled
 * in Latin script because that is how the companion has always sounded in
 * Hindi mode; the English column is what an English elder hears instead.
 */
export const FAST_PATH_COPY = {
  whatsappVideoCallButton: {
    hi: 'Video call karne ke liye yahan video call button par dabayein.',
    en: 'Tap here on the video call button to start a video call.',
  },
  whatsappCallsTabForVideo: {
    hi: 'Video ya audio call lagane ke liye niche Calls par dabayein, ya jis vyakti se baat karni hai unki chat kholein.',
    en: 'Tap Calls at the bottom, or open the chat of the person you want to talk to.',
  },
  whatsappVoiceCallButton: {
    hi: 'Call karne ke liye yahan dabayein.',
    en: 'Tap here to make the call.',
  },
  whatsappCallsTab: {
    hi: 'Call lagane ke liye niche Calls par dabayein, ya kisi ki chat kholein.',
    en: "Tap Calls at the bottom, or open someone's chat to make a call.",
  },
  whatsappStatus: {
    hi: 'Status (Updates) dekhne ke liye yahan dabayein.',
    en: 'Tap here to see Status (Updates).',
  },
  whatsappNewMessage: {
    hi: 'Naya message bhejne ke liye yahan dabayein.',
    en: 'Tap here to send a new message.',
  },
  dialerKeypad: {
    hi: 'Number dial karne ke liye yahan dabayein.',
    en: 'Tap here to dial a number.',
  },
  dialerCallContact: {
    hi: 'Is vyakti ko call lagane ke liye yahan dabayein.',
    en: 'Tap here to call this person.',
  },
  dialerPlaceCall: {
    hi: 'Number lag chuka hai, call karne ke liye niche Call par dabayein.',
    en: 'The number is already entered; tap Call below to place the call.',
  },
  dialerContacts: {
    hi: 'Sampark (Contacts) dekhne ke liye yahan dabayein.',
    en: 'Tap here to see your contacts.',
  },
  facebookPost: {
    hi: 'Photo ya post daalne ke liye yahan dabayein.',
    en: 'Tap here to add a photo or a post.',
  },
  facebookVideo: {
    hi: 'Video dekhne ke liye yahan dabayein.',
    en: 'Tap here to watch a video.',
  },
  youtubeSearch: {
    hi: 'Video khojne ke liye yahan dabayein.',
    en: 'Tap here to search for videos.',
  },
  youtubeShorts: {
    hi: 'Shorts dekhne ke liye yahan dabayein.',
    en: 'Tap here to watch Shorts.',
  },
  photosShare: {
    hi: 'Is photo ko kisi ko bhejne ke liye yahan share dabayein.',
    en: 'Tap share here to send this photo to someone.',
  },
  photosDelete: {
    hi: 'Is photo ko delete karne ke liye yahan dabayein.',
    en: 'Tap here to delete this photo.',
  },
  smsNewMessage: {
    hi: 'Naya message bhejne ke liye yahan click karein.',
    en: 'Tap here to send a new message.',
  },
  smsReadMessage: {
    hi: 'Apna message ya OTP padhne ke liye yahan dabayein.',
    en: 'Tap here to read your message or OTP.',
  },
  contactsAdd: {
    hi: 'Naya number save karne ke liye yahan dabayein.',
    en: 'Tap here to save a new number.',
  },
  contactsSearch: {
    hi: 'Kisi ka number khojne ke liye yahan dabayein.',
    en: "Tap here to find someone's number.",
  },
} as const;

export type FastPathCopyKey = keyof typeof FAST_PATH_COPY;
