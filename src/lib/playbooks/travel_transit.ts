import { MultiStepFlowDefinition } from './types';

export const TRAVEL_TRANSIT_PLAYBOOKS: MultiStepFlowDefinition[] = [
  // 1. IRCTC Train Ticket Booking
  {
    id: 'irctc_train_ticket_book',
    name: 'Book Train Ticket',
    category: 'travel_transit',
    triggerPatterns: ['train ki ticket book', 'railway ticket book', 'irctc ticket', 'रेल टिकट बुक'],
    steps: [
      {
        stepNumber: 1,
        label: 'Enter From and To Station',
        hindiInstruction: 'कदम 1/3: स्टेशन के नाम और यात्रा की तारीख चुनने के लिए यहाँ दबाएं।',
        expectedKeywords: ['from', 'to', 'search trains', 'गाड़ी खोजें']
      },
      {
        stepNumber: 2,
        label: 'Select Class & Quota',
        hindiInstruction: 'कदम 2/3: अपनी मनपसंद ट्रेन और क्लास (Sleeper/3AC) चुनें।',
        expectedKeywords: ['sleeper', '3a', 'sl', 'available', 'सीट']
      },
      {
        stepNumber: 3,
        label: 'Passenger Details & Pay',
        hindiInstruction: 'कदम 3/3: यात्री का नाम लिखकर पे (Pay) पर दबाएं।',
        expectedKeywords: ['book ticket', 'passenger', 'pay', 'टिकट बुक']
      }
    ]
  },

  // 2. Check PNR Status
  {
    id: 'irctc_pnr_status_check',
    name: 'Check PNR Status',
    category: 'travel_transit',
    triggerPatterns: ['pnr status dekhna', 'seat confirm hui ya nahi', 'pnr number check', 'पीएनआर स्टेटस'],
    steps: [
      {
        stepNumber: 1,
        label: 'PNR Option',
        hindiInstruction: 'कदम 1/2: पीएनआर चेक करने के लिए PNR Status पर दबाएं।',
        expectedKeywords: ['pnr', 'pnr status', 'पीएनआर']
      },
      {
        stepNumber: 2,
        label: 'Enter 10-digit PNR',
        hindiInstruction: 'कदम 2/2: यहाँ टिकट का 10 अंकों का PNR नंबर लिखकर Search दबाएं।',
        expectedKeywords: ['search', 'submit', 'check', 'खोजें']
      }
    ]
  },

  // 3. Live Train Running Status
  {
    id: 'train_live_running_status',
    name: 'Live Train Running Status',
    category: 'travel_transit',
    triggerPatterns: ['train kahan pahunchi', 'gaadi kahan hai', 'train late hai kya', 'ट्रेन कहाँ पहुंची'],
    steps: [
      {
        stepNumber: 1,
        label: 'Spot Your Train',
        hindiInstruction: 'कदम 1/2: ट्रेन की लाइव जगह देखने के लिए Live Status पर दबाएं।',
        expectedKeywords: ['spot train', 'running status', 'live status', 'ट्रेन']
      },
      {
        stepNumber: 2,
        label: 'Enter Train Number',
        hindiInstruction: 'कदम 2/2: यहाँ अपनी ट्रेन का नाम या 5 अंकों का नंबर लिखें।',
        expectedKeywords: ['train number', 'search', 'खोजें']
      }
    ]
  },

  // 4. Metro Smart Card Recharge
  {
    id: 'metro_smart_card_recharge',
    name: 'Metro Smart Card Recharge',
    category: 'travel_transit',
    triggerPatterns: ['metro card recharge', 'metro ke paise dalna', 'dmrc card recharge', 'मेट्रो कार्ड रिचार्ज'],
    steps: [
      {
        stepNumber: 1,
        label: 'Metro Card Icon',
        hindiInstruction: 'कदम 1/3: मेट्रो कार्ड के लिए Metro विकल्प पर दबाएं।',
        expectedKeywords: ['metro', 'metro card', 'smart card', 'मेट्रो']
      },
      {
        stepNumber: 2,
        label: 'Enter Metro Card Number',
        hindiInstruction: 'कदम 2/3: अपने कार्ड के पीछे लिखा नंबर डालें।',
        expectedKeywords: ['card number', 'engrave', 'नंबर']
      },
      {
        stepNumber: 3,
        label: 'Pay Recharge',
        hindiInstruction: 'कदम 3/3: पैसे भरने के लिए पे (Pay) पर दबाएं।',
        expectedKeywords: ['pay', 'proceed', 'पे']
      }
    ]
  },

  // 5. Book Uber Cab
  {
    id: 'uber_cab_book',
    name: 'Book Uber Cab',
    category: 'travel_transit',
    triggerPatterns: ['uber cab book', 'uber bulao', 'gaadi book karo', 'ऊबर बुक करो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Where to Input',
        hindiInstruction: 'कदम 1/3: आप जहाँ जाना चाहते हैं, वह जगह Where to में लिखें।',
        expectedKeywords: ['where to', 'destination', 'search', 'कहाँ']
      },
      {
        stepNumber: 2,
        label: 'Select Uber Ride',
        hindiInstruction: 'कदम 2/3: अपनी पसंद की गाड़ी (जैसे Uber Auto या Go) चुनें।',
        expectedKeywords: ['uber auto', 'uber go', 'ride', 'ऑटो']
      },
      {
        stepNumber: 3,
        label: 'Confirm Uber',
        hindiInstruction: 'कदम 3/3: गाड़ी बुलाने के लिए Confirm पर दबाएं।',
        expectedKeywords: ['confirm', 'book', 'बुक']
      }
    ]
  },

  // 6. Book Ola Auto
  {
    id: 'ola_auto_book',
    name: 'Book Ola Auto',
    category: 'travel_transit',
    triggerPatterns: ['ola auto bulao', 'auto book karo', 'ola bulao', 'ओला ऑटो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Destination Search',
        hindiInstruction: 'कदम 1/3: अपनी मंजिल का नाम Search Destination में लिखें।',
        expectedKeywords: ['search destination', 'where to', 'खोजें']
      },
      {
        stepNumber: 2,
        label: 'Select Auto',
        hindiInstruction: 'कदम 2/3: यहाँ Auto विकल्प पर दबाएं।',
        expectedKeywords: ['auto', 'ola auto', 'ऑटो']
      },
      {
        stepNumber: 3,
        label: 'Book Auto',
        hindiInstruction: 'कदम 3/3: ऑटो बुलाने के लिए Book Auto पर दबाएं।',
        expectedKeywords: ['book auto', 'confirm', 'बुक']
      }
    ]
  },

  // 7. Book Bus Ticket (RedBus)
  {
    id: 'redbus_ticket_book',
    name: 'Book Bus Ticket (RedBus / State Roadways)',
    category: 'travel_transit',
    triggerPatterns: ['bus ticket book', 'bus ki seat', 'redbus book', 'रोडवेज बस टिकट'],
    steps: [
      {
        stepNumber: 1,
        label: 'From & To Cities',
        hindiInstruction: 'कदम 1/3: शहर और यात्रा की तारीख चुनने के लिए यहाँ दबाएं।',
        expectedKeywords: ['from', 'to', 'search buses', 'बस खोजें']
      },
      {
        stepNumber: 2,
        label: 'Select Bus & Seat',
        hindiInstruction: 'कदम 2/3: अपनी पसंदीदा बस और सीट चुनें।',
        expectedKeywords: ['select seat', 'sleeper', 'seater', 'सीट']
      },
      {
        stepNumber: 3,
        label: 'Confirm and Pay',
        hindiInstruction: 'कदम 3/3: टिकट पक्की करने के लिए Proceed to Pay दबाएं।',
        expectedKeywords: ['pay', 'proceed', 'पे']
      }
    ]
  },

  // 8. Google Maps Navigate Home
  {
    id: 'google_maps_home_route',
    name: 'Navigate Home via Google Maps',
    category: 'travel_transit',
    triggerPatterns: ['ghar ka rasta', 'ghar kaise jaun', 'home navigation', 'maps ghar', 'घर का रास्ता'],
    steps: [
      {
        stepNumber: 1,
        label: 'Home Shortcut / Search',
        hindiInstruction: 'कदम 1/2: घर का रास्ता देखने के लिए Home शॉर्टकट पर दबाएं।',
        expectedKeywords: ['home', 'directions', 'घर']
      },
      {
        stepNumber: 2,
        label: 'Start Navigation',
        hindiInstruction: 'कदम 2/2: बोलकर रास्ता सुनने के लिए Start (शुरू करें) बटन पर दबाएं।',
        expectedKeywords: ['start', 'navigate', 'शुरू']
      }
    ]
  },

  // 9. Find Nearby Petrol Pump / CNG
  {
    id: 'petrol_pump_find_nearby',
    name: 'Find Nearby Petrol / CNG Station',
    category: 'travel_transit',
    triggerPatterns: ['pass ka petrol pump', 'cng pump kahan hai', 'petrol bharwana hai', 'पेट्रोल पंप'],
    steps: [
      {
        stepNumber: 1,
        label: 'Gas / Petrol Filter',
        hindiInstruction: 'कदम 1/2: पास का पंप देखने के लिए Petrol Pumps पर दबाएं।',
        expectedKeywords: ['gas', 'petrol', 'fuel', 'पंप']
      },
      {
        stepNumber: 2,
        label: 'Directions',
        hindiInstruction: 'कदम 2/2: पंप का रास्ता देखने के लिए Directions दबाएं।',
        expectedKeywords: ['directions', 'start', 'रास्ता']
      }
    ]
  },

  // 10. Flight Web Check-in
  {
    id: 'flight_web_checkin',
    name: 'Flight Web Check-in & Boarding Pass',
    category: 'travel_transit',
    triggerPatterns: ['flight check in', 'hawai jahaj boarding pass', 'web checkin', 'वेब चेक-इन'],
    steps: [
      {
        stepNumber: 1,
        label: 'Web Check-in Option',
        hindiInstruction: 'कदम 1/2: चेक-इन के लिए Web Check-in विकल्प पर दबाएं।',
        expectedKeywords: ['check-in', 'boarding pass', 'चेक-इन']
      },
      {
        stepNumber: 2,
        label: 'PNR & Download Pass',
        hindiInstruction: 'कदम 2/2: पीएनआर लिखकर अपना बोर्डिंग पास डाउनलोड करें।',
        expectedKeywords: ['download', 'pnr', 'seat', 'पास']
      }
    ]
  },

  // 11. Find Parking Slot
  {
    id: 'parking_slot_find',
    name: 'Find Nearby Car / Scooter Parking',
    category: 'travel_transit',
    triggerPatterns: ['parking kahan hai', 'gaadi khadi karni hai', 'pass ki parking', 'पार्किंग'],
    steps: [
      {
        stepNumber: 1,
        label: 'Parking Search',
        hindiInstruction: 'कदम 1/2: पार्किंग खोजने के लिए Parking विकल्प पर दबाएं।',
        expectedKeywords: ['parking', 'parking lot', 'पार्किंग']
      },
      {
        stepNumber: 2,
        label: 'Navigate to Parking',
        hindiInstruction: 'कदम 2/2: पार्किंग का रास्ता देखने के लिए Directions दबाएं।',
        expectedKeywords: ['directions', 'start', 'रास्ता']
      }
    ]
  },

  // 12. Check Traffic Route
  {
    id: 'traffic_check_route',
    name: 'Check Traffic and Road Jams',
    category: 'travel_transit',
    triggerPatterns: ['jam laga hai kya', 'rasta saaf hai kya', 'traffic check karo', 'ट्रैफिक'],
    steps: [
      {
        stepNumber: 1,
        label: 'Traffic Layer',
        hindiInstruction: 'कदम 1/2: जाम देखने के लिए ऊपर लेयर आइकन से Traffic चुनें।',
        expectedKeywords: ['layers', 'traffic', 'ट्रैफिक']
      },
      {
        stepNumber: 2,
        label: 'View Red / Yellow Jam Lines',
        hindiInstruction: 'कदम 2/2: लाल रंग की लाइन जाम दिखाती है, हरा रंग साफ रास्ता।',
        expectedKeywords: ['map', 'route', 'रास्ता']
      }
    ]
  }
];
