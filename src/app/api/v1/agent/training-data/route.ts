import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { pruneUITree } from "@/lib/uiPruner";
import { isFlywheelRequest } from "@/lib/agent-auth";

export async function GET(req: NextRequest) {
  try {
    // This route exports raw elder questions, on-screen text and tapped targets.
    // It was reachable by anyone who knew the URL, so restrict it to the
    // internal flywheel jobs (GitHub Actions / Kaggle) that hold the secret.
    if (!isFlywheelRequest(req)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
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
        created_at: string;
      }>(
        `SELECT id, app_package, question, ui_elements, suggested_index, actual_tapped_index, explanation, feedback_status, created_at
         FROM model_interactions
         WHERE feedback_status = 'rejected' 
           AND actual_tapped_index IS NOT NULL 
           AND suggested_index IS NOT NULL 
           AND actual_tapped_index != suggested_index
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit],
      );

      const dpoDataset = dpoRows.map((row) => {
        const { formattedString } = pruneUITree(row.ui_elements, row.question);

        const systemPrompt = `You are SaralGati, a patient, warm companion for Indian elders.
The user is looking at an Android app: ${row.app_package}.
Here are the numbered interactive elements on their screen:
${formattedString}

Instructions:
1. Answer the user's question in 1 or 2 simple, comforting Hinglish (Hindi written in English script) sentences.
2. Elements on screen are prefixed with their role ([BUTTON], [INPUT], [TOGGLE], [TEXT]).
3. When guiding the user to tap, open, or take action, ALWAYS target an interactive element ([BUTTON], [INPUT], or [TOGGLE]). Never target static [TEXT] or preview count noise.
4. If your answer directs the user to tap or look at a specific element on screen, append " TARGET:[index]" at the very end.`;

        return {
          prompt: [
            { role: "system", content: systemPrompt },
            { role: "user", content: row.question },
          ],
          chosen: [
            {
              role: "assistant",
              content: `${row.explanation} TARGET:${row.actual_tapped_index}`,
            },
          ],
          rejected: [
            {
              role: "assistant",
              content: `Ispe click karein. TARGET:${row.suggested_index}`,
            },
          ],
          metadata: {
            interaction_id: row.id,
            app_package: row.app_package,
            chosen_index: row.actual_tapped_index,
            rejected_index: row.suggested_index,
            type: "user_correction_preference",
            created_at: row.created_at,
          },
        };
      });

      if (format === "jsonl") {
        const jsonl = dpoDataset.map((d) => JSON.stringify(d)).join("\n");
        return new Response(jsonl, {
          headers: {
            "Content-Type": "application/x-ndjson",
            "Content-Disposition":
              'attachment; filename="saralgati_dpo_dataset.jsonl"',
          },
        });
      }

      return NextResponse.json({
        success: true,
        mode: "dpo",
        count: dpoDataset.length,
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
        expected_level: string;
        expected_category: string | null;
        is_correct: boolean | null;
        created_at: string;
      }>(
        `SELECT id, app_package, screen_hash, input_signals, predicted_level,
                predicted_category, expected_level, expected_category, is_correct, created_at
         FROM fraud_training_cases
         WHERE expected_level IS NOT NULL
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit],
      );

      const FRAUD_SYSTEM_PROMPT = `You are SaralGati's anti-fraud analyst for Indian elders.
You receive the visible signals of one Android screen or message batch: UI element labels, URLs, SMS/notification text and the elder's question.
Classify the threat into exactly one level (SAFE, SUSPICIOUS, DANGEROUS, CRITICAL) and one category among OTP_THEFT, PAYMENT_FRAUD, REMOTE_ACCESS, PHISHING_IMPERSONATION, MALVERTISING, MALICIOUS_APK, PRIVACY_RISK, NONE.
Rules: receiving money never needs a UPI PIN or OTP; only theft vectors (OTP theft, payment fraud, remote access, malicious APK) may reach CRITICAL; never mark a screen DANGEROUS on a single weak keyword when a benign explanation exists.
Respond ONLY with JSON: {"threat_level":"...","threat_category":"...","risk_reasoning":"one short sentence"}.`;

      const fraudSft = fraudRows.map((row) => ({
        messages: [
          { role: "system", content: FRAUD_SYSTEM_PROMPT },
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
              threat_level: row.expected_level,
              threat_category: row.expected_category ?? "NONE",
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
          type: "fraud_ground_truth",
          created_at: row.created_at,
        },
      }));

      const fraudDpo = fraudRows
        .filter((row) => row.is_correct === false)
        .map((row) => ({
          prompt: [
            { role: "system", content: FRAUD_SYSTEM_PROMPT },
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
              }),
            },
          ],
          rejected: [
            {
              role: "assistant",
              content: JSON.stringify({
                threat_level: row.predicted_level,
                threat_category: row.predicted_category ?? "NONE",
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
        const jsonl = fraudSft.map((d) => JSON.stringify(d)).join("\n");
        return new Response(jsonl, {
          headers: {
            "Content-Type": "application/x-ndjson",
            "Content-Disposition":
              'attachment; filename="saralgati_fraud_dataset.jsonl"',
          },
        });
      }

      return NextResponse.json({
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
    let sqlQuery = `SELECT id, app_package, question, ui_elements, suggested_index, actual_tapped_index, explanation, feedback_status, created_at
       FROM model_interactions
       WHERE feedback_status = $1
       ORDER BY created_at DESC
       LIMIT $2`;
    let queryParams: (string | number)[] = [status, limit];

    if (includeCorrections) {
      sqlQuery = `SELECT DISTINCT ON (app_package, screen_hash, question) id, app_package, question, ui_elements, suggested_index, actual_tapped_index, explanation, feedback_status, created_at
       FROM model_interactions
       WHERE feedback_status = 'verified' 
          OR (feedback_status = 'rejected' AND actual_tapped_index IS NOT NULL)
       ORDER BY app_package, screen_hash, question, created_at DESC
       LIMIT $1`;
      queryParams = [limit];
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
      created_at: string;
    }>(sqlQuery, queryParams);

    // Convert into instruction-tuning format suitable for Unsloth / LoRA training
    const dataset = rows.map((row) => {
      const targetIndex =
        row.feedback_status === "verified"
          ? row.suggested_index
          : (row.actual_tapped_index ?? row.suggested_index);

      const { formattedString } = pruneUITree(row.ui_elements, row.question);

      const systemPrompt = `You are SaralGati, a patient, warm companion for Indian elders.
The user is looking at an Android app: ${row.app_package}.
Here are the numbered interactive elements on their screen:
${formattedString}

Instructions:
1. Answer the user's question in 1 or 2 simple, comforting Hinglish (Hindi written in English script) sentences.
2. Elements on screen are prefixed with their role ([BUTTON], [INPUT], [TOGGLE], [TEXT]).
3. When guiding the user to tap, open, or take action, ALWAYS target an interactive element ([BUTTON], [INPUT], or [TOGGLE]). Never target static [TEXT] or preview count noise.
4. If your answer directs the user to tap or look at a specific element on screen, append " TARGET:[index]" at the very end.`;

      const assistantContent =
        targetIndex !== null
          ? `${row.explanation} TARGET:${targetIndex}`
          : row.explanation;

      return {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: row.question },
          { role: "assistant", content: assistantContent },
        ],
        metadata: {
          interaction_id: row.id,
          app_package: row.app_package,
          target_index: targetIndex,
          feedback_status: row.feedback_status,
          created_at: row.created_at,
        },
      };
    });

    if (format === "jsonl") {
      const jsonl = dataset.map((d) => JSON.stringify(d)).join("\n");
      return new Response(jsonl, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Content-Disposition":
            'attachment; filename="saralgati_training_dataset.jsonl"',
        },
      });
    }

    return NextResponse.json({
      success: true,
      mode: "sft",
      count: dataset.length,
      data: dataset,
    });
  } catch (error) {
    console.error("Training Data Export Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export training data" },
      { status: 500 },
    );
  }
}
