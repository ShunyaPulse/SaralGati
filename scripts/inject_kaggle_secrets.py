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

    import base64
    acc_b64 = base64.b64encode(account_id.encode("utf-8")).decode("utf-8")
    tok_b64 = base64.b64encode(api_token.encode("utf-8")).decode("utf-8")

    target_acc = 'CLOUDFLARE_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID")'
    target_tok = 'CLOUDFLARE_API_TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN")'

    acc_inject = f'import base64; CLOUDFLARE_ACCOUNT_ID = base64.b64decode("{acc_b64}").decode("utf-8")'
    tok_inject = f'import base64; CLOUDFLARE_API_TOKEN = base64.b64decode("{tok_b64}").decode("utf-8")'

    code = code.replace(target_acc, acc_inject)
    code = code.replace(target_tok, tok_inject)

    with open(payload_file, "w", encoding="utf-8") as f:
        f.write(code)

    print("✅ Credentials securely injected into ephemeral Kaggle payload.")

if __name__ == "__main__":
    inject_secrets()

