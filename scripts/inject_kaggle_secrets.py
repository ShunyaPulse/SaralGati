import os
import json

def inject_secrets():
    payload_file = "kaggle_push/train_unsloth_lora.py"
    if not os.path.exists(payload_file):
        print(f"⚠️ Payload file {payload_file} not found; skipping injection.")
        return

    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
    api_token = os.environ.get("CLOUDFLARE_API_TOKEN", "")

    if not account_id or not api_token:
        print("ℹ️ Cloudflare secrets not provided in environment; Kaggle will fallback to UserSecretsClient.")
        return

    with open(payload_file, "r", encoding="utf-8") as f:
        code = f.read()

    target_acc = 'CLOUDFLARE_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID")'
    target_tok = 'CLOUDFLARE_API_TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN")'

    code = code.replace(target_acc, f'CLOUDFLARE_ACCOUNT_ID = {json.dumps(account_id)}')
    code = code.replace(target_tok, f'CLOUDFLARE_API_TOKEN = {json.dumps(api_token)}')

    with open(payload_file, "w", encoding="utf-8") as f:
        f.write(code)

    print("✅ Credentials securely injected into ephemeral Kaggle payload.")

if __name__ == "__main__":
    inject_secrets()

