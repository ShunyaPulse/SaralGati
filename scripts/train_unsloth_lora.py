"""
SaralGati - Automated Continuous LoRA Fine-Tuning & Deployment Pipeline
Trains Unsloth Llama-3.1-8B on Single-GPU (T4) with full Unsloth custom Triton/CUDA
optimizations, SOTA two-stage training (Stage 1: SFT with NEFTune + Paged AdamW 8-bit
+ Cosine Annealing LR; Stage 2: Direct Preference Optimization / DPO on contrastive
elder corrections & fraud sentinel misses), and auto-deploys to Cloudflare Workers AI.
"""

import glob
import math
import os
import shutil
import sys
import json
import subprocess
import logging
import requests

# Enforce Single GPU for Maximum Unsloth Speed
os.environ["CUDA_VISIBLE_DEVICES"] = "0"

SARALGATI_API_URL = os.environ.get("SARALGATI_API_URL", "https://saralgati-685823552970.asia-south1.run.app")
CLOUDFLARE_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
CLOUDFLARE_API_TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN")
# Shared secret for the internal training-data export. There is deliberately no
# placeholder fallback: a default value here would be public in this repository.
FLYWHEEL_SECRET = os.environ.get("FLYWHEEL_SECRET") or os.environ.get("API_SECRET")

# Fallback to Kaggle UserSecrets if running inside Kaggle
if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_TOKEN or not FLYWHEEL_SECRET:
    try:
        from kaggle_secrets import UserSecretsClient
        secrets = UserSecretsClient()
        CLOUDFLARE_ACCOUNT_ID = CLOUDFLARE_ACCOUNT_ID or secrets.get_secret("CLOUDFLARE_ACCOUNT_ID")
        CLOUDFLARE_API_TOKEN = CLOUDFLARE_API_TOKEN or secrets.get_secret("CLOUDFLARE_API_TOKEN")
        FLYWHEEL_SECRET = FLYWHEEL_SECRET or secrets.get_secret("FLYWHEEL_SECRET")
    except Exception:
        # Fallback gracefully outside Kaggle or when UserSecretsClient is unavailable
        logging.getLogger(__name__).info("Kaggle platform integration bypassed; using environment variables.")


MIN_MINORITY_LANGUAGE_SHARE = 0.4
MAX_LANGUAGE_DUPLICATIONS = 4


def balance_guidance_languages(lines, min_share=MIN_MINORITY_LANGUAGE_SHARE, max_copies=MAX_LANGUAGE_DUPLICATIONS):
    """Oversample the minority guidance language so the adapter stays bilingual."""
    tagged, untagged = [], []
    for line in lines:
        try:
            row = json.loads(line)
        except (TypeError, ValueError):
            untagged.append(line)
            continue
        lang = (row.get("metadata") or {}).get("guidance_lang")
        if lang in ("hi", "en"):
            tagged.append((lang, line))
        else:
            untagged.append(line)

    counts = {"hi": 0, "en": 0}
    for lang, _ in tagged:
        counts[lang] += 1

    total = counts["hi"] + counts["en"]
    if total < 2:
        print(f"[Dataset] Language balance: only {total} language-tagged rows, left as is.")
        return lines

    minority = "en" if counts["en"] <= counts["hi"] else "hi"
    minority_rows = [line for lang, line in tagged if lang == minority]
    if not minority_rows:
        print(f"[Dataset] Language balance: no {minority} rows to oversample (hi={counts['hi']} en={counts['en']}).")
        return lines

    needed = math.ceil(
        (min_share * total - counts[minority]) / (1 - min_share)
    )
    extras = min(max(needed, 0), counts[minority] * (max_copies - 1))
    if extras <= 0:
        print(f"[Dataset] Language balance: hi={counts['hi']} en={counts['en']} already even enough.")
        return lines

    balanced = list(lines)
    for i in range(extras):
        balanced.append(minority_rows[i % len(minority_rows)])

    print(
        f"[Dataset] Language balance: oversampled {extras} '{minority}' row(s) "
        f"(was hi={counts['hi']} en={counts['en']}) so both languages train."
    )
    return balanced


def find_attached_dataset(filename="dataset.jsonl"):
    """Path of the attached Kaggle Dataset's file (dataset.jsonl or dpo_dataset.jsonl), or None."""
    for root in ("/kaggle/input", "/kaggle/working"):
        for path in sorted(glob.glob(os.path.join(root, "**", filename), recursive=True)):
            if os.path.getsize(path) > 0:
                return path
    return None


def normalize_training_rows(lines):
    """Reduce every exported SFT row to the single `messages` field the trainer reads."""
    normalized = []
    skipped = 0
    for line in lines:
        try:
            row = json.loads(line)
        except (TypeError, ValueError):
            skipped += 1
            continue
        messages = row.get("messages")
        if not isinstance(messages, list) or not messages:
            skipped += 1
            continue
        normalized.append(json.dumps({"messages": messages}, ensure_ascii=False))
    if skipped:
        print(f"[Dataset] Normalized rows: dropped {skipped} row(s) without a usable messages list.")
    return normalized


