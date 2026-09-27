/**
 * The two languages the companion speaks, and the one script test that keeps
 * guidance in whichever one the elder chose.
 *
 * The elder picks a language in onboarding (`guidance_lang` on the agent API),
 * and every layer that produces a spoken sentence - the deterministic
 * fast-path, the intent dictionary, the multi-step flows, the fraud sentinel
 * and the models - has to honour it. Before this module existed, each layer
 * answered in the language it was written in, so choosing English still
 * produced Hindi guidance.
 */

export type GuidanceLang = 'hi' | 'en';

/** Any Devanagari codepoint. Latin-script Hinglish does not count. */
const DEVANAGARI = /[\u0900-\u097F]/;

/** True when a sentence needs the Hindi voice: Devanagari, not Hinglish. */
export function hasDevanagari(text: string): boolean {
  return DEVANAGARI.test(text);
}
