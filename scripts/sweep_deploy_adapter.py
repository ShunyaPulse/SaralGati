"""
SaralGati - Hourly LoRA adapter deploy sweeper.

The training kernel is pushed by the weekly workflow and then runs on Kaggle's
own infrastructure for hours. GitHub Actions jobs are capped at 6 hours, so
instead of waiting inside the trigger workflow, this sweeper runs hourly and:

  1. reads the kernel status (seconds, cheap),
  2. skips everything unless the kernel is COMPLETE,
  3. refuses to re-deploy an adapter this run already produced - it compares
     the live Cloudflare fine-tune's creation time against the kernel's last
     run time, so a finished run deploys exactly once (deploying deletes and
     recreates the fine-tune, so doing it every hour would repeatedly break
     the LoRA endpoint),
  4. downloads the kernel output and deploys the adapter from CI, where the
     Cloudflare credentials are repository secrets - Kaggle's UserSecrets
     service is unreliable inside pushed batch kernels, so a Kaggle-side
     deploy can never be trusted on its own.
"""

import csv
import io
import os
import subprocess
import sys
from datetime import datetime, timezone

import requests

from train_unsloth_lora import deploy_to_cloudflare

KERNEL_SLUG = "saralgati-lora-training"


def fail(message):
    print(f"::error::{message}")
    sys.exit(1)


def require_env(name):
    value = os.environ.get(name)
    if not value:
        fail(f"{name} is not configured; the sweeper cannot run.")
    return value


def run_kaggle(*args):
    result = subprocess.run(
        ["kaggle", *args], capture_output=True, text=True, timeout=300
    )
    return result.stdout + result.stderr


def kernel_status(kernel_id):
    output = run_kaggle("kernels", "status", kernel_id)
    print(f"Kernel {kernel_id} status: {output.strip()}")
    upper = output.upper()
    if "ERROR" in upper or "CANCEL" in upper:
        fail(f"Kaggle kernel ended as: {output.strip()}")
    # The kaggle CLI prints the status in lowercase ("complete"), so compare
    # case-insensitively - the trigger workflow's grep -qi does the same.
    return "COMPLETE" in upper


def kernel_last_run_time(kernel_id):
    """Best-effort UTC timestamp of the kernel's most recent run."""
    try:
        listing = run_kaggle("kernels", "list", "--mine", "-s", KERNEL_SLUG)
        for row in csv.DictReader(io.StringIO(listing)):
            if row.get("ref") == kernel_id and row.get("lastRunTime"):
                value = row["lastRunTime"].strip()
                for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
                    try:
                        return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc)
                    except ValueError:
                        continue
                print(f"[Sweeper] Could not parse kernel lastRunTime '{value}'.")
    except Exception as exc:  # noqa: BLE001 - any failure must not crash the sweep
        print(f"[Sweeper] Could not read kernel list: {exc}")
    return None


def deployed_finetune_created_at(headers, account_id, finetune_name):
    """Creation time of the currently live fine-tune, or None if it is absent."""
    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/finetunes"
    try:
        response = requests.get(url, headers=headers, timeout=60)
        if not response.ok:
            print(f"[Sweeper] Fine-tune listing returned {response.status_code}; treating as undeployed.")
            return None
        for finetune in response.json().get("result", []):
            if finetune.get("name") == finetune_name:
                raw = finetune.get("created_at")
                if not raw:
                    return None
                return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except Exception as exc:  # noqa: BLE001
        print(f"[Sweeper] Could not read Cloudflare fine-tunes: {exc}")
    return None


def main():
    username = require_env("KAGGLE_USERNAME")
    account_id = require_env("CLOUDFLARE_ACCOUNT_ID")
    token = require_env("CLOUDFLARE_API_TOKEN")
    kernel_id = f"{username.lower()}/{KERNEL_SLUG}"

    if not kernel_status(kernel_id):
        print("[Sweeper] Kernel is still running or queued; nothing to do yet.")
        return

    trained_at = kernel_last_run_time(kernel_id)
    finetune_name = os.environ.get("CLOUDFLARE_LORA_NAME", "saralgati-elder-llama31-8b")
    deployed_at = deployed_finetune_created_at(
        {"Authorization": f"Bearer {token}"}, account_id, finetune_name
    )

    if trained_at and deployed_at and deployed_at >= trained_at:
        print(
            "[Sweeper] The live fine-tune was created after this training run "
            f"finished ({deployed_at.isoformat()} >= {trained_at.isoformat()}); "
            "already deployed, nothing to do."
        )
        return
    if trained_at and deployed_at:
        print(
            "[Sweeper] The live fine-tune predates this training run "
            f"({deployed_at.isoformat()} < {trained_at.isoformat()}); deploying."
        )
    if not trained_at:
        print("[Sweeper] Kernel run time unknown; deploying to be safe.")

    print(f"⬇️ Downloading the trained adapter from {kernel_id}...")
    if run_kaggle("kernels", "output", kernel_id, "-p", "kaggle_output").strip():
        pass  # output already echoed by the CLI

    adapter_dir = ""
    for root, _dirs, files in os.walk("kaggle_output"):
        if "adapter_model.safetensors" in files:
            adapter_dir = root
            break
    if not adapter_dir:
        fail("Kernel reported COMPLETE but produced no adapter_model.safetensors.")
    print(f"Found adapter files in: {adapter_dir}")

    if not deploy_to_cloudflare(adapter_dir):
        fail("The adapter was not deployed to Cloudflare Workers AI; the next hourly sweep will retry.")
    print("\n[Sweeper] Adapter deployed from CI. Continuous Learning Cycle Complete!")


if __name__ == "__main__":
    main()
