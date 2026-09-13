import json
import random
import os

SCENARIOS = [
    # --- PHONEPE & PAYMENTS ---
    {
        'app': 'com.phonepe.app',
        'elements': ['क्यूआर कोड स्कैन करें (Scan QR)', 'टू मोबाइल नंबर', 'बैलेंस चेक', 'इतिहास (History)'],
        'query': 'explain',
        'outputs': [
            'यह आपका फोन-पे ऐप है। यहाँ से आप किसी को भी स्कैन करके या नंबर डालकर पैसे भेज सकते हैं।',
            'आप फोन-पे के मुख्य पेज पर हैं। यहाँ आप अपना बैलेंस देख सकते हैं या पैसे ट्रांसफर कर सकते हैं।'
        ]
    },
    {
        'app': 'com.phonepe.app',
        'elements': ['क्यूआर कोड स्कैन करें (Scan QR)', 'टू मोबाइल नंबर', 'बैलेंस चेक'],
        'query': 'what_to_tap',
        'outputs': [
            'पैसे भेजने के लिए टू मोबाइल नंबर पर टैप करें।',
            'अगर आप किसी दुकान पर हैं, तो क्यूआर कोड स्कैन करें (Scan QR) वाले बटन को दबाएं।'
        ]
    },
    {
        'app': 'com.phonepe.app',
        'elements': ['एंटर यूपीआई पिन (Enter UPI PIN)', 'अमाउंट ₹5000', 'सेंड (Send)', 'लॉटरी जीतो'],
        'query': 'what_to_tap',
        'outputs': [
            'पैसे भेजने के लिए अपना यूपीआई पिन डालें। ध्यान दें, कभी भी अनजान व्यक्ति को पैसे न भेजें।',
            'अगर आप इन्हें पैसे भेजना चाहते हैं, तो पिन डालें और सेंड (Send) दबाएं। लॉटरी वाले मैसेज पर ध्यान न दें, वह फ्रॉड हो सकता है।'
        ]
    },
    {
        'app': 'net.one97.paytm',
        'elements': ['पासबुक', 'स्कैन एंड पे', 'मोबाइल रिचार्ज', 'डीटीएच'],
        'query': 'explain',
        'outputs': [
            'यह पेटीएम ऐप है। यहाँ से आप अपना फोन या टीवी रिचार्ज कर सकते हैं।',
            'आप पेटीएम पर हैं। सामने दिए गए पासबुक बटन से आप अपने पुराने खर्चे देख सकते हैं।'
        ]
    },
    
    # --- WHATSAPP ---
    {
        'app': 'com.whatsapp',
        'elements': ['चैट (Chat)', 'स्टेटस (Status)', 'कॉल (Calls)'],
        'query': 'explain',
        'outputs': [
            'यह वॉट्सऐप की मेन स्क्रीन है। यहाँ आपको अपने परिवार और दोस्तों के मैसेज दिखेंगे।',
            'आप वॉट्सऐप पर हैं। ऊपर दिए गए कॉल्स (Calls) बटन से आप देख सकते हैं कि किसका फोन आया था।'
        ]
    },
    {
        'app': 'com.whatsapp',
        'elements': ['बेटा (Son)', 'वीडियो कॉल', 'ऑडियो कॉल', 'टाइप करें...'],
        'query': 'what_to_tap',
        'outputs': [
            'बेटा को वीडियो कॉल करने के लिए ऊपर कैमरे वाले निशान को दबाएं।',
            'अगर आप बोलकर मैसेज भेजना चाहते हैं, तो नीचे दिए गए हरे माइक वाले निशान को दबाकर रखें।'
        ]
    },
    {
        'app': 'com.whatsapp',
        'elements': ['फॉरवर्ड करें (Forward)', 'डिलीट (Delete)', 'रिप्लाई (Reply)'],
        'query': 'what_to_tap',
        'outputs': [
            'मैसेज को किसी और को भेजने के लिए फॉरवर्ड (Forward) वाले तीर को दबाएं।',
            'मैसेज हटाने के लिए डिलीट (Delete) वाले डस्टबिन के निशान को दबाएं।'
        ]
    },
    
    # --- YOUTUBE ---
    {
        'app': 'com.google.android.youtube',
        'elements': ['सर्च (Search)', 'भजन और आरती', 'न्यूज़ लाइव'],
        'query': 'explain',
        'outputs': [
            'यह यूट्यूब है। यहाँ आप अपनी पसंद के गाने, भजन या समाचार देख सकते हैं।',
            'आप यूट्यूब पर हैं। कोई भी नया वीडियो खोजने के लिए ऊपर सर्च बटन का उपयोग कर सकते हैं।'
        ]
    },
    {
        'app': 'com.google.android.youtube',
        'elements': ['सर्च (Search)', 'माइक (Mic)'],
        'query': 'what_to_tap',
        'outputs': [
            'कुछ खोजने के लिए माइक (Mic) के निशान को दबाएं और बोलकर अपना वीडियो मंगा लें।',
            'ऊपर दिए गए माइक वाले बटन को दबाकर बोलें कि आप क्या देखना चाहते हैं।'
        ]
    },
    
    # --- IRCTC / TRAVEL ---
    {
        'app': 'cris.org.in.prs.ima',
        'elements': ['ट्रेन बुक करें', 'माय बुकिंग्स', 'पीएनआर इन्क्वायरी'],
        'query': 'explain',
        'outputs': [
            'यह रेलवे का ऐप है। यहाँ से आप अपनी टिकट बुक कर सकते हैं या पुरानी टिकट का स्टेटस जान सकते हैं।',
            'आप आईआरसीटीसी ऐप पर हैं। पीएनआर इन्क्वायरी से आप अपनी सीट कन्फर्म हुई या नहीं, यह चेक कर सकते हैं।'
        ]
    },
    {
        'app': 'cris.org.in.prs.ima',
        'elements': ['नई दिल्ली', 'मुंबई', 'सर्च ट्रेन्स'],
        'query': 'what_to_tap',
        'outputs': [
            'गाड़ी खोजने के लिए नीचे लाल रंग के सर्च ट्रेन्स बटन को दबाएं।',
            'अपनी यात्रा की तारीख चुनने के बाद सर्च बटन पर टैप करें।'
        ]
    },
    
    # --- PHONE DIALER / CONTACTS ---
    {
        'app': 'com.android.dialer',
        'elements': ['रिसेंट (Recents)', 'कॉन्टैक्ट्स (Contacts)', 'डायलपैड'],
        'query': 'explain',
        'outputs': [
            'यह फोन मिलाने वाला ऐप है। कॉन्टैक्ट्स में जाकर आप अपने परिचितों के नंबर ढूंढ सकते हैं।',
            'आप डायलर पर हैं। रिसेंट बटन दबाकर आप देख सकते हैं कि आखिरी बार किससे बात हुई थी।'
        ]
    },
    {
        'app': 'com.android.dialer',
        'elements': ['डॉक्टर', 'कॉल करें (Call)'],
        'query': 'what_to_tap',
        'outputs': [
            'कॉल मिलाने के लिए हरे रंग के कॉल बटन को दबाएं।',
            'डॉक्टर को फोन लगाने के लिए कॉल (Call) बटन पर उंगली रखें।'
        ]
    },
    
    # --- FACEBOOK ---
    {
        'app': 'com.facebook.katana',
        'elements': ['लाइक (Like)', 'कमेंट (Comment)', 'शेयर (Share)', 'वीडियो देखें (Watch)'],
        'query': 'what_to_tap',
        'outputs': [
            'यह फोटो पसंद आई हो तो लाइक (Like) वाले अंगूठे के निशान पर दबाएं।',
            'अगर आप वीडियो देखना चाहते हैं, तो वीडियो देखें (Watch) वाले टीवी के निशान पर टैप करें।'
        ]
    },
    {
        'app': 'com.facebook.katana',
        'elements': ['फ्रेंड रिक्वेस्ट (Friend Requests)', 'नोटिफिकेशन्स (Notifications)', 'सर्च (Search)'],
        'query': 'explain',
        'outputs': [
            'यह फेसबुक ऐप है। यहाँ आप अपने दोस्तों और रिश्तेदारों की तस्वीरें और पोस्ट देख सकते हैं।',
            'आप फेसबुक पर हैं। ऊपर दिए गए फ्रेंड रिक्वेस्ट बटन से आप देख सकते हैं कि किसने आपको जोड़ा है।'
        ]
    },
    
    # --- GALLERY & PHOTOS ---
    {
        'app': 'com.google.android.apps.photos',
        'elements': ['तस्वीरें (Photos)', 'एल्बम (Albums)', 'शेयर करें (Share)', 'डिलीट करें (Delete)'],
        'query': 'explain',
        'outputs': [
            'यह आपकी फोटो गैलरी है। यहाँ आपकी खींची हुई और वॉट्सऐप पर आई सारी तस्वीरें सुरक्षित हैं।',
            'आप फोटो गैलरी में हैं। यहाँ से आप पुरानी पारिवारिक तस्वीरें देख सकते हैं।'
        ]
    },
    {
        'app': 'com.google.android.apps.photos',
        'elements': ['वॉट्सऐप पर भेजें', 'शेयर करें (Share)', 'डिलीट (Delete)', 'एडिट (Edit)'],
        'query': 'what_to_tap',
        'outputs': [
            'इस फोटो को परिवार को भेजने के लिए नीचे शेयर करें (Share) या वॉट्सऐप वाले निशान को दबाएं।',
            'अगर यह फोटो धुंधली या खराब है, तो डिलीट (Delete) वाले डस्टबिन पर दबाकर इसे हटा सकते हैं।'
        ]
    },

    # --- MESSAGES & BANK OTP ---
    {
        'app': 'com.google.android.apps.messaging',
        'elements': ['एसबीआई बैंक (SBI Bank)', 'ओटीपी 482910 (OTP)', 'डिलीट करें', 'मैसेज लिखें'],
        'query': 'what_to_tap',
        'outputs': [
            'आपका बैंक ओटीपी (OTP) नंबर 482910 है। ध्यान रखें, यह नंबर किसी भी अनजान व्यक्ति को फोन पर न बताएं।',
            'बैंक का मैसेज देखने के लिए ऊपर एसबीआई बैंक वाले मैसेज पर टैप करें।'
        ]
    },
    {
        'app': 'com.google.android.apps.messaging',
        'elements': ['लॉटरी जीतें 25 लाख', 'डिलीट करें (Delete)', 'ब्लॉक करें (Block)'],
        'query': 'what_to_tap',
        'outputs': [
            'यह लॉटरी वाला मैसेज फ्रॉड है, इसके किसी लिंक पर न दबाएं। इसे हटाने के लिए डिलीट (Delete) दबाएं।',
            'अनजान इनाम वाले मैसेज को तुरंत ब्लॉक करें (Block) या डिलीट कर दें।'
        ]
    },

    # --- CONTACTS ---
    {
        'app': 'com.android.contacts',
        'elements': ['नया संपर्क जोड़ें (Add Contact)', 'सर्च संपर्क', 'बेटा', 'बेटी'],
        'query': 'what_to_tap',
        'outputs': [
            'नया फोन नंबर सेव करने के लिए नया संपर्क जोड़ें (Add Contact) वाले प्लस निशान पर दबाएं।',
            'बेटी को फोन मिलाने के लिए बेटी वाले नाम पर एक बार टैप करें।'
        ]
    },

    # --- CLOCK & MEDICINE ALARM ---
    {
        'app': 'com.google.android.deskclock',
        'elements': ['अलार्म (Alarm)', 'सुबह 8:00 दवाई', 'नया अलार्म जोड़ें (+)', 'टाइमर'],
        'query': 'what_to_tap',
        'outputs': [
            'दवाई का नया अलार्म लगाने के लिए नीचे दिए गए प्लस (+) के निशान को दबाएं।',
            'सुबह की दवाई का अलार्म चालू करने के लिए सुबह 8:00 दवाई के सामने वाले स्विच को दबाएं।'
        ]
    },

    # --- CAMERA ---
    {
        'app': 'com.google.android.GoogleCamera',
        'elements': ['फोटो खींचें (Shutter)', 'कैमरा घुमाएं (Flip)', 'फ्लैश (Flash)', 'वीडियो'],
        'query': 'what_to_tap',
        'outputs': [
            'फोटो खींचने के लिए नीचे सफेद रंग के बड़े गोल बटन को दबाएं।',
            'अपनी सेल्फी लेने के लिए कैमरा घुमाएं (Flip) वाले गोल तीर के निशान पर टैप करें।'
        ]
    },

    # --- SYSTEM SETTINGS ---
    {
        'app': 'com.android.settings',
        'elements': ['वाई-फाई (Wi-Fi)', 'डिस्प्ले (Display)', 'साउंड (Sound)'],
        'query': 'explain',
        'outputs': [
            'आप फोन की सेटिंग्स में हैं। यहाँ से आप फोन की आवाज़ या अक्षरों का आकार बदल सकते हैं।',
            'यह सेटिंग्स स्क्रीन है। अगर नेट नहीं चल रहा है, तो आप वाई-फाई (Wi-Fi) चेक कर सकते हैं।'
        ]
    }
]

