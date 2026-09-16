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
    
    # --- UBER / OLA ---
    {
        'app': 'com.ubercab',
        'elements': ['राइड (Ride)', 'पैकेज (Package)', 'कहाँ जाना है? (Where to?)'],
        'query': 'explain',
        'outputs': [
            'यह उबर ऐप है। यहाँ से आप कहीं जाने के लिए कैब या ऑटो बुला सकते हैं।',
            'आप उबर पर हैं। गाड़ी बुक करने के लिए आपको बताना होगा कि आपको कहाँ जाना है।'
        ]
    },
    {
        'app': 'com.ubercab',
        'elements': ['कहाँ जाना है? (Where to?)'],
        'query': 'what_to_tap',
        'outputs': [
            'कैब बुलाने के लिए कहाँ जाना है? (Where to?) वाले बॉक्स पर टैप करें और जगह का नाम लिखें।',
            'अपनी मंजिल डालने के लिए कहाँ जाना है वाले डब्बे को दबाएं।'
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

def generate_dataset(num_samples=500):
    dataset = []
    
    for _ in range(num_samples):
        base = random.choice(SCENARIOS)
        
        # Shuffle elements slightly to simulate different screen states
        elements = base["elements"].copy()
        
        # Add random noise elements to make model robust
        noise = random.choice([
            [],
            ['बैटरी 45% (Battery 45%)'],
            ['समय 10:30 (Time 10:30)'],
            ['सिग्नल (Signal)'],
            ['नेटवर्क (Network)']
        ])
        
        elements.extend(noise)
        random.shuffle(elements)
            
        elements_str = " | ".join(elements)
        
        prompt = f"You are SaralGati, a patient companion for Indian elders.\n"
        prompt += f"The user is currently looking at an app with package name: {base['app']}.\n"
        prompt += f"Here are the text elements visible on their screen:\n{elements_str}\n\n"
        
        if base["query"] == "explain":
            prompt += "Explain this screen to the elder in 1 or 2 very simple Hindi sentences. Tell them where they are and what they can do next. Be comforting and respectful. Do not mention that you are an AI. Only output the Hindi sentence."
        else:
            prompt += "The elder wants to know what to tap next. Based on the screen context, guide them on exactly which button or element to press in 1 simple Hindi sentence. Be comforting and respectful. Do not mention that you are an AI. Only output the Hindi sentence."

        # Select a random paraphrase output so the model learns diverse responses
        output = random.choice(base["outputs"])

        sample = {
            "instruction": prompt,
            "input": "",
            "output": output
        }
        dataset.append(sample)
        
    return dataset

def main():
    output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "saralgati_train.jsonl")
    
    dataset = generate_dataset(500)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        for item in dataset:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
            
    print(f"Successfully generated {len(dataset)} highly diverse elder training samples at: {output_file}")

if __name__ == "__main__":
    main()
