# AI Agent Standing Instructions - SaralGati

All AI models, assistants, and automated coding agents operating in this repository MUST read and adhere strictly to these rules before generating code, making commits, or pushing changes.

---

## 1. Versioning & Release Lifecycle (Mandatory on Every Push/Release)

Before committing changes or preparing a release, the AI model MUST inspect all modified files, classify the changes into one of three semantic categories, and update `version.json` accordingly:

### A. Major Update (`MAJOR.0.0`)
- **When to use**: Major architectural redesign, core accessibility pipeline rewrite, major framework or platform migration, or introducing an entirely new standalone capability pillar (e.g., `5.0.0` -> `6.0.0`).
- **Rule**:
  - `MAJOR = MAJOR + 1`
  - `MINOR = 0`
  - `PATCH = 0`
  - `version_code = version_code + 1`

### B. Minor Update (`MAJOR.MINOR.0`)
- **When to use**: New features, new capabilities (e.g., adding a new language, new Phone Doctor diagnostic tool, new flow categories, new dashboard analytics tab, new background worker), backward-compatible functional expansions.
- **Rule**:
  - `MAJOR` stays the same
  - `MINOR = MINOR + 1`
  - `PATCH = 0`
  - `version_code = version_code + 1` (e.g., `5.0.0` -> `5.1.0`)

### C. Patch Update (`MAJOR.MINOR.PATCH`)
- **When to use**: Bug fixes, security fixes, CodeQL/lint error resolutions, edge-case hardening, performance optimizations, copy/i18n adjustments, minor UI polish, documentation, or dependency bumps.
- **Rule**:
  - `MAJOR` and `MINOR` stay the same
  - `PATCH = PATCH + 1` strictly sequentially (e.g., `5.0.0` -> `5.0.1`, `5.0.1` -> `5.0.2`, `5.1.0` -> `5.1.1`).
  - **NEVER** skip numbers or overwrite `PATCH` with GitHub Actions run numbers.
  - `version_code = version_code + 1`

### Always Update `version.json`:
1. `version_name`: Set to the new `MAJOR.MINOR.PATCH` string.
2. `version_code`: Must be an integer strictly greater than the previous code (ensures Android `PackageInstaller` never rejects the update as a downgrade).
3. `changelog`: Write a crisp, human-readable summary of the exact changes included.

---

## 2. Core Operational Boundaries

1. **Push to GitHub**: Always ask user explicitly before pushing to GitHub. Never announce or execute a push without explicit permission.
2. **Hinglish Communication**: Chat responses with the user MUST be strictly in **Hinglish** (Hindi written in Roman / English script).
3. **Android Device Execution**: Never attempt to run or simulate the Android device directly. Provide clear verification instructions for testing on device.
4. **Zero Hardcoded Secrets**: Never commit or hardcode credentials, passwords, or API keys in Git-tracked files. Always use environment variables.
