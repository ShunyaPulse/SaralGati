import {
  hasDevanagari,
  type GuidanceLang,
} from "@/lib/guidance/guidanceLanguage";
import { buildAskSystemPrompt } from "@/lib/guidance/guidancePrompt";

/**
 * Turns captured interactions into LoRA training rows.
 *
 * The export used to be language-blind: every sample was rebuilt with the same
 * hardcoded Hinglish instruction, whatever the elder had chosen. So an English
 * answer became an example of "answer in Hinglish" - the flywheel actively
 * taught the model to ignore the language switch, and the fine-tuned adapter
 * kept losing English requests to the general model.
 *
 * A sample is language-correct only when the instruction and the answer agree,
 * which is what these builders guarantee.
 */

/** The rejected copy a DPO pair contrasts against, in the elder's language. */
export const REJECTED_GUIDANCE_COPY: Record<GuidanceLang, string> = {
  en: "Tap here.",
  hi: "Ispe click karein.",
};

export interface ExportInteraction {
  id: string;
  lang: GuidanceLang;
  appPackage: string;
  question: string;
  /** The numbered element lines the model saw, already pruned. */
  elementsBlock: string;
  explanation: string | null;
  /** Index the sample teaches: the verified pick or the elder's correction. */
  targetIndex: number | null;
  /** The wrong pick a rejected interaction was corrected away from. */
  rejectedIndex?: number | null;
  feedbackStatus?: string | null;
  createdAt?: string | null;
}

/**
 * Does this row teach the language it claims?
 *
 * In English mode a Devanagari answer is the model failing the request, not an
 * English answer, and training on it would teach "English instruction ->
 * Hindi answer". Latin-script Hinglish cannot be told apart from English by
 * script alone, so Hindi rows are accepted as they are - which is also why the
 * Hindi instruction is the one that asks for Latin script.
 */
export function teachesItsLanguage(row: {
  lang: GuidanceLang;
  explanation: string | null;
}): boolean {
  const explanation = (row.explanation ?? "").trim();
  if (!explanation) return false;
  if (row.lang === "en") return !hasDevanagari(explanation);
  return true;
}

/** Splits rows into the ones safe to train on and the ones that contradict themselves. */
export function partitionTrainable<T extends { lang: GuidanceLang; explanation: string | null }>(
  rows: T[],
): { trainable: T[]; skippedWrongScript: T[] } {
  const trainable: T[] = [];
  const skippedWrongScript: T[] = [];
  for (const row of rows) {
    (teachesItsLanguage(row) ? trainable : skippedWrongScript).push(row);
  }
  return { trainable, skippedWrongScript };
}

export function summarizeLanguageCoverage(
  rows: { lang: GuidanceLang }[],
): Record<GuidanceLang, number> {
  const counts: Record<GuidanceLang, number> = { hi: 0, en: 0 };
  for (const row of rows) counts[row.lang] += 1;
  return counts;
}

/** One SFT row in the same shape Unsloth's chat template expects. */
export function buildSftSample(row: ExportInteraction) {
  // Rows with an empty answer never reach here: partitionTrainable drops them.
  const explanation = row.explanation ?? "";
  const assistantContent =
    row.targetIndex !== null
      ? `${explanation} TARGET:${row.targetIndex}`
      : explanation;

  return {
    messages: [
      {
        role: "system",
        content: buildAskSystemPrompt({
          lang: row.lang,
          appPackage: row.appPackage,
          elementsBlock: row.elementsBlock,
        }),
      },
      { role: "user", content: row.question },
      { role: "assistant", content: assistantContent },
    ],
    metadata: {
      interaction_id: row.id,
      app_package: row.appPackage,
      target_index: row.targetIndex,
      guidance_lang: row.lang,
      feedback_status: row.feedbackStatus ?? null,
      created_at: row.createdAt ?? null,
    },
  };
}

/** One DPO row: the language-correct answer beats the wrong pick. */
export function buildDpoSample(row: ExportInteraction) {
  const languageCopy = REJECTED_GUIDANCE_COPY[row.lang];

  return {
    prompt: [
      {
        role: "system",
        content: buildAskSystemPrompt({
          lang: row.lang,
          appPackage: row.appPackage,
          elementsBlock: row.elementsBlock,
        }),
      },
      { role: "user", content: row.question },
    ],
    chosen: [
      {
        role: "assistant",
        content: `${row.explanation ?? ""} TARGET:${row.targetIndex}`,
      },
    ],
    rejected: [
      {
        role: "assistant",
        content: `${languageCopy} TARGET:${row.rejectedIndex}`,
      },
    ],
    metadata: {
      interaction_id: row.id,
      app_package: row.appPackage,
      chosen_index: row.targetIndex,
      rejected_index: row.rejectedIndex ?? null,
      guidance_lang: row.lang,
      type: "user_correction_preference",
      created_at: row.createdAt ?? null,
    },
  };
}
