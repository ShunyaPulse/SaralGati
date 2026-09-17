import json
import random

# Comprehensive Icon & App Categories for Indian Elders
categories = [
    # 1. CAMERA & PHOTOGRAPHY
    {
        "app_pkg": "com.google.android.GoogleCamera",
        "intents": [
            {
                "queries": ["photo kheencho", "tasveer lo", "photo click karo", "फोटो खींचो", "tasveer utaro", "photo nikaalo"],
                "target_ui": "Photo kheenchne wala button (Camera Shutter)",
                "response": "फोटो खींचने के लिए यहाँ बीच वाला गोल बटन दबाएं।"
            },
            {
                "queries": ["aage ka camera chalao", "apna chehra dekhna hai", "selfie leni hai", "camera badlo", "peeche ka camera karo"],
                "target_ui": "Camera badalne wala button (Flip Front/Back Camera)",
                "response": "कैमरा बदलने के लिए इस बटन को दबाएं।"
            },
            {
                "queries": ["andhera hai roshni jalao", "flash on karo", "roshni chahiye", "फ्लैश जलाओ"],
                "target_ui": "Flash / Roshni chalane wala button",
                "response": "रोशनी (Flash) चालू करने के लिए यहाँ दबाएं।"
            },
            {
                "queries": ["video banana hai", "recording karo", "chalta firta video banao"],
                "target_ui": "Video banane wala mode (Video Record)",
                "response": "वीडियो रिकॉर्डिंग शुरू करने के लिए यहाँ दबाएं।"
            }
        ],
        "noise": ["Camera timer (Photo lene ka samay)", "Camera zoom (Pass ya door karne ka button)", "Gallery / Purani photo", "Settings"]
    },

    # 2. SEARCH & DISCOVERY (Fixing Magnifying Glass / '0' confusion)
    {
        "app_pkg": "com.google.android.youtube",
        "intents": [
            {
                "queries": ["kuch dhoondo", "bhajan search karo", "gana khojo", "सर्च करो", "khoj", "dhundhna hai"],
                "target_ui": "Search / Khojne wala button (Lens)",
                "response": "मनपसंद वीडियो या गाना खोजने के लिए इस सर्च लेंस पर दबाएं।"
            },
            {
                "queries": ["video roko", "pause karo", "rok do", "band karo gana"],
                "target_ui": "Video / Gana rokne ka button (Pause)",
                "response": "वीडियो को रोकने के लिए यहाँ बीच में दबाएं।"
            },
            {
                "queries": ["video chalao", "play karo", "shuru karo"],
                "target_ui": "Video / Gana chalane ka button (Play)",
                "response": "वीडियो शुरू करने के लिए यहाँ दबाएं।"
            },
            {
                "queries": ["badi screen par dekho", "full screen karo", "bada karo video"],
                "target_ui": "Badi screen karne ka button (Fullscreen)",
                "response": "पूरे स्क्रीन पर वीडियो देखने के लिए यहाँ दबाएं।"
            },
            {
                "queries": ["agla gana lagao", "skip karo", "aage badhao"],
                "target_ui": "Agla video ya gana chalane ka button (Next / Skip)",
                "response": "अगला वीडियो चलाने के लिए यहाँ दबाएं।"
            }
        ],
        "noise": ["Subtitles / Likhe hue shabda dikhane ka button (CC)", "Home screen", "Subscriptions", "Khule hue tabs dekhne ka button"]
    },

    # 3. UPI, PAYMENTS & BANKING (GPay, PhonePe, Paytm)
    {
        "app_pkg": "com.google.android.apps.nbu.paisa.user",
        "intents": [
            {
                "queries": ["dukan par scan karna hai", "qr code scan karo", "barcode scanner", "क्यूआर कोड"],
                "target_ui": "QR Code scan karne ka camera (Scan & Pay)",
                "response": "दुकान का QR कोड स्कैन करने के लिए यहाँ कैमरा स्कैनर खोलें।"
            },
            {
                "queries": ["paise bhejo", "transfer karo", "rupaye dalne hain"],
                "target_ui": "Paise bhejne ka button (Pay / Transfer)",
                "response": "पैसे भेजने के लिए यहाँ 'Pay' पर दबाएं।"
            },
            {
                "queries": ["khate me kitne paise hain", "balance check karo", "mera bank balance batao"],
                "target_ui": "Bank balance check karne ka button",
                "response": "अपना बैंक बैलेंस चेक करने के लिए यहाँ दबाएं।"
            },
            {
                "queries": ["purana hisab dikhao", "passbook dekho", "kisko kitna paisa gaya", "history check karo"],
                "target_ui": "Purane len-den dekhne ka button (History / Passbook)",
                "response": "पुराने लेन-देन की रसीद देखने के लिए यहाँ हिस्ट्री पर दबाएं।"
            }
        ],
        "noise": ["Khareedari ka jhola (Shopping Cart)", "Peeche jane wala button (Back Arrow)", "Help & Support", "Profile"]
    },

    # 4. WHATSAPP & CHAT COMMUNICATIONS
    {
        "app_pkg": "com.whatsapp",
        "intents": [
            {
                "queries": ["bol kar message bhejo", "aawaz record karo", "voice note bhejna hai", "audio bhejo"],
                "target_ui": "Awaaz record karne wala mic button (Voice Note)",
                "response": "बोलकर संदेश भेजने के लिए इस माइक बटन को दबाए रखें।"
            },
            {
                "queries": ["photo ya kagaz bhejo", "file attach karo", "tasveer jod kar bhejo", "pin ka nishan"],
                "target_ui": "Photo / Document jodne wala button (Attachment Clip)",
                "response": "फोटो या डॉक्यूमेंट भेजने के लिए इस पिन (Attach) वाले निशान पर दबाएं।"
            },
            {
                "queries": ["chehra dekh kar baat karo", "video call lagao", "video call milao"],
                "target_ui": "Video call karne ka button",
                "response": "वीडियो कॉल शुरू करने के लिए यहाँ दबाएं।"
            },
            {
                "queries": ["phone milao", "audio call karo", "baat karni hai phone par"],
                "target_ui": "Phone milane ka button (Call)",
                "response": "कॉल करने के लिए इस फोन वाले बटन पर दबाएं।"
            },
            {
                "queries": ["message bhej do", "likha hua send karo", "ravana karo"],
                "target_ui": "Message bhejne wala button (Send Arrow)",
                "response": "मैसेज भेजने के लिए इस तीर (Send) वाले बटन पर दबाएं।"
            },
            {
                "queries": ["status dekhna hai", "story dekho", "naya status kya hai"],
                "target_ui": "Status ya Story dekhne ka button",
                "response": "स्टेटस या स्टोरी देखने के लिए यहाँ दबाएं।"
            }
        ],
        "noise": ["Emoji ya Sticker wala button", "Menu / 3 Bindi (More Options)", "Peeche jane wala button (Back Arrow)", "Search / Khojne wala button (Lens)"]
    },

    # 5. PHONE & CALLING (Dialer)
    {
        "app_pkg": "com.google.android.dialer",
        "intents": [
            {
                "queries": ["number dial karo", "keypad kholo", "number milana hai", "dial pad"],
                "target_ui": "Number dial karne ka keypad",
                "response": "नंबर टाइप करने के लिए यहाँ कीपैड खोलें।"
            },
            {
                "queries": ["call kaat do", "phone disconnect karo", "laal button dabao", "baat khatam"],
                "target_ui": "Call kaatne wala laal button (End Call)",
                "response": "फोन काटने के लिए इस लाल बटन को दबाएं।"
            },
            {
                "queries": ["speaker par dalo", "aawaz tez karo", "loudspeaker chalu karo"],
                "target_ui": "Speaker par aawaz tez karne ka button",
                "response": "आवाज़ तेज़ सुनने के लिए स्पीकर बटन पर दबाएं।"
            },
            {
                "queries": ["aawaz band karo", "mute karo", "mic mute karo"],
                "target_ui": "Mic band karne ka button (Mute)",
                "response": "अपनी आवाज़ बंद करने के लिए म्यूट बटन दबाएं।"
            },
            {
                "queries": ["naya number save karo", "contact add karo", "naya dost save karo"],
                "target_ui": "Naya number save karne ka button (Add Contact)",
                "response": "नया नंबर फोन में सेव करने के लिए यहाँ दबाएं।"
            }
        ],
        "noise": ["Call hold par rakhne ka button", "Menu / 3 Bindi (More Options)", "Recent calls", "Favorites"]
    },

    # 6. GALLERY & PHOTOS
    {
        "app_pkg": "com.google.android.apps.photos",
        "intents": [
            {
                "queries": ["ye photo bekar hai hatao", "delete karo", "trash me dalo", "mita do photo"],
                "target_ui": "Delete / Hatane ka dabba (Trash)",
                "response": "फोटो हटाने के लिए इस कचरे के डिब्बे (Delete) पर दबाएं।"
            },
            {
                "queries": ["kisi ko bhejna hai", "share karo photo", "whatsapp par bhejo"],
                "target_ui": "Share / Aage bhejne ka button",
                "response": "फोटो किसी और को भेजने के लिए यहाँ शेयर दबाएं।"
            },
            {
                "queries": ["photo thik karo", "crop karo", "pencil wala nishan", "edit karo"],
                "target_ui": "Photo sudharne ka button (Edit / Pencil)",
                "response": "फोटो को सही करने या काटने के लिए यहाँ पेंसिल (Edit) पर दबाएं।"
            },
            {
                "queries": ["pasand aayi", "favorite banao", "star mark karo"],
                "target_ui": "Pasand karne ka button (Favorite / Star)",
                "response": "फोटो को पसंदीदा (Favorite) मार्क करने के लिए इस तारे पर दबाएं।"
            }
        ],
        "noise": ["Photo ghumane ka button (Rotate)", "Photo ya file ki jaankari dekhne ka button (Info)", "Peeche jane wala button (Back Arrow)"]
    },

    # 7. GENERAL NAVIGATION & CONTROLS
    {
        "app_pkg": "com.android.chrome",
        "intents": [
            {
                "queries": ["peeche jao", "back karo", "purane page par jao", "teer ka nishan"],
                "target_ui": "Peeche jane wala button (Back Arrow)",
                "response": "पिछले पेज पर वापस जाने के लिए इस तीर के निशान पर दबाएं।"
            },
            {
                "queries": ["menu kholo", "teen bindi dabao", "options dekhna hai"],
                "target_ui": "Menu / 3 Bindi (More Options)",
                "response": "अन्य विकल्प देखने के लिए इन तीन बिन्दुओं पर दबाएं।"
            },
            {
                "queries": ["band karo", "hatao ise", "cross dabao", "close karo"],
                "target_ui": "Band karne ka cross button (Close)",
                "response": "इसे बंद करने के लिए इस क्रॉस (X) पर दबाएं।"
            }
        ],
        "noise": ["Home screen / Mukhya prishth par jane ka button", "Refresh / Dubara load karne ka button", "Khule hue tabs dekhne ka button"]
    }
]

