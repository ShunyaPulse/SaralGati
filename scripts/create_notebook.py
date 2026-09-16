import json
import os

notebook = {
  "cells": [
    {
      "cell_type": "markdown",
      "metadata": {"id": "saralgati-title"},
      "source": [
        "# SaralGati - Custom LoRA Fine-Tuning with Unsloth\n",
        "\n",
        "This notebook fine-tunes **Meta's Llama-3.2-3B-Instruct** using Unsloth (for 2x faster training on the free T4 GPU) to create a custom LoRA adapter for guiding Indian elders on mobile apps."
      ]
    },
    {
      "cell_type": "code",
      "execution_count": None,
      "metadata": {"id": "install-deps"},
      "outputs": [],
      "source": [
        "%%capture\n",
        "# Install Unsloth and Xformers\n",
        "!pip install unsloth\n",
        "!pip install --no-deps \"xformers<0.0.27\" trl peft accelerate bitsandbytes\n",
        "!pip install datasets"
      ]
    },
    {
      "cell_type": "code",
      "execution_count": None,
      "metadata": {"id": "load-model"},
      "outputs": [],
      "source": [
        "from unsloth import FastLanguageModel\n",
        "import torch\n",
        "\n",
        "max_seq_length = 2048 # Can increase later if needed\n",
        "dtype = None # Auto detects for Float16/Bfloat16\n",
        "load_in_4bit = True # Use 4bit quantization to fit on T4 GPU\n",
        "\n",
        "# Load Llama-3.2-3B-Instruct base model\n",
        "model, tokenizer = FastLanguageModel.from_pretrained(\n",
        "    model_name = \"unsloth/Llama-3.2-3B-Instruct\",\n",
        "    max_seq_length = max_seq_length,\n",
        "    dtype = dtype,\n",
        "    load_in_4bit = load_in_4bit,\n",
        ")"
      ]
    },
    {
      "cell_type": "code",
      "execution_count": None,
      "metadata": {"id": "apply-lora"},
      "outputs": [],
      "source": [
        "# Add LoRA adapters\n",
        "model = FastLanguageModel.get_peft_model(\n",
        "    model,\n",
        "    r = 16, # Rank\n",
        "    target_modules = [\"q_proj\", \"k_proj\", \"v_proj\", \"o_proj\",\n",
        "                      \"gate_proj\", \"up_proj\", \"down_proj\",],\n",
        "    lora_alpha = 16,\n",
        "    lora_dropout = 0, # Dropout = 0 is optimized\n",
        "    bias = \"none\",    # Bias = \"none\" is optimized\n",
        "    use_gradient_checkpointing = \"unsloth\",\n",
        "    random_state = 3407,\n",
        "    use_rslora = False,\n",
        "    loftq_config = None,\n",
        ")"
      ]
    },
    {
      "cell_type": "code",
      "execution_count": None,
      "metadata": {"id": "load-dataset"},
      "outputs": [],
      "source": [
        "from datasets import load_dataset\n",
        "import os\n",
        "from google.colab import files\n",
        "\n",
        "# PLEASE UPLOAD saralgati_train.jsonl to colab!\n",
        "print(\"Please upload the saralgati_train.jsonl dataset file:\")\n",
        "uploaded = files.upload()\n",
        "\n",
        "alpaca_prompt = \"\"\"Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.\n",
        "\n",
        "### Instruction:\n",
        "{}\n",
        "\n",
        "### Input:\n",
        "{}\n",
        "\n",
        "### Response:\n",
        "{}\"\"\"\n",
        "\n",
        "EOS_TOKEN = tokenizer.eos_token\n",
        "def formatting_prompts_func(examples):\n",
        "    instructions = examples[\"instruction\"]\n",
        "    inputs       = examples[\"input\"]\n",
        "    outputs      = examples[\"output\"]\n",
        "    texts = []\n",
        "    for instruction, input, output in zip(instructions, inputs, outputs):\n",
        "        text = alpaca_prompt.format(instruction, input, output) + EOS_TOKEN\n",
        "        texts.append(text)\n",
        "    return { \"text\" : texts, }\n",
        "\n",
        "dataset = load_dataset(\"json\", data_files=\"saralgati_train.jsonl\", split=\"train\")\n",
        "dataset = dataset.map(formatting_prompts_func, batched = True,)"
      ]
    },
    {
      "cell_type": "code",
      "execution_count": None,
      "metadata": {"id": "train-model"},
      "outputs": [],
      "source": [
        "from trl import SFTTrainer\n",
        "from transformers import TrainingArguments\n",
        "from unsloth import is_bfloat16_supported\n",
        "\n",
        "trainer = SFTTrainer(\n",
        "    model = model,\n",
        "    tokenizer = tokenizer,\n",
        "    train_dataset = dataset,\n",
        "    dataset_text_field = \"text\",\n",
        "    max_seq_length = max_seq_length,\n",
        "    dataset_num_proc = 2,\n",
        "    packing = False,\n",
        "    args = TrainingArguments(\n",
        "        per_device_train_batch_size = 2,\n",
        "        gradient_accumulation_steps = 4,\n",
        "        warmup_steps = 5,\n",
        "        max_steps = 60, # Change to 100 for better results, 60 is for quick test\n",
        "        learning_rate = 2e-4,\n",
        "        fp16 = not is_bfloat16_supported(),\n",
        "        bf16 = is_bfloat16_supported(),\n",
        "        logging_steps = 1,\n",
        "        optim = \"adamw_8bit\",\n",
        "        weight_decay = 0.01,\n",
        "        lr_scheduler_type = \"linear\",\n",
        "        seed = 3407,\n",
        "        output_dir = \"outputs\",\n",
        "    ),\n",
        ")\n",
        "\n",
        "trainer_stats = trainer.train()"
      ]
    },
    {
      "cell_type": "code",
      "execution_count": None,
      "metadata": {"id": "export-model"},
      "outputs": [],
      "source": [
        "# Save the LoRA adapter locally\n",
        "model.save_pretrained(\"saralgati_lora_model\")\n",
        "tokenizer.save_pretrained(\"saralgati_lora_model\")\n",
        "\n",
        "import shutil\n",
        "shutil.make_archive(\"saralgati_lora\", 'zip', \"saralgati_lora_model\")\n",
        "print(\"\\n✅ Training complete! Adapter saved as saralgati_lora.zip\")\n",
        "files.download(\"saralgati_lora.zip\")"
      ]
    }
  ],
  "metadata": {
    "colab": {
      "provenance": []
    },
    "kernelspec": {
      "display_name": "Python 3",
      "name": "python3"
    },
    "language_info": {
      "name": "python"
    },
    "accelerator": "GPU"
  },
  "nbformat": 4,
  "nbformat_minor": 0
}

output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "notebooks")
os.makedirs(output_dir, exist_ok=True)
output_file = os.path.join(output_dir, "SaralGati_LoRA_Unsloth.ipynb")

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(notebook, f, indent=2)
print(f"✅ Notebook created at {output_file}")