def generate_dataset(num_samples=1000):
    dataset = []
    
    follow_up_templates = [
        ("Kahan par hai?", "Screen par theek dhyan se dekhiye, wahan nishan bana hua hai."),
        ("Samajh nahi aaya", "Koi baat nahi babuji, wahan tap karein jahan highlight kiya hai."),
        ("Nahi dikh raha", "Screen ko thoda aaram se dekhiye, wahan gol button bana hai.")
    ]
    
    for _ in range(num_samples):
        base = random.choice(SCENARIOS)
        
        elements = base["elements"].copy()
        noise = random.choice([
            [],
            ['Battery 45%'],
            ['10:30 AM'],
            ['Signal 4G']
        ])
        elements.extend(noise)
        random.shuffle(elements)
        
        formatted_elements = "\n".join([f"[{i}] {el}" for i, el in enumerate(elements)])
        
        system_prompt = f"You are SaralGati, a patient, warm companion for Indian elders.\n"
        system_prompt += f"The user is looking at an Android app: {base['app']}.\n"
        system_prompt += f"Here are the numbered interactive elements on their screen:\n{formatted_elements}\n\n"
        system_prompt += "Instructions:\n1. Answer the user's question in 1 or 2 simple, comforting Hindi sentences.\n"
        system_prompt += "2. If your answer directs the user to tap or look at a specific element on screen, append \" TARGET:[index]\" at the very end of your response, where [index] is the exact number of that element (for example: TARGET:2).\n"
        system_prompt += "3. If no specific element needs to be tapped, do NOT output any TARGET tag.\n"
        system_prompt += "4. Do not mention that you are an AI. Only output the Hindi sentence."

        output = random.choice(base["outputs"])
        
        # Determine target index if an element is mentioned in the output
        target_idx = None
        for idx, el in enumerate(elements):
            clean_el = el.split('(')[0].strip()
            if clean_el and clean_el in output:
                target_idx = idx
                break
        
        if target_idx is not None and base["query"] != "explain":
            output_with_target = f"{output} TARGET:{target_idx}"
        else:
            output_with_target = output

        user_query = "Yeh screen samjhaiye" if base["query"] == "explain" else "Aage kya karein / kaunsa button dabayein?"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query},
            {"role": "assistant", "content": output_with_target}
        ]
        
        # 50% chance of adding a follow-up turn
        if random.random() < 0.5 and target_idx is not None:
            fu_q, fu_a = random.choice(follow_up_templates)
            messages.append({"role": "user", "content": fu_q})
            messages.append({"role": "assistant", "content": f"{fu_a} TARGET:{target_idx}"})

        dataset.append({"messages": messages})
        
    return dataset

def main():
    output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "saralgati_multiturn_train.jsonl")
    
    dataset = generate_dataset(1000)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        for item in dataset:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
            
    print(f"Successfully generated {len(dataset)} multi-turn grounded samples at: {output_file}")

if __name__ == "__main__":
    main()