dataset = []

# Generate 150 diverse combinations per intent
for cat in categories:
    app_pkg = cat["app_pkg"]
    for item in cat["intents"]:
        for _ in range(150):
            query = random.choice(item["queries"])
            target = item["target_ui"]
            
            # Select 2 to 4 random noise elements
            num_noise = random.randint(2, min(4, len(cat["noise"])))
            screen_elements = random.sample(cat["noise"], k=num_noise)
            
            # Insert target element at random position
            target_idx = random.randint(0, len(screen_elements))
            screen_elements.insert(target_idx, target)
            
            formatted_elements = "\n".join([f"[{i}] {el}" for i, el in enumerate(screen_elements)])
            
            system_prompt = f"""You are SaralGati, a patient, warm companion for Indian elders.
The user is looking at an Android app: {app_pkg}.
Here are the numbered interactive elements on their screen:
{formatted_elements}

Instructions:
1. Answer the user's question in 1 or 2 simple, comforting Hindi sentences.
2. If your answer directs the user to tap or look at a specific element on screen, append " TARGET:[index]" at the very end of your response, where [index] is the exact number of that element (for example: TARGET:2).
3. If no specific element needs to be tapped, do NOT output any TARGET tag.
4. Do not mention that you are an AI. Only output the Hindi sentence."""

            response = f"{item['response']} TARGET:{target_idx}"
            
            dataset.append({
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query},
                    {"role": "assistant", "content": response}
                ]
            })

random.shuffle(dataset)

output_file = "data/saralgati_popular_apps_train.jsonl"
with open(output_file, "w", encoding="utf-8") as f:
    for entry in dataset:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

print(f"Generated {len(dataset)} high-precision samples in {output_file}!")
