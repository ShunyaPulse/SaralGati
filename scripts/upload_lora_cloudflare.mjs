import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const LORA_NAME = "saralgati-elder-lora";

// Ensure you extract adapter_model.safetensors or adapter_model.bin from the Colab zip file.
const ADAPTER_FILE_PATH = path.join(__dirname, '..', 'adapter_model.safetensors');

async function uploadLoRA() {
  if (!ACCOUNT_ID || !API_TOKEN) {
    console.error("❌ CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set as environment variables.");
    process.exit(1);
  }

  if (!fs.existsSync(ADAPTER_FILE_PATH)) {
    console.error(`❌ LoRA adapter not found at: ${ADAPTER_FILE_PATH}`);
    console.error("Please download the saralgati_lora.zip from Google Colab, extract it, and place 'adapter_model.safetensors' in the root folder of this project.");
    process.exit(1);
  }

  console.log(`📤 Uploading LoRA adapter '${LORA_NAME}' to Cloudflare...`);
  
  // Note: For large files, Node 18+ fetch with FormData or a stream is required.
  // We use FormData for multipart/form-data upload.
  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(ADAPTER_FILE_PATH)]);
  formData.append("file", fileBlob, "adapter_model.safetensors");
  
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/finetunes/${LORA_NAME}`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_TOKEN}`,
      },
      body: formData
    });

    const result = await response.json();
    if (response.ok) {
      console.log("✅ Successfully uploaded LoRA to Cloudflare Workers AI!");
      console.log("Response:", JSON.stringify(result, null, 2));
    } else {
      console.error("❌ Failed to upload LoRA:", JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error("❌ Network error during upload:", error);
  }
}

uploadLoRA();
