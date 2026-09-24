import os

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

    print("✅ Cloudflare secrets detected in environment; skipping file injection to avoid storing sensitive data.")

if __name__ == "__main__":
    inject_secrets()

