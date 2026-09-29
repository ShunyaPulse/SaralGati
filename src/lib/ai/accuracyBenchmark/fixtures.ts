import type { GuidanceLang } from '@/lib/guidance/guidanceLanguage';

/**
 * The labelled screens the benchmark is scored against.
 *
 * Fixtures are written the way a device sends a screen (index-prefixed,
 * role-tagged lines) and the way an elder speaks (imperative, mostly Hinglish),
 * because a benchmark whose fixtures look nothing like production traffic
 * measures the fixtures.
 *
 * They live apart from the harness in `index.ts` so that adding a case is a
 * data change to one file with no logic around it, and so the scoring code can
 * be read without scrolling past 30 screens.
 */

export interface GuidanceCase {
  id: string;
  appPackage: string;
  question: string;
  /** Screen exactly as the companion sends it. */
  elements: string[];
  /**
   * The element the elder actually needs, or null when nothing should be
   * tapped. A deterministic engine that answers a null case is a false
   * positive: it short-circuits the model and the spotlight goes somewhere
   * unrelated.
   */
  expectedIndex: number | null;
  lang?: GuidanceLang;
  /** Why the case exists, so a failure is readable without the diff. */
  note?: string;
}

export const GUIDANCE_CASES: GuidanceCase[] = [
  // --- Communication -------------------------------------------------------
  {
    id: 'whatsapp-chat-video-call',
    appPackage: 'com.whatsapp',
    question: 'Ramesh ko video call lagao',
    elements: [
      '0:[BUTTON] Navigate up',
      '1:[TEXT] Ramesh Kumar (online)',
      '2:[BUTTON] Video call',
      '3:[BUTTON] Voice call',
      '4:[BUTTON] More options',
    ],
    expectedIndex: 2,
  },
  {
    id: 'whatsapp-chat-voice-call',
    appPackage: 'com.whatsapp',
    question: 'Ramesh se baat karni hai',
    elements: [
      '0:[BUTTON] Navigate up',
      '1:[TEXT] Ramesh Kumar (online)',
      '2:[BUTTON] Video call',
      '3:[BUTTON] Voice call',
      '4:[BUTTON] More options',
    ],
    expectedIndex: 3,
  },
  {
    id: 'whatsapp-list-video-call',
    appPackage: 'com.whatsapp',
    question: 'mujhe video call karni hai',
    elements: [
      '0:[TEXT] WhatsApp',
      '1:[BUTTON] Camera',
      '2:[BUTTON] Search',
      '3:[TEXT] Chats (5 unread)',
      '4:[BUTTON] Updates',
      '5:[BUTTON] Calls',
    ],
    expectedIndex: 5,
  },
  {
    id: 'whatsapp-list-preview-is-not-the-target',
    appPackage: 'com.whatsapp',
    question: 'video call karni hai',
    elements: [
      '0:[TEXT] Chats (5 unread)',
      '1:[TEXT] 📹 Video call',
      '2:[BUTTON] Calls',
      '3:[BUTTON] New chat',
    ],
    expectedIndex: 2,
    note: 'A call preview is status text; the real control is the Calls tab. A tappable "Video call" must not be confused with it either.',
  },
  {
    id: 'whatsapp-list-new-chat',
    appPackage: 'com.whatsapp',
    question: 'naya message bhejna hai',
    elements: [
      '0:[TEXT] WhatsApp',
      '1:[BUTTON] Camera',
      '2:[BUTTON] Search',
      '3:[BUTTON] New chat',
      '4:[BUTTON] Updates',
      '5:[BUTTON] Calls',
    ],
    expectedIndex: 3,
  },
  {
    id: 'whatsapp-list-status',
    appPackage: 'com.whatsapp',
    question: 'status dekhna hai',
    elements: [
      '0:[TEXT] WhatsApp',
      '1:[BUTTON] Camera',
      '2:[BUTTON] Search',
      '3:[BUTTON] New chat',
      '4:[BUTTON] Updates',
      '5:[BUTTON] Calls',
    ],
    expectedIndex: 4,
  },
  {
    id: 'dialer-call-contact',
    appPackage: 'com.google.android.dialer',
    question: 'Amit ko phone lagao',
    elements: [
      '0:[INPUT] Search contacts',
      '1:[TEXT] Amit Beta (+91 9876543210)',
      '2:[BUTTON] Call Amit Beta',
      '3:[BUTTON] Keypad',
    ],
    expectedIndex: 2,
  },
  {
    id: 'dialer-keypad',
    appPackage: 'com.google.android.dialer',
    question: 'number dial karke call karo',
    elements: [
      '0:[TEXT] 9820112233',
      '1:[BUTTON] 1',
      '2:[BUTTON] 2',
      '3:[BUTTON] Call SIM 1',
    ],
    expectedIndex: 3,
  },
  {
    id: 'messages-read-otp',
    appPackage: 'com.google.android.apps.messaging',
    question: 'bank ka OTP dikhao',
    elements: [
      '0:[INPUT] Search conversations',
      '1:[BUTTON] SBI-UPI: OTP for Rs 500 is 839210 (Unread)',
      '2:[BUTTON] Start chat',
    ],
    expectedIndex: 1,
  },
  {
    id: 'contacts-create',
    appPackage: 'com.android.contacts',
    question: 'naya number save karo',
    elements: ['0:[INPUT] Search contacts', '1:[BUTTON] Create new contact'],
    expectedIndex: 1,
  },
  {
    id: 'messaging-block-spam',
    appPackage: 'com.google.android.apps.messaging',
    question: 'is number ko block karo',
    elements: ['0:[BUTTON] Block', '1:[BUTTON] Report spam', '2:[BUTTON] Call'],
    expectedIndex: 0,
  },

  // --- Media ---------------------------------------------------------------
  {
    id: 'youtube-search',
    appPackage: 'com.google.android.youtube',
    question: 'bhajan dhoondho',
    elements: [
      '0:[BUTTON] Cast',
      '1:[BUTTON] Notifications',
      '2:[BUTTON] Search YouTube',
      '3:[TEXT] Trending bhajan 2026',
    ],
    expectedIndex: 2,
  },
  {
    id: 'youtube-counter-is-not-the-target',
    appPackage: 'com.google.android.youtube',
    question: 'video dhoondhni hai',
    elements: ['0:[TEXT] 4 videos', '1:[BUTTON] Search YouTube', '2:[BUTTON] Shorts'],
    expectedIndex: 1,
    note: 'A "4 videos" counter is furniture, not a search button.',
  },
  {
    id: 'youtube-subscribe',
    appPackage: 'com.google.android.youtube',
    question: 'ye channel join karna hai',
    elements: [
      '0:[TEXT] Bhakti Sagar Mandir',
      '1:[BUTTON] Subscribe',
      '2:[BUTTON] Like this video',
      '3:[BUTTON] Share',
    ],
    expectedIndex: 1,
  },
  {
    id: 'photos-delete',
    appPackage: 'com.google.android.apps.photos',
    question: 'ye bekaar photo hata do',
    elements: [
      '0:[BUTTON] Share photo',
      '1:[BUTTON] Edit',
      '2:[BUTTON] Delete',
      '3:[BUTTON] More options',
    ],
    expectedIndex: 2,
  },
  {
    id: 'facebook-like',
    appPackage: 'com.facebook.katana',
    question: 'ye photo achhi lagi',
    elements: ['0:[BUTTON] Like', '1:[BUTTON] Comment', '2:[BUTTON] Share', '3:[TEXT] Ramesh and 5 others'],
    expectedIndex: 0,
  },

  // --- Money ---------------------------------------------------------------
  {
    id: 'paytm-scan-and-pay',
    appPackage: 'net.one97.paytm',
    question: 'dukan par QR scan karke paise dene hain',
    elements: [
      '0:[BUTTON] Scan & Pay any QR',
      '1:[BUTTON] To Mobile Number',
      '2:[BUTTON] To Bank A/c',
      '3:[TEXT] Flat 50 cashback',
    ],
    expectedIndex: 0,
  },
  {
    id: 'paytm-balance',
    appPackage: 'net.one97.paytm',
    question: 'khate mein kitne paise bache hain',
    elements: [
      '0:[BUTTON] Scan QR',
      '1:[BUTTON] Check Balance & History',
      '2:[BUTTON] Personal Loan',
      '3:[TEXT] My UPI ID',
    ],
    expectedIndex: 1,
  },
  {
    id: 'phonepe-electricity-bill',
    appPackage: 'com.phonepe.app',
    question: 'bijli ka bill bharna hai',
    elements: [
      '0:[BUTTON] Mobile Recharge',
      '1:[BUTTON] Electricity Bill',
      '2:[BUTTON] DTH',
      '3:[TEXT] Recharge & Pay Bills',
    ],
    expectedIndex: 1,
  },
  {
    id: 'amazon-track-order',
    appPackage: 'in.amazon.mShop.android.shopping',
    question: 'mera parcel track karo',
    elements: [
      '0:[BUTTON] Open Menu',
      '1:[INPUT] Search Amazon.in',
      '2:[BUTTON] Returns & Orders',
      '3:[BUTTON] Cart',
    ],
    expectedIndex: 2,
  },
  {
    id: 'zomato-order-food',
    appPackage: 'com.application.zomato',
    question: 'roti sabji order karni hai',
    elements: [
      '0:[INPUT] Restaurant name or a dish...',
      '1:[BUTTON] Pure Veg mode',
      '2:[BUTTON] View Cart',
      '3:[TEXT] Great Offers',
    ],
    expectedIndex: 0,
  },

  // --- Travel & health -----------------------------------------------------
  {
    id: 'irctc-pnr',
    appPackage: 'cris.org.in.prs.ima',
    question: 'ticket confirm hui ya nahi check karo',
    elements: [
      '0:[BUTTON] Train Booking',
      '1:[BUTTON] PNR Enquiry',
      '2:[BUTTON] Cancel Ticket',
      '3:[TEXT] IRCTC Official',
    ],
    expectedIndex: 1,
  },
  {
    id: 'maps-directions',
    appPackage: 'com.google.android.apps.maps',
    question: 'hospital ka rasta batao',
    elements: [
      '0:[INPUT] Search here',
      '1:[BUTTON] Directions to Hospital',
      '2:[BUTTON] Start Navigation',
      '3:[TEXT] 12 mins via Ring Road',
    ],
    expectedIndex: 1,
  },
  {
    id: 'ola-book-ride',
    appPackage: 'com.olacabs.customer',
    question: 'station ke liye auto bula do',
    elements: ['0:[INPUT] Where to go?', '1:[BUTTON] Daily Rides', '2:[BUTTON] Rentals', '3:[TEXT] Welcome back'],
    expectedIndex: 0,
  },
  {
    id: 'pharmeasy-order-medicine',
    appPackage: 'com.aranoah.healthkart.plus',
    question: 'sugar ki dawai mangwani hai',
    elements: [
      '0:[INPUT] Search medicines and health products',
      '1:[BUTTON] Consult Doctor',
      '2:[BUTTON] Lab Tests',
      '3:[BUTTON] Cart',
    ],
    expectedIndex: 0,
  },

  // --- System --------------------------------------------------------------
  {
    id: 'settings-font-size',
    appPackage: 'com.android.settings',
    question: 'akshar bade karne hain',
    elements: [
      '0:[BUTTON] Network & internet',
      '1:[BUTTON] Display & brightness (Font size, Theme)',
      '2:[BUTTON] Sound & vibration',
      '3:[TEXT] Android Version',
    ],
    expectedIndex: 1,
  },
  {
    id: 'settings-wifi',
    appPackage: 'com.android.settings',
    question: 'wifi chalu karo',
    elements: [
      '0:[BUTTON] Airplane mode',
      '1:[TOGGLE] Wi-Fi Off',
      '2:[BUTTON] Bluetooth',
      '3:[TEXT] Internet settings',
    ],
    expectedIndex: 1,
  },

  // --- English mode --------------------------------------------------------
  {
    id: 'en-whatsapp-video-call',
    appPackage: 'com.whatsapp',
    question: 'make a video call to Ramesh',
    lang: 'en',
    elements: [
      '0:[BUTTON] Navigate up',
      '1:[TEXT] Ramesh Kumar (online)',
      '2:[BUTTON] Video call',
      '3:[BUTTON] Voice call',
    ],
    expectedIndex: 2,
  },
  {
    id: 'en-paytm-balance',
    appPackage: 'net.one97.paytm',
    question: 'show my balance',
    lang: 'en',
    elements: [
      '0:[BUTTON] Scan QR',
      '1:[BUTTON] Check Balance & History',
      '2:[BUTTON] Personal Loan',
    ],
    expectedIndex: 1,
  },

  // --- Nothing to tap ------------------------------------------------------
  {
    id: 'nothing-to-tap-ok-only',
    appPackage: 'com.unknown.bankapp',
    question: 'ye screen khol do',
    elements: ['0:[BUTTON] OK', '1:[BUTTON] Cancel'],
    expectedIndex: null,
    note: 'A yes/no dialog has no "next step" button; the spotlight must not be sent to OK.',
  },
];
