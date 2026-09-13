import json
import random
import os

# Define realistic UI hierarchy templates for common Indian apps
SCENARIOS = [
    {
        "app_package": "com.whatsapp",
        "elements": ["चैट (Chat)", "स्टेटस (Status)", "कॉल (Calls)", "सर्च (Search)", "नया मैसेज (New Message)"],
        "query": "explain",
        "output": "आप अभी वॉट्सऐप के मुख्य पेज पर हैं। यहाँ आप अपने मैसेज पढ़ सकते हैं या नीचे दिए बटन से नया मैसेज भेज सकते हैं।"
    },
    {
        "app_package": "com.whatsapp",
        "elements": ["बेटा (Son)", "वीडियो कॉल (Video Call)", "ऑडियो कॉल (Voice Call)", "टाइप करें... (Type a message...)"],
        "query": "what_to_tap",
        "output": "वीडियो कॉल करने के लिए ऊपर दाईं ओर दिए गए कैमरे वाले निशान (Video Call) को दबाएं।"
    },
    {
        "app_package": "com.phonepe.app",
        "elements": ["क्यूआर कोड स्कैन करें (Scan QR)", "टू मोबाइल नंबर (To Mobile Number)", "बैलेंस चेक (Check Balance)", "₹10,000 जीते (Win ₹10,000)"],
        "query": "explain",
        "output": "आप अभी फ़ोनपे पर हैं। यहाँ से आप पैसे भेज सकते हैं या बैलेंस चेक कर सकते हैं। ध्यान दें, अगर कोई लॉटरी या इनाम जीतने का मैसेज दिखे तो उस पर क्लिक न करें, वह फ्रॉड हो सकता है।"
    },
    {
        "app_package": "com.phonepe.app",
        "elements": ["एंटर यूपीआई पिन (Enter UPI PIN)", "अमाउंट ₹500 (Amount ₹500)", "सेंड (Send)"],
        "query": "what_to_tap",
        "output": "पैसे भेजने के लिए अपना गुप्त UPI पिन डालें और फिर नीचे दिए गए सही (Tick) के निशान को दबाएं। किसी अनजान व्यक्ति के कहने पर अपना पिन कभी न डालें।"
    },
    {
        "app_package": "cris.org.in.prs.ima",
        "elements": ["ट्रेन बुक करें (Book Ticket)", "माय बुकिंग्स (My Bookings)", "पीएनआर इन्क्वायरी (PNR Enquiry)"],
        "query": "explain",
        "output": "यह आईआरसीटीसी (IRCTC) का ऐप है। यहाँ से आप ट्रेन की टिकट बुक कर सकते हैं या अपनी पहले से बुक की गई टिकट का स्टेटस देख सकते हैं।"
    },
    {
        "app_package": "cris.org.in.prs.ima",
        "elements": ["तत्काल (Tatkal)", "स्लीपर (Sleeper)", "थर्ड एसी (3A)", "सर्च ट्रेन्स (Search Trains)"],
        "query": "what_to_tap",
        "output": "ट्रेन खोजने के लिए नीचे दिए गए लाल बटन 'सर्च ट्रेन्स' (Search Trains) पर टैप करें।"
    },
    {
        "app_package": "com.google.android.youtube",
        "elements": ["होम (Home)", "शॉर्ट्स (Shorts)", "सर्च (Search)", "भजन और आरती (Bhajan and Aarti)"],
        "query": "explain",
        "output": "आप यूट्यूब पर हैं। यहाँ आप भजन, समाचार या अपने पसंद के वीडियो देख सकते हैं। ऊपर सर्च वाले लेंस के निशान से आप कुछ भी खोज सकते हैं।"
    },
    {
        "app_package": "com.android.settings",
        "elements": ["डिस्प्ले (Display)", "फॉन्ट साइज (Font Size)", "बैटरी (Battery)"],
        "query": "explain",
        "output": "आप फोन की सेटिंग्स में हैं। अगर आपको अक्षर छोटे लग रहे हैं तो 'डिस्प्ले' (Display) में जाकर 'फॉन्ट साइज' बड़ा कर सकते हैं।"
    },
    {
        "app_package": "com.android.settings",
        "elements": ["डिस्प्ले (Display)", "फॉन्ट साइज (Font Size)", "बैटरी (Battery)"],
        "query": "what_to_tap",
        "output": "अक्षर बड़े करने के लिए 'डिस्प्ले' (Display) पर टैप करें।"
    }
]

# We will generate a larger dataset by adding slight variations
def generate_dataset(num_samples=300):
    dataset = []
    
    for _ in range(num_samples):
        base = random.choice(SCENARIOS)
        
        # Shuffle elements slightly to simulate different screen states
        elements = base["elements"].copy()
        if random.random() > 0.5:
            random.shuffle(elements)
            
        elements_str = " | ".join(elements)
        
        prompt = f"You are SaralGati, a patient companion for Indian elders.\n"
        prompt += f"The user is currently looking at an app with package name: {base['app_package']}.\n"
        prompt += f"Here are the text elements visible on their screen:\n{elements_str}\n\n"
        
        if base["query"] == "explain":
            prompt += "Explain this screen to the elder in 1 or 2 very simple Hindi sentences. Tell them where they are and what they can do next. Be comforting and respectful. Do not mention that you are an AI. Only output the Hindi sentence."
        else:
            prompt += "The elder wants to know what to tap next. Based on the screen context, guide them on exactly which button or element to press in 1 simple Hindi sentence. Be comforting and respectful. Do not mention that you are an AI. Only output the Hindi sentence."

        # HuggingFace / Unsloth format (Alpaca style for standard Instruct models)
        sample = {
            "instruction": prompt,
            "input": "",
            "output": base["output"]
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
            
    print(f"Successfully generated {len(dataset)} high-quality elder training samples at: {output_file}")

if __name__ == "__main__":
    main()
