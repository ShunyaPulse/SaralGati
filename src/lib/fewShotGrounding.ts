export interface FewShotExample {
  id: number;
  appPackage: string;
  category: string;
  question: string;
  elements: string[];
  response: string;
}

export const CRISP_FEW_SHOT_EXAMPLES: FewShotExample[] = [
  // 1. WhatsApp: Video call from inside active chat
  {
    id: 1,
    appPackage: 'com.whatsapp',
    category: 'communication',
    question: 'Ramesh ko video call lagao',
    elements: [
      '0:[BUTTON] Navigate up',
      '1:[TEXT] Ramesh Kumar (online)',
      '2:[BUTTON] Video call',
      '3:[BUTTON] Voice call',
      '4:[BUTTON] More options'
    ],
    response: 'रमेश को वीडियो कॉल लगाने के लिए ऊपर वीडियो कॉल बटन पर दबाएं। TARGET:2'
  },

  // 2. WhatsApp: Video call intent on main chats list (Disambiguation)
  {
    id: 2,
    appPackage: 'com.whatsapp',
    category: 'communication',
    question: 'Mujhe video call karni hai',
    elements: [
      '0:[TEXT] WhatsApp',
      '1:[BUTTON] Camera',
      '2:[BUTTON] Search',
      '3:[TEXT] Chats (5 unread)',
      '4:[BUTTON] Updates',
      '5:[BUTTON] Calls'
    ],
    response: 'कॉल लगाने के लिए नीचे Calls (कॉल) विकल्प पर दबाएं, या जिस व्यक्ति से बात करनी है उनकी चैट खोलें। TARGET:5'
  },

  // 3. WhatsApp: Send photo in chat
  {
    id: 3,
    appPackage: 'com.whatsapp',
    category: 'communication',
    question: 'Photo kaise bheju?',
    elements: [
      '0:[INPUT] Message',
      '1:[BUTTON] Attach file',
      '2:[BUTTON] Camera',
      '3:[BUTTON] Voice message'
    ],
    response: 'फोटो भेजने के लिए यहाँ अटैचमेंट (पिन) या कैमरा बटन पर दबाएं। TARGET:1'
  },

  // 4. Phone Dialer: Call son from contact list
  {
    id: 4,
    appPackage: 'com.google.android.dialer',
    category: 'communication',
    question: 'Amit ko phone lagao',
    elements: [
      '0:[INPUT] Search contacts',
      '1:[TEXT] Amit Beta (+91 9876543210)',
      '2:[BUTTON] Call Amit Beta',
      '3:[BUTTON] Keypad'
    ],
    response: 'अमित को फोन करने के लिए यहाँ कॉल बटन पर दबाएं। TARGET:2'
  },

  // 5. Phone Dialer: Open Keypad & Call
  {
    id: 5,
    appPackage: 'com.google.android.dialer',
    category: 'communication',
    question: 'Number dial karke call karo',
    elements: [
      '0:[TEXT] 9820112233',
      '1:[BUTTON] 1',
      '2:[BUTTON] 2',
      '3:[BUTTON] Call SIM 1'
    ],
    response: 'फोन लगाने के लिए नीचे हरे कॉल बटन पर दबाएं। TARGET:3'
  },

  // 6. YouTube: Search bhajan
  {
    id: 6,
    appPackage: 'com.google.android.youtube',
    category: 'devotion',
    question: 'Ram bhajan sunna hai, dhoondho',
    elements: [
      '0:[BUTTON] Cast',
      '1:[BUTTON] Notifications',
      '2:[BUTTON] Search YouTube',
      '3:[TEXT] Trending bhajan 2026'
    ],
    response: 'भजन खोजने के लिए ऊपर सर्च (लेंस) बटन पर दबाएं। TARGET:2'
  },

  // 7. YouTube: Subscribe channel
  {
    id: 7,
    appPackage: 'com.google.android.youtube',
    category: 'entertainment',
    question: 'Ye channel judna hai',
    elements: [
      '0:[TEXT] Bhakti Sagar Mandir',
      '1:[BUTTON] Subscribe',
      '2:[BUTTON] Like this video',
      '3:[BUTTON] Share'
    ],
    response: 'चैनल से जुड़ने के लिए यहाँ सब्सक्राइब (Subscribe) पर दबाएं। TARGET:1'
  },

  // 8. Paytm: Scan QR Code at shop
  {
    id: 8,
    appPackage: 'net.one97.paytm',
    category: 'finance_upi',
    question: 'Dukan par QR code scan karke paise dene hain',
    elements: [
      '0:[BUTTON] Scan & Pay any QR',
      '1:[BUTTON] To Mobile Number',
      '2:[BUTTON] To Bank A/c',
      '3:[TEXT] Flat 50 cashback'
    ],
    response: 'दुकान का कोड स्कैन करने के लिए Scan & Pay पर दबाएं। TARGET:0'
  },

  // 9. Paytm: Check bank balance
  {
    id: 9,
    appPackage: 'net.one97.paytm',
    category: 'finance_upi',
    question: 'Khate me kitne paise bache hain check karo',
    elements: [
      '0:[BUTTON] Scan QR',
      '1:[BUTTON] Check Balance & History',
      '2:[BUTTON] Personal Loan',
      '3:[TEXT] My UPI ID'
    ],
    response: 'बैंक बैलेंस देखने के लिए Check Balance पर दबाएं। TARGET:1'
  },

  // 10. PhonePe: Electricity Bill Payment
  {
    id: 10,
    appPackage: 'com.phonepe.app',
    category: 'finance_upi',
    question: 'Bijli ka bill bharna hai',
    elements: [
      '0:[BUTTON] Mobile Recharge',
      '1:[BUTTON] Electricity Bill',
      '2:[BUTTON] DTH',
      '3:[TEXT] Recharge & Pay Bills'
    ],
    response: 'बिजली का बिल भरने के लिए Electricity बटन पर दबाएं। TARGET:1'
  },

  // 11. Tata 1mg: Order Medicines
  {
    id: 11,
    appPackage: 'com.aranoah.healthkart.plus',
    category: 'health_medical',
    question: 'Sugar ki dawai mangwani hai',
    elements: [
      '0:[INPUT] Search medicines and health products',
      '1:[BUTTON] Consult Doctor',
      '2:[BUTTON] Lab Tests',
      '3:[BUTTON] Cart'
    ],
    response: 'दवाई खोजने और मंगाने के लिए ऊपर सर्च बॉक्स पर दबाएं। TARGET:0'
  },

  // 12. Amazon: Track order delivery
  {
    id: 12,
    appPackage: 'in.amazon.mShop.android.shopping',
    category: 'ecommerce_food',
    question: 'Mera parcel kahan pahuncha?',
    elements: [
      '0:[BUTTON] Open Menu',
      '1:[INPUT] Search Amazon.in',
      '2:[BUTTON] Returns & Orders',
      '3:[BUTTON] Cart'
    ],
    response: 'अपना सामान और डिलीवरी ट्रैक करने के लिए Returns & Orders पर दबाएं। TARGET:2'
  },

  // 13. Zomato: Order food
  {
    id: 13,
    appPackage: 'com.application.zomato',
    category: 'ecommerce_food',
    question: 'Roti sabji order karni hai',
    elements: [
      '0:[INPUT] Restaurant name or a dish...',
      '1:[BUTTON] Pure Veg mode',
      '2:[BUTTON] View Cart',
      '3:[TEXT] Great Offers'
    ],
    response: 'खाना खोजने के लिए ऊपर सर्च बार पर दबाएं। TARGET:0'
  },

  // 14. Ola: Book Auto to railway station
  {
    id: 14,
    appPackage: 'com.olacabs.customer',
    category: 'travel_transit',
    question: 'Station ke liye auto bula do',
    elements: [
      '0:[INPUT] Where to go?',
      '1:[BUTTON] Daily Rides',
      '2:[BUTTON] Rentals',
      '3:[TEXT] Welcome back'
    ],
    response: 'जहाँ जाना है वह जगह लिखने के लिए Where to go पर दबाएं। TARGET:0'
  },

  // 15. IRCTC: Check Train PNR status
  {
    id: 15,
    appPackage: 'cris.org.in.prs.ima',
    category: 'travel_transit',
    question: 'Train ki ticket confirm hui ya nahi check karo',
    elements: [
      '0:[BUTTON] Train Booking',
      '1:[BUTTON] PNR Enquiry',
      '2:[BUTTON] Cancel Ticket',
      '3:[TEXT] IRCTC Official'
    ],
    response: 'टिकट कन्फर्मेशन चेक करने के लिए PNR Enquiry पर दबाएं। TARGET:1'
  },

  // 16. Google Maps: Find hospital route
  {
    id: 16,
    appPackage: 'com.google.android.apps.maps',
    category: 'travel_transit',
    question: 'Hospital ka rasta batao',
    elements: [
      '0:[INPUT] Search here',
      '1:[BUTTON] Directions to Hospital',
      '2:[BUTTON] Start Navigation',
      '3:[TEXT] 12 mins via Ring Road'
    ],
    response: 'अस्पताल का रास्ता देखने के लिए Directions पर दबाएं। TARGET:1'
  },

  // 17. Android Settings: Increase font size / Large text
  {
    id: 17,
    appPackage: 'com.android.settings',
    category: 'system_accessibility',
    question: 'Akshar bade karne hain, padhne me dikkat hai',
    elements: [
      '0:[BUTTON] Network & internet',
      '1:[BUTTON] Display & brightness (Font size, Theme)',
      '2:[BUTTON] Sound & vibration',
      '3:[TEXT] Android Version'
    ],
    response: 'अक्षर बड़े करने के लिए Display & brightness पर दबाएं। TARGET:1'
  },

  // 18. Android Settings: WiFi Toggle
  {
    id: 18,
    appPackage: 'com.android.settings',
    category: 'system_accessibility',
    question: 'Wifi chalu karo',
    elements: [
      '0:[BUTTON] Airplane mode',
      '1:[TOGGLE] Wi-Fi Off',
      '2:[BUTTON] Bluetooth',
      '3:[TEXT] Internet settings'
    ],
    response: 'इंटरनेट चालू करने के लिए Wi-Fi के सामने वाले बटन को दबाएं। TARGET:1'
  },

  // 19. Google Photos: Delete unwanted photo
  {
    id: 19,
    appPackage: 'com.google.android.apps.photos',
    category: 'media',
    question: 'Ye bekaar photo hata do',
    elements: [
      '0:[BUTTON] Share photo',
      '1:[BUTTON] Edit',
      '2:[BUTTON] Delete',
      '3:[BUTTON] More options'
    ],
    response: 'फोटो हटाने के लिए नीचे Delete (कचरा पेटी) पर दबाएं। TARGET:2'
  },

  // 20. SMS Messages: Read bank OTP
  {
    id: 20,
    appPackage: 'com.google.android.apps.messaging',
    category: 'finance_upi',
    question: 'Bank ka OTP kahan aaya hai?',
    elements: [
      '0:[INPUT] Search conversations',
      '1:[BUTTON] SBI-UPI: OTP for Rs 500 is 839210 (Unread)',
      '2:[BUTTON] Start chat',
      '3:[TEXT] Yesterday'
    ],
    response: 'अपना बैंक OTP देखने के लिए ऊपर बैंक वाले मैसेज पर दबाएं। TARGET:1'
  }
];