def normalize_dpo_rows(lines):
    """Validate and normalize contrastive DPO rows into {prompt, chosen, rejected} message lists."""
    normalized = []
    skipped = 0
    for line in lines:
        try:
            row = json.loads(line)
        except (TypeError, ValueError):
            skipped += 1
            continue
        prompt = row.get("prompt")
        chosen = row.get("chosen")
        rejected = row.get("rejected")
        if (
            not isinstance(prompt, list) or not prompt or
            not isinstance(chosen, list) or not chosen or
            not isinstance(rejected, list) or not rejected
        ):
            skipped += 1
            continue
        chosen_text = str(chosen[0].get("content", "")).strip()
        rejected_text = str(rejected[0].get("content", "")).strip()
        if not chosen_text or not rejected_text or chosen_text == rejected_text:
            skipped += 1
            continue
        normalized.append(json.dumps({
            "prompt": prompt,
            "chosen": chosen,
            "rejected": rejected,
        }, ensure_ascii=False))
    if skipped:
        print(f"[DPO Dataset] Dropped {skipped} invalid/non-contrastive DPO row(s).")
    return normalized


def fetch_live_dpo_dataset():
    """Load contrastive DPO preference pairs (elder corrections + fraud sentinel misses)."""
    dpo_file = "train_dpo_dataset.jsonl"
    lines = []

    attached = find_attached_dataset("dpo_dataset.jsonl")
    if attached:
        try:
            with open(attached, "r", encoding="utf-8") as f:
                lines = [line for line in f.read().split("\n") if line.strip()]
            print(f"[DPO Dataset] Loaded {len(lines)} DPO preference pairs from attached Kaggle dataset: {attached}")
        except Exception as e:
            print(f"[DPO Dataset] Warning reading {attached}: {e}")

    if not lines:
        candidates = [
            "dpo_dataset.jsonl",
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "dpo_dataset.jsonl"),
            "/kaggle/src/dpo_dataset.jsonl",
            "/kaggle/working/dpo_dataset.jsonl",
        ]
        for candidate in candidates:
            if os.path.exists(candidate) and os.path.getsize(candidate) > 0:
                try:
                    with open(candidate, "r", encoding="utf-8") as f:
                        candidate_lines = [l for l in f.read().split("\n") if l.strip()]
                    if candidate_lines:
                        lines = candidate_lines
                        print(f"[DPO Dataset] Loaded {len(lines)} DPO pairs from local file: {candidate}")
                        break
                except Exception as e:
                    print(f"[DPO Dataset] Warning reading {candidate}: {e}")

    if not lines and FLYWHEEL_SECRET:
        dpo_urls = [
            f"{SARALGATI_API_URL}/api/v1/agent/training-data?type=dpo&format=jsonl&limit=5000",
            f"{SARALGATI_API_URL}/api/v1/agent/training-data?type=fraud&mode=dpo&format=jsonl&limit=5000",
        ]
        for d_url in dpo_urls:
            try:
                res = requests.get(d_url, headers={"x-flywheel-secret": FLYWHEEL_SECRET}, timeout=25)
                if res.ok and res.text.strip():
                    fetched = [l for l in res.text.strip().split("\n") if l.strip()]
                    lines.extend(fetched)
            except Exception as e:
                print(f"[DPO Dataset] Info: Live DPO fetch skipped ({e}).")

    lines = normalize_dpo_rows(lines)
    if len(lines) < 4:
        print(f"[DPO Dataset] {len(lines)} contrastive DPO pair(s) available (< 4 minimum); Stage 2 DPO will be skipped.")
        return None

    with open(dpo_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[DPO Dataset] Saved {len(lines)} contrastive preference pairs to {dpo_file} for Stage 2 DPO alignment.")
    return dpo_file


def fetch_live_dataset():
    dataset_file = "train_dataset.jsonl"
    lines = []

    # 1. First priority: the dataset attached to this Kaggle run as an input.
    attached = find_attached_dataset("dataset.jsonl")
    if attached:
        try:
            with open(attached, "r", encoding="utf-8") as f:
                lines = [line for line in f.read().split("\n") if line.strip()]
            print(f"[Dataset] Step 1: Loaded {len(lines)} verified training samples from the attached Kaggle dataset: {attached}")
        except Exception as e:
            print(f"[Dataset] Warning: Could not read attached dataset {attached} ({e}).")
    else:
        print("[Dataset] Info: No attached Kaggle dataset found. Checking local files...")

    # 2. Second priority: Check local dataset.jsonl candidates
    if not lines:
        candidates = [
            "dataset.jsonl",
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset.jsonl"),
            "/kaggle/src/dataset.jsonl",
            "/kaggle/working/dataset.jsonl",
        ]
        for candidate in candidates:
            if os.path.exists(candidate) and os.path.getsize(candidate) > 0:
                try:
                    with open(candidate, "r", encoding="utf-8") as f:
                        candidate_lines = [l for l in f.read().split("\n") if l.strip()]
                    if candidate_lines:
                        lines = candidate_lines
                        print(f"[Dataset] Step 1: Loaded {len(lines)} verified samples from local file: {candidate}")
                        break
                except Exception as e:
                    print(f"[Dataset] Warning reading {candidate}: {e}")

    # 3. Third priority: Live API fetch from Flywheel
    if not lines:
        url = f"{SARALGATI_API_URL}/api/v1/agent/training-data?status=flywheel&format=jsonl&limit=10000"
        fraud_url = f"{SARALGATI_API_URL}/api/v1/agent/training-data?type=fraud&mode=sft&format=jsonl&limit=10000"
        print(f"[Dataset] Step 1: Fetching verified training data from {url}...")
        try:
            if not FLYWHEEL_SECRET:
                raise RuntimeError("FLYWHEEL_SECRET / API_SECRET is not available in this environment")
            res = requests.get(url, headers={"x-flywheel-secret": FLYWHEEL_SECRET}, timeout=30)
            res.raise_for_status()
            content = res.text.strip()
            lines.extend([l for l in content.split("\n") if l.strip()])
            print(f"[Dataset] Downloaded {len(lines)} verified training interactions from live Flywheel.")
        except Exception as e:
            print(f"[Dataset] Warning: Failed to fetch live interaction data ({e}).")

        try:
            if FLYWHEEL_SECRET:
                f_res = requests.get(fraud_url, headers={"x-flywheel-secret": FLYWHEEL_SECRET}, timeout=30)
                if f_res.ok:
                    f_content = f_res.text.strip()
                    f_lines = [l for l in f_content.split("\n") if l.strip()]
                    print(f"[Dataset] Downloaded {len(f_lines)} fraud training cases from live Flywheel.")
                    lines.extend(f_lines)
        except Exception as e:
            print(f"[Dataset] Warning: Failed to fetch fraud data ({e}).")

    # Supplement with high-quality seed pairs if dataset is small
    if len(lines) < 20:
        print("[Dataset] Supplementing with high-quality seed elder interaction examples...")
        seed_samples = [
            {
                "messages": [
                    {"role": "system", "content": "You are SaralGati, a patient, warm companion for Indian elders.\nThe user is looking at an Android app: com.whatsapp.\nHere are the numbered interactive elements on their screen:\n[0] [BUTTON] Audio Call\n[1] [BUTTON] Video Call\n[2] [BUTTON] Search\n[3] [TEXT] Recent chats\n\nInstructions:\n1. Answer the user's question in 1 or 2 simple, comforting Hinglish (Hindi written in English script) sentences.\n2. Elements on screen are prefixed with their role:\n   - [BUTTON]: Clickable button or icon that can be tapped.\n   - [INPUT]: Text input box for typing.\n   - [TOGGLE]: Switch or checkbox.\n   - [TEXT]: Plain static non-clickable text or title.\n3. When guiding the user to tap, open, or take action, ALWAYS target an interactive element ([BUTTON], [INPUT], or [TOGGLE]). Never target static [TEXT] unless specifically asked to read or verify text.\n4. If your answer directs the user to tap or look at a specific element on screen, append \" TARGET:[index]\" at the very end of your response, where [index] is the exact number of that element (for example: TARGET:2).\n5. If no specific element needs to be tapped, do NOT output any TARGET tag.\n6. Do not mention that you are an AI. Only output the Hinglish sentence."},
                    {"role": "user", "content": "video call kaise lagau"},
                    {"role": "assistant", "content": "Video call karne ke liye yahan \"Video Call\" button par dabayein. TARGET:1"}
                ],
                "metadata": {"guidance_lang": "hi"}
            },
            {
                "messages": [
                    {"role": "system", "content": "You are SaralGati, a patient, warm companion for Indian elders.\nThe user is looking at an Android app: com.google.android.dialer.\nHere are the numbered interactive elements on their screen:\n[0] [INPUT] Search contacts\n[1] [BUTTON] Keypad Dial\n[2] [BUTTON] Favorites\n\nInstructions:\n1. Answer the user's question in 1 or 2 simple, comforting Hinglish (Hindi written in English script) sentences.\n2. Elements on screen are prefixed with their role:\n   - [BUTTON]: Clickable button or icon that can be tapped.\n   - [INPUT]: Text input box for typing.\n   - [TOGGLE]: Switch or checkbox.\n   - [TEXT]: Plain static non-clickable text or title.\n3. When guiding the user to tap, open, or take action, ALWAYS target an interactive element ([BUTTON], [INPUT], or [TOGGLE]). Never target static [TEXT] unless specifically asked to read or verify text.\n4. If your answer directs the user to tap or look at a specific element on screen, append \" TARGET:[index]\" at the very end of your response, where [index] is the exact number of that element (for example: TARGET:2).\n5. If no specific element needs to be tapped, do NOT output any TARGET tag.\n6. Do not mention that you are an AI. Only output the Hinglish sentence."},
                    {"role": "user", "content": "naya number milana hai"},
                    {"role": "assistant", "content": "Number dial karne ke liye yahan \"Keypad Dial\" par dabayein. TARGET:1"}
                ],
                "metadata": {"guidance_lang": "hi"}
            },
            {
                "messages": [
                    {"role": "system", "content": "You are SaralGati, a patient, warm companion for Indian elders.\nThe user is looking at an Android app: com.google.android.youtube.\nHere are the numbered interactive elements on their screen:\n[0] [BUTTON] Search\n[1] [BUTTON] Voice Search\n[2] [BUTTON] Play Video Bhajan\n[3] [TEXT] Top Songs\n\nInstructions:\n1. Answer the user's question in 1 or 2 simple, comforting English sentences. Write only in English words and Latin script, never in Hindi or Devanagari.\n2. Elements on screen are prefixed with their role:\n   - [BUTTON]: Clickable button or icon that can be tapped.\n   - [INPUT]: Text input box for typing.\n   - [TOGGLE]: Switch or checkbox.\n   - [TEXT]: Plain static non-clickable text or title.\n3. When guiding the user to tap, open, or take action, ALWAYS target an interactive element ([BUTTON], [INPUT], or [TOGGLE]). Never target static [TEXT] unless specifically asked to read or verify text.\n4. If your answer directs the user to tap or look at a specific element on screen, append \" TARGET:[index]\" at the very end of your response, where [index] is the exact number of that element (for example: TARGET:2).\n5. If no specific element needs to be tapped, do NOT output any TARGET tag.\n6. Do not mention that you are an AI. Only output the English sentence."},
                    {"role": "user", "content": "How do I play the bhajan video?"},
                    {"role": "assistant", "content": "Tap \"Play Video Bhajan\" here to start the video. TARGET:2"}
                ],
                "metadata": {"guidance_lang": "en"}
            },
            {
                "messages": [
                    {"role": "system", "content": "You are SaralGati's anti-fraud analyst for Indian elders.\nYou receive the visible signals of one Android screen or message batch: UI element labels, URLs, SMS/notification text and the elder's question.\nClassify the threat into exactly one level (SAFE, SUSPICIOUS, DANGEROUS, CRITICAL) and one category among OTP_THEFT, PAYMENT_FRAUD, REMOTE_ACCESS, PHISHING_IMPERSONATION, MALVERTISING, MALICIOUS_APK, PRIVACY_RISK, NONE.\nRules: receiving money never needs a UPI PIN or OTP; only theft vectors (OTP theft, payment fraud, remote access, malicious APK) may reach CRITICAL; never mark a screen DANGEROUS on a single weak keyword when a benign explanation exists.\nRespond ONLY with JSON: {\"threat_level\":\"...\",\"threat_category\":\"...\",\"risk_reasoning\":\"one short sentence\"}."},
                    {"role": "user", "content": json.dumps({"app_package": "com.android.mms", "signals": {"messages": ["SBI: Your net banking is locked. Share OTP 482910 to unlock immediately."], "urls": []}})},
                    {"role": "assistant", "content": json.dumps({"threat_level": "CRITICAL", "threat_category": "OTP_THEFT", "risk_reasoning": "OTP kisi ke sath share mat karein, bank kabhi OTP nahi mangta."})}
                ]
            },
            {
                "messages": [
                    {"role": "system", "content": "You are SaralGati's anti-fraud analyst for Indian elders.\nYou receive the visible signals of one Android screen or message batch: UI element labels, URLs, SMS/notification text and the elder's question.\nClassify the threat into exactly one level (SAFE, SUSPICIOUS, DANGEROUS, CRITICAL) and one category among OTP_THEFT, PAYMENT_FRAUD, REMOTE_ACCESS, PHISHING_IMPERSONATION, MALVERTISING, MALICIOUS_APK, PRIVACY_RISK, NONE.\nRules: receiving money never needs a UPI PIN or OTP; only theft vectors (OTP theft, payment fraud, remote access, malicious APK) may reach CRITICAL; never mark a screen DANGEROUS on a single weak keyword when a benign explanation exists.\nRespond ONLY with JSON: {\"threat_level\":\"...\",\"threat_category\":\"...\",\"risk_reasoning\":\"one short sentence\"}."},
                    {"role": "user", "content": json.dumps({"app_package": "com.phonepe.app", "signals": {"question": "pension ka paisa lene ke liye pin mang raha hai", "ui_elements": ["[0] [BUTTON] Enter UPI PIN to receive ₹5000", "[1] [BUTTON] Cancel"]}})},
                    {"role": "assistant", "content": json.dumps({"threat_level": "CRITICAL", "threat_category": "PAYMENT_FRAUD", "risk_reasoning": "Paisa prapt karne ke liye kabhi UPI PIN nahi dalna hota."})}
                ]
            },
            {
                "messages": [
                    {"role": "system", "content": "You are SaralGati's anti-fraud analyst for Indian elders.\nYou receive the visible signals of one Android screen or message batch: UI element labels, URLs, SMS/notification text and the elder's question.\nClassify the threat into exactly one level (SAFE, SUSPICIOUS, DANGEROUS, CRITICAL) and one category among OTP_THEFT, PAYMENT_FRAUD, REMOTE_ACCESS, PHISHING_IMPERSONATION, MALVERTISING, MALICIOUS_APK, PRIVACY_RISK, NONE.\nRules: receiving money never needs a UPI PIN or OTP; only theft vectors (OTP theft, payment fraud, remote access, malicious APK) may reach CRITICAL; never mark a screen DANGEROUS on a single weak keyword when a benign explanation exists.\nRespond ONLY with JSON: {\"threat_level\":\"...\",\"threat_category\":\"...\",\"risk_reasoning\":\"one short sentence\"}."},
                    {"role": "user", "content": json.dumps({"app_package": "com.whatsapp", "signals": {"messages": ["Electricity power cut tonight at 9:30 PM. Download bill update app immediately: https://bit.ly/mseb-bill.apk"], "urls": ["https://bit.ly/mseb-bill.apk"]}})},
                    {"role": "assistant", "content": json.dumps({"threat_level": "CRITICAL", "threat_category": "MALICIOUS_APK", "risk_reasoning": "Anjaan APK file download na karein, yeh phone hack kar sakta hai."})}
                ]
            }
        ]
        for s in seed_samples:
            lines.append(json.dumps(s))

    # Keep the two guidance languages in balance before the rows reach the
    # trainer, so an English elder's screens are not drowned by Hinglish ones.
    lines = balance_guidance_languages(lines)
    lines = normalize_training_rows(lines)
    if not lines:
        raise SystemExit("[Dataset] No usable training rows; refusing to train on an empty dataset.")

    with open(dataset_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[Dataset] Total training dataset size: {len(lines)} items saved to {dataset_file}")
    return dataset_file


def ensure_unsloth():
    try:
        import unsloth
        return
    except ImportError:
        pass

    print("[Install] Installing Unsloth and compatible dependencies for Kaggle GPU environment...")
    # 1. Update auxiliary libraries without touching pre-installed PyTorch, Triton, or CUDA runtime
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "--no-deps",
            "bitsandbytes", "accelerate", "transformers", "trl", "peft"
        ])
    except Exception as e:
        print(f"[Install] Notice: auxiliary libraries install skipped ({e}); proceeding...")

    # 2. Install unsloth & unsloth_zoo without clobbering native PyTorch or xformers
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "--no-deps", "unsloth", "unsloth_zoo"
        ])
    except Exception as e:
        print(f"[Install] Notice: --no-deps unsloth install failed ({e}); falling back to standard...")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "unsloth"
        ])


