import json
import random

apps = {
    "com.whatsapp": {
        "intents": [
            {"intent": "video_call", "queries": ["video call lagao", "video call kaise kare", "video call milao", "वीडियो कॉल करना है", "beti ko video call karo", "chehra dekhna hai"], "ui": ["video call", "वीडियो", "video", "call icon"], "response": "वीडियो कॉल शुरू करने के लिए यहाँ दबाएं।"},
            {"intent": "audio_call", "queries": ["call lagao", "phone karo", "audio call milao", "कॉल करो", "baat karni hai"], "ui": ["call", "phone", "कॉल", "voice call"], "response": "कॉल करने के लिए इस बटन को दबाएं।"},
            {"intent": "status", "queries": ["status dekhna hai", "photo status", "update dekho", "स्टेटस", "kya naya hai"], "ui": ["status", "updates", "स्टेटस", "my status"], "response": "स्टेटस देखने या डालने के लिए यहाँ क्लिक करें।"},
            {"intent": "new_chat", "queries": ["message bhejo", "naya chat", "msg karna hai", "मैसेज लिखो", "kuch likhna hai"], "ui": ["new chat", "message icon", "नया चैट"], "response": "नया मैसेज भेजने के लिए यहाँ दबाएं।"},
            {"intent": "voice_note", "queries": ["bol kar bhejo", "voice message", "aawaz bhejni hai", "ऑडियो भेजो"], "ui": ["mic", "microphone", "माइक", "voice message"], "response": "बोलकर मैसेज भेजने के लिए इस माइक को दबाए रखें।"}
        ],
        "noise_elements": ["settings", "search", "more options", "camera", "chats", "calls"]
    },
    "com.facebook.katana": {
        "intents": [
            {"intent": "create_post", "queries": ["photo dalo", "post likho", "kuch share karo", "स्टेटस डालो", "photo upload", "nayi photo"], "ui": ["what's on your mind", "photo/video", "create post", "फोटो"], "response": "नया पोस्ट या फोटो डालने के लिए यहाँ दबाएं।"},
            {"intent": "watch_video", "queries": ["video dekho", "watch", "kuch dekhna hai", "वीडियो चलाओ"], "ui": ["video", "watch", "वीडियो"], "response": "वीडियो देखने के लिए यहाँ क्लिक करें।"},
            {"intent": "friend_request", "queries": ["friends dekho", "naya dost", "friend request", "मित्र"], "ui": ["friends", "friend requests", "मित्र"], "response": "फ्रेंड रिक्वेस्ट देखने के लिए यहाँ दबाएं।"},
            {"intent": "like", "queries": ["like karo", "pasand aaya", "achha laga", "लाइक"], "ui": ["like", "लाइक", "thumbs up"], "response": "इस पोस्ट को लाइक करने के लिए यहाँ दबाएं।"}
        ],
        "noise_elements": ["search", "menu", "notifications", "marketplace", "profile"]
    },
    "com.google.android.youtube": {
        "intents": [
            {"intent": "search", "queries": ["bhajan lagao", "gana khojo", "search karo", "kuch dhoondo", "खोजो", "arti chalao"], "ui": ["search", "खोज", "search icon", "magnifying glass"], "response": "मनपसंद वीडियो खोजने के लिए यहाँ सर्च करें।"},
            {"intent": "shorts", "queries": ["chote video", "shorts dekho", "timepass", "शॉर्ट्स"], "ui": ["shorts", "शॉर्ट्स"], "response": "छोटे वीडियो (Shorts) देखने के लिए यहाँ दबाएं।"},
            {"intent": "play_pause", "queries": ["roko", "chalao", "pause karo", "play", "रोक दो"], "ui": ["play", "pause", "रोकें", "चलाएं"], "response": "वीडियो को रोकने या चलाने के लिए यहाँ दबाएं।"}
        ],
        "noise_elements": ["home", "subscriptions", "library", "history", "cast"]
    },
    "com.google.android.dialer": {
        "intents": [
            {"intent": "dial_number", "queries": ["number milao", "call karna hai", "phone lagao", "नंबर डायल करो", "dial pad"], "ui": ["keypad", "dialpad", "डायलर", "number pad"], "response": "नंबर डायल करने के लिए यहाँ कीपैड (Keypad) खोलें।"},
            {"intent": "contacts", "queries": ["number dekho", "kis kis ka number hai", "contacts", "संपर्क"], "ui": ["contacts", "संपर्क", "people"], "response": "सेव किये हुए नंबर (Contacts) देखने के लिए यहाँ दबाएं।"},
            {"intent": "speaker", "queries": ["aawaz badao", "speaker par dalo", "loudspeaker", "स्पीकर"], "ui": ["speaker", "स्पीकर", "loudspeaker"], "response": "आवाज़ तेज़ करने के लिए स्पीकर बटन दबाएं।"}
        ],
        "noise_elements": ["recent", "favorites", "voicemail", "mute", "hold"]
    },
    "com.google.android.apps.photos": {
        "intents": [
            {"intent": "share", "queries": ["photo bhejo", "share karo", "kisi ko bhejna hai", "शेयर"], "ui": ["share", "शेयर", "send"], "response": "इस फोटो को किसी और को भेजने के लिए यहाँ शेयर दबाएं।"},
            {"intent": "delete", "queries": ["delete karo", "hatao", "khrab photo hai", "डिलीट"], "ui": ["delete", "trash", "डिलीट"], "response": "इस फोटो को हटाने (Delete) के लिए यहाँ दबाएं।"},
            {"intent": "edit", "queries": ["thik karo", "edit karo", "crop karna hai", "सुधारें"], "ui": ["edit", "सुधारें", "crop"], "response": "फोटो को सही करने या एडिट करने के लिए यहाँ दबाएं।"}
        ],
        "noise_elements": ["albums", "search", "sharing", "library", "lens"]
    },
    "com.google.android.apps.messaging": {
        "intents": [
            {"intent": "new_sms", "queries": ["sms likho", "text message", "message bhejo", "naya sms"], "ui": ["start chat", "new message", "नया संदेश"], "response": "नया SMS भेजने के लिए यहाँ क्लिक करें।"},
            {"intent": "read_otp", "queries": ["otp kya hai", "code dekho", "bank ka message", "पासवर्ड"], "ui": ["unread", "otp", "bank", "message body"], "response": "अपना मैसेज या OTP पढ़ने के लिए यहाँ दबाएं।"}
        ],
        "noise_elements": ["search", "archive", "settings", "spam", "mark as read"]
    }
}

