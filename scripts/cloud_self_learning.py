#!/usr/bin/env python3
"""
SaralGati - 100% Cloud-Based Autonomous Self-Learning Pipeline
=============================================================
Runs completely in the cloud (e.g. via GitHub Actions Cron).
No local device, emulator, or laptop required.

1. Generates rich synthetic Android app screens & elder queries across major apps:
   - WhatsApp, PhonePe, Google Pay, YouTube, Swiggy, Uber, IRCTC, Settings, Dialer.
2. Evaluates SaralGati (/api/v1/agent/ask).
3. Validates decisions against ground truth.
4. Directly feeds verified outcomes into /api/v1/agent/feedback:
   - Success -> Promoted to Redis Golden Cache.
   - Mismatch -> Recorded as a preference correction in Neon DB Flywheel.
"""

import os
import sys
import json
import time
import argparse
import re
from urllib.parse import urljoin

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    import requests
except ImportError:
    print("[Error] 'requests' library required. Run: pip install requests")
    sys.exit(1)



def generate_infinite_screens_via_gemini(gemini_keys_pool, count=5, blacklisted_models=None):
    """
    Multi-key pool with MODEL-FIRST exhaustive rotation:
    Exhaust ALL keys on gemini-3.8-flash first, then ALL keys on gemini-3.7-flash, etc.
    Falls through models only after every single key for that model has been tried.
    Priority: 3.8-flash > 3.7-flash > 3.6-flash > 3.5-flash > 3-flash > 3.5-flash-lite > 3.1-flash-lite
    Models that returned 503 are in blacklisted_models and skipped; retried only in the final pass.
    """
    import random
    import datetime
    import uuid

    # AXIS 1: Elder Personas (Who is interacting?)
    elder_personas = [
        "Retired PSU / Govt employee (age 72) managing pension passbook, CGHS medical claims, and fixed deposit slips",
        "Rural / Semi-urban elder managing PM-Kisan DBT subsidy, PDS ration card, and local mandi prices",
        "Grandmother living with family, frequently doing WhatsApp video calls with kids, listening to devotional bhajans, and forwarding festival greetings",
        "Elderly patient living alone, ordering monthly BP/Sugar medicines, booking auto/cab for clinic visits, and viewing lab reports",
        "Active grandfather managing home utilities: paying electricity/water bills, gas cylinder booking, and FASTag recharge"
    ]

    # AXIS 2: Cognitive Intent & Mental State (What is their mental frame?)
    intent_states = [
        "Routine habituated task: performing a familiar weekly action with confidence",
        "Confused / Lost state: accidentally navigated to an unfamiliar tab or dialog, trying to find their way back",
        "Frustrated / Stuck state: struggled to find the action button, asking in distress why it's not working",
        "Time-critical urgency: needs to connect with family or book transit immediately, high anxiety",
        "Exploratory curiosity: wants to check if money arrived or view an old photo without making a mistake"
    ]

    # AXIS 3: App Domain & Screen Topology (What app and view?)
    app_domains = [
        ("com.whatsapp", "WhatsApp (active family chat, media viewer, or call log view)"),
        ("com.google.android.dialer", "Phone Dialer (keypad dial, recent incoming call, or contact details)"),
        ("com.phonepe.app", "PhonePe / UPI (electricity bill pay, mobile recharge, or transaction history)"),
        ("com.google.android.youtube", "YouTube (search results for old bhajans, aarti video player, or channel view)"),
        ("cris.org.in.prs.ima", "IRCTC Rail Connect (train search, PNR status check, or passenger list)"),
        ("com.sbi.lotusintouch", "SBI YONO (account balance passbook, mini-statement, or fund transfer)"),
        ("com.aranoah.healthkart.plus", "Tata 1mg / Apollo (prescription medicine cart, address confirmation, or order status)"),
        ("com.google.android.apps.maps", "Google Maps (search directions to hospital, find nearest temple, or live share location)"),
        ("com.grofers.customerapp", "Blinkit / Instamart (10-min daily essentials: milk, bread, curd, vegetables checkout)"),
        ("com.digilocker.android", "DigiLocker / mAadhaar (view digital Aadhaar, vehicle RC, or vaccination certificate)")
    ]

    # AXIS 4: Linguistic Speech Style (How does the elder ask?)
    speech_styles = [
        "Natural Conversational Hinglish (Hindi in Roman script: 'Beti ko video call kaise lagayein', 'Bijli ka bill kahan se bharein')",
        "Pure Devanagari Hindi script ('पेंशन का पैसा आया या नहीं कैसे देखें', 'दवाई मंगवाने का बटन कहाँ है')",
        "Colloquial / Indirect elder phrasing ('Doctor sahab ko phone milana hai', 'Ghar aane ke liye gaadi bulao')",
        "Semi-literate / Keyword-action mix ('Train ticket PNR check', 'Gas cylinder booking karna')"
    ]

    # EVOL-INSTRUCT MUTATION (Adversarial challenge for model robustness)
    evol_mutations = [
        "In-Depth Complexity: Include prominent banner or dynamic notifications that could distract from the primary actionable button. Elder must still be guided to the exact actionable element.",
        "Ambiguity Resolution: The screen contains multiple similar buttons (e.g. 'Audio Call' vs 'Video Call', or 'Pay Later' vs 'Pay Now'). The elder's query specifically demands one, testing element disambiguation.",
        "Dialect & Slang Shift: Elder uses conversational Hindi idioms ('chasma nahi pehna', 'number lagao', 'paisa bhejna hai').",
        "Target Actionability Enforcement: Subtitle counts, timestamps ('3 unread', 'Photo', '10:45 AM') and static headings must be present but NEVER targeted as the action."
    ]

    # Sample from each axis independently
    persona = random.choice(elder_personas)
    intent = random.choice(intent_states)
    chosen_apps = random.sample(app_domains, min(count, len(app_domains)))
    speech = random.choice(speech_styles)
    mutation = random.choice(evol_mutations)
    entropy_seed = f"{datetime.datetime.utcnow().strftime('%Y%m%d-%H%M')}-{uuid.uuid4().hex[:6]}"

    prompt = f"""You are an advanced synthetic UI generator for SaralGati, an AI companion designed for Indian elders.
Generate exactly {len(chosen_apps)} realistic Android app screens based on this 4-Axis Combinatorial Space:

=== 4-AXIS CONFIGURATION ===
1. Elder Persona: {persona}
2. Cognitive Intent: {intent}
3. Speech / Query Style: {speech}
4. Evol-Instruct Mutation: {mutation}
5. Entropy Seed: {entropy_seed}

Target Apps:
{json.dumps([app[1] for app in chosen_apps])}

=== SCREEN & SCENARIO SPECIFICATIONS ===
For each screen:
1. Provide "app_package" (exact package, e.g. '{chosen_apps[0][0]}').
2. Provide "elements": list of 8 to 14 elements formatted with their accessibility role:
   - [BUTTON] for clickable buttons or interactive icons
   - [INPUT] for text input boxes
   - [TOGGLE] for checkboxes/switches
   - [TEXT] for static titles/headers
   Format: "[index] [ROLE] Label" (e.g., "[0] [BUTTON] Video Call", "[1] [INPUT] Search contacts")
   *CRITICAL RULE*: Subtitles, timestamps, or media counters (e.g., '[TEXT] 3 unread') must NEVER be the target.
3. Provide "scenarios": 2 to 3 realistic elder queries matching the selected Speech Style and Intent.
4. For each query, specify "expected" (the exact integer index number of the actionable target element to tap).

Respond ONLY with valid JSON array containing this exact structure (no markdown fences, no extra text):
[
  {{
    "app_package": "string",
    "elements": ["string"],
    "scenarios": [
      {{"query": "string", "expected": 0, "intent": "string"}}
    ]
  }}
]"""

    # MODEL-FIRST exhaustive rotation:
    # Try ALL keys on highest-priority model before falling to next model.
    # Priority: best quality first, fallback to lite/older on 503/exhaustion.
    # Note: "Gemini 3 Flash" (AI Studio) → API ID is `gemini-3-flash-preview`
    #        (not `gemini-3-flash` which returns 404).
    CANDIDATE_MODELS = [
        "gemini-3.8-flash",       # Latest stable, best quality  (5 RPM / 20 RPD free)
        "gemini-3.7-flash",       # Previous gen, very capable   (5 RPM / 20 RPD free)
        "gemini-3.6-flash",       # Solid fallback               (5 RPM / 20 RPD free)
        "gemini-3.5-flash",       # Widely available             (10 RPM / 20 RPD free)
        "gemini-3-flash-preview", # Gemini 3 Flash (AI Studio)   (5 RPM / 20 RPD free)
        "gemini-3.5-flash-lite",  # High-throughput lite         (30 RPM / 1500 RPD free)
        "gemini-3.1-flash-lite",  # Last-resort ultra-lite       (30 RPM / 1500 RPD free)
    ]

    if not gemini_keys_pool:
        print("⚠️ No Gemini API keys available in pool.")
        return []

    if blacklisted_models is None:
        blacklisted_models = set()

    for model_name in CANDIDATE_MODELS:
        if model_name in blacklisted_models:
            continue  # Skip models that gave 503 in a previous batch
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
        model_exhausted = True

        for key_idx, api_key in enumerate(gemini_keys_pool):
            api_key = api_key.strip()
            if not api_key:
                continue
            headers = {"Content-Type": "application/json", "x-goog-api-key": api_key}
            payload = {"contents": [{"parts": [{"text": prompt}]}]}

            try:
                res = requests.post(url, json=payload, headers=headers, timeout=25)
                if res.status_code in (500, 502, 503, 504):
                    # Blacklist this model for the entire pipeline run; retry only at the end
                    blacklisted_models.add(model_name)
                    print(f"  ⚡ {model_name} is experiencing high demand ({res.status_code}). Blacklisting for this run, fast-switching to next candidate model...")
                    model_exhausted = False
                    break
                if res.status_code == 429:
                    # This key is rate-limited on this model; try next key
                    print(f"  ⏭ Key [{key_idx+1}/{len(gemini_keys_pool)}] rate-limited on {model_name}, trying next key...")
                    continue
                res.raise_for_status()
                raw_text = res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                clean_json = re.sub(r"^```(?:json)?", "", raw_text, flags=re.MULTILINE)
                clean_json = re.sub(r"```$", "", clean_json, flags=re.MULTILINE).strip()
                parsed_data = json.loads(clean_json)
                if isinstance(parsed_data, list) and len(parsed_data) > 0:
                    screens = [
                        {
                            "app_package": str(s.get("app_package", "")),
                            "elements": [str(el) for el in s.get("elements", [])],
                            "scenarios": [
                                {
                                    "query": str(sc.get("query", "")),
                                    "expected": int(sc.get("expected", 0)),
                                    "intent": str(sc.get("intent", "general"))
                                }
                                for sc in s.get("scenarios", [])
                            ]
                        }
                        for s in parsed_data
                        if isinstance(s, dict)
                    ]
                    print(f"✨ Synthesized {len(screens)} screens via {model_name} [key {key_idx+1}/{len(gemini_keys_pool)}]")
                    return screens
                model_exhausted = False
            except Exception as e:
                print(f"  ⚠️ Key [{key_idx+1}] / {model_name}: {e}. Trying next key...")
                continue

        if model_exhausted:
            print(f"  ❌ All {len(gemini_keys_pool)} keys exhausted on {model_name}. Falling to next model...")

    print("⚠️ All models and all keys exhausted.")
    return []


