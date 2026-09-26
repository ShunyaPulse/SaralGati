# SaralGati - Project Guidelines & Standing Rules

## 1. Communication Style

- **Language**: Strictly respond in **Hinglish** (Hindi written in English alphabet / Roman script).
- **Tone & Conciseness**: High conciseness, low verbosity. Keep answers crisp, technical, and directly to the point. No fluff or unnecessary preambles.
- **Pull Requests**: PR titles and PR descriptions must be written in **English** (chat replies stay Hinglish).

## 2. Core Prohibitions & Boundaries

- **Push to GitHub**: Always ask user before pushing to github. If ever instructed to push, never announce the push.
- **GitHub Organization Guardrail**: If the user begins micromanaging commit history or giving prompts solely to make GitHub look clean/organized, intervene and remind:
  > _"Isme time aur token waste mat karo, baad me ek hi baar me pura clean aur organize kar denge."_
- **Android Device Execution**: Do not attempt to run or simulate the Android device directly. Prepare code and give clear verification instructions for the user to test on device.
- **Semantics**: Do not change '' to "" or vice versa where it does not cause error.
- **No Legacy Backward-Compatibility Shims**: The application is in active development with no external users. Do NOT introduce transitional fallbacks, legacy compatibility bridges, or backward-compatibility workarounds (e.g. fallback secrets, legacy schema shims, or multi-version branching) to preserve obsolete client/APK versions. Always enforce clean, modern, and hardened cut-overs.

## 3. UI Grounding Rules (Elder Companion)

- **Interactive Role Priority**: When resolving UI elements for an elder's question, strictly prioritize actionable elements (`[BUTTON]`, `[INPUT]`, `[TOGGLE]`).
- **Filter Media/Chat Noise**: Subtitle counts, chat preview snippets, or timestamps (e.g., `3 videos`, `Photo`, `unread`) must never be targeted as action buttons.
- **WhatsApp Context**: On the main chats list, guide call intents to the bottom navigation `Calls` tab or instruct to open a chat; only target `[BUTTON] Video call` when inside an active chat.

## 4. Architecture & Services

- **Backend**: Next.js deployed on Google Cloud Run (`saralgati` in `asia-south1`).
- **Cache**: Redis Global Screen Cache on Oracle VM.
- **Database**: Neon PostgreSQL for model interactions, implicit user feedback, and training data flywheel.
- **Training Pipeline**: Single T4 GPU (`CUDA_VISIBLE_DEVICES=0`), native Unsloth fast kernels (`use_gradient_checkpointing="unsloth"`), auto-deployed to Cloudflare Workers AI under `@cf/meta/llama-3.1-8b-instruct-fast`.

## 5. Security & Workflow Invariants

- **Zero Hardcoded Secrets & Credentials Invariant**:
  - NEVER hardcode, paste, or default credentials, database passwords, API tokens, connection strings, or private keys into ANY Git-tracked file (including test scripts, scratch files, configs, documentation, or workflows).
  - Always read secrets from environment variables (e.g. `process.env.DATABASE_URL`, `process.env.API_SECRET`, `System.getenv(...)`) with generic placeholders (e.g. `'YOUR_DATABASE_URL'`) if fallbacks are needed.
  - Actual credentials must ONLY reside in `.env.local` (which is git-ignored) or platform Secret Managers (Cloud Run / GitHub Secrets).
- **GitHub Actions Shell Injection Prevention**: Never interpolate `${{ ... }}` context expressions (such as `github.event.*`, `inputs.*`, `vars.*`) directly inside `run:` inline bash scripts in `.github/workflows/`. Always map them to intermediate environment variables in `env:` and access them via `"$ENV_VAR"` in shell scripts.
- **Nested Dependency CVE Fixes**: When fixing vulnerabilities in indirect/nested dependencies (e.g., `postcss` under `next` or `nodemailer` under `next-auth`), prefer `package.json` `"overrides"` combined with `npm install --legacy-peer-deps` instead of breaking framework upgrades.
- **No PWA Web Manifest**: Do NOT add `manifest.json` or PWA installation prompts to the website. The user must be guided to download and use the native Android companion APK (`SaralGati.apk`) rather than installing the caregiver dashboard web app as a PWA.
- **PowerShell Command Separator**: In Windows terminal commands, always use `;` (semicolon) to chain sequential commands instead of `&&`.
- **Next.js Config Format**: Always use `next.config.mjs` instead of `next.config.ts` to prevent runtime build failures caused by major TypeScript compiler version bumps.
- **Zod v4 API Invariants**:
  - Always use `error.issues` instead of `error.errors`.
  - Do NOT manually type-annotate `err` in `error.issues.forEach((err) => ...)` (Zod v4 `$ZodIssue.path` is `PropertyKey[]`, including `symbol`).
  - Always use two arguments for `z.record(z.string(), ...)` instead of `z.record(...)`.