dataset = []

for app_pkg, app_data in apps.items():
    for intent_data in app_data["intents"]:
        for i in range(150):  # Generate 150 variations per intent
            query = random.choice(intent_data["queries"])
            target_ui = random.choice(intent_data["ui"])
            
            # Construct UI elements array with noise
            ui_elements = random.sample(app_data["noise_elements"], k=min(3, len(app_data["noise_elements"])))
            target_index = random.randint(0, len(ui_elements))
            ui_elements.insert(target_index, target_ui)
            
            formatted_elements = "\\n".join([f"[{idx}] {el}" for idx, el in enumerate(ui_elements)])
            
            system_prompt = f"""You are SaralGati, a patient, warm companion for Indian elders.
The user is looking at an Android app: {app_pkg}.
Here are the numbered interactive elements on their screen:
{formatted_elements}

Instructions:
1. Answer the user's question in 1 or 2 simple, comforting Hindi sentences.
2. If your answer directs the user to tap or look at a specific element on screen, append " TARGET:[index]" at the very end of your response, where [index] is the exact number of that element (for example: TARGET:2).
3. If no specific element needs to be tapped, do NOT output any TARGET tag.
4. Do not mention that you are an AI. Only output the Hindi sentence."""

            response = f"{intent_data['response']} TARGET:{target_index}"
            
            dataset.append({
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query},
                    {"role": "assistant", "content": response}
                ]
            })

# Shuffle dataset
random.shuffle(dataset)

# Save to JSONL
output_file = "saralgati_popular_apps_train.jsonl"
with open(output_file, "w", encoding="utf-8") as f:
    for item in dataset:
        f.write(json.dumps(item, ensure_ascii=False) + "\n")

print(f"Generated {len(dataset)} examples in {output_file}")
