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

# Minimal emergency fallback scenario (only triggered if Gemini API is unreachable)
CLOUD_BENCHMARKS = [
    {
        "app_package": "com.whatsapp",
        "elements": [
            "[0] [TEXT] WhatsApp",
            "[1] [BUTTON] Camera",
            "[2] [BUTTON] Search",
            "[3] [BUTTON] Chats",
            "[4] [BUTTON] Updates",
            "[5] [BUTTON] Calls",
            "[6] [BUTTON] Ramesh Beta",
            "[7] [BUTTON] New chat"
        ],
        "scenarios": [
            {"query": "Ramesh ko phone lagao", "expected": 6, "intent": "chat_selection"},
            {"query": "Naya message bhejo kisi ko", "expected": 7, "intent": "new_chat"}
        ]
    }
]


def generate_infinite_screens_via_gemini(gemini_api_key, count=5):
    """
    Uses Free Gemini 3.5 Flash Lite API to generate completely brand-new, unseen Indian Android app screens
    with realistic UI element tokens and natural Hinglish elder queries.
    """
    import random
    popular_apps = [
        "IRCTC Rail Connect (train ticket booking, PNR status, berth choice)",
        "DigiLocker (Aadhaar card, driving license, vehicle RC, ration card)",
        "Blinkit / Zepto / Instamart (10 min grocery, milk, bread, medicines, fresh vegetables)",
        "JioCinema / Disney+ Hotstar (Live cricket match, Ramayan, old Hindi classics, news)",
        "SBI YONO / HDFC Mobile / ICICI iMobile (Account balance check, money transfer, mini statement)",
        "Uber / Ola / Rapido (Auto rickshaw booking, cab to hospital, railway station)",
        "Aarogya Setu / CoWIN (Vaccine certificate, doctor appointment booking)",
        "Tata 1mg / Apollo 247 / PharmEasy (Order BP/Sugar medicines, lab test booking)",
        "Flipkart / Amazon India (Order kurta, track delivered parcel, easy return)",
        "WhatsApp (Family group video call, forward bhajan, share photo)",
        "PhonePe / Google Pay / Paytm (Pay electricity bill, gas cylinder, FASTag recharge)",
        "UTS Indian Railways (Unreserved local train ticket, suburban monthly pass)",
        "YouTube (Aarti bhajan live, old devotional songs, cooking recipes)",
        "BHIM UPI (Scan QR code at local kirana store, check bank balance)",
        "PostInfo (India Post tracking, Senior Citizen Savings Scheme)",
        "mAadhaar (Update address, download e-Aadhaar, lock biometrics)",
        "Google Maps (Directions to nearest hospital, find temple, share live location)"
    ]
    selected_apps = random.sample(popular_apps, min(count, len(popular_apps)))

    # Add variation seed to prevent duplicate scenarios across hourly runs
    import datetime
    hour_seed = datetime.datetime.utcnow().strftime("%Y-%m-%d-%H")
    variation_contexts = [
        "home screen", "settings page", "payment confirmation", "search results",
        "order history", "profile page", "notification panel", "login screen",
        "checkout page", "booking confirmation", "help section", "menu drawer"
    ]
    variation = random.choice(variation_contexts)

    prompt = f"""You are a synthetic Android UI generator for SaralGati, an AI companion designed for Indian elders.
Generate exactly {len(selected_apps)} realistic Android app screens for Indian apps based on these topics:
{json.dumps(selected_apps)}
Context variation: Show the {variation} view. Generation seed: {hour_seed}.

For each screen:
1. Provide "app_package" (e.g. 'cris.org.in.prs.ima', 'com.phonepe.app', 'com.sbi.lotusintouch').
2. Provide "elements": a list of 8 to 14 elements formatted with their accessibility role:
   - [BUTTON] for clickable buttons or icons
   - [INPUT] for text input boxes
   - [TOGGLE] for checkboxes/switches
   - [TEXT] for static titles/headers
   Format each element strictly as: "[index] [ROLE] Label" (e.g., "[0] [BUTTON] Scan QR", "[1] [INPUT] Enter mobile number")
3. Provide "scenarios": 2 to 3 realistic Indian elder queries in natural Hinglish (Hindi in Roman English alphabet).
   Example queries: 'Beti ko video call kaise karein', 'Bijli ka bill kahan se bharein', 'Train ka PNR check karna hai'.
4. For each query, specify "expected" (the exact integer index number of the target element to tap).

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

    # Primary: gemini-3.5-flash-lite (Newest generation, 500 RPD, 15 RPM)
    # Secondary: gemini-3.1-flash-lite (500 RPD fallback)
    candidate_models = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]

    for model_name in candidate_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
        headers = {"Content-Type": "application/json", "x-goog-api-key": gemini_api_key}
        payload = {"contents": [{"parts": [{"text": prompt}]}]}

        try:
            res = requests.post(url, json=payload, headers=headers, timeout=25)
            res.raise_for_status()
            raw_text = res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            # Clean any accidental markdown backticks
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
                print(f"✨ Successfully synthesized {len(screens)} fresh, unseen app screens via {model_name}!")
                return screens
        except Exception as e:
            print(f"⚠️ Dynamic synthesis warning with {model_name}: {e}. Trying next model...")

    print("⚠️ All dynamic generation models exhausted. Falling back to benchmark screens.")
    return []



def run_cloud_self_learning(api_url, auth_token=None, gemini_key=None, max_cases=None):
    print("=" * 75)
    print(" ☁️  SARALGATI 100% CLOUD-BASED AUTONOMOUS SELF-LEARNING PIPELINE")
    print("=" * 75)
    print(f" Target API Server : {api_url}")
    print(f" Dynamic Generator : {'Active (Gemini 3.5 Flash Lite Turbo Multi-Batch)' if gemini_key else 'Static Benchmark Screens'}")
    print(f" Device Dependency : NONE (Runs completely in the cloud)")
    print("=" * 75 + "\n")

    flywheel_secret = auth_token or os.environ.get("FLYWHEEL_SECRET") or os.environ.get("API_SECRET") or "saralgati_super_secret_key_2024"
    headers = {
        "Content-Type": "application/json",
        "X-Flywheel-Secret": flywheel_secret,
        "Authorization": f"Bearer {flywheel_secret}"
    }

    # Generate screens in 2 batches for maximum yield while respecting 15 RPM
    active_screens = []
    if gemini_key:
        for batch_num in (1, 2):
            print(f"[Generator] Requesting batch {batch_num}/2 of dynamic app screens from Gemini API...")
            dynamic_screens = generate_infinite_screens_via_gemini(gemini_key, count=8)
            if dynamic_screens:
                active_screens.extend(dynamic_screens)
            if batch_num == 1:
                time.sleep(5)  # Strict 15 RPM guardrail between batches

    if not active_screens:
        print("[Generator] Using curated benchmark screen suite.")
        active_screens = CLOUD_BENCHMARKS

    stats = {
        "total_scenarios": 0,
        "correct_grounding": 0,
        "corrections_injected": 0,
        "golden_cache_promotions": 0,
        "cache_evictions": 0,
        "api_errors": 0
    }

    count = 0
    for screen in active_screens:
        pkg = screen["app_package"]
        elements = screen["elements"]

        for scenario in screen["scenarios"]:
            if max_cases and count >= max_cases:
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
    print("=" * 75)

    # Check Training Flywheel Readiness
    try:
        train_res = requests.get(urljoin(api_url, "/api/v1/agent/training-data?status=flywheel&limit=5"), timeout=15)
        train_count = train_res.json().get("count", 0)
        print(f" Flywheel Verified Pool    : {train_count} verified samples ready in Neon DB.")
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
    parser.add_argument("--gemini-key", default=os.environ.get("GEMINI_API_KEY", None), help="Google AI Studio / Gemini API key for infinite dynamic screen synthesis")
    parser.add_argument("--limit", type=int, default=None, help="Max scenarios to run")
    args = parser.parse_args()

    run_cloud_self_learning(api_url=args.url, auth_token=args.token, gemini_key=args.gemini_key, max_cases=args.limit)