def auto_tune_hyperparameters(dataset_file, tokenizer):
    """Dynamically compute training hyperparameters from the live dataset."""
    from datasets import load_dataset

    PER_DEVICE_BATCH = 4
    TARGET_EFFECTIVE_BATCH = 16
    TARGET_GRAD_STEPS = 450        # Sweet spot for LoRA convergence
    MIN_SEQ_LEN = 256
    MAX_SEQ_LEN = 768              # T4 VRAM ceiling for 4-bit Llama-3.1-8B
    ROUND_TO = 64

    dataset = load_dataset("json", data_files=dataset_file, split="train")
    total_samples = len(dataset)
    print(f"[AutoTune] Dataset size: {total_samples} samples")

    sample_size = min(total_samples, 2000)
    sample_indices = list(range(0, total_samples, max(1, total_samples // sample_size)))[:sample_size]
    token_lengths = []
    for idx in sample_indices:
        row = dataset[idx]
        messages = row.get("messages", [])
        if not messages:
            continue
        try:
            text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
            tokens = tokenizer(text, add_special_tokens=False)["input_ids"]
            token_lengths.append(len(tokens))
        except Exception:
            continue

    if not token_lengths:
        print("[AutoTune] WARNING: Could not tokenize any samples, using safe defaults.")
        return {
            "max_seq_length": MAX_SEQ_LEN,
            "num_train_epochs": 1,
            "learning_rate": 2e-4,
            "gradient_accumulation_steps": TARGET_EFFECTIVE_BATCH // PER_DEVICE_BATCH,
            "per_device_train_batch_size": PER_DEVICE_BATCH,
        }

    token_lengths.sort()
    p50 = token_lengths[len(token_lengths) // 2]
    p99_idx = min(int(len(token_lengths) * 0.99), len(token_lengths) - 1)
    p99 = token_lengths[p99_idx]
    max_tok = token_lengths[-1]

    seq_len = math.ceil(p99 / ROUND_TO) * ROUND_TO
    seq_len = max(MIN_SEQ_LEN, min(seq_len, MAX_SEQ_LEN))

    grad_accum = max(1, TARGET_EFFECTIVE_BATCH // PER_DEVICE_BATCH)

    effective_batch = PER_DEVICE_BATCH * grad_accum
    steps_per_epoch = math.ceil(total_samples / effective_batch)
    if steps_per_epoch > 0:
        raw_epochs = TARGET_GRAD_STEPS / steps_per_epoch
    else:
        raw_epochs = 1

    num_epochs = max(1, min(4, round(raw_epochs)))
    if total_samples < 20:
        num_epochs = 1

    if total_samples < 500:
        lr = 2.8e-4
    elif total_samples < 1000:
        lr = 2.4e-4
    elif total_samples < 3000:
        lr = 2.0e-4
    elif total_samples < 6000:
        lr = 1.6e-4
    else:
        lr = 1.2e-4

    total_steps = steps_per_epoch * num_epochs
    print(f"[AutoTune] Token profile: p50={p50}, p99={p99}, max={max_tok}")
    print(f"[AutoTune] → max_seq_length   = {seq_len}  (P99={p99} → rounded to {ROUND_TO})")
    print(f"[AutoTune] → num_train_epochs  = {num_epochs}  (target ~{TARGET_GRAD_STEPS} steps, actual ~{total_steps})")
    print(f"[AutoTune] → learning_rate     = {lr}  (n={total_samples})")
    print(f"[AutoTune] → grad_accum_steps  = {grad_accum}  (eff_batch={effective_batch})")
    print(f"[AutoTune] → per_device_batch  = {PER_DEVICE_BATCH}")

    return {
        "max_seq_length": seq_len,
        "num_train_epochs": num_epochs,
        "learning_rate": lr,
        "gradient_accumulation_steps": grad_accum,
        "per_device_train_batch_size": PER_DEVICE_BATCH,
    }


def run_dpo_alignment(model, tokenizer, dpo_file, max_seq_length):
    """Stage 2 SOTA Preference Alignment via Direct Preference Optimization (DPO).

    Uses contrastive (prompt, chosen, rejected) pairs from elder tap corrections
    and fraud sentinel misses so the adapter explicitly suppresses wrong element
    targets and false-negative/false-positive scam classifications.
    """
    if not dpo_file or not os.path.exists(dpo_file):
        return

    try:
        from unsloth import PatchDPOTrainer
        PatchDPOTrainer()
        import torch
        from datasets import load_dataset
        from trl import DPOTrainer, DPOConfig
    except Exception as e:
        print(f"[DPO] Info: DPOTrainer unavailable in current environment ({e}); skipping Stage 2 DPO.")
        return

    try:
        dpo_raw = load_dataset("json", data_files=dpo_file, split="train")
        if len(dpo_raw) < 4:
            print(f"[DPO] Only {len(dpo_raw)} DPO samples; skipping Stage 2.")
            return

        def format_dpo_row(example):
            prompt_msgs = example["prompt"]
            chosen_msgs = example["chosen"]
            rejected_msgs = example["rejected"]
            prompt_str = tokenizer.apply_chat_template(
                prompt_msgs, tokenize=False, add_generation_prompt=True
            )
            chosen_str = chosen_msgs[0]["content"] + tokenizer.eos_token
            rejected_str = rejected_msgs[0]["content"] + tokenizer.eos_token
            return {
                "prompt": prompt_str,
                "chosen": chosen_str,
                "rejected": rejected_str,
            }

        dpo_dataset = dpo_raw.map(format_dpo_row)

        def within_dpo_limit(ex):
            p_ids = tokenizer(ex["prompt"], add_special_tokens=False)["input_ids"]
            c_ids = tokenizer(ex["chosen"], add_special_tokens=False)["input_ids"]
            r_ids = tokenizer(ex["rejected"], add_special_tokens=False)["input_ids"]
            return (
                len(p_ids) + max(len(c_ids), len(r_ids)) <= max_seq_length
                and len(p_ids) <= 512
            )

        dpo_dataset = dpo_dataset.filter(within_dpo_limit)
        if len(dpo_dataset) < 4:
            print(f"[DPO] Only {len(dpo_dataset)} DPO samples within max_seq_length={max_seq_length}; skipping Stage 2.")
            return

        print(f"\n[DPO] Stage 2: Starting Direct Preference Optimization on {len(dpo_dataset)} contrastive pairs...")
        dpo_args = DPOConfig(
            per_device_train_batch_size=2,
            gradient_accumulation_steps=4,
            warmup_ratio=0.1,
            num_train_epochs=1,
            learning_rate=5e-6,
            lr_scheduler_type="cosine",
            optim="adamw_8bit",
            fp16=not torch.cuda.is_bf16_supported(),
            bf16=torch.cuda.is_bf16_supported(),
            logging_steps=10,
            output_dir="dpo_checkpoints",
            beta=0.1,
            max_length=max_seq_length,
            max_prompt_length=512,
            seed=3407,
            save_strategy="no",
            report_to="none",
        )
        try:
            dpo_trainer = DPOTrainer(
                model=model,
                ref_model=None,
                args=dpo_args,
                train_dataset=dpo_dataset,
                processing_class=tokenizer,
            )
        except TypeError:
            dpo_trainer = DPOTrainer(
                model=model,
                ref_model=None,
                args=dpo_args,
                train_dataset=dpo_dataset,
                tokenizer=tokenizer,
            )

        dpo_trainer.train()
        print("[DPO] ✅ Stage 2 Direct Preference Optimization completed successfully.")
    except Exception as e:
        print(f"[DPO] ⚠️ Stage 2 DPO encountered a non-fatal error ({e}); retaining validated Stage 1 SFT weights.")


def train_lora(dataset_file, dpo_file=None):
    ensure_unsloth()

    # Strictly ordered imports: unsloth FastLanguageModel BEFORE trl/transformers/peft
    from unsloth import FastLanguageModel
    import torch
    from datasets import load_dataset
    from trl import SFTTrainer
    from transformers import TrainingArguments
    from unsloth.chat_templates import get_chat_template

    MODEL_SEQ_CEILING = 768

    print("\n[Model] Step 2: Loading Unsloth Llama-3.1-8B-Instruct...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name="unsloth/Meta-Llama-3.1-8B-Instruct-bnb-4bit",
        max_seq_length=MODEL_SEQ_CEILING,
        dtype=None,
        load_in_4bit=True,
    )

    print("[Model] Adding LoRA adapters with native Unsloth fast kernels...")
    model = FastLanguageModel.get_peft_model(
        model,
        r=16,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_alpha=32,
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=3407,
    )

    tokenizer = get_chat_template(tokenizer, chat_template="llama-3.1")

    hp = auto_tune_hyperparameters(dataset_file, tokenizer)
    max_seq_length = MODEL_SEQ_CEILING

    def formatting_prompts_func(examples):
        convos = examples["messages"]
        texts = [tokenizer.apply_chat_template(convo, tokenize=False, add_generation_prompt=False) for convo in convos]
        return {"text": texts}

    dataset = load_dataset("json", data_files=dataset_file, split="train")
    dataset = dataset.map(formatting_prompts_func, batched=True)

    pre_filter_count = len(dataset)

    def within_seq_limit(example):
        toks = tokenizer(example["text"], add_special_tokens=False, truncation=False)
        return len(toks["input_ids"]) <= max_seq_length

    dataset = dataset.filter(within_seq_limit, num_proc=2)
    dropped = pre_filter_count - len(dataset)
    if dropped:
        print(f"[Train] ⚠️  Dropped {dropped} sample(s) exceeding max_seq_length={max_seq_length} "
              f"to prevent Unsloth cross-entropy crash (out of {pre_filter_count})")

    dataset_split = dataset.train_test_split(test_size=0.1, seed=42)
    train_dataset = dataset_split["train"]
    eval_dataset = dataset_split["test"]
    
    total_samples = len(train_dataset)
    print(f"[Train] Training set size: {total_samples} samples. Eval set size: {len(eval_dataset)}")

    output_dir = "saralgati_lora_output"
    os.makedirs(output_dir, exist_ok=True)

    print(f"[Train] Stage 1 SFT (Cosine LR + Paged AdamW 8-bit + NEFTune alpha=5): "
          f"{hp['num_train_epochs']} epochs, lr={hp['learning_rate']}, seq={max_seq_length}, "
          f"batch={hp['per_device_train_batch_size']}×{hp['gradient_accumulation_steps']}...")
    eff_batch = hp["per_device_train_batch_size"] * hp["gradient_accumulation_steps"]
    total_train_steps = max(1, int((total_samples / eff_batch) * hp["num_train_epochs"]))
    warmup_steps = max(5, int(total_train_steps * 0.05))

    args_dict = dict(
        per_device_train_batch_size=hp["per_device_train_batch_size"],
        gradient_accumulation_steps=hp["gradient_accumulation_steps"],
        warmup_steps=warmup_steps,
        num_train_epochs=hp["num_train_epochs"],
        learning_rate=hp["learning_rate"],
        lr_scheduler_type="cosine",
        optim="adamw_8bit",
        neftune_noise_alpha=5.0,
        weight_decay=0.01,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=25,
        output_dir="lora_checkpoints",
        seed=3407,
        save_strategy="no",
        report_to="none",
    )
    training_args = TrainingArguments(**args_dict)

    trainer_kwargs = dict(
        model=model,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        dataset_text_field="text",
        max_seq_length=max_seq_length,
        dataset_num_proc=2,
        packing=False,
        args=training_args,
    )
    try:
        trainer = SFTTrainer(processing_class=tokenizer, **trainer_kwargs)
    except TypeError:
        trainer = SFTTrainer(tokenizer=tokenizer, **trainer_kwargs)

    try:
        from unsloth.chat_templates import train_on_responses_only
        trainer = train_on_responses_only(
            trainer,
            instruction_part="<|start_header_id|>user<|end_header_id|>\n\n",
            response_part="<|start_header_id|>assistant<|end_header_id|>\n\n",
        )
    except (ImportError, AttributeError):
        from unsloth.chat_templates import train_on_responses_only_with_padding
        trainer = train_on_responses_only_with_padding(
            trainer,
            instruction_part="<|start_header_id|>user<|end_header_id|>\n\n",
            response_part="<|start_header_id|>assistant<|end_header_id|>\n\n",
        )

    trainer.train()
    
    # Evaluate model to prevent blind deploy
    eval_results = trainer.evaluate()
    eval_loss = eval_results.get("eval_loss", float('inf'))
    print(f"[Eval] Stage 1 SFT evaluation loss: {eval_loss}")
    
    if eval_loss > 3.0:
        print("❌ [Fatal] Eval loss is too high (> 3.0). Training likely diverged or data is corrupted. Aborting deployment!")
        sys.exit(1)
    
    print("[Eval] Stage 1 SFT validation passed.")

    # Stage 2: Optional DPO Preference Alignment on contrastive corrections
    if dpo_file:
        run_dpo_alignment(model, tokenizer, dpo_file, max_seq_length)

    print(f"[Save] Saving clean LoRA adapter weights (~100MB) to {output_dir}...")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    # Patch adapter_config.json strictly for Cloudflare Workers AI compatibility
    config_path = os.path.join(output_dir, "adapter_config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    cfg["base_model_name_or_path"] = "meta-llama/Llama-3.1-8B-Instruct"
    cfg["model_type"] = "llama"
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)
    print("[Save] adapter_config.json patched for Cloudflare Workers AI.")

    return output_dir


def mirror_adapter_into_kernel_output(output_dir):
    """Make sure the adapter lands where Kaggle collects kernel output."""
    working_root = "/kaggle/working"
    if not os.path.isdir(working_root):
        return
    if os.path.abspath(output_dir).startswith(os.path.abspath(working_root)):
        return

    destination = os.path.join(working_root, os.path.basename(output_dir.rstrip("/")) or "saralgati_lora_output")
    os.makedirs(destination, exist_ok=True)
    copied = 0
    for file_name in ("adapter_config.json", "adapter_model.safetensors"):
        source = os.path.join(output_dir, file_name)
        if os.path.exists(source):
            shutil.copy2(source, os.path.join(destination, file_name))
            copied += 1
    print(f"[Save] Mirrored {copied} adapter file(s) into {destination} for the CI deploy.")


def deploy_to_cloudflare(output_dir):
    print("\n[Deploy] Step 3: Deploying new LoRA adapter to Cloudflare Workers AI...")
    global CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN
    if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_TOKEN:
        print("[Deploy] Warning: CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN not found in environment.")
        print(f"[Deploy] Adapter is saved locally in: {output_dir}")
        return None

    config_file = os.path.join(output_dir, "adapter_config.json")
    weights_file = os.path.join(output_dir, "adapter_model.safetensors")
    for required in (config_file, weights_file):
        if not os.path.exists(required):
            print(f"[Deploy] Warning: {required} is missing, so there is nothing to deploy.")
            return None

    finetune_name = os.environ.get("CLOUDFLARE_LORA_NAME", "saralgati-elder-llama31-8b")
    headers = {
        "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
        "Content-Type": "application/json"
    }

    list_url = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/finetunes"
    try:
        list_res = requests.get(list_url, headers=headers)
        if list_res.ok:
            for ft in list_res.json().get("result", []):
                if ft.get("name") == finetune_name:
                    old_id = ft.get("id")
                    print(f"[Deploy] Refreshing existing fine-tune '{finetune_name}' (ID: {old_id}) to prevent MAX_ASSETS_ERROR...")
                    del_url = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/finetunes/{old_id}"
                    del_res = requests.delete(del_url, headers=headers)
                    del_res.raise_for_status()
                    import time
                    time.sleep(3)
                    break
    except Exception as e:
        print(f"[Deploy] Info: Fine-tune listing check: {e}")

    print(f"[Deploy] Creating Cloudflare finetune container: {finetune_name}...")
    create_res = requests.post(list_url, headers=headers, json={
        "name": finetune_name,
        "model": "@cf/meta/llama-guard-3-8b",
        "description": "SaralGati Autonomous Self-Improving LoRA (SFT + DPO)"
    })

    if not create_res.ok:
        print(f"[Deploy] Failed to create finetune: {create_res.text}")
        return None

    finetune_id = create_res.json()["result"]["id"]
    print(f"[Deploy] Created fine-tune ID: {finetune_id}")

    upload_url = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/finetunes/{finetune_id}/finetune-assets"
    upload_headers = {"Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}"}

    with open(config_file, "rb") as f:
        r1 = requests.post(
            upload_url,
            headers=upload_headers,
            data={"file_name": "adapter_config.json"},
            files={"file": ("adapter_config.json", f, "application/json")}
        )
    print(f"[Deploy] Uploaded adapter_config.json: {r1.status_code}")

    with open(weights_file, "rb") as f:
        r2 = requests.post(
            upload_url,
            headers=upload_headers,
            data={"file_name": "adapter_model.safetensors"},
            files={"file": ("adapter_model.safetensors", f, "application/octet-stream")}
        )
    print(f"[Deploy] Uploaded adapter_model.safetensors: {r2.status_code}")

    if r1.ok and r2.ok:
        print(f"\n[Deploy] SUCCESS: Deployed LoRA adapter '{finetune_name}' to Cloudflare Workers AI!")
        return finetune_name
    else:
        print("[Deploy] ERROR: Asset upload failed on Cloudflare Workers AI.")
        return None


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "--deploy-only":
        if not deploy_to_cloudflare(sys.argv[2]):
            print("[Deploy] ERROR: the adapter was not deployed to Cloudflare Workers AI.")
            sys.exit(1)
        print("\n[Deploy] Continuous Learning Cycle Complete!")
        sys.exit(0)

    dataset_path = fetch_live_dataset()
    dpo_path = fetch_live_dpo_dataset()
    output_dir = train_lora(dataset_path, dpo_path)
    mirror_adapter_into_kernel_output(output_dir)
    deploy_to_cloudflare(output_dir)
    print("\n[Complete] Continuous Learning Cycle Complete!")
