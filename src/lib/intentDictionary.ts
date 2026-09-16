// Comprehensive 50+ Elder Intent Dictionary for Hindi, Hinglish, and English Android screen actions.

export interface IntentDefinition {
  id: string;
  name: string;
  queryPatterns: string[];
  elementKeywords: string[];
}

export const ELDER_INTENTS: IntentDefinition[] = [
  // 1. Video Call
  {
    id: 'video_call',
    name: 'Video Call',
    queryPatterns: [
      'video call', 'video', 'vidiyo', 'vdo', 'video pe baat', 'chehra dekh kar',
      'camera call', 'face call', 'face time', 'vcall', 'video par baat', 'vidio',
      'video call lagao', 'video call kaise kare', 'video calling', 'chehra dekhna',
      'वीडियो', 'वीडियो कॉल', 'विडियो', 'चेहरा देखकर', 'विडिओ', 'वीडियो कॉलिंग'
    ],
    elementKeywords: ['video call', 'video_call', 'vc', 'camcorder', 'वीडियो कॉल']
  },

  // 2. Audio Call / Phone Dialer
  {
    id: 'call',
    name: 'Phone / Audio Call',
    queryPatterns: [
      'call', 'phone', 'dial', 'baat karni', 'lagao', 'milao', 'awaz', 'awaaz',
      'number milao', 'fon', 'kol', 'phone lagao', 'call lagao', 'baat karvao',
      'audio call', 'voice call', 'ghanti bajao', 'call karna hai', 'ring',
      'कॉल', 'फोन', 'बात', 'डायल', 'मिलाओ', 'नंबर', 'फोन लगाओ', 'कॉल लगाओ', 'बात करनी', 'ऑडियो कॉल'
    ],
    elementKeywords: ['call', 'dial', 'phone', 'keypad', 'dialpad', 'voice call', 'कॉल', 'फोन', 'डायल']
  },

  // 3. Chat / Messaging / SMS
  {
    id: 'chat_message',
    name: 'Chat / Messaging',
    queryPatterns: [
      'chat', 'message', 'msg', 'sms', 'sandesh', 'likhna', 'bhejo', 'kuch likhu',
      'naya sandesh', 'text', 'naye chat', 'new chat', 'message bhejna', 'chitthi',
      'likh kar bhejo', 'whatsapp message', 'likhna hai', 'type karna', 'likhein',
      'चैट', 'संदेश', 'मैसेज', 'लिखना', 'भेजो', 'नया संदेश', 'एसएमएस', 'चिट्ठी'
    ],
    elementKeywords: ['chat', 'message', 'send', 'compose', 'start chat', 'new message', 'new chat', 'sms', 'text', 'type', 'input', 'संदेश', 'मैसेज', 'चैट', 'भेजें']
  },

  // 4. Voice Note / Audio Message
  {
    id: 'voice_message',
    name: 'Voice Note / Audio Sandesh',
    queryPatterns: [
      'voice message', 'voice note', 'bol kar bhejo', 'awaaz bhejo', 'audio message',
      'recording bhejo', 'awaz me bhejo', 'bolke message', 'audio note',
      'वॉइस मैसेज', 'आवाज भेजो', 'बोलकर भेजो', 'ऑडियो मैसेज', 'रिकॉर्डिंग'
    ],
    elementKeywords: ['voice message', 'voice note', 'audio', 'mic', 'record', 'वॉइस', 'रिकॉर्ड']
  },

  // 5. Search / Find
  {
    id: 'search',
    name: 'Search / Find',
    queryPatterns: [
      'search', 'khoj', 'dhoondho', 'dhoondh', 'talash', 'kahan hai', 'pata karo',
      'dhoondhna', 'khojna', 'mil nahi raha', 'kaha milega', 'dhoondo', 'khojo',
      'pata lagao', 'kahan par hai', 'search karna hai',
      'खोज', 'ढूंढो', 'ढूंढ', 'तलाश', 'पता करो', 'सर्च', 'कहाँ है', 'ढूंढना', 'खोजें'
    ],
    elementKeywords: ['search', 'find', 'explore', 'lookup', 'query', 'search box', 'खोज', 'सर्च', 'ढूंढें']
  },

  // 6. Camera / Take Photo
  {
    id: 'camera_photo',
    name: 'Camera / Take Photo',
    queryPatterns: [
      'camera', 'photo', 'tasveer', 'pic', 'picture', 'selfie', 'photo khincho',
      'tasvir', 'photo lena', 'chhavi', 'camera chalu', 'tasveer khincho',
      'selfi', 'tasveer lena', 'photo utaro',
      'कैमरा', 'फोटो', 'तस्वीर', 'पिक्चर', 'सेल्फी', 'फोटो खींचो', 'तस्वीर खींचो', 'फोटो लो'
    ],
    elementKeywords: ['camera', 'photo', 'capture', 'take photo', 'shutter', 'lens', 'कैमरा', 'फोटो']
  },

  // 7. Gallery / View Saved Photos
  {
    id: 'gallery_media',
    name: 'Gallery / View Photos',
    queryPatterns: [
      'gallery', 'album', 'purani photo', 'photos', 'tasveerein', 'chhaviyan',
      'meri photo', 'photo dekhna', 'photo kahan hai', 'saved photo', 'photo album',
      'tasvire dekhna', 'purana photo',
      'गैलरी', 'एल्बम', 'पुरानी फोटो', 'तस्वीरें', 'फोटो देखना', 'फ़ोटो एल्बम'
    ],
    elementKeywords: ['gallery', 'photos', 'album', 'media', 'images', 'pictures', 'गैलरी', 'एल्बम', 'फ़ोटो']
  },

  // 8. Play Video / Music / Bhajan / Katha
  {
    id: 'play_video_music',
    name: 'Play Video / Song / Bhajan',
    queryPatterns: [
      'play', 'chalao', 'chalu karo', 'video dekho', 'gana', 'bhajan', 'geet',
      'gana sunao', 'bhajan sunao', 'bajao', 'play karo', 'katha', 'aarti', 'shuru karo', 'chalana',
      'chalaiye', 'video lagao', 'gana lagao', 'dhun', 'kirtan',
      'चलाओ', 'गाना', 'भजन', 'गीत', 'गाना सुनाओ', 'बजाओ', 'शुरू', 'आरती', 'कथा', 'कीर्तन'
    ],
    elementKeywords: ['play', 'watch', 'video', 'start', 'resume', 'listen', 'प्ले', 'चलाएं', 'देखें', 'सुनें']
  },

  // 9. Pause / Stop Media
  {
    id: 'pause_stop',
    name: 'Pause / Stop Media',
    queryPatterns: [
      'pause', 'roko', 'band karo', 'ruk jao', 'thahar', 'stop', 'thoda roko',
      'gana roko', 'video roko', 'khatam karo', 'ruk', 'rok do',
      'रोको', 'बंद करो', 'रुक', 'पॉज', 'ठहरो', 'रोकें', 'बंद'
    ],
    elementKeywords: ['pause', 'stop', 'halt', 'पॉज', 'रोकें', 'बंद करें']
  },

  // 10. Order Food / Grocery / Shopping
  {
    id: 'order_food_shopping',
    name: 'Order Food / Grocery / Shopping',
    queryPatterns: [
      'order', 'mangwao', 'mangana', 'khareedna', 'buy', 'khana', 'biryani',
      'roti', 'saman', 'le lo', 'khana order', 'ghar pe mangao', 'khareedo',
      'mitaai', 'sabji', 'dawai mangao', 'shopping', 'rashan',
      'ऑर्डर', 'मंगवाओ', 'मंगाना', 'खरीदना', 'खाना', 'सामान', 'खरीदो', 'सब्जी', 'राशन'
    ],
    elementKeywords: ['order', 'buy', 'add', 'cart', 'checkout', 'item', 'dish', 'menu', 'add to cart', 'ऑर्डर', 'खरीदें', 'जोड़ें']
  },

  // 11. UPI / Payment / Send Money
  {
    id: 'payment_upi',
    name: 'UPI / Payment / Send Money',
    queryPatterns: [
      'pay', 'paisa', 'paise', 'rupaye', 'rupiye', 'rupee', 'rupees', 'transfer',
      'bhejna', 'bhejne', 'upi', 'gpay', 'phonepe', 'khata', 'paise bhejo', 'paise bhejne',
      'bhim', 'bill bharna', 'paise dena', 'chukan', 'money', 'send money', 'paytm',
      'kisi ko paise', 'bhugtan',
      'पे', 'पैसा', 'पैसे', 'रुपये', 'ट्रांसफर', 'भेजना', 'पेमेंट', 'पैसे भेजो', 'पैसे भेजें', 'बिल', 'भुगतान'
    ],
    elementKeywords: ['pay', 'send money', 'upi', 'transfer', 'proceed to pay', 'bhim', 'पेमेंट', 'भुगतान', 'पे', 'पैसे भेजें']
  },

  // 12. Mobile Recharge / Bill Payment
  {
    id: 'recharge_mobile',
    name: 'Mobile Recharge / Bills',
    queryPatterns: [
      'recharge', 'reacharge', 'richarge', 'mobile recharge', 'balance khatam',
      'pack khatam', 'recharge karna hai', 'bijli ka bill', 'paani ka bill',
      'रिचार्ज', 'मोबाइल रिचार्ज', 'बिजली का बिल', 'बिल भरना', 'पैक'
    ],
    elementKeywords: ['recharge', 'bill', 'pay bill', 'mobile recharge', 'electricity', 'रिचार्ज', 'बिल']
  },

  // 13. Settings / Options / Menu
  {
    id: 'settings_options',
    name: 'Settings / Options / Menu',
    queryPatterns: [
      'setting', 'settings', 'option', 'vikalp', 'badlo', 'change', 'more', 'menu',
      'three dots', 'bindu', 'teen bindu', 'badalna', 'seeting', 'prabandh',
      'सेटिंग', 'विकल्प', 'बदलो', 'मेनू', 'तीन बिंदु', 'सेटिंग्स', 'प्रबंध'
    ],
    elementKeywords: ['setting', 'settings', 'more options', 'menu', 'overflow', 'preferences', 'more', 'सेटिंग', 'विकल्प', 'मेनू']
  },

  // 14. Delete / Remove / Trash
  {
    id: 'delete_remove',
    name: 'Delete / Remove / Trash',
    queryPatterns: [
      'delete', 'hatao', 'mitao', 'khatam', 'trash', 'remove', 'saaf karo',
      'feko', 'hata do', 'hataana', 'mita do', 'safai', 'kachra', 'dlt',
      'डिलीट', 'हटाओ', 'मिटाओ', 'कचरा', 'साफ करो', 'हटा दो', 'हटाएं'
    ],
    elementKeywords: ['delete', 'trash', 'bin', 'remove', 'discard', 'clear', 'डिलीट', 'हटाएं', 'मिटाएं']
  },

  // 15. Share / Forward
  {
    id: 'share_forward',
    name: 'Share / Forward',
    queryPatterns: [
      'share', 'forward', 'dusre ko bhejo', 'batao', 'kisiko bhejna', 'aage bhejo',
      'dost ko bhejo', 'whatsapp pe bhejo', 'bhejiye', 'forward karna',
      'शेयर', 'फॉरवर्ड', 'भेजें', 'आगे भेजो', 'दूसरे को भेजो', 'शेयर करें'
    ],
    elementKeywords: ['share', 'forward', 'send to', 'शेयर', 'भेजें', 'फॉरवर्ड']
  },

  // 16. Add / Create New
  {
    id: 'add_new',
    name: 'Add / Create New',
    queryPatterns: [
      'add', 'naya', 'create', 'jodo', 'plus', 'new', 'naya contact', 'naya number',
      'naya jodo', 'shamil karo', 'banaye', 'plus button', 'naya banao',
      'नया', 'जोड़ो', 'प्लस', 'बनाओ', 'नया नंबर', 'नया संपर्क', 'जोड़ें'
    ],
    elementKeywords: ['add', 'new', 'create', 'plus', 'compose', 'नया', 'जोड़ें', 'बनाएं']
  },

  // 17. Status / Story
  {
    id: 'status_story',
    name: 'Status / Story',
    queryPatterns: [
      'status', 'story', 'update', 'haal chaal', 'kya chal raha', 'status lagao',
      'status dekhna', 'apna status', 'kahani', 'status update',
      'स्टेटस', 'स्टोरी', 'अपडेट', 'हाल चाल', 'स्टेटस लगाओ'
    ],
    elementKeywords: ['status', 'story', 'updates', 'my status', 'स्टेटस', 'अपडेट']
  },

  // 18. Mic / Voice Search / Voice Typing
  {
    id: 'mic_voice_search',
    name: 'Microphone / Voice Typing',
    queryPatterns: [
      'mic', 'bol kar', 'voice', 'awaaz', 'mike', 'bolke', 'bol kar likhna',
      'maik', 'bolna', 'voice typing', 'bol kar search', 'mike dabao',
      'माइक', 'बोलकर', 'आवाज', 'माइक चालू', 'बोलकर खोजें', 'माइक दबाओ'
    ],
    elementKeywords: ['mic', 'microphone', 'voice', 'speak', 'voice search', 'माइक']
  },

  // 19. Back / Close / Exit
  {
    id: 'back_close',
    name: 'Back / Close / Cancel',
    queryPatterns: [
      'back', 'peeche', 'wapas', 'band', 'close', 'hata do', 'peeche jao',
      'bahar niklo', 'wapis', 'cancel karo', 'radd karo', 'peechhe', 'laotna',
      'पीछे', 'वापस', 'बंद', 'हटाओ', 'रद्द', 'बाहर', 'पीछे जाओ'
    ],
    elementKeywords: ['back', 'close', 'cancel', 'navigate up', 'exit', 'done', 'पीछे', 'बंद', 'रद्द', 'वापस']
  },

  // 20. Download / Save
  {
    id: 'download_save',
    name: 'Download / Save',
    queryPatterns: [
      'download', 'save', 'rakho', 'surakshit', 'jama karo', 'phone me daalo',
      'save karo', 'apne paas rakho', 'download karna', 'phone me rakhna',
      'डाउनलोड', 'सेव', 'रखो', 'सुरक्षित', 'सहेजें', 'डाउनलोड करो'
    ],
    elementKeywords: ['download', 'save', 'keep', 'store', 'डाउनलोड', 'सहेजें']
  },

  // 21. Help / Assistance / Stuck
  {
    id: 'help_assistance',
    name: 'Help / Assistance',
    queryPatterns: [
      'help', 'madad', 'samajh nahi aa raha', 'sahayata', 'kya karu', 'madat',
      'phas gaya', 'fas gaya', 'nahi chal raha', 'kaise hoga', 'madad chahiye',
      'gadbad ho gayi', 'galat ho gaya',
      'मदद', 'सहायता', 'समझ नहीं आ रहा', 'फंस गया', 'क्या करूं', 'मदद चाहिए'
    ],
    elementKeywords: ['help', 'support', 'faq', 'guide', 'info', 'assistance', 'मदद', 'सहायता']
  },

  // 22. Profile / Account / My Details
  {
    id: 'profile_account',
    name: 'Profile / Account',
    queryPatterns: [
      'profile', 'account', 'mera account', 'apna account', 'khata', 'meri photo',
      'meri detail', 'nam', 'apni profile', 'mera nam', 'meri setting', 'mera khata',
      'प्रोफाइल', 'अकाउंट', 'खाता', 'नाम', 'मेरी प्रोफाइल', 'मेरा खाता'
    ],
    elementKeywords: ['profile', 'account', 'me', 'user', 'avatar', 'प्रोफाइल', 'खाता']
  },

  // 23. Alarm / Clock / Reminder Time
  {
    id: 'alarm_clock_time',
    name: 'Alarm / Clock / Time',
    queryPatterns: [
      'alarm', 'alarm lagao', 'ghadi', 'samay', 'jagao', 'subah ka alarm',
      'time', 'kitne baje', 'timer', 'uthane ka alarm', 'alarm kaise lagaye',
      'अलार्म', 'अलार्म लगाओ', 'घड़ी', 'समय', 'जगाओ', 'टाइमर', 'सुबह'
    ],
    elementKeywords: ['alarm', 'clock', 'timer', 'add alarm', 'time', 'अलार्म', 'घड़ी']
  },

  // 24. Weather / Mausam
  {
    id: 'weather_mausam',
    name: 'Weather / Temperature / Rain',
    queryPatterns: [
      'weather', 'mausam', 'barish', 'baarish', 'rain', 'barsaat', 'dhoop', 'garmi', 'sardi', 'taapmaan',
      'aaj ka mausam', 'temperature', 'badal', 'pani barsega', 'barish hogi',
      'मौसम', 'बारिश', 'धूप', 'गर्मी', 'सर्दी', 'तापमान', 'आज का मौसम', 'बरसात'
    ],
    elementKeywords: ['weather', 'forecast', 'temperature', 'rain', 'मौसम', 'तापमान']
  },

  // 25. Flashlight / Torch
  {
    id: 'flashlight_torch',
    name: 'Flashlight / Torch',
    queryPatterns: [
      'torch', 'flashlight', 'roshni', 'batti', 'light chalao', 'torch jalao',
      'andhera hai', 'torch band karo', 'batti chalu',
      'टॉर्च', 'फ्लैशलाइट', 'रोशनी', 'बत्ती', 'टॉर्च जलाओ', 'अंधेरा'
    ],
    elementKeywords: ['torch', 'flashlight', 'flash', 'टॉर्च', 'रोशनी']
  },

  // 26. Train / Railway / Ticket / IRCTC
  {
    id: 'train_railway',
    name: 'Train / Railway / PNR',
    queryPatterns: [
      'train', 'railway', 'rail gaadi', 'ticket', 'pnr', 'irctc', 'train status',
      'gaadi kahan pahunchi', 'train ka samay', 'ticket booking', 'seat',
      'ट्रेन', 'रेलवे', 'रेल गाड़ी', 'टिकट', 'पीएनआर', 'गाड़ी'
    ],
    elementKeywords: ['train', 'pnr', 'ticket', 'station', 'railway', 'ट्रेन', 'टिकट']
  },

  // 27. Cab / Auto / Ride (Ola/Uber)
  {
    id: 'cab_auto_ride',
    name: 'Cab / Auto / Taxi Ride',
    queryPatterns: [
      'cab', 'auto', 'taxi', 'uber', 'ola', 'gaadi bulao', 'auto bulao',
      'ride', 'kahin jana hai', 'taxi book', 'cab book karo',
      'कैब', 'ऑटो', 'टैक्सी', 'गाड़ी बुलाओ', 'राइड'
    ],
    elementKeywords: ['cab', 'auto', 'ride', 'book', 'confirm', 'कैब', 'ऑटो', 'बुक']
  },

  // 28. Medicine / Health / Doctor
  {
    id: 'medicine_health',
    name: 'Medicine / Health / Reminders',
    queryPatterns: [
      'dawa', 'medicine', 'goli', 'health', 'doctor', 'aspataal', 'dawa ka time',
      'dawaai', 'tablet', 'parcha', 'ilaaj',
      'दवा', 'दवाई', 'गोली', 'डॉक्टर', 'अस्पताल', 'स्वास्थ्य', 'इलाज'
    ],
    elementKeywords: ['medicine', 'pill', 'health', 'doctor', 'reminder', 'दवा', 'स्वास्थ्य']
  },

  // 29. Battery / Charging
  {
    id: 'battery_power',
    name: 'Battery / Charging',
    queryPatterns: [
      'battery', 'charge', 'charging', 'battery kitni hai', 'battery khatam',
      'power saver', 'battery percentage', 'charge pe lagana',
      'बैटरी', 'चार्ज', 'चार्जिंग', 'बैटरी कितनी है'
    ],
    elementKeywords: ['battery', 'power', 'charge', 'बैटरी']
  },

  // 30. WiFi / Internet Data
  {
    id: 'wifi_internet',
    name: 'WiFi / Mobile Internet',
    queryPatterns: [
      'wifi', 'internet', 'net nahi chal raha', 'data', 'mobile data', 'hotspot',
      'net chalu karo', 'wifi connect', 'internet band',
      'वाईफाई', 'इंटरनेट', 'नेट', 'डाटा', 'मोबाइल डाटा'
    ],
    elementKeywords: ['wifi', 'wi-fi', 'internet', 'data', 'network', 'वाईफाई', 'नेटवर्क']
  },

  // 31. Bluetooth / Earphones
  {
    id: 'bluetooth_connect',
    name: 'Bluetooth / Audio Device',
    queryPatterns: [
      'bluetooth', 'earphone', 'headphone', 'speaker', 'bluetooth chalu',
      'earphone connect', 'bluetooth jodo',
      'ब्लूटूथ', 'इयरफोन', 'हेडफोन', 'स्पीकर'
    ],
    elementKeywords: ['bluetooth', 'pair', 'device', 'ब्लूटूथ']
  },

  // 32. Calculator / Math / Hisaab
  {
    id: 'calculator_math',
    name: 'Calculator / Calculation',
    queryPatterns: [
      'calculator', 'hisaab', 'jodna', 'ghatana', 'guna', 'hisaab kitab',
      'kitna hua', 'kalkulator', 'ginti',
      'कैलकुलेटर', 'हिसाब', 'जोड़ना', 'घटाना', 'गिनती'
    ],
    elementKeywords: ['calculator', 'equals', 'clear', 'कैलकुलेटर']
  },

  // 33. Notes / Reminder / Diary
  {
    id: 'notes_reminder',
    name: 'Notes / Diary / Remember',
    queryPatterns: [
      'notes', 'diary', 'likh ke rakhna', 'yaad rakhna', 'note karo', 'suchi',
      'list banao', 'yaad dilana', 'kuch likhna hai',
      'नोट्स', 'डायरी', 'याद रखना', 'सूची', 'लिस्ट'
    ],
    elementKeywords: ['notes', 'note', 'add note', 'memo', 'list', 'नोट्स', 'सूची']
  },

  // 34. News / Samachar / Newspaper
  {
    id: 'news_samachar',
    name: 'News / Samachar / Updates',
    queryPatterns: [
      'news', 'samachar', 'akhbar', 'khabar', 'aaj ki khabar', 'desh ka haal',
      'taaza khabar', 'patrika', 'khabrein',
      'समाचार', 'अखबार', 'खबर', 'ताजा खबर', 'न्यूज़'
    ],
    elementKeywords: ['news', 'headline', 'top stories', 'समाचार', 'खबरें']
  },

  // 35. WhatsApp Group
  {
    id: 'whatsapp_group',
    name: 'Group Chat / Parivar Group',
    queryPatterns: [
      'group', 'parivar group', 'family group', 'naya group', 'group me jodo',
      'group ka message', 'mandir group',
      'ग्रुप', 'परिवार ग्रुप', 'नया ग्रुप', 'ग्रुप मैसेज'
    ],
    elementKeywords: ['group', 'new group', 'participants', 'ग्रुप']
  },

  // 36. Read Screen Aloud / Padho
  {
    id: 'read_screen_text',
    name: 'Read Screen Aloud / Speak',
    queryPatterns: [
      'padh ke sunao', 'padho', 'kya likha hai', 'padh nahi pa raha',
      'bol kar batao', 'aankhon me dard', 'chhota likha hai', 'sunaiye',
      'पढ़ कर सुनाओ', 'पढ़ो', 'क्या लिखा है', 'बोलकर बताओ'
    ],
    elementKeywords: ['listen', 'read aloud', 'speak', 'tts', 'सुनें', 'पढ़ें']
  },

  // 37. Zoom / Large Text / Akshar Bade
  {
    id: 'zoom_magnify',
    name: 'Zoom / Text Size / Bada Dikhao',
    queryPatterns: [
      'zoom', 'bada dikhao', 'akshar bade karo', 'text size', 'dikhai nahi de raha',
      'bada karo', 'magnify', 'font size',
      'ज़ूम', 'बड़ा दिखाओ', 'अक्षर बड़े करो', 'बड़ा करें'
    ],
    elementKeywords: ['zoom', 'font size', 'display size', 'magnification', 'ज़ूम']
  },

  // 38. Volume / Louder / Dheere
  {
    id: 'volume_sound',
    name: 'Volume / Audio Level',
    queryPatterns: [
      'volume', 'awaaz badhao', 'dheere karo', 'awaaz kam karo', 'zor se sunao',
      'awaz tez karo', 'sound', 'awaaj badhao',
      'वॉल्यूम', 'आवाज बढ़ाओ', 'आवाज कम करो', 'तेज करो'
    ],
    elementKeywords: ['volume', 'sound', 'speaker', 'audio level', 'वॉल्यूम', 'ध्वनि']
  },

  // 39. Mute / Silent Phone
  {
    id: 'mute_silent',
    name: 'Mute / Silent Phone',
    queryPatterns: [
      'silent', 'mute', 'shant karo', 'awaaz band karo', 'ghanti band',
      'vibrate', 'silent mode', 'awaaj band',
      'साइलेंट', 'म्यूट', 'शांत करो', 'आवाज बंद', 'कंपन'
    ],
    elementKeywords: ['silent', 'mute', 'vibrate', 'sound off', 'म्यूट', 'शांत']
  },

  // 40. Location / Maps / Rasta
  {
    id: 'location_map',
    name: 'Location / GPS / Maps',
    queryPatterns: [
      'map', 'location', 'rasta', 'kahan jana hai', 'gps', 'navigation',
      'rasta dikhao', 'kahan par hoon', 'naksha', 'pata',
      'मैप', 'लोकेशन', 'रास्ता', 'नक्शा', 'नेविगेशन', 'कहाँ जाना है'
    ],
    elementKeywords: ['map', 'location', 'directions', 'navigate', 'start route', 'मैप', 'रास्ता']
  },

  // 41. OTP / Verification Code
  {
    id: 'otp_verification',
    name: 'OTP / Verification Code',
    queryPatterns: [
      'otp', 'code', 'password', 'aaya hua number', 'pin', 'verification code',
      'otp kahan aaya', 'otp batao', 'sms wala code',
      'ओटीपी', 'कोड', 'पासवर्ड', 'पिन', 'सत्यापन कोड'
    ],
    elementKeywords: ['otp', 'verify', 'code', 'resend', 'submit', 'ओटीपी', 'सत्यापित']
  },

  // 42. Block / Spam Calls
  {
    id: 'block_spam',
    name: 'Block / Report Spam',
    queryPatterns: [
      'block', 'spam', 'faltu call', 'rok lagao', 'pareshan kar raha hai',
      'fraud call', 'number block karo', 'dhokha',
      'ब्लॉक', 'स्पैम', 'फालतू कॉल', 'रोक लगाओ', 'ब्लॉक करें'
    ],
    elementKeywords: ['block', 'report spam', 'block number', 'ब्लॉक', 'रोकें']
  },

  // 43. Screen Brightness
  {
    id: 'brightness_screen',
    name: 'Screen Brightness / Roshni',
    queryPatterns: [
      'brightness', 'chamak', 'roshni badhao', 'screen roshni', 'chamak kam karo',
      'andhera dikh raha hai', 'bright karo',
      'ब्राइटनेस', 'चमक', 'स्क्रीन रोशनी', 'रोशनी बढ़ाओ'
    ],
    elementKeywords: ['brightness', 'display', 'screen light', 'ब्राइटनेस', 'चमक']
  },

  // 44. Notifications / Alerts
  {
    id: 'notification_alert',
    name: 'Notifications / Bell Icon',
    queryPatterns: [
      'notification', 'sandesh aaya', 'ghanti', 'bell icon', 'kya sandesh hai',
      'suchna', 'noti',
      'नोटिफिकेशन', 'सूचना', 'घंटी', 'अलर्ट'
    ],
    elementKeywords: ['notification', 'bell', 'alerts', 'notifs', 'नोटिफिकेशन']
  },

  // 45. Copy / Paste
  {
    id: 'copy_paste',
    name: 'Copy / Paste',
    queryPatterns: [
      'copy', 'paste', 'nakal karo', 'chipkao', 'copy paste', 'likha hua uthao',
      'कॉपी', 'पेस्ट', 'नकल करो', 'चिपकाओ'
    ],
    elementKeywords: ['copy', 'paste', 'clipboard', 'कॉपी', 'पेस्ट']
  },

  // 46. App Update / Play Store
  {
    id: 'update_app',
    name: 'App Update / Play Store',
    queryPatterns: [
      'update', 'play store', 'naya version', 'app update karo', 'purani app',
      'अपडेट', 'प्ले स्टोर', 'नया वर्जन', 'अपडेट करें'
    ],
    elementKeywords: ['update', 'install', 'open', 'अपडेट', 'इंस्टॉल']
  },

  // 47. Call History / Recent Calls
  {
    id: 'call_history_logs',
    name: 'Call History / Recent Calls',
    queryPatterns: [
      'call history', 'recent call', 'kisne phone kiya', 'missed call',
      'purana call', 'call log', 'kiska phone aaya tha',
      'कॉल हिस्ट्री', 'मिस्ड कॉल', 'किसका फोन आया', 'हालिया कॉल'
    ],
    elementKeywords: ['recent', 'history', 'recents', 'call logs', 'missed', 'हालिया', 'इतिहास']
  },

  // 48. Contacts / Address Book
  {
    id: 'contacts_addressbook',
    name: 'Contacts / Phonebook',
    queryPatterns: [
      'contact', 'contacts', 'phonebook', 'saved number', 'number ki list',
      'sampark', 'dost ka number', 'rishtedar ka number',
      'संपर्क', 'कॉन्टैक्ट्स', 'फोनबुक', 'नंबर लिस्ट'
    ],
    elementKeywords: ['contact', 'contacts', 'people', 'phonebook', 'संपर्क']
  },

  // 49. Screenshot Capture
  {
    id: 'screenshot_capture',
    name: 'Screenshot / Screen Photo',
    queryPatterns: [
      'screenshot', 'screen photo', 'screen ki tasveer', 'screen capture',
      'स्क्रीनशॉट', 'स्क्रीन फोटो', 'स्क्रीन की तस्वीर'
    ],
    elementKeywords: ['screenshot', 'capture screen', 'स्क्रीनशॉट']
  },

  // 50. Language / Hindi Mode
  {
    id: 'language_hindi',
    name: 'Language / Hindi Mode',
    queryPatterns: [
      'hindi', 'language', 'bhasha', 'hindi me karo', 'angrezi samajh nahi aati',
      'bhasha badlo', 'hindi bhasha',
      'हिंदी', 'भाषा', 'हिंदी में करो', 'भाषा बदलो'
    ],
    elementKeywords: ['language', 'hindi', 'bhasha', 'हिंदी', 'भाषा']
  }
];