- **CodeQL Action Pinning**: In `.github/workflows/codeql.yml`, all `github/codeql-action` steps (`init`, `analyze`, `upload-sarif`) must be pinned to the exact same commit SHA to prevent version mismatch crashes and satisfy Semgrep immutable action tag rules.
- **Docker Dependency Resolution**: Always keep `RUN npm ci --legacy-peer-deps` in the `Dockerfile` to avoid `ERESOLVE` failures with peer-optional dependencies (such as `next-auth` and `nodemailer`).

## 6. Versioning & Release Lifecycle Rules

- **Major Milestone Bumps (`1.2.1`, `1.3.1`, `1.4.1`...)**:
  - Only bump the milestone version in `version.json` (e.g. to `1.2.1`, then `1.3.1`, `1.4.1`) when a major change or architectural milestone is completely implemented AND thoroughly verified/tested.
- **Automated Incremental Builds (`1.1.28` -> `1.1.29`...)**:
  - For minor changes, ongoing iterations, untested versions, or runs where tests failed, let the CI workflow automatically bump the patch number (e.g., `1.1.<run_number>` or `<major_minor>.<run_number>`) via GitHub Actions.

## 7. Flywheel & Active Learning Invariants

- **Cache Key Parity**:
  - The cache key generation logic in `feedback/route.ts` and `ask/route.ts` MUST remain 100% mathematically identical (same SHA-256 algorithm and component ordering: `app_package:screen_hash:question:history_hash`). Never write to a plaintext key when the reader uses a hashed key.
- **Async Interaction Logging Guard**:
  - `recordModelInteraction` MUST be `await`ed before returning the HTTP response in `/api/v1/agent/ask` to eliminate race conditions with immediate feedback calls.
- **Correction Explanation Sanitization**:
  - When storing `tapped_other` (user correction) feedback, never retain the LLM's original explanation with the new target index. Always sanitize or replace the explanation (e.g., `'Yahan dabayein.'`) to prevent training data poisoning.
- **SFT Tree Pruning Parity**:
  - Dataset generators in `/api/v1/agent/training-data` MUST format UI elements using `pruneUITree()` from `@/lib/uiPruner` to keep the training distribution identical to production inference inputs.
- **SFT Deduplication**:
  - SFT queries must enforce `DISTINCT ON (app_package, screen_hash, question)` to prevent common queries from causing catastrophic overfitting.
- **DPO Contrastive Pair Integrity**:
  - In DPO preference datasets, `chosen` and `rejected` responses must contain distinct explanation phrasing; never generate pairs with identical text differing only by the `TARGET:[idx]` number.

## 8. Autonomous LoRA Training & Deployment Invariants

- **Response Masking (`train_on_responses_only`)**:
  - All Unsloth / SFT trainers for Llama-3.1 MUST enable `train_on_responses_only_with_padding` (`response_part="<|start_header_id|>assistant<|end_header_id|>\n\n"`). Loss must never be computed on system prompts or user inputs.
- **Automated Validation Gate**:
  - Autonomous GPU training scripts must split a test set (`train_test_split(test_size=0.1)`) and execute `trainer.evaluate()`. Deployment to Cloudflare Workers AI must abort immediately if `eval_loss > 3.0` or divergence occurs.
- **Seed Overfitting Guard**:
  - If total training samples are below 20 (fallback seed data), cap training epochs to 1 to prevent overfitting and base model degradation.
- **Target Model Identity Matching**:
  - Fine-tune containers in Cloudflare Workers AI must register and run against the exact production model identifier (`@cf/meta/llama-3.1-8b-instruct-fast`).

## 9. Android Privacy & Stability Invariants

- **Password Field Exclusion**:
  - `SaralGatiAccessibilityService`'s `traverseNode()` MUST strictly check `if (node.isPassword) return` before serializing or reading screen contents.
- **Overlay Window Safety**:
  - Calls to `WindowManager.addView` for system overlays MUST check `Settings.canDrawOverlays(context)` and be enclosed in a `try-catch` handling `WindowManager.BadTokenException`.
- **Runtime Notification Permission**:
  - For targetSdk >= 33, `android.permission.POST_NOTIFICATIONS` MUST be requested at runtime alongside `RECORD_AUDIO`.