def generate_fraud_scam_screens_via_gemini(gemini_keys_pool, count=6, blacklisted_models=None):
    """Ask Gemini for synthetic scam / benign screens with a ground-truth label.

    The deterministic sentinel has no learning loop of its own, so the flywheel
    is where it is trained: Gemini writes the fraud scenario AND the expected
    threat_level/threat_category, the caller posts it to
    /api/v1/agent/fraud-check, and the verdict is stored in
    fraud_training_cases for the LoRA export (type=fraud).
    """
    import random
    import datetime
    import uuid

    # AXIS 1: Target Victim Persona (Who is being targeted?)
    victim_personas = [
        "Retired PSU / Senior citizen pension account holder (fears bank account freeze or pension stoppage)",
        "Rural welfare DBT subsidy beneficiary (expecting PM-Kisan, Ladli Behna, or PDS food grain quota)",
        "Grandparent living alone while adult children work in another city / abroad (anxious about family well-being)",
        "Elderly homeowner managing utility meters and household expenses (vulnerable to disconnection threats)",
        "Tech-anxious elder using smartphone UPI or mobile banking for the first time"
    ]

    # AXIS 2: Psychological Attack Vector (Social Engineering Trigger)
    psych_triggers = [
        "Intimidation & Authority (Digital Arrest): Fake CBI, Police, Supreme Court, or Cyber Crime Cell alleging illegal parcel, money laundering, or arrest warrant",
        "Time-Critical Panic: Threatening immediate cutoff of electricity, mobile SIM, or gas connection within 2 hours",
        "Financial Bait & Greed: Claiming uncredited pension arrears, lottery win, or expiring credit card reward points ready for cash redemption",
        "Family Distress Impersonation: Pretending to be a grandchild or relative in hospital/police custody needing urgent UPI transfer",
        "Routine Administrative Deception: Falsely claiming mandatory KYC expiry, PAN-Aadhaar linking deadline, or biometric update",
        "Benign Everyday Control (Guaranteed 25% clean baseline): Legitimate shop payment, genuine balance check, IRCTC ticket SMS, or utility receipt"
    ]

    # AXIS 3: Technical Attack Vector (How the trap works)
    attack_vectors = [
        "Malicious Sideload APK link: Sending an .apk download link (e.g. 'mseb_bill.apk', 'echallan.apk', 'update.apk') over SMS/chat",
        "UPI PIN Inversion Trap: Collect request demanding elder enter their UPI PIN under the lie that PIN is required to 'receive' money",
        "OTP Harvesting / Impersonation: Caller or text asking for confidential OTP to 'unfreeze' account or 'cancel' an unauthorized transaction",
        "Remote Access / Accessibility Exploit: Coercing elder to install AnyDesk, TeamViewer, or QuickSupport for 'customer support'",
        "Deceptive Phishing Landing URL: Cloned bank or government portal hosted on suspicious TLD (.xyz, .top, .live, .in.net, bit.ly)",
        "Clean Benign Screen: Zero malicious signals; clean legitimate UI or genuine bank notification"
    ]

    # AXIS 4: Delivery Disguise & Linguistic Packaging (What does the screen look like?)
    delivery_disguises = [
        "SMS inbox text alert with Indian alphanumeric sender header (e.g. 'VK-SBIINB', 'BZ-MSEBDL', 'AX-TRAIIN', 'CP-CYBERD')",
        "WhatsApp chat message from an unknown number (+91 / +92 / +1) displaying an official bank or government seal as profile picture",
        "System push notification banner popping up over the current app with urgent alert styling",
        "Deceptive browser popup page claiming virus infection or lottery winning spin wheel",
        "Caller audio transcript where an aggressive caller instructs the elder to follow up on a link or read out SMS code"
    ]

    # EVOL-INSTRUCT ADVERSARIAL MUTATION
    evol_mutations = [
        "Obfuscation Mutation: Scammer deliberately avoids trigger words like 'OTP' or 'PIN', instead saying 'confidential 6-digit verification code' or 'security passcode'.",
        "Hyper-Realistic Indian Context: Inject precise rupee figures (e.g. ₹12,480 electricity dues, ₹2,000 PM-Kisan tranche), real bank names, and regional power utilities.",
        "Contrastive Subtlety: Make the scenario subtle so it tests the model's discernment (e.g., looks almost like a genuine bank alert, but has an unofficial URL).",
        "Strict Specificity Guard: If the scenario is benign (Benign Control), expected_threat_level MUST be SAFE and expected_threat_category MUST be NONE."
    ]

    persona = random.choice(victim_personas)
    trigger = random.choice(psych_triggers)
    vector = random.choice(attack_vectors)
    disguise = random.choice(delivery_disguises)
    mutation = random.choice(evol_mutations)
    generation_seed = f"{datetime.datetime.utcnow().strftime('%Y%m%d-%H%M')}-{uuid.uuid4().hex[:6]}"

    prompt = f"""You are an advanced synthetic fraud-scenario generator for SaralGati, an anti-fraud sentinel that protects Indian elders.
Generate exactly {count} realistic Android fraud/benign scenarios based on this 4-Axis Combinatorial Space:

=== 4-AXIS COMBINATORIAL CONFIGURATION ===
1. Target Victim Persona: {persona}
2. Psychological Trigger: {trigger}
3. Technical Attack Vector: {vector}
4. Delivery Disguise: {disguise}
5. Evol-Instruct Mutation: {mutation}
6. Entropy Seed: {generation_seed}

=== DIVERSITY & INTEGRITY RULES ===
- Always include at least 1 BENIGN CONTROL scenario (threat_level: "SAFE", threat_category: "NONE") to prevent model paranoia.
- Vary sender IDs (e.g. 'VK-SBIINB', 'BZ-MSEBDL', 'AX-TRAIIN', 'JM-POSTIN', 'CP-CYBERD').
- Vary monetary amounts, phone numbers, and URLs (.xyz, .top, .live, .in.net, bit.ly, etc.).
- Threat Level Rules:
  * Only theft vectors (OTP theft, payment PIN fraud, remote access, malicious APK) may reach CRITICAL.
  * Receiving money NEVER requires a UPI PIN or OTP.
  * Secondary concerns (unneeded contacts/SMS access, minor spam) are SUSPICIOUS or DANGEROUS, never CRITICAL.
  * Benign controls are strictly SAFE.

For each scenario provide:
1. "app_package": the Android app/context it appears in (e.g. 'com.android.mms', 'com.whatsapp', 'com.phonepe.app').
2. "messages": the SMS / notification / caller-script lines the elder sees (1 to 4 plain strings, keep the scam wording realistic).
3. "urls": any links in the message (empty list if none).
4. "screen_text": a short description of the visible screen (may be empty string).
5. "expected_threat_level": one of SAFE, SUSPICIOUS, DANGEROUS, CRITICAL.
6. "expected_threat_category": one of OTP_THEFT, PAYMENT_FRAUD, REMOTE_ACCESS, PHISHING_IMPERSONATION, MALVERTISING, MALICIOUS_APK, PRIVACY_RISK, NONE.

Respond ONLY with valid JSON array (no markdown fences, no extra text):
[
  {{
    "app_package": "string",
    "messages": ["string"],
    "urls": ["string"],
    "screen_text": "string",
    "expected_threat_level": "string",
    "expected_threat_category": "string"
  }}
]"""

    CANDIDATE_MODELS = [
        "gemini-3.8-flash",
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3-flash-preview",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
    ]

    if not gemini_keys_pool:
        return []
    if blacklisted_models is None:
        blacklisted_models = set()

    for model_name in CANDIDATE_MODELS:
        if model_name in blacklisted_models:
            continue
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
        for key_idx, api_key in enumerate(gemini_keys_pool):
            api_key = api_key.strip()
            if not api_key:
                continue
            headers = {"Content-Type": "application/json", "x-goog-api-key": api_key}
            payload = {"contents": [{"parts": [{"text": prompt}]}]}
            try:
                res = requests.post(url, json=payload, headers=headers, timeout=25)
                if res.status_code in (500, 502, 503, 504):
                    blacklisted_models.add(model_name)
                    print(f"  ⚡ [fraud] {model_name} high demand ({res.status_code}). Fast-switching model...")
                    break
                if res.status_code == 429:
                    continue
                res.raise_for_status()
                raw_text = res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                clean_json = re.sub(r"^```(?:json)?", "", raw_text, flags=re.MULTILINE)
                clean_json = re.sub(r"```$", "", clean_json, flags=re.MULTILINE).strip()
                parsed_data = json.loads(clean_json)
                if isinstance(parsed_data, list) and parsed_data:
                    screens = [
                        {
                            "app_package": str(s.get("app_package", "com.android.mms")),
                            "messages": [str(m) for m in s.get("messages", [])],
                            "urls": [str(u) for u in s.get("urls", [])],
                            "screen_text": str(s.get("screen_text", "")),
                            "expected_threat_level": str(s.get("expected_threat_level", "SAFE")).upper(),
                            "expected_threat_category": str(s.get("expected_threat_category", "NONE")).upper(),
                        }
                        for s in parsed_data
                        if isinstance(s, dict)
                    ]
                    print(f"✨ [fraud] Synthesized {len(screens)} scam scenarios via {model_name} [key {key_idx+1}/{len(gemini_keys_pool)}]")
                    return screens
            except Exception as e:
                print(f"  ⚠️ [fraud] Key [{key_idx+1}] / {model_name}: {e}. Trying next key...")
                continue

    print("⚠️ [fraud] All models and all keys exhausted for scam generation.")
    return []


