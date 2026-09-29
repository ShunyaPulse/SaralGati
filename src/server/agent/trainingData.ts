import type { NextRequest } from "next/server";

import { fail, ndjson, ok, type ServiceResult } from '@/server/http';
import { query } from "@/lib/data/db";
import { pruneUITree } from "@/lib/guidance/uiPruner";
import { isFlywheelRequest } from "@/lib/auth/agent-auth";
import { FRAUD_ANALYST_SYSTEM_PROMPT } from "@/lib/fraud/fraudAdvisor";
import {
  normalizeGuidanceLang,
  type GuidanceLang,
} from "@/lib/guidance/guidanceLanguage";
import {
  buildDpoSample,
  buildSftSample,
  partitionTrainable,
  summarizeLanguageCoverage,
} from "@/lib/ai/trainingDataExport";

export async function exportTrainingData(req: NextRequest): Promise<ServiceResult> {
  try {
    // This route exports raw elder questions, on-screen text and tapped targets.
    // It was reachable by anyone who knew the URL, so restrict it to the
    // internal flywheel jobs (GitHub Actions / Kaggle) that hold the secret.
    if (!isFlywheelRequest(req)) {
      return fail(401, { success: false, error: "Unauthorized" });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || searchParams.get("mode") || "sft"; // 'sft' or 'dpo'
    const status = searchParams.get("status") || "verified";
    const includeCorrections =
      searchParams.get("include_corrections") === "true" ||
      status === "flywheel";
    // `parseInt` on a non-numeric limit returns NaN, which still reached the
    // query as LIMIT $n and made a malformed query string a 500.
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "", 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 10000)
      : 500;
    const format = (searchParams.get("format") || "json").toLowerCase();
    // Optional language slice, so a training run can pull one language (or check
    // how much of each it has) without exporting the whole pool.
    const langParam = searchParams.get("lang");
    const wantedLang: GuidanceLang | null =
      langParam === "hi" || langParam === "en" ? langParam : null;

    // === MODE 1: DPO (Direct Preference Optimization) Pipeline ===
    if (type === "dpo") {
      const dpoRows = await query<{
        id: string;
        app_package: string;
        question: string;
        ui_elements: string[];
        suggested_index: number | null;
        actual_tapped_index: number | null;
        explanation: string;
        feedback_status: string;
        guidance_lang: string | null;
        created_at: string;
      }>(
        `SELECT id, app_package, question, ui_elements, suggested_index, actual_tapped_index, explanation, feedback_status, guidance_lang, created_at
         FROM model_interactions
         WHERE feedback_status = 'rejected' 
           AND actual_tapped_index IS NOT NULL 
           AND suggested_index IS NOT NULL 
           AND actual_tapped_index != suggested_index
           AND ($2::text IS NULL OR guidance_lang::text = $2)
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit, wantedLang],
      );

      // Each pair is rebuilt in the language the elder was answered in, and a
      // row whose answer contradicts its own language is dropped rather than
      // taught (see src/lib/ai/trainingDataExport.ts).
      const { trainable, skippedWrongScript } = partitionTrainable(
        dpoRows.map((row) => ({
          ...row,
          lang: normalizeGuidanceLang(row.guidance_lang),
        })),
      );

      const dpoDataset = trainable.map((row) => {
        const { formattedString } = pruneUITree(row.ui_elements, row.question);
        return buildDpoSample({
          id: row.id,
          lang: row.lang,
          appPackage: row.app_package,
          question: row.question,
          elementsBlock: formattedString,
          explanation: row.explanation,
          targetIndex: row.actual_tapped_index,
          rejectedIndex: row.suggested_index,
          feedbackStatus: row.feedback_status,
          createdAt: row.created_at,
        });
      });

      if (format === "jsonl") {
        const jsonl = dpoDataset.map((d) => JSON.stringify(d)).join("\n");
        return ndjson(jsonl, "saralgati_dpo_dataset.jsonl");
      }

      return ok({
        success: true,
        mode: "dpo",
        count: dpoDataset.length,
        counts: summarizeLanguageCoverage(trainable),
        skipped_wrong_script: skippedWrongScript.length,
        data: dpoDataset,
      });
    }

    // === MODE 1B: Anti-Fraud Sentinel Pipeline ===
    // The web sentinel is a deterministic rule engine, so this is where it
    // "learns": the cloud flywheel has Gemini label synthetic scam screens with
    // a ground-truth threat level, calls /api/v1/agent/fraud-check, and every
    // verdict is stored in fraud_training_cases. Exporting here turns those
    // pairs into SFT samples (what the verdict should be) plus unmatched rows
    // into DPO pairs (expected beats predicted), so the LoRA model picks up the
    // same scam signal the rules already encode.
    if (type === "fraud") {
      const fraudRows = await query<{
        id: string;
        app_package: string | null;
        screen_hash: string | null;
        input_signals: Record<string, unknown>;
        predicted_level: string;
        predicted_category: string | null;
        expected_level: string | null;
        expected_category: string | null;
        is_correct: boolean | null;
        risk_reasoning: string | null;
        source: string;
        created_at: string;
      }>(
        `SELECT DISTINCT ON (app_package, screen_hash)
                id, app_package, screen_hash, input_signals, predicted_level,
                predicted_category, expected_level, expected_category, is_correct,
                verdict->>'risk_reasoning' AS risk_reasoning, source, created_at
         FROM fraud_training_cases
         ORDER BY app_package, screen_hash, created_at DESC
         LIMIT $1`,
        [limit],
      );

      // The prompt is imported (not duplicated) so the adapter this export trains
      // is asked the identical question in production by src/lib/fraud/fraudAdvisor.ts.

      // For device-sourced rows without ground-truth labels, the predicted
      // verdict IS the best available label (sentinel was confident enough to
      // flag DANGEROUS/CRITICAL).
      const fraudSft = fraudRows.map((row) => ({
        messages: [
          { role: "system", content: FRAUD_ANALYST_SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify(
              {
                app_package: row.app_package,
                signals: row.input_signals,
              },
              null,
              0,
            ),
          },
          {
            role: "assistant",
            content: JSON.stringify({
              threat_level: row.expected_level ?? row.predicted_level,
              threat_category:
                row.expected_category ?? row.predicted_category ?? "NONE",
              risk_reasoning: row.risk_reasoning ?? "Yahan dabayein.",
            }),
          },
        ],
        metadata: {
          case_id: row.id,
          screen_hash: row.screen_hash,
          predicted_level: row.predicted_level,
          predicted_category: row.predicted_category,
          expected_level: row.expected_level,
          is_correct: row.is_correct,
          source: row.source,
          type: "fraud_ground_truth",
          created_at: row.created_at,
        },
      }));

      const fraudDpo = fraudRows
        .filter((row) => row.is_correct === false)
        .map((row) => ({
          prompt: [
            { role: "system", content: FRAUD_ANALYST_SYSTEM_PROMPT },
            {
              role: "user",
              content: JSON.stringify({
                app_package: row.app_package,
                signals: row.input_signals,
              }),
            },
          ],
          chosen: [
            {
              role: "assistant",
              content: JSON.stringify({
                threat_level: row.expected_level,
                threat_category: row.expected_category ?? "NONE",
                risk_reasoning: "Yahan dabayein.",
              }),
            },
          ],
          rejected: [
            {
              role: "assistant",
              content: JSON.stringify({
                threat_level: row.predicted_level,
                threat_category: row.predicted_category ?? "NONE",
                risk_reasoning: row.risk_reasoning ?? "Yahan dabayein.",
              }),
            },
          ],
          metadata: {
            case_id: row.id,
            type: "fraud_sentinel_correction",
            created_at: row.created_at,
          },
        }));

      if (format === "jsonl") {
        const subMode = (searchParams.get("mode") || "sft").toLowerCase();
        let exportRows: Record<string, unknown>[];
        if (subMode === "dpo") {
          exportRows = fraudDpo;
        } else if (subMode === "all") {
          exportRows = [
            ...fraudSft.map((d) => ({ ...d, dataset_type: "sft" })),
            ...fraudDpo.map((d) => ({ ...d, dataset_type: "dpo" })),
          ];
        } else {
          // Default: pure SFT rows for SFTTrainer / HuggingFace datasets compatibility
          exportRows = fraudSft;
        }
        const jsonl = exportRows.map((d) => JSON.stringify(d)).join("\n");
        return ndjson(jsonl, "saralgati_fraud_dataset.jsonl");
      }

      return ok({
        success: true,
        mode: "fraud",
        count: fraudSft.length,
        dpo_count: fraudDpo.length,
        correct: fraudRows.filter((row) => row.is_correct === true).length,
        data: fraudSft,
        dpo_data: fraudDpo,
      });
    }

    // === MODE 2: SFT / Supervised Instruction Tuning Pipeline ===
    let sqlQuery = `SELECT id, app_package, question, ui_elements, suggested_index, actual_tapped_index, explanation, feedback_status, guidance_lang, created_at
       FROM model_interactions
       WHERE feedback_status = $1
         AND ($3::text IS NULL OR guidance_lang::text = $3)
       ORDER BY created_at DESC
       LIMIT $2`;
    let queryParams: (string | number | null)[] = [status, limit, wantedLang];

    if (includeCorrections) {
      sqlQuery = `SELECT DISTINCT ON (app_package, screen_hash, question) id, app_package, question, ui_elements, suggested_index, actual_tapped_index, explanation, feedback_status, guidance_lang, created_at
       FROM model_interactions
       WHERE (feedback_status = 'verified' 
          OR (feedback_status = 'rejected' AND actual_tapped_index IS NOT NULL))
         AND ($2::text IS NULL OR guidance_lang::text = $2)
       ORDER BY app_package, screen_hash, question, created_at DESC
       LIMIT $1`;
      queryParams = [limit, wantedLang];
    }

    const rows = await query<{
      id: string;
      app_package: string;
      question: string;
      ui_elements: string[];
      suggested_index: number | null;
      actual_tapped_index: number | null;
      explanation: string;
      feedback_status: string;
      guidance_lang: string | null;
      created_at: string;
    }>(sqlQuery, queryParams);

    // Convert into instruction-tuning format suitable for Unsloth / LoRA training,
    // keeping every sample in the language it was answered in: the instruction
    // block is the exported production prompt (src/lib/guidance/guidancePrompt.ts) built
    // for that row's language.
    const { trainable, skippedWrongScript } = partitionTrainable(
      rows.map((row) => ({ ...row, lang: normalizeGuidanceLang(row.guidance_lang) })),
    );

    const dataset = trainable.map((row) => {
      const targetIndex =
        row.feedback_status === "verified"
          ? row.suggested_index
          : (row.actual_tapped_index ?? row.suggested_index);

      const { formattedString } = pruneUITree(row.ui_elements, row.question);

      return buildSftSample({
        id: row.id,
        lang: row.lang,
        appPackage: row.app_package,
        question: row.question,
        elementsBlock: formattedString,
        explanation: row.explanation,
        targetIndex,
        feedbackStatus: row.feedback_status,
        createdAt: row.created_at,
      });
    });

    if (format === "jsonl") {
      const jsonl = dataset.map((d) => JSON.stringify(d)).join("\n");
      return ndjson(jsonl, "saralgati_training_dataset.jsonl");
    }

    return ok({
      success: true,
      mode: "sft",
      count: dataset.length,
      counts: summarizeLanguageCoverage(trainable),
      skipped_wrong_script: skippedWrongScript.length,
      data: dataset,
    });
  } catch (error) {
    console.error("Training Data Export Error:", error);
    return fail(500, { success: false, error: "Failed to export training data" });
  }
}
