import { MultiStepFlowDefinition } from './types';

export const GOVERNMENT_DEVOTION_PLAYBOOKS: MultiStepFlowDefinition[] = [
  // 1. Download Aadhaar on DigiLocker
  {
    id: 'digilocker_download_aadhaar',
    name: 'Download Aadhaar Card via DigiLocker',
    category: 'government_devotion',
    triggerPatterns: ['aadhaar card download', 'digilocker se aadhaar', 'aadhar nikalna', 'आधार कार्ड डाउनलोड'],
    steps: [
      {
        stepNumber: 1,
        label: 'Aadhaar Section',
        hindiInstruction: 'कदम 1/2: आधार कार्ड देखने के लिए Aadhaar Card विकल्प पर दबाएं।',
        expectedKeywords: ['aadhaar', 'uidai', 'आधार']
      },
      {
        stepNumber: 2,
        label: 'View / Download Card',
        hindiInstruction: 'कदम 2/2: आधार डाउनलोड करने के लिए Download PDF पर दबाएं।',
        expectedKeywords: ['download', 'view', 'pdf', 'डाउनलोड']
      }
    ]
  },

  // 2. Ration Card Status Check
  {
    id: 'ration_card_status_check',
    name: 'Check Ration Card Details & Quota',
    category: 'government_devotion',
    triggerPatterns: ['ration card check', 'rashan mila kya', 'ration card list', 'राशन कार्ड'],
    steps: [
      {
        stepNumber: 1,
        label: 'Ration Card Option',
        hindiInstruction: 'कदम 1/2: राशन कार्ड की स्थिति देखने के लिए Ration Card पर दबाएं।',
        expectedKeywords: ['ration', 'rashan', 'राशन']
      },
      {
        stepNumber: 2,
        label: 'Enter Ration Card Number',
        hindiInstruction: 'कदम 2/2: अपना 12 अंकों का राशन कार्ड नंबर लिखकर सर्च करें।',
        expectedKeywords: ['search', 'number', 'submit', 'खोजें']
      }
    ]
  },

  // 3. PM Kisan Samman Nidhi Status
  {
    id: 'pm_kisan_installment_check',
    name: 'Check PM Kisan 2000 Rs Installment',
    category: 'government_devotion',
    triggerPatterns: ['pm kisan ka paisa aaya kya', 'kisan samman nidhi kist', '2000 rupaye kisan', 'पीएम किसान'],
    steps: [
      {
        stepNumber: 1,
        label: 'Beneficiary Status',
        hindiInstruction: 'कदम 1/2: किस्त का पैसा देखने के लिए Beneficiary Status पर दबाएं।',
        expectedKeywords: ['beneficiary', 'status', 'kisan', 'स्थिति']
      },
      {
        stepNumber: 2,
        label: 'Enter Aadhaar / Mobile & Search',
        hindiInstruction: 'कदम 2/2: अपना आधार या मोबाइल नंबर लिखकर Get Data दबाएं।',
        expectedKeywords: ['get data', 'search', 'डाटा']
      }
    ]
  },

  // 4. Voter ID Search
  {
    id: 'voter_id_card_search',
    name: 'Search Voter ID in Electoral Roll',
    category: 'government_devotion',
    triggerPatterns: ['voter card check', 'vote list me naam', 'voter id download', 'वोटर कार्ड'],
    steps: [
      {
        stepNumber: 1,
        label: 'Search in Electoral Roll',
        hindiInstruction: 'कदम 1/2: वोटर लिस्ट में नाम देखने के लिए Search Electoral Roll पर दबाएं।',
        expectedKeywords: ['voter', 'electoral roll', 'वोटर']
      },
      {
        stepNumber: 2,
        label: 'Enter EPIC Number',
        hindiInstruction: 'कदम 2/2: अपना वोटर आईडी (EPIC) नंबर लिखकर Search दबाएं।',
        expectedKeywords: ['epic', 'search', 'खोजें']
      }
    ]
  },

  // 5. Pension Passbook Check
  {
    id: 'pension_passbook_status',
    name: 'Check Pension Credit Status',
    category: 'government_devotion',
    triggerPatterns: ['pension aayi kya', 'vriddha pension check', 'pension passbook', 'पेंशन चेक'],
    steps: [
      {
        stepNumber: 1,
        label: 'Pension Status Section',
        hindiInstruction: 'कदम 1/2: पेंशन की जानकारी देखने के लिए Pension Status पर दबाएं।',
        expectedKeywords: ['pension', 'passbook', 'पेंशन']
      },
      {
        stepNumber: 2,
        label: 'View Credit History',
        hindiInstruction: 'कदम 2/2: महीने की पेंशन जमा होने की रसीद यहाँ देखें।',
        expectedKeywords: ['details', 'view', 'खाता']
      }
    ]
  },

  // 6. Daily Panchang & Tithi
  {
    id: 'panchang_tithi_today',
    name: 'View Today Panchang, Tithi & Shubh Muhurat',
    category: 'government_devotion',
    triggerPatterns: ['aaj ki tithi', 'panchang dekhna', 'shubh muhurat', 'aaj kaun sa din hai', 'आज का पंचांग'],
    steps: [
      {
        stepNumber: 1,
        label: 'Panchang Section',
        hindiInstruction: 'कदम 1/1: आज की तिथि, वार और नक्षत्र देखने के लिए Panchang पर दबाएं।',
        expectedKeywords: ['panchang', 'tithi', 'muhurat', 'पंचांग']
      }
    ]
  },

  // 7. Play Morning Aarti
  {
    id: 'morning_aarti_play',
    name: 'Play Morning Aarti (Ganesh, Lakshmi, Shiv)',
    category: 'government_devotion',
    triggerPatterns: ['aarti sunao', 'subah ki aarti', 'ganesh ji ki aarti', 'aarti chalao', 'आरती चलाओ'],
    steps: [
      {
        stepNumber: 1,
        label: 'Aarti Category / Search',
        hindiInstruction: 'कदम 1/2: आरती सुनने के लिए आरती या भजन विकल्प पर दबाएं।',
        expectedKeywords: ['aarti', 'bhajan', 'devotional', 'आरती']
      },
      {
        stepNumber: 2,
        label: 'Play Aarti',
        hindiInstruction: 'कदम 2/2: आरती शुरू करने के लिए प्ले (Play) बटन पर दबाएं।',
        expectedKeywords: ['play', 'listen', 'चलाएं']
      }
    ]
  },

  // 8. Play Hanuman Chalisa
  {
    id: 'hanuman_chalisa_play',
    name: 'Play Hanuman Chalisa Audio / Video',
    category: 'government_devotion',
    triggerPatterns: ['hanuman chalisa sunao', 'chalisa chalao', 'sankat mochan', 'हनुमान चालीसा'],
    steps: [
      {
        stepNumber: 1,
        label: 'Hanuman Chalisa Search / Tile',
        hindiInstruction: 'कदम 1/2: हनुमान चालीसा पर दबाएं।',
        expectedKeywords: ['hanuman', 'chalisa', 'चालीसा']
      },
      {
        stepNumber: 2,
        label: 'Play Chalisa',
        hindiInstruction: 'कदम 2/2: पाठ सुनने के लिए प्ले (Play) बटन पर दबाएं।',
        expectedKeywords: ['play', 'start', 'चलाएं']
      }
    ]
  },

  // 9. Listen to Ramayan Katha
  {
    id: 'ramayan_katha_listen',
    name: 'Listen to Ramayan Katha / Chaupai',
    category: 'government_devotion',
    triggerPatterns: ['ramayan katha sunao', 'ramcharitmanas chaupai', 'ram katha', 'रामायण कथा'],
    steps: [
      {
        stepNumber: 1,
        label: 'Ramayan Episode',
        hindiInstruction: 'कदम 1/2: रामायण कथा के प्रसंग पर दबाएं।',
        expectedKeywords: ['ramayan', 'katha', 'chaupai', 'रामायण']
      },
      {
        stepNumber: 2,
        label: 'Play Katha',
        hindiInstruction: 'कदम 2/2: कथा सुनने के लिए प्ले (Play) दबाएं।',
        expectedKeywords: ['play', 'listen', 'सुनें']
      }
    ]
  },

  // 10. Bhagavad Gita Audio
  {
    id: 'bhagavad_gita_audio',
    name: 'Listen to Bhagavad Gita Shloka with Hindi Meaning',
    category: 'government_devotion',
    triggerPatterns: ['geeta ka shlok', 'bhagavad gita sunao', 'gita saar', 'भगवद गीता'],
    steps: [
      {
        stepNumber: 1,
        label: 'Select Chapter (Adhyay)',
        hindiInstruction: 'कदम 1/2: गीता का अध्याय चुनने के लिए यहाँ दबाएं।',
        expectedKeywords: ['gita', 'adhyay', 'chapter', 'अध्याय']
      },
      {
        stepNumber: 2,
        label: 'Play Audio Shlok',
        hindiInstruction: 'कदम 2/2: श्लोक और हिंदी अर्थ सुनने के लिए प्ले दबाएं।',
        expectedKeywords: ['play', 'listen', 'श्लोक']
      }
    ]
  },

  // 11. Live Temple Darshan
  {
    id: 'live_temple_darshan',
    name: 'Live Darshan (Kashi, Vaishno Devi, Mahakal, Tirupati)',
    category: 'government_devotion',
    triggerPatterns: ['mandir ke live darshan', 'kashi vishwanath darshan', 'live aarti darshan', 'मंदिर दर्शन'],
    steps: [
      {
        stepNumber: 1,
        label: 'Choose Temple',
        hindiInstruction: 'कदम 1/2: जिस तीर्थ का दर्शन करना है, उस मंदिर पर दबाएं।',
        expectedKeywords: ['darshan', 'live', 'temple', 'दर्शन']
      },
      {
        stepNumber: 2,
        label: 'Watch Live Video',
        hindiInstruction: 'कदम 2/2: लाइव दर्शन देखने के लिए Watch Live पर दबाएं।',
        expectedKeywords: ['watch', 'live', 'play', 'देखें']
      }
    ]
  },

  // 12. Bhajan Playlist
  {
    id: 'bhajan_playlist_play',
    name: 'Play Bhakti Bhajan Playlist',
    category: 'government_devotion',
    triggerPatterns: ['bhajan sunao', 'meera bai bhajan', 'krishna bhajan', 'bhakti geet', 'भजन सुनाओ'],
    steps: [
      {
        stepNumber: 1,
        label: 'Bhajan Album / Playlist',
        hindiInstruction: 'कदम 1/2: भजनों की सूची खोलने के लिए Bhajan पर दबाएं।',
        expectedKeywords: ['bhajan', 'bhakti', 'playlist', 'भजन']
      },
      {
        stepNumber: 2,
        label: 'Play All / Shuffle',
        hindiInstruction: 'कदम 2/2: भजन शुरू करने के लिए Play All पर दबाएं।',
        expectedKeywords: ['play all', 'play', 'चलाएं']
      }
    ]
  }
];
