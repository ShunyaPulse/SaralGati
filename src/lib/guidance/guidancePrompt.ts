import type { GuidanceLang } from "./guidanceLanguage";

/**
 * The one place the companion's guidance instructions are written.
 *
 * Production (`/api/v1/agent/ask`) and the self-learning export
 * (`/api/v1/agent/training-data`) have to ask the model the *identical*
 * question, or the LoRA is fine-tuned on a prompt the app never sends. The
 * fraud half of the flywheel already works that way (`FRAUD_ANALYST_SYSTEM_PROMPT`
 * is imported by both sides); this module gives the guidance half the same
 * guarantee - and per language, so an English elder's screens train English
 * answers instead of re-teaching Hinglish.
 */

/** Everything except the first and last line, which name the language. */
const ROLE_RULES = `2. Elements on screen are prefixed with their role:
   - [BUTTON]: Clickable button or icon that can be tapped.
   - [INPUT]: Text input box for typing.
   - [TOGGLE]: Switch or checkbox.
   - [TEXT]: Plain static non-clickable text or title.
3. When guiding the user to tap, open, or take action, ALWAYS target an interactive element ([BUTTON], [INPUT], or [TOGGLE]). Never target static [TEXT] unless specifically asked to read or verify text.
4. If your answer directs the user to tap or look at a specific element on screen, append " TARGET:[index]" at the very end of your response, where [index] is the exact number of that element (for example: TARGET:2).
5. If no specific element needs to be tapped, do NOT output any TARGET tag.`;

export const GUIDANCE_INSTRUCTIONS: Record<GuidanceLang, string> = {
  en: `1. Answer the user's question in 1 or 2 simple, comforting English sentences. Write only in English words and Latin script, never in Hindi or Devanagari.
${ROLE_RULES}
6. Do not mention that you are an AI. Only output the English sentence.`,
  hi: `1. Answer the user's question in 1 or 2 simple, comforting Hinglish (Hindi written in English script) sentences.
${ROLE_RULES}
6. Do not mention that you are an AI. Only output the Hinglish sentence.`,
};

export function guidanceInstructions(lang: GuidanceLang): string {
  return GUIDANCE_INSTRUCTIONS[lang];
}

/**
 * Builds the ask prompt a screen produces for one elder language. Both the live
 * route and the training export call this, so a change here lands in production
 * and in the next adapter at the same time.
 */
export function buildAskSystemPrompt(params: {
  lang: GuidanceLang;
  appPackage: string;
  /** The numbered `[0] [BUTTON] ...` element lines, already pruned/formatted. */
  elementsBlock: string;
  /** Pre-formatted habit block, newline-separated, or "" when there are none. */
  habitsBlock?: string;
  /** Pre-formatted few-shot examples, or omitted when unused. */
  fewShotsBlock?: string;
}): string {
  let prompt = `You are SaralGati, a patient, warm companion for Indian elders.${params.habitsBlock ?? ""}
The user is looking at an Android app: ${params.appPackage}.
Here are the numbered interactive elements on their screen:
${params.elementsBlock}

Instructions:
${guidanceInstructions(params.lang)}`;

  if (params.fewShotsBlock) {
    prompt += `

Few-shot Grounding Examples:
${params.fewShotsBlock}`;
  }

  return prompt;
}