/**
 * Dynamically formats and selects the most relevant few-shot grounding examples.
 * Prioritizes matching appPackage and intent, keeping prompt concise (~250-350 tokens).
 */
export function formatRelevantFewShots(
  appPackage?: string,
  question?: string,
  count: number = 4
): string {
  const qLower = (question || '').toLowerCase();
  const pkgLower = (appPackage || '').toLowerCase();

  // Score each few-shot example based on relevance
  const scored = CRISP_FEW_SHOT_EXAMPLES.map((ex) => {
    let score = 0;
    if (pkgLower && (ex.appPackage.includes(pkgLower) || pkgLower.includes(ex.appPackage))) {
      score += 10;
    }
    // Check keyword overlap
    const exWords = ex.question.toLowerCase().split(/\s+/);
    for (const w of exWords) {
      if (w.length >= 3 && qLower.includes(w)) {
        score += 3;
      }
    }
    return { example: ex, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Take top N examples
  const selected = scored.slice(0, count).map((s) => s.example);

  return selected
    .map(
      (ex, i) =>
        `Example ${i + 1} (${ex.appPackage}):
Screen:
${ex.elements.map((el) => `  ${el}`).join('\n')}
Question: "${ex.question}"
Answer: ${ex.response}`
    )
    .join('\n\n');
}

/**
 * Returns all 20 few-shot grounding examples formatted.
 */
export function formatAll20FewShots(): string {
  return CRISP_FEW_SHOT_EXAMPLES.map(
    (ex, i) =>
      `Example ${i + 1} (${ex.appPackage}):
Screen:
${ex.elements.map((el) => `  ${el}`).join('\n')}
Question: "${ex.question}"
Answer: ${ex.response}`
  ).join('\n\n');
}
