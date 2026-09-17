import { MultiStepFlowDefinition } from './types';

export const FINANCE_UPI_PLAYBOOKS: MultiStepFlowDefinition[] = [
  // 1. UPI Send to Mobile Number
  {
    id: 'upi_send_to_mobile',
    name: 'Send Money to Mobile Number',
    category: 'finance_upi',
    triggerPatterns: ['paise bhejna phone number', 'mobile pe paise bhejo', 'gpay se paise', 'phonepe paise bhejo', 'पैसे भेजो'],
    steps: [
      {
        stepNumber: 1,
        label: 'To Mobile / Contact',
        hindiInstruction: 'कदम 1/3: मोबाइल नंबर पर पैसे भेजने के लिए To Mobile या Contact पर दबाएं।',
        expectedKeywords: ['to mobile', 'send money', 'contact', 'मोबाइल']
      },
      {
        stepNumber: 2,
        label: 'Enter Amount',
        hindiInstruction: 'कदम 2/3: यहाँ जितने रुपये भेजने हैं वह रकम लिखें।',
        expectedKeywords: ['amount', 'rupees', 'input', 'रकम']
      },
      {
        stepNumber: 3,
        label: 'Pay Button',
        hindiInstruction: 'कदम 3/3: भुगतान करने के लिए पे (Pay) पर दबाएं और अपना UPI PIN डालें।',
        expectedKeywords: ['pay', 'proceed', 'send', 'पे']
      }
    ]
  },

  // 2. UPI Scan QR Code
  {
    id: 'upi_scan_qr_code',
    name: 'Scan QR Code and Pay',
    category: 'finance_upi',
    triggerPatterns: ['qr code scan', 'scanner kholo', 'dukan par pay karna', 'barcode scan', 'क्यूआर कोड स्कैन'],
    steps: [
      {
        stepNumber: 1,
        label: 'QR Scanner Button',
        hindiInstruction: 'कदम 1/2: दुकान का कोड स्कैन करने के लिए ऊपर स्कैनर (QR) बटन पर दबाएं।',
        expectedKeywords: ['scan', 'qr', 'scanner', 'कैमरा', 'स्कैन']
      },
      {
        stepNumber: 2,
        label: 'Enter Amount and Pay',
        hindiInstruction: 'कदम 2/2: कोड स्कैन होने के बाद रकम लिखकर पे (Pay) पर दबाएं।',
        expectedKeywords: ['pay', 'proceed', 'amount', 'पे']
      }
    ]
  },

  // 3. Check Bank Balance
  {
    id: 'upi_check_balance',
    name: 'Check Bank Account Balance',
    category: 'finance_upi',
    triggerPatterns: ['bank balance check', 'khate me kitne paise hain', 'balance dekhna', 'bank account check', 'बैलेंस चेक'],
    steps: [
      {
        stepNumber: 1,
        label: 'Check Balance Tile',
        hindiInstruction: 'कदम 1/2: खाते का बैलेंस देखने के लिए Check Balance पर दबाएं।',
        expectedKeywords: ['check balance', 'bank balance', 'balance', 'बैलेंस']
      },
      {
        stepNumber: 2,
        label: 'Select Bank & Enter PIN',
        hindiInstruction: 'कदम 2/2: अपना बैंक चुनकर अपना UPI पिन डालें।',
        expectedKeywords: ['bank', 'account', 'pin', 'बैंक']
      }
    ]
  },

  // 4. Request Money / Payment
  {
    id: 'upi_request_money',
    name: 'Request Money from Contact',
    category: 'finance_upi',
    triggerPatterns: ['paise mangwana', 'request money', 'paisa mango', 'पैसे मंगाना'],
    steps: [
      {
        stepNumber: 1,
        label: 'Request Option',
        hindiInstruction: 'कदम 1/2: पैसे मांगने के लिए Request बटन पर दबाएं।',
        expectedKeywords: ['request', 'collect', 'मागें']
      },
      {
        stepNumber: 2,
        label: 'Enter Amount & Request',
        hindiInstruction: 'कदम 2/2: रकम लिखकर रिक्वेस्ट भेजें।',
        expectedKeywords: ['request', 'send request', 'आगे']
      }
    ]
  },

  // 5. Electricity Bill Payment
  {
    id: 'bill_electricity',
    name: 'Electricity Bill Payment',
    category: 'finance_upi',
    triggerPatterns: ['bijli ka bill', 'electricity bill', 'light bill', 'bijli bill jama', 'बिजली का बिल'],
    steps: [
      {
        stepNumber: 1,
        label: 'Electricity Category',
        hindiInstruction: 'कदम 1/3: बिजली का बिल भरने के लिए Electricity आइकन पर दबाएं।',
        expectedKeywords: ['electricity', 'bijli', 'बिजली']
      },
      {
        stepNumber: 2,
        label: 'Enter Consumer Number',
        hindiInstruction: 'कदम 2/3: यहाँ अपना बिल या उपभोक्ता नंबर (Consumer/CA Number) लिखें।',
        expectedKeywords: ['consumer', 'ca number', 'account', 'उपभोक्ता']
      },
      {
        stepNumber: 3,
        label: 'Confirm and Pay',
        hindiInstruction: 'कदम 3/3: बिल चेक करके नीचे पे (Proceed to Pay) पर दबाएं।',
        expectedKeywords: ['pay', 'proceed', 'पे', 'आगे']
      }
    ]
  },

  // 6. Water Bill Payment
  {
    id: 'bill_water',
    name: 'Water Bill Payment',
    category: 'finance_upi',
    triggerPatterns: ['paani ka bill', 'water bill', 'jal board bill', 'पानी का बिल'],
    steps: [
      {
        stepNumber: 1,
        label: 'Water Category',
        hindiInstruction: 'कदम 1/3: पानी का बिल चुनने के लिए Water आइकन पर दबाएं।',
        expectedKeywords: ['water', 'jal', 'पानी']
      },
      {
        stepNumber: 2,
        label: 'Enter K Number / Meter ID',
        hindiInstruction: 'कदम 2/3: यहाँ अपना जल बोर्ड मीटर नंबर लिखें।',
        expectedKeywords: ['k number', 'consumer', 'meter', 'नंबर']
      },
      {
        stepNumber: 3,
        label: 'Pay Water Bill',
        hindiInstruction: 'कदम 3/3: बिल का भुगतान करने के लिए पे (Pay) पर दबाएं।',
        expectedKeywords: ['pay', 'proceed', 'पे']
      }
    ]
  },

  // 7. Gas Cylinder Booking
  {
    id: 'bill_gas_cylinder',
    name: 'Book Gas Cylinder / Bharat / Indane / HP',
    category: 'finance_upi',
    triggerPatterns: ['gas cylinder book', 'gas ki booking', 'indane gas', 'bharat gas', 'गैस सिलेंडर'],
    steps: [
      {
        stepNumber: 1,
        label: 'Gas Cylinder Icon',
        hindiInstruction: 'कदम 1/3: गैस सिलेंडर बुक करने के लिए Gas Cylinder विकल्प पर दबाएं।',
        expectedKeywords: ['gas', 'cylinder', 'lpg', 'गैस']
      },
      {
        stepNumber: 2,
        label: 'Choose Provider & Number',
        hindiInstruction: 'कदम 2/3: अपनी गैस कंपनी चुनकर रजिस्टर्ड मोबाइल नंबर लिखें।',
        expectedKeywords: ['indane', 'hp', 'bharat', 'mobile', 'कंपनी']
      },
      {
        stepNumber: 3,
        label: 'Book & Pay',
        hindiInstruction: 'कदम 3/3: बुकिंग पक्की करने के लिए पे (Pay) पर दबाएं।',
        expectedKeywords: ['book', 'pay', 'proceed', 'बुक']
      }
    ]
  },

  // 8. Mobile Prepaid Recharge
  {
    id: 'recharge_mobile_prepaid',
    name: 'Mobile Prepaid Recharge',
    category: 'finance_upi',
    triggerPatterns: ['mobile recharge', 'phone recharge karo', 'pack khatam ho gaya', 'रिचार्ज करो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Mobile Recharge Icon',
        hindiInstruction: 'कदम 1/3: मोबाइल रिचार्ज करने के लिए Mobile Recharge पर दबाएं।',
        expectedKeywords: ['recharge', 'mobile recharge', 'prepaid', 'रिचार्ज']
      },
      {
        stepNumber: 2,
        label: 'Select Plan',
        hindiInstruction: 'कदम 2/3: अपने पसंद का रिचार्ज पैक या प्लान चुनें।',
        expectedKeywords: ['plan', 'pack', 'view plans', 'प्लान']
      },
      {
        stepNumber: 3,
        label: 'Pay Recharge Amount',
        hindiInstruction: 'कदम 3/3: रिचार्ज पूरा करने के लिए नीचे पे (Pay) पर दबाएं।',
        expectedKeywords: ['pay', 'proceed', 'पे']
      }
    ]
  },

  // 9. DTH / Cable TV Recharge
  {
    id: 'recharge_dth_cable',
    name: 'DTH / Tata Play / Airtel TV Recharge',
    category: 'finance_upi',
    triggerPatterns: ['dth recharge', 'tv ka recharge', 'tata play recharge', 'dish tv recharge', 'टीवी रिचार्ज'],
    steps: [
      {
        stepNumber: 1,
        label: 'DTH Icon',
        hindiInstruction: 'कदम 1/3: टीवी रिचार्ज के लिए DTH विकल्प पर दबाएं।',
        expectedKeywords: ['dth', 'cable', 'tv', 'टीवी']
      },
      {
        stepNumber: 2,
        label: 'Enter Subscriber ID',
        hindiInstruction: 'कदम 2/3: अपने सेट-टॉप बॉक्स का सब्सक्राइबर या कार्ड नंबर लिखें।',
        expectedKeywords: ['subscriber', 'customer id', 'card', 'नंबर']
      },
      {
        stepNumber: 3,
        label: 'Proceed to Pay',
        hindiInstruction: 'कदम 3/3: रिचार्ज करने के लिए पे (Pay) दबाएं।',
        expectedKeywords: ['pay', 'proceed', 'पे']
      }
    ]
  },

  // 10. FASTag Recharge
  {
    id: 'recharge_fastag',
    name: 'FASTag Toll Recharge',
    category: 'finance_upi',
    triggerPatterns: ['fastag recharge', 'toll recharge', 'gaadi ka fastag', 'फास्टैग रिचार्ज'],
    steps: [
      {
        stepNumber: 1,
        label: 'FASTag Icon',
        hindiInstruction: 'कदम 1/3: फास्टैग रिचार्ज के लिए FASTag पर दबाएं।',
        expectedKeywords: ['fastag', 'toll', 'फास्टैग']
      },
      {
        stepNumber: 2,
        label: 'Vehicle Number',
        hindiInstruction: 'कदम 2/3: अपनी गाड़ी का नंबर लिखें।',
        expectedKeywords: ['vehicle', 'car number', 'plate', 'गाड़ी नंबर']
      },
      {
        stepNumber: 3,
        label: 'Recharge FASTag',
        hindiInstruction: 'कदम 3/3: पैसे भरने के लिए पे (Pay) पर दबाएं।',
        expectedKeywords: ['pay', 'proceed', 'पे']
      }
    ]
  },

  // 11. Broadband / Wi-Fi Bill
  {
    id: 'bill_broadband_wifi',
    name: 'Broadband / Wi-Fi Bill Payment',
    category: 'finance_upi',
    triggerPatterns: ['wifi ka bill', 'broadband bill', 'internet bill', 'fiber bill', 'वाईफाई बिल'],
    steps: [
      {
        stepNumber: 1,
        label: 'Broadband Category',
        hindiInstruction: 'कदम 1/3: ब्रॉडबैंड या वाई-फाई बिल पर दबाएं।',
        expectedKeywords: ['broadband', 'landline', 'wifi', 'ब्रॉडबैंड']
      },
      {
        stepNumber: 2,
        label: 'Account Number',
        hindiInstruction: 'कदम 2/3: अपना ब्रॉडबैंड खाता नंबर लिखें।',
        expectedKeywords: ['account', 'telephone', 'id', 'नंबर']
      },
      {
        stepNumber: 3,
        label: 'Pay Bill',
        hindiInstruction: 'कदम 3/3: बिल का भुगतान करने के लिए पे (Pay) दबाएं।',
        expectedKeywords: ['pay', 'proceed', 'पे']
      }
    ]
  },

  // 12. Credit Card Bill Payment
  {
    id: 'bill_credit_card',
    name: 'Credit Card Bill Payment',
    category: 'finance_upi',
    triggerPatterns: ['credit card ka bill', 'card payment', 'credit card bharna', 'क्रेडिट कार्ड बिल'],
    steps: [
      {
        stepNumber: 1,
        label: 'Credit Card Tile',
        hindiInstruction: 'कदम 1/3: क्रेडिट कार्ड बिल विकल्प पर दबाएं।',
        expectedKeywords: ['credit card', 'card bill', 'कार्ड']
      },
      {
        stepNumber: 2,
        label: 'Card Digits / Amount',
        hindiInstruction: 'कदम 2/3: अपने कार्ड के आखिरी 4 अंक और बिल राशि देखें।',
        expectedKeywords: ['card', 'bill', 'amount', 'राशि']
      },
      {
        stepNumber: 3,
        label: 'Pay Card Bill',
        hindiInstruction: 'कदम 3/3: कार्ड बिल भरने के लिए पे (Pay) पर दबाएं।',
        expectedKeywords: ['pay', 'proceed', 'पे']
      }
    ]
  },

  // 13. Loan EMI Payment
  {
    id: 'bill_loan_emi',
    name: 'Loan EMI Payment',
    category: 'finance_upi',
    triggerPatterns: ['loan ki kist', 'emi bharna', 'loan emi pay', 'kist jama', 'लोन की किस्त'],
    steps: [
      {
        stepNumber: 1,
        label: 'Loan Repayment Tile',
        hindiInstruction: 'कदम 1/3: लोन या किस्त विकल्प पर दबाएं।',
        expectedKeywords: ['loan', 'emi', 'repayment', 'किस्त']
      },
      {
        stepNumber: 2,
        label: 'Loan Account Number',
        hindiInstruction: 'कदम 2/3: अपना लोन खाता नंबर डालें।',
        expectedKeywords: ['loan account', 'account', 'id', 'खाता']
      },
      {
        stepNumber: 3,
        label: 'Pay EMI',
        hindiInstruction: 'कदम 3/3: किस्त भरने के लिए पे (Pay) पर दबाएं।',
        expectedKeywords: ['pay', 'proceed', 'पे']
      }
    ]
  },

  // 14. View Bank Account Statement
  {
    id: 'bank_view_statement',
    name: 'View Bank Account Statement',
    category: 'finance_upi',
    triggerPatterns: ['bank statement dekhna', 'passbook dekhna', 'paise kahan gaye dekhna', 'पासबुक देखो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Bank Accounts / Passbook',
        hindiInstruction: 'कदम 1/2: पासबुक या स्टेटमेंट देखने के लिए Accounts या Passbook पर दबाएं।',
        expectedKeywords: ['passbook', 'statement', 'history', 'पासबुक']
      },
      {
        stepNumber: 2,
        label: 'View Transactions',
        hindiInstruction: 'कदम 2/2: अपने पिछले लेन-देन की लिस्ट यहाँ देखें।',
        expectedKeywords: ['transactions', 'download', 'statement', 'लेन-देन']
      }
    ]
  },

  // 15. Change UPI PIN
  {
    id: 'upi_change_pin',
    name: 'Change / Reset UPI PIN',
    category: 'finance_upi',
    triggerPatterns: ['upi pin badalna', 'pin bhool gaye', 'change upi pin', 'reset pin', 'पिन बदलो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Bank Account Settings',
        hindiInstruction: 'कदम 1/2: अपने बैंक खाते की सेटिंग पर जाकर Change PIN पर दबाएं।',
        expectedKeywords: ['change pin', 'reset pin', 'pin', 'पिन']
      },
      {
        stepNumber: 2,
        label: 'Enter New PIN',
        hindiInstruction: 'कदम 2/2: अपना नया 4 या 6 अंकों का UPI पिन दर्ज करें।',
        expectedKeywords: ['enter pin', 'confirm', 'पिन']
      }
    ]
  },

  // 16. Transaction History
  {
    id: 'upi_transaction_history',
    name: 'View UPI Transaction History',
    category: 'finance_upi',
    triggerPatterns: ['purane payment dekhna', 'transaction history', 'paise kisko bheje the', 'लेन-देन इतिहास'],
    steps: [
      {
        stepNumber: 1,
        label: 'History Tab',
        hindiInstruction: 'कदम 1/2: अपने सभी भुगतान देखने के लिए History पर दबाएं।',
        expectedKeywords: ['history', 'transactions', 'इतिहास']
      },
      {
        stepNumber: 2,
        label: 'Transaction Details',
        hindiInstruction: 'कदम 2/2: जिस लेन-देन की रसीद देखनी है, उस पर दबाएं।',
        expectedKeywords: ['details', 'receipt', 'रसीद']
      }
    ]
  },

  // 17. Add New Bank Account
  {
    id: 'bank_add_new_account',
    name: 'Link New Bank Account',
    category: 'finance_upi',
    triggerPatterns: ['naya bank jodo', 'doosra khata jodo', 'add bank account', 'नया बैंक जोड़ें'],
    steps: [
      {
        stepNumber: 1,
        label: 'Add Bank Account Button',
        hindiInstruction: 'कदम 1/2: नया बैंक जोड़ने के लिए Add Bank Account पर दबाएं।',
        expectedKeywords: ['add bank', 'link account', 'बैंक जोड़ें']
      },
      {
        stepNumber: 2,
        label: 'Choose Your Bank',
        hindiInstruction: 'कदम 2/2: सूची में से अपने बैंक का नाम चुनें।',
        expectedKeywords: ['sbi', 'pnb', 'hdfc', 'bank', 'बैंक']
      }
    ]
  },

  // 18. Digital Gold Buy
  {
    id: 'finance_buy_gold',
    name: 'Buy Digital Gold',
    category: 'finance_upi',
    triggerPatterns: ['sona khareedna', 'digital gold', 'gold khareedo', 'सोना खरीदें'],
    steps: [
      {
        stepNumber: 1,
        label: 'Gold Section',
        hindiInstruction: 'कदम 1/2: सोना खरीदने के लिए Gold आइकन पर दबाएं।',
        expectedKeywords: ['gold', 'digital gold', 'सोना']
      },
      {
        stepNumber: 2,
        label: 'Enter Amount & Buy',
        hindiInstruction: 'कदम 2/2: रुपये लिखकर प्रोसीड टू पे दबाएं।',
        expectedKeywords: ['buy', 'proceed', 'खरीदें']
      }
    ]
  },

  // 19. Insurance Premium Payment
  {
    id: 'insurance_premium_pay',
    name: 'Pay Insurance Premium',
    category: 'finance_upi',
    triggerPatterns: ['bima ka premium', 'insurance bharna', 'lic premium', 'बीमा प्रीमियम'],
    steps: [
      {
        stepNumber: 1,
        label: 'Insurance Category',
        hindiInstruction: 'कदम 1/3: बीमा भरने के लिए Insurance पर दबाएं।',
        expectedKeywords: ['insurance', 'lic', 'premium', 'बीमा']
      },
      {
        stepNumber: 2,
        label: 'Policy Number',
        hindiInstruction: 'कदम 2/3: अपना पॉलिसी नंबर लिखें।',
        expectedKeywords: ['policy', 'number', 'पॉलिसी']
      },
      {
        stepNumber: 3,
        label: 'Pay Premium',
        hindiInstruction: 'कदम 3/3: प्रीमियम भरने के लिए पे (Pay) पर दबाएं।',
        expectedKeywords: ['pay', 'proceed', 'पे']
      }
    ]
  },

  // 20. Split Bill with Friends
  {
    id: 'upi_split_expense',
    name: 'Split Bill with Group',
    category: 'finance_upi',
    triggerPatterns: ['bill aapas me baanto', 'split bill', 'hisaab baantna', 'बिल बांटो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Split Expense Option',
        hindiInstruction: 'कदम 1/2: बिल बांटने के लिए Split Bill विकल्प पर दबाएं।',
        expectedKeywords: ['split', 'divide', 'group', 'बांटें']
      },
      {
        stepNumber: 2,
        label: 'Select Contacts & Split',
        hindiInstruction: 'कदम 2/2: लोगों को चुनकर स्प्लिट रिक्वेस्ट भेजें।',
        expectedKeywords: ['send', 'split', 'request', 'आगे']
      }
    ]
  }
];
