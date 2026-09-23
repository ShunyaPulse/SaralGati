"""
SaralGati - Automated Continuous LoRA Fine-Tuning & Deployment Pipeline
Trains Unsloth Llama-3.1-8B on Single-GPU (T4) with full Unsloth custom Triton/CUDA
optimizations, using live verified dataset from SaralGati Flywheel, and auto-deploys
to Cloudflare Workers AI.
"""

import os
import sys
import json
import subprocess
import requests

# Enforce Single GPU for Maximum Unsloth Speed
os.environ["CUDA_VISIBLE_DEVICES"] = "0"

SARALGATI_API_URL = os.environ.get("SARALGATI_API_URL", "https://saralgati-685823552970.asia-south1.run.app")
CLOUDFLARE_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
CLOUDFLARE_API_TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN")

# Fallback to Kaggle UserSecrets if running inside Kaggle
if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_TOKEN:
    try:
        from kaggle_secrets import UserSecretsClient
        secrets = UserSecretsClient()
        CLOUDFLARE_ACCOUNT_ID = CLOUDFLARE_ACCOUNT_ID or secrets.get_secret("CLOUDFLARE_ACCOUNT_ID")
        CLOUDFLARE_API_TOKEN = CLOUDFLARE_API_TOKEN or secrets.get_secret("CLOUDFLARE_API_TOKEN")
    except Exception:
        # Fallback gracefully if running outside Kaggle environment
        pass


def fetch_live_dataset():
    dataset_file = "train_dataset.jsonl"
    url = f"{SARALGATI_API_URL}/api/v1/agent/training-data?status=flywheel&format=jsonl&limit=2000"
    print(f"[Dataset] Step 1: Fetching verified training data from {url}...")
    try:
        res = requests.get(url, timeout=30)
        res.raise_for_status()
        content = res.text.strip()
        lines = [l for l in content.split("\n") if l.strip()]
        print(f"[Dataset] Downloaded {len(lines)} verified training interactions from live Flywheel.")
    except Exception as e:
        print(f"[Dataset] Warning: Failed to fetch live data ({e}). Falling back to local/seed data.")
        lines = []

    # Supplement with high-quality seed pairs if dataset is small
    if len(lines) < 20:
        print("[Dataset] Supplementing with high-quality seed elder interaction examples...")
        seed_samples = [
            {
                "messages": [
                    {"role": "system", "content": "You are SaralGati, a patient, warm companion for Indian elders.\nThe user is looking at an Android app: com.whatsapp.\nHere are the numbered interactive elements on their screen:\n[0] [BUTTON] Audio Call\n[1] [BUTTON] Video Call\n[2] [BUTTON] Search\n[3] [TEXT] Recent chats\n\nInstructions:\n1. Answer the user's question in 1 or 2 simple, comforting Hindi sentences.\n2. Elements on screen are prefixed with their role ([BUTTON], [INPUT], [TOGGLE], [TEXT]).\n3. When guiding the user to tap, open, or take action, ALWAYS target an interactive element ([BUTTON], [INPUT], or [TOGGLE]).\n4. If your answer directs the user to tap or look at a specific element on screen, append \" TARGET:[index]\" at the very end."},
                    {"role": "user", "content": "video call kaise lagau"},
                    {"role": "assistant", "content": "वीडियो कॉल करने के लिए यहाँ वीडियो कॉल पर दबाएं। TARGET:1"}
                ]
            },
            {
                "messages": [
                    {"role": "system", "content": "You are SaralGati, a patient, warm companion for Indian elders.\nThe user is looking at an Android app: com.google.android.dialer.\nHere are the numbered interactive elements on their screen:\n[0] [INPUT] Search contacts\n[1] [BUTTON] Keypad Dial\n[2] [BUTTON] Favorites\n\nInstructions:\n1. Answer the user's question in 1 or 2 simple, comforting Hindi sentences.\n2. Elements on screen are prefixed with their role ([BUTTON], [INPUT], [TOGGLE], [TEXT]).\n3. When guiding the user to tap, open, or take action, ALWAYS target an interactive element ([BUTTON], [INPUT], or [TOGGLE]).\n4. If your answer directs the user to tap or look at a specific element on screen, append \" TARGET:[index]\" at the very end."},
                    {"role": "user", "content": "naya number milana hai"},
                    {"role": "assistant", "content": "नंबर डायल करने के लिए यहाँ कीपैड दबाएं। TARGET:1"}
                ]
            },
            {
                "messages": [
                    {"role": "system", "content": "You are SaralGati, a patient, warm companion for Indian elders.\nThe user is looking at an Android app: com.google.android.youtube.\nHere are the numbered interactive elements on their screen:\n[0] [BUTTON] Search\n[1] [BUTTON] Voice Search\n[2] [BUTTON] Play Video भजन\n[3] [TEXT] Top Songs\n\nInstructions:\n1. Answer the user's question in 1 or 2 simple, comforting Hindi sentences.\n2. Elements on screen are prefixed with their role ([BUTTON], [INPUT], [TOGGLE], [TEXT]).\n3. When guiding the user to tap, open, or take action, ALWAYS target an interactive element ([BUTTON], [INPUT], or [TOGGLE]).\n4. If your answer directs the user to tap or look at a specific element on screen, append \" TARGET:[index]\" at the very end."},
                    {"role": "user", "content": "aarti bhajan sunna hai"},
                    {"role": "assistant", "content": "भजन सुनने के लिए यहाँ दबाएं। TARGET:2"}
                ]
            }
        ]
        for s in seed_samples:
            lines.append(json.dumps(s))

    with open(dataset_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[Dataset] Total training dataset size: {len(lines)} items saved to {dataset_file}")
    return dataset_file


def ensure_unsloth():
    try:
        import unsloth
    except ImportError:
        print("[Install] Installing unsloth and compatible dependencies for GPU...")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "--no-deps",
            "xformers<0.0.29", "trl<0.9.0", "peft", "accelerate", "bitsandbytes"
        ])
        subprocess.check_call([
            sys.executable, "-m", "pip", "install",
            "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
        ])