def run_cloud_self_learning(api_url, auth_token=None, gemini_keys_pool=None, max_cases=None):
    num_keys = len(gemini_keys_pool) if gemini_keys_pool else 0
    print("=" * 75)
    print(" ☁️  SARALGATI 100% CLOUD-BASED AUTONOMOUS SELF-LEARNING PIPELINE")
    print("=" * 75)
    print(f" Target API Server : {api_url}")
    print(f" Gemini Key Pool   : {num_keys} keys loaded | Model-first exhaustive rotation")
    print(f" Model Priority    : 3.8-flash > 3.7 > 3.6 > 3.5 > 3-flash-preview > 3.5-lite > 3.1-lite")
    print(f" Device Dependency : NONE (Runs completely in the cloud)")
    print("=" * 75 + "\n")

    # No placeholder fallback: the server rejects unknown secrets, so running with
    # a made-up default would only produce confusing 401s.
    flywheel_secret = auth_token or os.environ.get("FLYWHEEL_SECRET") or os.environ.get("API_SECRET")
    if not flywheel_secret:
        raise SystemExit("FLYWHEEL_SECRET (or API_SECRET) must be set before running the flywheel.")
    headers = {
        "Content-Type": "application/json",
        "X-Flywheel-Secret": flywheel_secret,
        "Authorization": f"Bearer {flywheel_secret}"
    }

    stats = {
        "total_scenarios": 0,
        "correct_grounding": 0,
        "corrections_injected": 0,
        "golden_cache_promotions": 0,
        "cache_evictions": 0,
        "api_errors": 0,
        "fraud_scenarios": 0,
        "fraud_correct": 0,
        "fraud_missed": 0,
        "fraud_false_alarms": 0,
        "fraud_captured": 0
    }

    # Generate screens in 4 batches when keys available (more data per run)
    active_screens = []
    if gemini_keys_pool:
        num_batches = 4 if num_keys >= 10 else 2
        blacklisted_models = set()  # Shared across all batches in this run
        for batch_num in range(1, num_batches + 1):
            print(f"[Generator] Requesting batch {batch_num}/{num_batches} of dynamic app screens...")
            dynamic_screens = generate_infinite_screens_via_gemini(gemini_keys_pool, count=8, blacklisted_models=blacklisted_models)
            if dynamic_screens:
                active_screens.extend(dynamic_screens)
            if batch_num < num_batches:
                time.sleep(2)  # Small inter-batch delay

        # Final retry pass: give blacklisted 503 models one last chance at the end
        if blacklisted_models:
            print(f"[Generator] Final retry pass for {len(blacklisted_models)} blacklisted model(s): {', '.join(sorted(blacklisted_models))}")
            retry_screens = generate_infinite_screens_via_gemini(gemini_keys_pool, count=8, blacklisted_models=set())
            if retry_screens:
                active_screens.extend(retry_screens)
                print(f"[Generator] Final retry yielded {len(retry_screens)} additional screens.")

    if not active_screens:
        print("⚠️ No active screens generated from Gemini API. Exiting self-learning cycle.")
        return stats

    count = 0
    limit_reached = False
    for screen in active_screens:
        if limit_reached:
            break
        pkg = screen["app_package"]
        elements = screen["elements"]

        for scenario in screen["scenarios"]:
            if max_cases and count >= max_cases:
                limit_reached = True
                break

            query = scenario["query"]
            expected_index = scenario["expected"]
            intent_name = scenario.get("intent", "general")

            # Validate ground truth: skip if expected index is out of bounds
            if not isinstance(expected_index, int) or expected_index < 0 or expected_index >= len(elements):
                print(f"    ⚠️ Skipping scenario (expected index {expected_index} out of bounds for {len(elements)} elements)")
                continue

            count += 1

            print(f"[{count}] App: {pkg:<28} | Intent: {intent_name:<18}")
            print(f"    Query: \"{query}\"")

            # 1. Ask SaralGati API
            ask_payload = {
                "app_package": pkg,
                "question": query,
                "ui_elements": elements,
                "conversation_history": []
            }

            try:
                t0 = time.time()
                res = requests.post(urljoin(api_url, "/api/v1/agent/ask"), json=ask_payload, headers=headers, timeout=20)
                latency = int((time.time() - t0) * 1000)
                data = res.json()
            except Exception as e:
                print(f"    ❌ Network error: {e}")
                stats["api_errors"] += 1
                continue

            if not data.get("success"):
                print(f"    ❌ API Error: {data.get('error')}")
                stats["api_errors"] += 1
                continue

            result = data.get("data", {})
            interaction_id = result.get("interaction_id")
            predicted_index = result.get("highlight_index")
            source = result.get("source")

            print(f"    🎯 SaralGati Pick: [{predicted_index}] (Expected: [{expected_index}]) | {latency}ms | Source: {source}")

            # 2. Compare with Ground Truth
            stats["total_scenarios"] += 1
            is_correct = (predicted_index == expected_index)

            if is_correct:
                stats["correct_grounding"] += 1
                print(f"    ✅ CORRECT! Feeding positive reinforcement...")
                fb_payload = {
                    "interaction_id": interaction_id,
                    "feedback": "tapped_highlight",
                    "actual_tapped_index": expected_index
                }
            else:
                stats["corrections_injected"] += 1
                print(f"    ⚠️  MISMATCH! Injected ground truth correction: [{predicted_index}] -> [{expected_index}]")
                fb_payload = {
                    "interaction_id": interaction_id,
                    "feedback": "tapped_other",
                    "actual_tapped_index": expected_index
                }

            # 3. Submit Feedback to Flywheel (/api/v1/agent/feedback)
            try:
                fb_res = requests.post(urljoin(api_url, "/api/v1/agent/feedback"), json=fb_payload, headers=headers, timeout=10)
                fb_data = fb_res.json().get("data", {})
                if fb_data.get("promoted_to_golden_cache"):
                    stats["golden_cache_promotions"] += 1
                    print(f"    🌟 PROMOTED TO REDIS GOLDEN CACHE!")
                if fb_data.get("bad_cache_evicted"):
                    stats["cache_evictions"] += 1
                    print(f"    🗑️ Bad cache evicted from Redis.")
            except Exception as e:
                print(f"    ⚠️ Feedback logging failed: {e}")

            print("-" * 75)
            time.sleep(0.3)

    # 4. Anti-Fraud Sentinel training phase: Gemini writes the scam screen and
    #    its ground-truth label, the sentinel scores it, and the verdict is
    #    persisted per case (fraud_training_cases) for the LoRA fraud export.
    if gemini_keys_pool:
        print("\n" + "=" * 75)
        print(" 🛡️  ANTI-FRAUD SENTINEL TRAINING PHASE (Gemini ground truth)")
        print("=" * 75)
        fraud_target = min(6, max_cases) if max_cases else 6
        fraud_screens = generate_fraud_scam_screens_via_gemini(gemini_keys_pool, count=fraud_target, blacklisted_models=blacklisted_models)
        severity = {"SAFE": 0, "SUSPICIOUS": 1, "DANGEROUS": 2, "CRITICAL": 3}
        for fc_idx, case in enumerate(fraud_screens, start=1):
            expected_level = case["expected_threat_level"]
            payload = {
                "app_package": case["app_package"],
                "messages": case["messages"],
                "urls": case["urls"],
                "screen_text": case["screen_text"],
                "expected_threat_level": expected_level,
                "expected_threat_category": case["expected_threat_category"],
            }
            print(f"[{fc_idx}] {case['app_package']:<24} | Expected: {expected_level}/{case['expected_threat_category']}")
            if case["messages"]:
                print(f"    Message: \"{case['messages'][0][:100]}\"")
            try:
                f_res = requests.post(
                    urljoin(api_url, "/api/v1/agent/fraud-check"),
                    json=payload,
                    headers=headers,
                    timeout=20,
                )
                verdict = f_res.json()
            except Exception as e:
                print(f"    ❌ Network error: {e}")
                stats["api_errors"] += 1
                continue

            predicted_level = verdict.get("threat_level")
            if predicted_level not in severity:
                print(f"    ❌ Unexpected verdict: {verdict}")
                stats["api_errors"] += 1
                continue

            stats["fraud_scenarios"] += 1
            stats["fraud_captured"] += 1  # server persisted a labelled fraud_training_cases row
            if predicted_level == expected_level:
                stats["fraud_correct"] += 1
                print(f"    ✅ CORRECT: sentinel said {predicted_level}/{verdict.get('threat_category')}")
            elif severity[predicted_level] < severity[expected_level]:
                stats["fraud_missed"] += 1
                print(f"    ⚠️  MISSED: sentinel said {predicted_level}, expected {expected_level}")
            else:
                stats["fraud_false_alarms"] += 1
                print(f"    🚨 FALSE ALARM: sentinel said {predicted_level}, expected {expected_level}")
            print(f"    🧠 {verdict.get('risk_reasoning', '')[:110]}")
            print("-" * 75)
            time.sleep(0.3)

        if stats["fraud_scenarios"]:
            print(f" Fraud cases captured for LoRA training: {stats['fraud_captured']} "
                  f"(stored in fraud_training_cases via /api/v1/agent/fraud-check)")

    # Summary
    print("\n" + "=" * 75)
    print(" 📈 CLOUD SELF-LEARNING SESSION SUMMARY")
    print("=" * 75)
    total = stats["total_scenarios"]
    acc = (stats["correct_grounding"] / total * 100) if total > 0 else 0
    print(f" Scenarios Evaluated       : {total}")
    print(f" Grounding Accuracy        : {stats['correct_grounding']}/{total} ({acc:.1f}%)")
    print(f" Corrections Injected      : {stats['corrections_injected']}")
    print(f" Golden Cache Promotions   : {stats['golden_cache_promotions']}")
    print(f" Bad Caches Evicted        : {stats['cache_evictions']}")
    if stats["fraud_scenarios"]:
        f_total = stats["fraud_scenarios"]
        f_acc = stats["fraud_correct"] / f_total * 100
        print(f" Anti-Fraud Cases Scored   : {f_total}")
        print(f" Fraud Verdict Accuracy    : {stats['fraud_correct']}/{f_total} ({f_acc:.1f}%)")
        print(f" Missed Scams              : {stats['fraud_missed']}")
        print(f" False Alarms              : {stats['fraud_false_alarms']}")
    print("=" * 75)

    # Check Training Flywheel Readiness
    try:
        train_res = requests.get(
            urljoin(api_url, "/api/v1/agent/training-data?status=flywheel&limit=5"),
            headers=headers,
            timeout=15,
        )
        train_count = train_res.json().get("count", 0)
        print(f" Flywheel Verified Pool    : {train_count} verified interaction samples ready in Neon DB.")

        fraud_res = requests.get(
            urljoin(api_url, "/api/v1/agent/training-data?type=fraud&limit=5"),
            headers=headers,
            timeout=15,
        )
        fraud_count = fraud_res.json().get("count", 0)
        print(f" Fraud Training Cases Pool : {fraud_count} fraud cases ready in Neon DB.")
    except Exception:
        # Ignore network errors or database connection drops during offline checks
        pass

    print("\n🎯 Pipeline completed cleanly. No local devices or battery consumed.\n")
    return stats


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SaralGati 100% Cloud-Based Autonomous Self-Learning")
    parser.add_argument("--url", default=os.environ.get("SARALGATI_API_URL", "https://saralgati-685823552970.asia-south1.run.app"),
                        help="SaralGati backend API base URL")
    parser.add_argument("--token", default=os.environ.get("DEVICE_TOKEN", None), help="Device token (optional)")
    parser.add_argument("--gemini-keys", default=None, help="Comma-separated Gemini API keys pool (overrides env)")
    parser.add_argument("--limit", type=int, default=None, help="Max scenarios to run")
    args = parser.parse_args()

    # Build keys pool: --gemini-keys arg > GEMINI_API_KEYS env > GEMINI_API_KEY env (single key fallback)
    raw_keys_str = args.gemini_keys or os.environ.get("GEMINI_API_KEYS", "") or os.environ.get("GEMINI_API_KEY", "")
    keys_pool = [k.strip() for k in raw_keys_str.split(",") if k.strip()]
    print(f"[Keys] Loaded {len(keys_pool)} Gemini API key(s) for model-first rotation.")

    run_cloud_self_learning(api_url=args.url, auth_token=args.token, gemini_keys_pool=keys_pool, max_cases=args.limit)

