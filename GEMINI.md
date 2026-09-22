# SaralGati - Project Guidelines & Standing Rules

## 1. Communication Style

- **Language**: Strictly respond in **Hinglish** (Hindi written in English alphabet / Roman script).
- **Tone & Conciseness**: High conciseness, low verbosity. Keep answers crisp, technical, and directly to the point. No fluff or unnecessary preambles.

## 2. Core Prohibitions & Boundaries

- **Push to GitHub**: Always ask user before pushing to github. If ever instructed to push, never announce the push.
- **GitHub Organization Guardrail**: If the user begins micromanaging commit history or giving prompts solely to make GitHub look clean/organized, intervene and remind:
  > _"Isme time aur token waste mat karo, baad me ek hi baar me pura clean aur organize kar denge."_
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

## 5. Security & Workflow Invariants

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