def train_lora(dataset_file):
    ensure_unsloth()

    # Strictly ordered imports: unsloth FastLanguageModel BEFORE trl/transformers/peft
    from unsloth import FastLanguageModel
    import torch
    from datasets import load_dataset
    from trl import SFTTrainer
    from transformers import TrainingArguments
    from unsloth.chat_templates import get_chat_template

    max_seq_length = 1024

    print("\n[Model] Step 2: Loading Unsloth Llama-3.1-8B-Instruct...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name="unsloth/Meta-Llama-3.1-8B-Instruct-bnb-4bit",
        max_seq_length=max_seq_length,
        dtype=None,
        load_in_4bit=True,
    )

    print("[Model] Adding LoRA adapters with native Unsloth fast kernels...")
    model = FastLanguageModel.get_peft_model(
        model,
        r=16,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_alpha=16,
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=3407,
    )

    tokenizer = get_chat_template(tokenizer, chat_template="llama-3.1")

    def formatting_prompts_func(examples):
        convos = examples["messages"]
        texts = [tokenizer.apply_chat_template(convo, tokenize=False, add_generation_prompt=False) for convo in convos]
        return {"text": texts}

    dataset = load_dataset("json", data_files=dataset_file, split="train")
    dataset = dataset.map(formatting_prompts_func, batched=True)

    output_dir = "saralgati_lora_output"
    os.makedirs(output_dir, exist_ok=True)

    print("[Train] Starting Fast Fine-Tuning...")
    training_args = TrainingArguments(
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        warmup_steps=5,
        max_steps=50,
        learning_rate=2e-4,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=10,
        output_dir="lora_checkpoints",
        seed=3407,
    )

    trainer_kwargs = dict(
        model=model,
        train_dataset=dataset,
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

    trainer.train()

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


def deploy_to_cloudflare(output_dir):
    print("\n[Deploy] Step 3: Deploying new LoRA adapter to Cloudflare Workers AI...")
    global CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN
    if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_TOKEN:
        print("[Deploy] Warning: CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN not found in environment.")
        print(f"[Deploy] Adapter is saved locally in: {output_dir}")
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
                    requests.delete(del_url, headers=headers)
                    break
    except Exception as e:
        print(f"[Deploy] Info: Fine-tune listing check: {e}")

    # 2. Create fresh fine-tune container (using @cf/meta/llama-guard-3-8b per Cloudflare quirk workaround)
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
    config_file = os.path.join(output_dir, "adapter_config.json")
    with open(config_file, "rb") as f:
        r1 = requests.post(
            upload_url,
            headers=upload_headers,
            data={"file_name": "adapter_config.json"},
            files={"file": ("adapter_config.json", f, "application/json")}
        )
    print(f"[Deploy] Uploaded adapter_config.json: {r1.status_code}")

    # Upload safetensors
    weights_file = os.path.join(output_dir, "adapter_model.safetensors")
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
    dataset_path = fetch_live_dataset()
    output_dir = train_lora(dataset_path)
    deploy_to_cloudflare(output_dir)
    print("\n[Complete] Continuous Learning Cycle Complete!")
