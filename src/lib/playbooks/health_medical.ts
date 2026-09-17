import { MultiStepFlowDefinition } from './types';

export const HEALTH_MEDICAL_PLAYBOOKS: MultiStepFlowDefinition[] = [
  // 1. Order Medicine Online
  {
    id: 'medicine_order_online',
    name: 'Order Medicine Online',
    category: 'health_medical',
    triggerPatterns: ['dawai mangwana', 'medicine order karo', '1mg se dawai', 'pharmacy order', 'दवाई मंगाना'],
    steps: [
      {
        stepNumber: 1,
        label: 'Search Medicine',
        hindiInstruction: 'कदम 1/3: दवा का नाम खोजने के लिए सर्च बार पर दबाएं।',
        expectedKeywords: ['search', 'medicine', 'find', 'खोजें']
      },
      {
        stepNumber: 2,
        label: 'Add to Cart',
        hindiInstruction: 'कदम 2/3: दवा को कार्ट में जोड़ने के लिए Add to Cart पर दबाएं।',
        expectedKeywords: ['add', 'cart', 'buy', 'जोड़ें']
      },
      {
        stepNumber: 3,
        label: 'Proceed to Checkout',
        hindiInstruction: 'कदम 3/3: दवा घर मंगाने के लिए चेकआउट (Checkout/Order) दबाएं।',
        expectedKeywords: ['checkout', 'order', 'proceed', 'ऑर्डर']
      }
    ]
  },

  // 2. Upload Doctor Prescription
  {
    id: 'medicine_upload_prescription',
    name: 'Upload Doctor Prescription',
    category: 'health_medical',
    triggerPatterns: ['parcha upload karo', 'prescription photo bhejna', 'doctor ka parcha', 'पर्चा अपलोड'],
    steps: [
      {
        stepNumber: 1,
        label: 'Upload Prescription Button',
        hindiInstruction: 'कदम 1/2: पर्चे की फोटो खींचने के लिए Upload Prescription पर दबाएं।',
        expectedKeywords: ['upload', 'prescription', 'camera', 'पर्चा']
      },
      {
        stepNumber: 2,
        label: 'Take Photo or Choose Gallery',
        hindiInstruction: 'कदम 2/2: कैमरे से पर्चे की साफ फोटो लें और सबमिट दबाएं।',
        expectedKeywords: ['camera', 'gallery', 'submit', 'फोटो']
      }
    ]
  },

  // 3. Book Doctor Consultation
  {
    id: 'doctor_book_consultation',
    name: 'Book Doctor Consultation',
    category: 'health_medical',
    triggerPatterns: ['doctor se baat', 'doctor appointment', 'doctor ko dikhana', 'डॉक्टर से बात'],
    steps: [
      {
        stepNumber: 1,
        label: 'Find Doctor / Speciality',
        hindiInstruction: 'कदम 1/3: जिस बीमारी के डॉक्टर को दिखाना है, वह विशेषज्ञ चुनें।',
        expectedKeywords: ['doctor', 'consult', 'specialist', 'डॉक्टर']
      },
      {
        stepNumber: 2,
        label: 'Select Date & Time',
        hindiInstruction: 'कदम 2/3: अपनी सुविधानुसार तारीख और समय का स्लॉट चुनें।',
        expectedKeywords: ['slot', 'time', 'date', 'समय']
      },
      {
        stepNumber: 3,
        label: 'Confirm Appointment',
        hindiInstruction: 'कदम 3/3: अपॉइंटमेंट पक्की करने के लिए Confirm पर दबाएं।',
        expectedKeywords: ['confirm', 'book', 'बुक']
      }
    ]
  },

  // 4. Book Lab Test at Home
  {
    id: 'lab_test_book_home',
    name: 'Book Blood / Lab Test at Home',
    category: 'health_medical',
    triggerPatterns: ['khoon ki jaanch', 'blood test ghar pe', 'lab test book', 'jaanch karana', 'खून की जांच'],
    steps: [
      {
        stepNumber: 1,
        label: 'Lab Tests Section',
        hindiInstruction: 'कदम 1/3: जांच बुक करने के लिए Lab Tests विकल्प पर दबाएं।',
        expectedKeywords: ['lab test', 'blood test', 'tests', 'जांच']
      },
      {
        stepNumber: 2,
        label: 'Select Test Package',
        hindiInstruction: 'कदम 2/3: टेस्ट पैकेज (जैसे फुल बॉडी या शुगर) चुनें।',
        expectedKeywords: ['package', 'add', 'checkup', 'पैकेज']
      },
      {
        stepNumber: 3,
        label: 'Book Home Sample Collection',
        hindiInstruction: 'कदम 3/3: घर पर सैंपल लेने के लिए समय चुनकर बुक करें।',
        expectedKeywords: ['book', 'schedule', 'घर']
      }
    ]
  },

  // 5. Set Medicine Reminder
  {
    id: 'medicine_set_reminder',
    name: 'Set Daily Medicine Reminder',
    category: 'health_medical',
    triggerPatterns: ['dawai ka alarm', 'dawa yaad dilana', 'medicine reminder lagao', 'दवा का रिमाइंडर'],
    steps: [
      {
        stepNumber: 1,
        label: 'Add Reminder',
        hindiInstruction: 'कदम 1/2: दवा का रिमाइंडर जोड़ने के लिए Add Reminder पर दबाएं।',
        expectedKeywords: ['add reminder', 'new', 'alarm', 'जोड़ें']
      },
      {
        stepNumber: 2,
        label: 'Set Time & Save',
        hindiInstruction: 'कदम 2/2: दवा खाने का समय चुनकर सेव (Save) दबाएं।',
        expectedKeywords: ['save', 'set', 'time', 'सेव']
      }
    ]
  },

  // 6. Blood Pressure Log
  {
    id: 'health_blood_pressure_log',
    name: 'Log Blood Pressure (BP)',
    category: 'health_medical',
    triggerPatterns: ['bp likhna', 'blood pressure note karo', 'bp check kiya tha', 'बीपी दर्ज करें'],
    steps: [
      {
        stepNumber: 1,
        label: 'BP Section',
        hindiInstruction: 'कदम 1/2: ब्लड प्रेशर रिकॉर्ड करने के लिए Blood Pressure पर दबाएं।',
        expectedKeywords: ['bp', 'blood pressure', 'बीपी']
      },
      {
        stepNumber: 2,
        label: 'Enter Readings and Save',
        hindiInstruction: 'कदम 2/2: ऊपर (Systolic) और नीचे (Diastolic) का नंबर लिखकर सेव दबाएं।',
        expectedKeywords: ['save', 'record', 'सेव']
      }
    ]
  },

  // 7. Blood Sugar Log
  {
    id: 'health_sugar_diabetes_log',
    name: 'Log Blood Sugar / Diabetes',
    category: 'health_medical',
    triggerPatterns: ['sugar note karo', 'diabetes reading', 'sugar ka number likhna', 'शुगर दर्ज करें'],
    steps: [
      {
        stepNumber: 1,
        label: 'Blood Sugar Tile',
        hindiInstruction: 'कदम 1/2: शुगर दर्ज करने के लिए Blood Sugar पर दबाएं।',
        expectedKeywords: ['sugar', 'glucose', 'diabetes', 'शुगर']
      },
      {
        stepNumber: 2,
        label: 'Enter Value & Save',
        hindiInstruction: 'कदम 2/2: खाली पेट (Fasting) या खाने के बाद की वैल्यू लिखकर सेव करें।',
        expectedKeywords: ['save', 'fasting', 'reading', 'सेव']
      }
    ]
  },

  // 8. Emergency SOS Alert
  {
    id: 'emergency_sos_alert',
    name: 'Trigger Emergency SOS Alert',
    category: 'health_medical',
    triggerPatterns: ['emergency call', 'madad chahiye emergency', 'sos alert', 'tabiyat kharab hai', 'आपातकाल'],
    steps: [
      {
        stepNumber: 1,
        label: 'Red SOS Button',
        hindiInstruction: 'कदम 1/2: तुरंत मदद बुलाने के लिए लाल SOS बटन पर दबाएं।',
        expectedKeywords: ['sos', 'emergency', 'help', 'मदद']
      },
      {
        stepNumber: 2,
        label: 'Confirm Emergency Alert',
        hindiInstruction: 'कदम 2/2: परिवार को संदेश भेजने के लिए Send SOS दबाएं।',
        expectedKeywords: ['send sos', 'call', 'confirm', 'कॉल']
      }
    ]
  },

  // 9. Call Ambulance
  {
    id: 'ambulance_call_book',
    name: 'Call Ambulance 108 / 102',
    category: 'health_medical',
    triggerPatterns: ['ambulance bulao', 'ambulance ko phone lagao', '108 ambulance', 'एम्बुलेंस बुलाओ'],
    steps: [
      {
        stepNumber: 1,
        label: 'Ambulance Call Option',
        hindiInstruction: 'कदम 1/2: एम्बुलेंस के लिए 108 या Ambulance बटन पर दबाएं।',
        expectedKeywords: ['108', 'ambulance', 'call', 'एम्बुलेंस']
      },
      {
        stepNumber: 2,
        label: 'Confirm Call',
        hindiInstruction: 'कदम 2/2: तुरंत कॉल जोड़ने के लिए हरे फोन बटन पर दबाएं।',
        expectedKeywords: ['call', 'dial', 'कॉल']
      }
    ]
  },

  // 10. Find Nearby Hospital
  {
    id: 'hospital_find_nearby',
    name: 'Find Nearby Hospital',
    category: 'health_medical',
    triggerPatterns: ['pass ka aspataal', 'hospital dhoondho', 'doctor clinic kahan hai', 'अस्पताल खोजें'],
    steps: [
      {
        stepNumber: 1,
        label: 'Hospital Search',
        hindiInstruction: 'कदम 1/2: पास का अस्पताल देखने के लिए Hospitals पर दबाएं।',
        expectedKeywords: ['hospital', 'nearby', 'clinic', 'अस्पताल']
      },
      {
        stepNumber: 2,
        label: 'Get Directions / Call',
        hindiInstruction: 'कदम 2/2: अस्पताल का रास्ता या फोन नंबर देखने के लिए नाम पर दबाएं।',
        expectedKeywords: ['directions', 'call', 'map', 'रास्ता']
      }
    ]
  },

  // 11. View Ayushman Bharat Card
  {
    id: 'ayushman_card_view',
    name: 'View Ayushman Bharat Golden Card',
    category: 'health_medical',
    triggerPatterns: ['ayushman card dekhna', 'pmjay card', 'golden card', 'आयुष्मान कार्ड'],
    steps: [
      {
        stepNumber: 1,
        label: 'Ayushman / Health ID Tile',
        hindiInstruction: 'कदम 1/2: आयुष्मान कार्ड देखने के लिए Ayushman Card पर दबाएं।',
        expectedKeywords: ['ayushman', 'pmjay', 'health card', 'कार्ड']
      },
      {
        stepNumber: 2,
        label: 'View or Download Card',
        hindiInstruction: 'कदम 2/2: कार्ड डाउनलोड करने के लिए Download पर दबाएं।',
        expectedKeywords: ['download', 'view', 'डाउनलोड']
      }
    ]
  },

  // 12. Health Insurance Claim
  {
    id: 'health_insurance_claim',
    name: 'Initiate Health Insurance Claim',
    category: 'health_medical',
    triggerPatterns: ['mediclaim karna', 'health insurance claim', 'bima ka paisa claim', 'बीमा क्लेम'],
    steps: [
      {
        stepNumber: 1,
        label: 'Claim Option',
        hindiInstruction: 'कदम 1/2: क्लेम शुरू करने के लिए Claim Insurance पर दबाएं।',
        expectedKeywords: ['claim', 'file claim', 'क्लेम']
      },
      {
        stepNumber: 2,
        label: 'Upload Hospital Bills',
        hindiInstruction: 'कदम 2/2: अस्पताल के बिल अपलोड करके सबमिट दबाएं।',
        expectedKeywords: ['upload', 'submit', 'bills', 'जमा']
      }
    ]
  }
];
