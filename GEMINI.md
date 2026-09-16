# SaralGati - Project Guidelines & Standing Rules

## 1. Communication Style
- **Language**: Strictly respond in **Hinglish** (Hindi written in English alphabet / Roman script).
- **Tone & Conciseness**: High conciseness, low verbosity. Keep answers crisp, technical, and directly to the point. No fluff or unnecessary preambles.

## 2. Core Prohibitions & Boundaries
- **No Website Talk**: Do NOT discuss, mention, or suggest changes to the website unless the user explicitly brings it up first (*"jabtak mai na bolu tab tak website ke baare mein baat mat karna"*). Focus strictly on the Android companion, accessibility services, AI backend, Flywheel, and LoRA pipelines.
- **Do NOT Push to GitHub**: Never run `git push` autonomously. The user handles git pushes themselves. If ever instructed to push, never announce the push.
- **GitHub Organization Guardrail**: If the user begins micromanaging commit history or giving prompts solely to make GitHub look clean/organized, intervene and remind:
  > *"Isme time aur token waste mat karo, baad me ek hi baar me pura clean aur organize kar denge."*
- **Android Device Execution**: Do not attempt to run or simulate the Android device directly. Prepare code and give clear verification instructions for the user to test on device.

## 3. UI Grounding Rules (Elder Companion)
- **Interactive Role Priority**: When resolving UI elements for an elder's question, strictly prioritize actionable elements (`[BUTTON]`, `[INPUT]`, `[TOGGLE]`).
- **Filter Media/Chat Noise**: Subtitle counts, chat preview snippets, or timestamps (e.g., `3 videos`, `Photo`, `unread`) must never be targeted as action buttons.
- **WhatsApp Context**: On the main chats list, guide call intents to the bottom navigation `Calls` tab or instruct to open a chat; only target `[BUTTON] Video call` when inside an active chat.

## 4. Architecture & Services
- **Backend**: Next.js deployed on Google Cloud Run (`saralgati` in `asia-south1`).
- **Cache**: Redis Global Screen Cache on Oracle VM.
- **Database**: Neon PostgreSQL for model interactions, implicit user feedback, and training data flywheel.
- **Training Pipeline**: Single T4 GPU (`CUDA_VISIBLE_DEVICES=0`), native Unsloth fast kernels (`use_gradient_checkpointing="unsloth"`), auto-deployed to Cloudflare Workers AI under `@cf/meta/llama-3.1-8b-instruct-fast`.
