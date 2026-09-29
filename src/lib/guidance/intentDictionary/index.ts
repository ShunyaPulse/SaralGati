/**
 * The elder intent dictionary, split by concern:
 *
 * - `types`        the shape of one intent
 * - `intents`      the intent data itself
 * - `explanations` the bilingual spoken sentence for each intent id
 * - `matching`     query matching and best-element scoring
 *
 * Importers keep using `@/lib/guidance/intentDictionary`, so this surface is
 * the module's public API.
 */
export type { IntentDefinition } from './types';
export { ELDER_INTENTS } from './intents';
export {
  INTENT_ENGLISH_EXPLANATIONS,
  INTENT_HINDI_EXPLANATIONS,
  getIntentExplanation,
} from './explanations';
export { matchElderIntent, matchQueryPattern } from './matching';
