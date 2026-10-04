"""
SaralGati - Automated Continuous LoRA Fine-Tuning & Deployment Pipeline
Trains Unsloth Llama-3.1-8B on Single-GPU (T4) with full Unsloth custom Triton/CUDA
optimizations, using live verified dataset from SaralGati Flywheel, and auto-deploys
to Cloudflare Workers AI.
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


# The adapter is fine-tuned on the elder's own captured screens, and those now
# come in two languages. Hinglish rows outnumber English ones simply because
# Hinglish is the historical default, and a fine-tune that sees mostly Hinglish
# drifts back to it - which is what made an English request fall back to the
# general model. So the minority language is oversampled up to this share of the
# language-tagged rows before training.
MIN_MINORITY_LANGUAGE_SHARE = 0.4
MAX_LANGUAGE_DUPLICATIONS = 4


def balance_guidance_languages(lines, min_share=MIN_MINORITY_LANGUAGE_SHARE, max_copies=MAX_LANGUAGE_DUPLICATIONS):
    """Oversample the minority guidance language so the adapter stays bilingual.

    Reads metadata.guidance_lang from every exported sample (fraud rows carry no
    language and are excluded from the ratio). Rows are duplicated, never
    rewritten, so no sample changes meaning - and the duplication is capped, so
    a handful of English rows cannot become pure memorisation. Non-JSONL input
    is passed through untouched.
    """
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

    # Duplicate round-robin until the minority reaches its share, or the cap bites.
    # extras solves (minority + extras) >= min_share * (total + extras).

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


def find_attached_dataset():
    """Path of the attached Kaggle Dataset's dataset.jsonl, or None.

    The verified pool is published as a private Kaggle Dataset and attached to
    this kernel through `dataset_sources`, which lands it under /kaggle/input/.
    It cannot travel beside this script: `kaggle kernels push` uploads only the
    code file named in kernel-metadata.json, and a Kaggle notebook source is
    capped at 1 MB, so embedding a 1.7 MB pool here is rejected by the SaveKernel
    API with 400 Bad Request.
    """
    for root in ("/kaggle/input", "/kaggle/working"):
        for path in sorted(glob.glob(os.path.join(root, "**", "dataset.jsonl"), recursive=True)):
            if os.path.getsize(path) > 0:
                return path
    return None


def normalize_training_rows(lines):
    """Reduce every exported row to the single field the trainer reads.

    The guidance and fraud exports both carry `messages`, but their `metadata`
    structs hold different keys. `load_dataset("json", ...)` infers one Arrow
    schema for the whole file, so a mixed file dies at the load step with
    "Couldn't cast array of type struct<...> into struct<...>" on datasets 4.x,
    which aborted an 8733-row run. Only `messages` is consumed below, so every
    other key is dropped and each row gets the same shape.
    """
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


def fetch_live_dataset():
    dataset_file = "train_dataset.jsonl"
    lines = []

    # 1. First priority: the dataset attached to this Kaggle run as an input.
    attached = find_attached_dataset()
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
                    {"role": "system", "content": "You are SaralGati, a patient, warm companion for Indian elders.\nThe user is looking at an Android app: com.whatsapp.\nHere are the numbered interactive elements on their screen:\n[0] [BUTTON] Audio Call\n[1] [BUTTON] Video Call\n[2] [BUTTON] Search\n[3] [TEXT] Recent chats\n\nInstructions:\n1. Answer the user's question in 1 or 2 simple, comforting sentences, in the language the instruction asks for (Hinglish by default, English when it asks for English).\n2. Elements on screen are prefixed with their role ([BUTTON], [INPUT], [TOGGLE], [TEXT]).\n3. When guiding the user to tap, open, or take action, ALWAYS target an interactive element ([BUTTON], [INPUT], or [TOGGLE]).\n4. If your answer directs the user to tap or look at a specific element on screen, append \" TARGET:[index]\" at the very end."},
                    {"role": "user", "content": "video call kaise lagau"},
                    {"role": "assistant", "content": "वीडियो कॉल करने के लिए यहाँ वीडियो कॉल पर दबाएं। TARGET:1"}
                ]
            },
            {
                "messages": [
                    {"role": "system", "content": "You are SaralGati, a patient, warm companion for Indian elders.\nThe user is looking at an Android app: com.google.android.dialer.\nHere are the numbered interactive elements on their screen:\n[0] [INPUT] Search contacts\n[1] [BUTTON] Keypad Dial\n[2] [BUTTON] Favorites\n\nInstructions:\n1. Answer the user's question in 1 or 2 simple, comforting sentences, in the language the instruction asks for (Hinglish by default, English when it asks for English).\n2. Elements on screen are prefixed with their role ([BUTTON], [INPUT], [TOGGLE], [TEXT]).\n3. When guiding the user to tap, open, or take action, ALWAYS target an interactive element ([BUTTON], [INPUT], or [TOGGLE]).\n4. If your answer directs the user to tap or look at a specific element on screen, append \" TARGET:[index]\" at the very end."},
                    {"role": "user", "content": "naya number milana hai"},
                    {"role": "assistant", "content": "नंबर डायल करने के लिए यहाँ कीपैड दबाएं। TARGET:1"}
                ]
            },
            {
                "messages": [
                    {"role": "system", "content": "You are SaralGati, a patient, warm companion for Indian elders.\nThe user is looking at an Android app: com.google.android.youtube.\nHere are the numbered interactive elements on their screen:\n[0] [BUTTON] Search\n[1] [BUTTON] Voice Search\n[2] [BUTTON] Play Video भजन\n[3] [TEXT] Top Songs\n\nInstructions:\n1. Answer the user's question in 1 or 2 simple, comforting sentences, in the language the instruction asks for (Hinglish by default, English when it asks for English).\n2. Elements on screen are prefixed with their role ([BUTTON], [INPUT], [TOGGLE], [TEXT]).\n3. When guiding the user to tap, open, or take action, ALWAYS target an interactive element ([BUTTON], [INPUT], or [TOGGLE]).\n4. If your answer directs the user to tap or look at a specific element on screen, append \" TARGET:[index]\" at the very end."},
                    {"role": "user", "content": "aarti bhajan sunna hai"},
                    {"role": "assistant", "content": "भजन सुनने के लिए यहाँ दबाएं। TARGET:2"}
                ]
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
    # Step 1: Pre-install compatible xformers from PyTorch cu121 wheel repository
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-U", "xformers",
            "--index-url", "https://download.pytorch.org/whl/cu121", "--quiet"
        ])
    except Exception as e:
        print(f"[Install] Notice: pre-installing xformers cu121 wheel skipped ({e}); proceeding...")

    # Step 2: Install Unsloth using official [kaggle-new] extra
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install",
            "unsloth[kaggle-new] @ git+https://github.com/unslothai/unsloth.git"
        ])
    except Exception as e:
        print(f"[Install] Notice: git install failed ({e}); falling back to PyPI release...")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "unsloth", "unsloth_zoo"
        ])


def auto_tune_hyperparameters(dataset_file, tokenizer):
    """Dynamically compute training hyperparameters from the live dataset.

    Industry-standard approach: profile the actual data instead of hardcoding
    values that may not match the current dataset distribution. Four parameters
    are auto-tuned:

    1. max_seq_length   — P99 token length, rounded up to nearest 64, clamped
                          [256, 768]. Prevents OOM on long tails while not
                          wasting VRAM on unused positions.
    2. num_train_epochs — Target ~450 gradient steps (the sweet spot for LoRA
                          on 1–10k samples). Capped [1, 4] and hard-capped at
                          1 if ≤20 seed-only samples to prevent overfitting.
    3. learning_rate    — Inverse-scaled by dataset size. Smaller datasets need
                          higher LR to learn in fewer steps; larger datasets
                          need lower LR to avoid catastrophic forgetting.
    4. gradient_accumulation_steps — Keeps effective batch size constant at 16
                          regardless of per_device_train_batch_size, which is
                          pinned at 4 (the T4's sweet-spot for 4-bit LoRA).
    """
    from datasets import load_dataset

    PER_DEVICE_BATCH = 4
    TARGET_EFFECTIVE_BATCH = 16
    TARGET_GRAD_STEPS = 450        # Sweet spot for LoRA convergence
    MIN_SEQ_LEN = 256
    MAX_SEQ_LEN = 768              # T4 VRAM ceiling for 4-bit Llama-3.1-8B
    ROUND_TO = 64

    # --- Load dataset and profile token lengths ---
    dataset = load_dataset("json", data_files=dataset_file, split="train")
    total_samples = len(dataset)
    print(f"[AutoTune] Dataset size: {total_samples} samples")

    # Tokenize a representative sample (up to 2000 rows) to profile lengths
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

    # 1. max_seq_length: P99 rounded up to nearest 64, clamped
    seq_len = math.ceil(p99 / ROUND_TO) * ROUND_TO
    seq_len = max(MIN_SEQ_LEN, min(seq_len, MAX_SEQ_LEN))

    # 2. gradient_accumulation_steps: constant effective batch = 16
    grad_accum = max(1, TARGET_EFFECTIVE_BATCH // PER_DEVICE_BATCH)

    # 3. num_train_epochs: target ~450 gradient steps
    #    steps_per_epoch = ceil(total_samples / effective_batch)
    effective_batch = PER_DEVICE_BATCH * grad_accum
    steps_per_epoch = math.ceil(total_samples / effective_batch)
    if steps_per_epoch > 0:
        raw_epochs = TARGET_GRAD_STEPS / steps_per_epoch
    else:
        raw_epochs = 1

    # Clamp epochs
    num_epochs = max(1, min(4, round(raw_epochs)))
    # Overfitting guard: seed data only → cap at 1 epoch
    if total_samples < 20:
        num_epochs = 1

    # 4. learning_rate: inversely scaled by dataset size
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


def train_lora(dataset_file):
    ensure_unsloth()

    # Strictly ordered imports: unsloth FastLanguageModel BEFORE trl/transformers/peft
    from unsloth import FastLanguageModel
    import torch
    from datasets import load_dataset
    from trl import SFTTrainer
    from transformers import TrainingArguments
    from unsloth.chat_templates import get_chat_template

    # Load model with maximum supported seq length; auto_tune will compute the
    # actual training max_seq_length from data. The model itself supports up to
    # 131072, but we cap at 768 for T4 VRAM safety.
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

    # --- Auto-Tune: profile dataset and compute epochs, LR, grad_accum ---
    hp = auto_tune_hyperparameters(dataset_file, tokenizer)
    # IMPORTANT: Do NOT use auto-tune's max_seq_length for the trainer.
    # Unsloth's train_on_responses_only bypasses SFTTrainer's truncation,
    # letting oversized sequences crash the cross-entropy loss. We always
    # use MODEL_SEQ_CEILING so model and trainer agree, and explicitly
    # filter outliers below.
    max_seq_length = MODEL_SEQ_CEILING

    def formatting_prompts_func(examples):
        convos = examples["messages"]
        texts = [tokenizer.apply_chat_template(convo, tokenize=False, add_generation_prompt=False) for convo in convos]
        return {"text": texts}

    dataset = load_dataset("json", data_files=dataset_file, split="train")
    dataset = dataset.map(formatting_prompts_func, batched=True)

    # --- Explicit sequence length filter ---
    # SFTTrainer's max_seq_length truncation is unreliable when Unsloth's
    # train_on_responses_only is applied (v14 and v15 both crashed because
    # oversized sequences bypassed truncation and hit cross_entropy with
    # mismatched input/target dimensions). Drop any sample that exceeds
    # the model's actual capacity BEFORE the trainer ever sees it.
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

    print(f"[Train] Starting Fast Fine-Tuning: {hp['num_train_epochs']} epochs, "
          f"lr={hp['learning_rate']}, seq={max_seq_length}, "
          f"batch={hp['per_device_train_batch_size']}×{hp['gradient_accumulation_steps']}...")
    # Calculate warmup_steps dynamically (~5% of total training steps)
    eff_batch = hp["per_device_train_batch_size"] * hp["gradient_accumulation_steps"]
    total_train_steps = max(1, int((total_samples / eff_batch) * hp["num_train_epochs"]))
    warmup_steps = max(5, int(total_train_steps * 0.05))

    # Eval runs once, after trainer.train(), through the eval-loss gate below.
    args_dict = dict(
        per_device_train_batch_size=hp["per_device_train_batch_size"],
        gradient_accumulation_steps=hp["gradient_accumulation_steps"],
        warmup_steps=warmup_steps,
        num_train_epochs=hp["num_train_epochs"],
        learning_rate=hp["learning_rate"],
        weight_decay=0.01,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=25,
        output_dir="lora_checkpoints",
        seed=3407,
        save_strategy="no",
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
    print(f"[Eval] Final evaluation loss: {eval_loss}")
    
    if eval_loss > 3.0:
        print("❌ [Fatal] Eval loss is too high (> 3.0). Training likely diverged or data is corrupted. Aborting deployment!")
        sys.exit(1)
    
    print("[Eval] Validation passed. Proceeding to save and deploy.")

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
    """Make sure the adapter lands where Kaggle collects kernel output.

    Kaggle only publishes what ends up under /kaggle/working, and this runner's
    working directory is not guaranteed to be there, so the adapter is copied in
    before returning. GitHub Actions downloads that output and deploys it, so a
    missing copy would abort the deploy with nothing to upload.
    """
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

    # 1. Check if fine-tune already exists; delete old to avoid MAX_ASSETS_ERROR
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
                    time.sleep(3) # Allow propagation time
                    break
    except Exception as e:
        print(f"[Deploy] Info: Fine-tune listing check: {e}")

    # 2. Create fresh fine-tune container (use llama-guard-3-8b for container registration per Workers AI API quirk)
    print(f"[Deploy] Creating Cloudflare finetune container: {finetune_name}...")
    create_res = requests.post(list_url, headers=headers, json={
        "name": finetune_name,
        "model": "@cf/meta/llama-guard-3-8b",
        "description": "SaralGati Autonomous Self-Improving LoRA"
    })

    if not create_res.ok:
        print(f"[Deploy] Failed to create finetune: {create_res.text}")
        return None

    finetune_id = create_res.json()["result"]["id"]
    print(f"[Deploy] Created fine-tune ID: {finetune_id}")

    # 3. Upload exactly 2 assets (adapter_config.json and adapter_model.safetensors)
    upload_url = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/finetunes/{finetune_id}/finetune-assets"
    upload_headers = {"Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}"}

    # Upload config
    with open(config_file, "rb") as f:
        r1 = requests.post(
            upload_url,
            headers=upload_headers,
            data={"file_name": "adapter_config.json"},
            files={"file": ("adapter_config.json", f, "application/json")}
        )
    print(f"[Deploy] Uploaded adapter_config.json: {r1.status_code}")

    # Upload safetensors
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
    # CI mode: deploy an adapter that was trained somewhere else. GitHub Actions
    # already holds the Cloudflare credentials as repository secrets, so it can
    # push the adapter the Kaggle kernel produced. The kernel itself runs as a
    # `kaggle kernels push` batch job, where Kaggle's UserSecrets service is
    # unreliable ("Connection error trying to communicate with service."), so
    # the deploy must not be the only place those credentials exist.
    if len(sys.argv) >= 3 and sys.argv[1] == "--deploy-only":
        if not deploy_to_cloudflare(sys.argv[2]):
            print("[Deploy] ERROR: the adapter was not deployed to Cloudflare Workers AI.")
            sys.exit(1)
        print("\n[Deploy] Continuous Learning Cycle Complete!")
        sys.exit(0)

    dataset_path = fetch_live_dataset()
    output_dir = train_lora(dataset_path)
    mirror_adapter_into_kernel_output(output_dir)
    deploy_to_cloudflare(output_dir)
    print("\n[Complete] Continuous Learning Cycle Complete!")
