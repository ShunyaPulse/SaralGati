import { MultiStepFlowDefinition } from './types';

export const COMMUNICATION_PLAYBOOKS: MultiStepFlowDefinition[] = [
  // 1. WhatsApp Video Call
  {
    id: 'whatsapp_video_call',
    name: 'WhatsApp Video Call',
    category: 'communication',
    triggerPatterns: ['video call', 'chehra dekh kar baat', 'vidiyo call', 'face call', 'camera call', 'वीडियो कॉल'],
    steps: [
      {
        stepNumber: 1,
        label: 'Open Contact / Chat',
        hindiInstruction: 'कदम 1/2: जिनसे बात करनी है, उनकी चैट या नाम पर दबाएं।',
        expectedKeywords: ['chat', 'contact', 'search', 'चैट', 'नाम']
      },
      {
        stepNumber: 2,
        label: 'Tap Video Call Icon',
        hindiInstruction: 'कदम 2/2: वीडियो कॉल लगाने के लिए ऊपर दिए गए वीडियो कैमरा बटन पर दबाएं।',
        expectedKeywords: ['video call', 'video_call', 'vc', 'camcorder', 'वीडियो']
      }
    ]
  },

  // 2. WhatsApp Audio Call
  {
    id: 'whatsapp_audio_call',
    name: 'WhatsApp Audio Call',
    category: 'communication',
    triggerPatterns: ['whatsapp call lagao', 'phone call lagao whatsapp', 'awaaz se baat', 'whatsapp phone', 'ऑडियो कॉल'],
    steps: [
      {
        stepNumber: 1,
        label: 'Select Contact',
        hindiInstruction: 'कदम 1/2: जिनकी कॉल लगानी है, उनकी चैट खोलें।',
        expectedKeywords: ['chat', 'contact', 'search', 'चैट']
      },
      {
        stepNumber: 2,
        label: 'Tap Voice Call Icon',
        hindiInstruction: 'कदम 2/2: कॉल लगाने के लिए ऊपर फोन/कॉल बटन पर दबाएं।',
        expectedKeywords: ['call', 'voice call', 'phone', 'कॉल', 'फोन']
      }
    ]
  },

  // 3. Send Text Message
  {
    id: 'whatsapp_send_message',
    name: 'Send Chat Message',
    category: 'communication',
    triggerPatterns: ['message bhejna', 'sandesh bhejo', 'kuch likh kar bhejo', 'chat message', 'मैसेज भेजो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Focus Input Field',
        hindiInstruction: 'कदम 1/2: लिखने के लिए नीचे दिए गए मैसेज बॉक्स पर दबाएं।',
        expectedKeywords: ['message', 'type a message', 'input', 'मैसेज']
      },
      {
        stepNumber: 2,
        label: 'Send Button',
        hindiInstruction: 'कदम 2/2: मैसेज भेजने के लिए यहाँ हरे तीर या सेंड बटन पर दबाएं।',
        expectedKeywords: ['send', 'bhejo', 'arrow', 'भेजें']
      }
    ]
  },

  // 4. Send Voice Note / Audio Message
  {
    id: 'whatsapp_voice_note',
    name: 'Send Voice Note',
    category: 'communication',
    triggerPatterns: ['bol kar message', 'awaaz bhejo', 'voice note bhejo', 'recording bhejna', 'वॉइस मैसेज'],
    steps: [
      {
        stepNumber: 1,
        label: 'Hold Mic Button',
        hindiInstruction: 'कदम 1/2: बोलकर भेजने के लिए नीचे दिए गए माइक (Mic) बटन को दबाकर रखें।',
        expectedKeywords: ['mic', 'voice', 'record', 'microphone', 'माइक']
      },
      {
        stepNumber: 2,
        label: 'Send Voice Recording',
        hindiInstruction: 'कदम 2/2: बोलने के बाद भेजने के लिए माइक को छोड़ दें या सेंड दबाएं।',
        expectedKeywords: ['send', 'mic', 'release', 'भेजें']
      }
    ]
  },

  // 5. Send Photo on WhatsApp
  {
    id: 'whatsapp_send_photo',
    name: 'Send Photo in Chat',
    category: 'communication',
    triggerPatterns: ['photo bhejo', 'tasveer bhejna', 'gallery se photo bhejo', 'photo share karo', 'फोटो भेजो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Tap Attachment / Gallery',
        hindiInstruction: 'कदम 1/2: फोटो चुनने के लिए यहाँ अटैचमेंट (पिन) या गैलरी पर दबाएं।',
        expectedKeywords: ['attach', 'gallery', 'camera', 'plus', 'गैलरी', 'कैमरा']
      },
      {
        stepNumber: 2,
        label: 'Send Photo Button',
        hindiInstruction: 'कदम 2/2: फोटो भेजने के लिए यहाँ सेंड (Send) बटन पर दबाएं।',
        expectedKeywords: ['send', 'share', 'bhejo', 'भेजें']
      }
    ]
  },

  // 6. Share Contact
  {
    id: 'whatsapp_send_contact',
    name: 'Share Contact in Chat',
    category: 'communication',
    triggerPatterns: ['kisi ka number bhejna', 'contact bhejo', 'number share karo', 'संपर्क भेजो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Attachment Menu',
        hindiInstruction: 'कदम 1/3: नीचे अटैचमेंट (पिन) आइकन पर दबाएं।',
        expectedKeywords: ['attach', 'clip', 'plus', 'पिन']
      },
      {
        stepNumber: 2,
        label: 'Choose Contact Option',
        hindiInstruction: 'कदम 2/3: यहाँ कॉन्टैक्ट (Contact) विकल्प पर दबाएं।',
        expectedKeywords: ['contact', 'people', 'संपर्क']
      },
      {
        stepNumber: 3,
        label: 'Confirm and Send',
        hindiInstruction: 'कदम 3/3: नंबर चुनकर भेजने के लिए सेंड दबाएं।',
        expectedKeywords: ['send', 'forward', 'भेजें']
      }
    ]
  },

  // 7. Share Live Location
  {
    id: 'whatsapp_send_location',
    name: 'Share Location in Chat',
    category: 'communication',
    triggerPatterns: ['apni jagah bhejo', 'location share karo', 'kahan hoon batao', 'लोकेशन भेजो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Attachment Menu',
        hindiInstruction: 'कदम 1/2: नीचे अटैचमेंट बटन पर दबाएं।',
        expectedKeywords: ['attach', 'clip', 'plus']
      },
      {
        stepNumber: 2,
        label: 'Send Location',
        hindiInstruction: 'कदम 2/2: यहाँ लोकेशन (Location) पर दबाकर अपनी जगह भेजें।',
        expectedKeywords: ['location', 'map', 'gps', 'लोकेशन']
      }
    ]
  },

  // 8. Post Status / Story
  {
    id: 'whatsapp_post_status',
    name: 'Post Status / Story',
    category: 'communication',
    triggerPatterns: ['status lagana', 'status lagao', 'apna status', 'story daalo', 'स्टेटस लगाओ'],
    steps: [
      {
        stepNumber: 1,
        label: 'Go to Updates/Status Tab',
        hindiInstruction: 'कदम 1/2: ऊपर या नीचे दिए गए स्टेटस (Updates) टैब पर दबाएं।',
        expectedKeywords: ['updates', 'status', 'स्टेटस']
      },
      {
        stepNumber: 2,
        label: 'Add Status',
        hindiInstruction: 'कदम 2/2: नया स्टेटस लगाने के लिए कैमरा या माय स्टेटस (+) पर दबाएं।',
        expectedKeywords: ['my status', 'camera', 'pencil', 'add', 'नया']
      }
    ]
  },

  // 9. Create New Group
  {
    id: 'whatsapp_create_group',
    name: 'Create Family Group',
    category: 'communication',
    triggerPatterns: ['naya group banao', 'family group banana', 'group create', 'नया ग्रुप'],
    steps: [
      {
        stepNumber: 1,
        label: 'Menu or New Chat',
        hindiInstruction: 'कदम 1/2: नया ग्रुप बनाने के लिए ऊपर तीन बिंदु (Menu) या नए चैट बटन पर दबाएं।',
        expectedKeywords: ['new chat', 'more options', 'menu', 'teen bindu']
      },
      {
        stepNumber: 2,
        label: 'Select New Group',
        hindiInstruction: 'कदम 2/2: यहाँ न्यू ग्रुप (New Group) पर दबाएं।',
        expectedKeywords: ['new group', 'create group', 'नया ग्रुप']
      }
    ]
  },

  // 10. Clear Chat History
  {
    id: 'whatsapp_clear_chat',
    name: 'Clear Chat Messages',
    category: 'communication',
    triggerPatterns: ['chat saaf karo', 'message mitao', 'clear chat', 'purane message hatao', 'चैट साफ करो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Three Dots Menu',
        hindiInstruction: 'कदम 1/2: चैट के ऊपर दिए गए तीन बिंदुओं (Menu) पर दबाएं।',
        expectedKeywords: ['more options', 'menu', 'overflow', 'तीन बिंदु']
      },
      {
        stepNumber: 2,
        label: 'Clear Chat Option',
        hindiInstruction: 'कदम 2/2: यहाँ मोर (More) में जाकर क्लियर चैट (Clear chat) दबाएं।',
        expectedKeywords: ['clear chat', 'more', 'saaf', 'हटाएं']
      }
    ]
  },

  // 11. Block Spam Contact
  {
    id: 'whatsapp_block_contact',
    name: 'Block Spam Contact',
    category: 'communication',
    triggerPatterns: ['number block karo', 'faltu call roko', 'block whatsapp', 'ब्लॉक करो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Chat Menu',
        hindiInstruction: 'कदम 1/2: ऊपर दिए गए तीन बिंदुओं (Menu) पर दबाएं।',
        expectedKeywords: ['more options', 'menu', 'three dots']
      },
      {
        stepNumber: 2,
        label: 'Block Contact',
        hindiInstruction: 'कदम 2/2: यहाँ ब्लॉक (Block) विकल्प पर दबाएं।',
        expectedKeywords: ['block', 'report', 'ब्लॉक']
      }
    ]
  },

  // 12. Phone Dialer - Call Number
  {
    id: 'phone_dial_number',
    name: 'Dial Phone Number',
    category: 'communication',
    triggerPatterns: ['phone lagana hai', 'number milana hai', 'dial karo', 'call karna hai phone se', 'फोन लगाओ'],
    steps: [
      {
        stepNumber: 1,
        label: 'Open Keypad',
        hindiInstruction: 'कदम 1/2: नंबर लिखने के लिए डायलपैड (Keypad) आइकन पर दबाएं।',
        expectedKeywords: ['dialpad', 'keypad', 'dial', 'कीपैड']
      },
      {
        stepNumber: 2,
        label: 'Green Call Button',
        hindiInstruction: 'कदम 2/2: नंबर डायल करने के बाद नीचे हरे कॉल बटन पर दबाएं।',
        expectedKeywords: ['call', 'dial', 'phone', 'कॉल']
      }
    ]
  },

  // 13. Phone - Save New Contact
  {
    id: 'phone_save_new_contact',
    name: 'Save New Contact',
    category: 'communication',
    triggerPatterns: ['naya number save', 'contact jodna', 'naya contact banana', 'number save karo', 'नया नंबर सेव'],
    steps: [
      {
        stepNumber: 1,
        label: 'Add Contact Button',
        hindiInstruction: 'कदम 1/3: नया संपर्क जोड़ने के लिए यहाँ प्लस (+) या Create Contact पर दबाएं।',
        expectedKeywords: ['create', 'new', 'add', '+', 'प्लस', 'नया', 'जोड़ें']
      },
      {
        stepNumber: 2,
        label: 'Enter Name',
        hindiInstruction: 'कदम 2/3: यहाँ व्यक्ति का नाम लिखें।',
        expectedKeywords: ['name', 'first name', 'naam', 'नाम']
      },
      {
        stepNumber: 3,
        label: 'Save Button',
        hindiInstruction: 'कदम 3/3: नंबर सुरक्षित करने के लिए ऊपर या नीचे सेव (Save) दबाएं।',
        expectedKeywords: ['save', 'done', 'check', 'सेव', 'सुरक्षित']
      }
    ]
  },

  // 14. View Recent Call Logs
  {
    id: 'phone_view_call_logs',
    name: 'View Recent Call Logs',
    category: 'communication',
    triggerPatterns: ['kisne call kiya tha', 'purane phone dekhna', 'call history', 'missed call check', 'कॉल हिस्ट्री'],
    steps: [
      {
        stepNumber: 1,
        label: 'Recents Tab',
        hindiInstruction: 'कदम 1/2: हाल की कॉल देखने के लिए रीसेंट्स (Recents) टैब पर दबाएं।',
        expectedKeywords: ['recents', 'recent', 'history', 'logs', 'हालिया']
      },
      {
        stepNumber: 2,
        label: 'Call Details / Redial',
        hindiInstruction: 'कदम 2/2: नंबर की जानकारी देखने या वापस कॉल लगाने के लिए नाम पर दबाएं।',
        expectedKeywords: ['call', 'details', 'info', 'कॉल']
      }
    ]
  },

  // 15. Send SMS Message
  {
    id: 'sms_send_new',
    name: 'Send SMS Message',
    category: 'communication',
    triggerPatterns: ['sms bhejna', 'sadharan message', 'naya sms', 'sms kaise karein', 'एसएमएस भेजो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Start Chat Button',
        hindiInstruction: 'कदम 1/2: नया संदेश शुरू करने के लिए यहाँ स्टार्ट चैट (Start Chat) पर दबाएं।',
        expectedKeywords: ['start chat', 'compose', 'new message', 'नया संदेश']
      },
      {
        stepNumber: 2,
        label: 'Send SMS',
        hindiInstruction: 'कदम 2/2: मैसेज लिखकर सेंड (SMS) तीर वाले बटन पर दबाएं।',
        expectedKeywords: ['send', 'sms', 'arrow', 'भेजें']
      }
    ]
  }
];
