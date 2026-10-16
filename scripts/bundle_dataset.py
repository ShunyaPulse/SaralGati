"""
SaralGati - Kaggle Dataset Packager
Packages the downloaded dataset.jsonl (and optional dpo_dataset.jsonl) as a
private Kaggle Dataset so the GPU runner can read them from /kaggle/input/.
"""

import json
import os
import sys

DATASET_TITLE = "SaralGati Verified Training Set"
DATASET_SLUG = "saralgati-verified-training-set"


def package(dataset_file, dest_dir, owner, dpo_file="dpo_dataset.jsonl"):
    if not os.path.exists(dataset_file) or os.path.getsize(dataset_file) == 0:
        print(f"⚠️ Dataset file '{dataset_file}' not found or empty; nothing to package.")
        raise SystemExit(1)

    os.makedirs(dest_dir, exist_ok=True)

    with open(dataset_file, "rb") as f:
        raw_bytes = f.read()
    line_count = len([line for line in raw_bytes.split(b"\n") if line.strip()])

    dest_data = os.path.join(dest_dir, "dataset.jsonl")
    with open(dest_data, "wb") as f:
        f.write(raw_bytes)

    if dpo_file and os.path.exists(dpo_file) and os.path.getsize(dpo_file) > 0:
        with open(dpo_file, "rb") as df:
            dpo_bytes = df.read()
        dpo_count = len([line for line in dpo_bytes.split(b"\n") if line.strip()])
        dest_dpo = os.path.join(dest_dir, "dpo_dataset.jsonl")
        with open(dest_dpo, "wb") as df:
            df.write(dpo_bytes)
        print(f"✅ Packaged {dpo_count} contrastive DPO pairs ({len(dpo_bytes)} bytes) into {dest_dpo}")

    # Kaggle needs a deterministic id: the workflow publishes with it and the
    # kernel attaches the very same string through dataset_sources.
    dataset_id = f"{owner}/{DATASET_SLUG}"
    metadata = {
        "title": DATASET_TITLE,
        "id": dataset_id,
        "licenses": [{"name": "other"}],
    }
    with open(os.path.join(dest_dir, "dataset-metadata.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
        f.write("\n")

    print(f"✅ Packaged {line_count} verified training rows ({len(raw_bytes)} bytes) into {dest_data}")
    print(f"   • dataset id: {dataset_id} (private)")
    print(f"   • the runner reads it from /kaggle/input/{DATASET_SLUG}/dataset.jsonl")


if __name__ == "__main__":
    dataset_file = sys.argv[1] if len(sys.argv) > 1 else "dataset.jsonl"
    dest_dir = sys.argv[2] if len(sys.argv) > 2 else "kaggle_dataset"
    owner = sys.argv[3] if len(sys.argv) > 3 else os.environ.get("KAGGLE_USERNAME", "")
    dpo_file = sys.argv[4] if len(sys.argv) > 4 else "dpo_dataset.jsonl"
    if not owner:
        print("⚠️ Dataset owner missing; pass the Kaggle username as the third argument.")
        raise SystemExit(1)
    package(dataset_file, dest_dir, owner.lower(), dpo_file)