/**
 * Matches an elder's question to the best matching interactive element on the screen.
 * Prioritizes actionable elements ([BUTTON], [INPUT], [TOGGLE]) over static [TEXT].
 */
export function matchElderIntent(
  question: string,
  uiElements: string[]
): { highlightIndex: number | null; matchedIntent: IntentDefinition | null } {
  const qLower = question.toLowerCase();

  // Find all intents triggered by the user's question
  const matchingIntents = ELDER_INTENTS.filter((intent) =>
    intent.queryPatterns.some((pattern) => qLower.includes(pattern))
  );

  if (matchingIntents.length === 0) {
    return { highlightIndex: null, matchedIntent: null };
  }

  // Pass 1: Prioritize actionable elements ([BUTTON], [INPUT], [TOGGLE])
  for (const intent of matchingIntents) {
    for (let i = 0; i < uiElements.length; i++) {
      const elLower = uiElements[i].toLowerCase();
      const isActionable =
        elLower.startsWith('[button]') ||
        elLower.startsWith('[input]') ||
        elLower.startsWith('[toggle]');

      if (isActionable) {
        if (intent.elementKeywords.some((keyword) => elLower.includes(keyword))) {
          return { highlightIndex: i, matchedIntent: intent };
        }
      }
    }
  }

  // Pass 2: Fallback to any element including [TEXT] if no actionable button matched
  for (const intent of matchingIntents) {
    for (let i = 0; i < uiElements.length; i++) {
      const elLower = uiElements[i].toLowerCase();
      if (intent.elementKeywords.some((keyword) => elLower.includes(keyword))) {
        return { highlightIndex: i, matchedIntent: intent };
      }
    }
  }

  return { highlightIndex: null, matchedIntent: matchingIntents[0] };
}
