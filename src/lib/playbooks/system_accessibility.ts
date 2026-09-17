import { MultiStepFlowDefinition } from './types';

export const SYSTEM_ACCESSIBILITY_PLAYBOOKS: MultiStepFlowDefinition[] = [
  // 1. Connect to Wi-Fi
  {
    id: 'wifi_connect_network',
    name: 'Connect to Wi-Fi Network',
    category: 'system_accessibility',
    triggerPatterns: ['wifi connect karo', 'ghar ka wifi jodo', 'internet chalu wifi', 'वाईफाई जोड़ो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Wi-Fi Settings Tile',
        hindiInstruction: 'कदम 1/2: वाई-फाई सेटिंग्स खोलने के लिए Wi-Fi विकल्प पर दबाएं।',
        expectedKeywords: ['wi-fi', 'wifi', 'network', 'वाईफाई']
      },
      {
        stepNumber: 2,
        label: 'Select Home Network & Connect',
        hindiInstruction: 'कदम 2/2: अपने घर के वाई-फाई के नाम पर दबाएं और पासवर्ड डालें।',
        expectedKeywords: ['connect', 'network', 'जोड़ें']
      }
    ]
  },

  // 2. Pair Bluetooth Earphones
  {
    id: 'bluetooth_pair_device',
    name: 'Pair Bluetooth Earphones or Speaker',
    category: 'system_accessibility',
    triggerPatterns: ['bluetooth jodo', 'earphone connect karo', 'speaker connect', 'ब्लूटूथ जोड़ो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Bluetooth Tile',
        hindiInstruction: 'कदम 1/2: ब्लूटूथ चालू करने के लिए Bluetooth विकल्प पर दबाएं।',
        expectedKeywords: ['bluetooth', 'pair', 'ब्लूटूथ']
      },
      {
        stepNumber: 2,
        label: 'Pair New Device',
        hindiInstruction: 'कदम 2/2: अपने इयरफोन के नाम पर दबाकर Pair करें।',
        expectedKeywords: ['pair new device', 'connect', 'जोड़ें']
      }
    ]
  },

  // 3. Font Size Increase / Zoom
  {
    id: 'font_size_increase_zoom',
    name: 'Make Text and Fonts Larger',
    category: 'system_accessibility',
    triggerPatterns: ['akshar bade karo', 'padhne me dikkat', 'font size bada', 'bada dikhao', 'अक्षर बड़े करो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Display / Font Size Setting',
        hindiInstruction: 'कदम 1/2: अक्षर बड़े करने के लिए Font size या Display पर दबाएं।',
        expectedKeywords: ['font size', 'display', 'text size', 'डिस्प्ले']
      },
      {
        stepNumber: 2,
        label: 'Increase Slider',
        hindiInstruction: 'कदम 2/2: अक्षर का आकार बड़ा करने के लिए स्लाइडर को दाईं ओर (+) खींचें।',
        expectedKeywords: ['slider', 'large', 'largest', 'बड़ा']
      }
    ]
  },

  // 4. Increase Ringtone & Call Volume
  {
    id: 'volume_ringtone_increase',
    name: 'Increase Ringtone & Call Sound Volume',
    category: 'system_accessibility',
    triggerPatterns: ['awaaz tez karo', 'phone ki ghanti tez', 'ringtone volume badhao', 'आवाज बढ़ाओ'],
    steps: [
      {
        stepNumber: 1,
        label: 'Sound & Vibration',
        hindiInstruction: 'कदम 1/2: आवाज़ की सेटिंग के लिए Sound & Vibration पर दबाएं।',
        expectedKeywords: ['sound', 'vibration', 'volume', 'ध्वनि']
      },
      {
        stepNumber: 2,
        label: 'Ringtone Volume Slider',
        hindiInstruction: 'कदम 2/2: घंटी की आवाज़ तेज करने के लिए Ring volume को आगे बढ़ाएं।',
        expectedKeywords: ['ring volume', 'media', 'slider', 'वॉल्यूम']
      }
    ]
  },

  // 5. Set Morning Alarm
  {
    id: 'alarm_set_morning',
    name: 'Set Morning Wakeup Alarm',
    category: 'system_accessibility',
    triggerPatterns: ['subah ka alarm lagao', 'alarm set karo', 'uthane ka time', 'अलार्म लगाओ'],
    steps: [
      {
        stepNumber: 1,
        label: 'Add Alarm Button',
        hindiInstruction: 'कदम 1/2: नया अलार्म जोड़ने के लिए प्लस (+) बटन पर दबाएं।',
        expectedKeywords: ['add alarm', 'plus', '+', 'नया अलार्म']
      },
      {
        stepNumber: 2,
        label: 'Set Time & Save',
        hindiInstruction: 'कदम 2/2: समय (जैसे 05:00 AM) चुनकर सेव (Save) पर दबाएं।',
        expectedKeywords: ['save', 'done', 'am', 'सेव']
      }
    ]
  },

  // 6. Flashlight / Torch Toggle
  {
    id: 'flashlight_torch_toggle',
    name: 'Turn Flashlight / Torch On or Off',
    category: 'system_accessibility',
    triggerPatterns: ['torch jalao', 'batti chalu karo', 'flashlight band karo', 'roshni chahiye', 'टॉर्च जलाओ'],
    steps: [
      {
        stepNumber: 1,
        label: 'Torch Button in Quick Settings',
        hindiInstruction: 'कदम 1/1: टॉर्च चालू या बंद करने के लिए Torch (फ्लैशलाइट) बटन पर दबाएं।',
        expectedKeywords: ['torch', 'flashlight', 'flash', 'टॉर्च']
      }
    ]
  },

  // 7. Adjust Screen Brightness
  {
    id: 'brightness_screen_adjust',
    name: 'Adjust Screen Brightness',
    category: 'system_accessibility',
    triggerPatterns: ['chamak badhao', 'screen roshni kam karo', 'brightness badhao', 'ब्राइटनेस'],
    steps: [
      {
        stepNumber: 1,
        label: 'Brightness Slider',
        hindiInstruction: 'कदम 1/1: स्क्रीन की रोशनी बदलने के लिए ब्राइटनेस स्लाइडर को आगे या पीछे करें।',
        expectedKeywords: ['brightness', 'display', 'slider', 'चमक']
      }
    ]
  },

  // 8. Dark Mode Toggle
  {
    id: 'dark_mode_toggle',
    name: 'Turn Dark Mode On or Off',
    category: 'system_accessibility',
    triggerPatterns: ['screen kali karo', 'dark mode lagao', 'aankho me roshni lag rahi', 'डार्क मोड'],
    steps: [
      {
        stepNumber: 1,
        label: 'Dark Theme Option',
        hindiInstruction: 'कदम 1/1: डार्क मोड लगाने के लिए Dark theme / Dark mode पर दबाएं।',
        expectedKeywords: ['dark theme', 'dark mode', 'night mode', 'डार्क']
      }
    ]
  },

  // 9. Switch Phone Language to Hindi
  {
    id: 'language_switch_to_hindi',
    name: 'Change Phone Language to Hindi',
    category: 'system_accessibility',
    triggerPatterns: ['phone hindi me karo', 'bhasha badalna', 'angrezi nahi aati hindi karo', 'हिंदी भाषा'],
    steps: [
      {
        stepNumber: 1,
        label: 'Languages & Input',
        hindiInstruction: 'कदम 1/2: भाषा बदलने के लिए Languages & input विकल्प पर दबाएं।',
        expectedKeywords: ['language', 'languages', 'input', 'भाषा']
      },
      {
        stepNumber: 2,
        label: 'Select Hindi',
        hindiInstruction: 'कदम 2/2: यहाँ हिंदी (भारत) चुनें और उसे सबसे ऊपर करें।',
        expectedKeywords: ['hindi', 'हिन्दी', 'हिंदी']
      }
    ]
  },

  // 10. Clear App Storage / Cache
  {
    id: 'clear_storage_app_cache',
    name: 'Clear App Cache and Free Space',
    category: 'system_accessibility',
    triggerPatterns: ['phone bhar gaya hai', 'storage saaf karo', 'cache clear karo', 'स्टोरेज खाली करो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Storage & Cache',
        hindiInstruction: 'कदम 1/2: मेमोरी खाली करने के लिए Storage & cache पर दबाएं।',
        expectedKeywords: ['storage', 'cache', 'स्टोरेज']
      },
      {
        stepNumber: 2,
        label: 'Clear Cache Button',
        hindiInstruction: 'कदम 2/2: फालतू फाइलें हटाने के लिए Clear cache पर दबाएं।',
        expectedKeywords: ['clear cache', 'clear', 'साफ']
      }
    ]
  },

  // 11. Restart / Reboot Phone
  {
    id: 'restart_phone_reboot',
    name: 'Restart / Reboot Phone',
    category: 'system_accessibility',
    triggerPatterns: ['phone band karke chalu', 'restart karo', 'reboot karna hai', 'फोन रीस्टार्ट करो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Power Menu',
        hindiInstruction: 'कदम 1/2: फोन का पावर बटन दबाकर रखें और Restart पर दबाएं।',
        expectedKeywords: ['restart', 'reboot', 'रीस्टार्ट']
      },
      {
        stepNumber: 2,
        label: 'Confirm Restart',
        hindiInstruction: 'कदम 2/2: दोबारा Restart पर दबाकर फोन को रीबूट करें।',
        expectedKeywords: ['tap to restart', 'restart', 'पुष्टि']
      }
    ]
  },

  // 12. Take Screenshot
  {
    id: 'screenshot_capture_screen',
    name: 'Take Screenshot of Screen',
    category: 'system_accessibility',
    triggerPatterns: ['screen ki photo', 'screenshot lo', 'screen photo khinchna', 'स्क्रीनशॉट लो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Screenshot Button',
        hindiInstruction: 'कदम 1/1: स्क्रीन की फोटो लेने के लिए Screenshot बटन पर दबाएं।',
        expectedKeywords: ['screenshot', 'capture', 'स्क्रीनशॉट']
      }
    ]
  },

  // 13. Install App from Google Play Store
  {
    id: 'playstore_install_app',
    name: 'Install App from Play Store',
    category: 'system_accessibility',
    triggerPatterns: ['app download karna', 'play store se app', 'naya app daalo', 'ऐप डाउनलोड'],
    steps: [
      {
        stepNumber: 1,
        label: 'Play Store Search',
        hindiInstruction: 'कदम 1/2: जो ऐप चाहिए, उसका नाम Play Store के सर्च में लिखें।',
        expectedKeywords: ['search', 'play store', 'खोजें']
      },
      {
        stepNumber: 2,
        label: 'Install Button',
        hindiInstruction: 'कदम 2/2: ऐप डाउनलोड करने के लिए हरे Install बटन पर दबाएं।',
        expectedKeywords: ['install', 'download', 'इंस्टॉल']
      }
    ]
  },

  // 14. Enable Battery Saver
  {
    id: 'battery_saver_enable',
    name: 'Enable Battery Saver Mode',
    category: 'system_accessibility',
    triggerPatterns: ['battery bachao', 'battery saver lagao', 'charge jaldi khatam', 'बैटरी सेवर'],
    steps: [
      {
        stepNumber: 1,
        label: 'Battery Saver Toggle',
        hindiInstruction: 'कदम 1/1: बैटरी बचाने के लिए Battery Saver बटन पर दबाएं।',
        expectedKeywords: ['battery saver', 'power save', 'बैटरी']
      }
    ]
  },

  // 15. Silent / Mute Mode
  {
    id: 'silent_mute_mode_toggle',
    name: 'Turn Phone on Silent or Mute',
    category: 'system_accessibility',
    triggerPatterns: ['phone silent karo', 'ghanti band karo', 'mute karo', 'साइलेंट करो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Silent Mode Tile',
        hindiInstruction: 'कदम 1/1: फोन को शांत करने के लिए Silent या Mute बटन पर दबाएं।',
        expectedKeywords: ['silent', 'mute', 'vibrate', 'साइलेंट']
      }
    ]
  }
];
