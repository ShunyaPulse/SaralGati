import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { generateAIResponse } from "@/lib/aiFallback";
import { isFlywheelRequest } from "@/lib/agent-auth";

/** Mirrors the CHECK constraint on habit_rules.rule_type - the model is free to
 * invent other labels, and an unchecked insert would fail the whole write. */
const ALLOWED_RULE_TYPES = new Set([
  "frequent_contact",
  "app_trigger",
  "time_routine",
  "location_trigger",
]);

export async function POST(req: NextRequest) {
  try {
    if (!isFlywheelRequest(req)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // 1. Get elders who have recent verified interactions
    const eldersRes = await query<{ elder_id: string }>(
      `SELECT DISTINCT elder_id 
       FROM model_interactions 
       WHERE feedback_status = 'verified' AND elder_id IS NOT NULL 
       ORDER BY elder_id LIMIT 10`,
    );

    const processedElders: string[] = [];
    let habitsCreated = 0;

    for (const { elder_id } of eldersRes || []) {
      // 2. Get their last 30 verified interactions
      const interactions = await query<{
        question: string;
        app_package: string;
        ui_elements: any;
        actual_tapped_index: number;
      }>(
        `SELECT question, app_package, ui_elements, COALESCE(actual_tapped_index, suggested_index) as actual_tapped_index
         FROM model_interactions
         WHERE elder_id = $1 AND feedback_status = 'verified'
         ORDER BY created_at DESC LIMIT 30`,
        [elder_id],
      );

      if (!interactions || interactions.length < 3) continue; // Need some data to find patterns

      // 3. Format history for AI
      const historyText = interactions
        .map((i) => {
          const elements = Array.isArray(i.ui_elements)
            ? i.ui_elements
            : JSON.parse(i.ui_elements || "[]");
          const targetElement = elements[i.actual_tapped_index] || "Unknown";
          return `App: ${i.app_package} | Q: "${i.question}" | Tapped: ${targetElement}`;
        })
        .join("\n");

      const systemPrompt = `You are a data mining agent. Extract consistent personal habits or naming conventions from the user's interaction history.
Focus on:
1. Implicit relations (e.g. if they say "beta" and consistently tap "Rahul"). Use rule_type: 'frequent_contact', payload: {"name": "Rahul"}.
2. Routines (e.g. if they say "aarti" and tap a specific YouTube video). Use rule_type: 'app_trigger', payload: {"video": "Title"}.

Return a strict JSON array of objects with keys: rule_type (string), rule_payload (object). The ONLY valid rule_types are: 'frequent_contact', 'app_trigger', 'time_routine', 'location_trigger'. If no clear patterns exist, return []. Do not wrap in markdown blocks, just raw JSON.`;

      const aiResponse = await generateAIResponse({
        systemPrompt,
        userPrompt: `Here is the elder's verified interaction history:\n${historyText}\n\nExtract their habits.`,
      });

      try {
        const cleanJson = aiResponse.text.replace(/^```json|```$/gi, "").trim();
        const extracted = JSON.parse(cleanJson);

        if (Array.isArray(extracted) && extracted.length > 0) {
          // 4. Save to habit_rules
          for (const habit of extracted) {
            if (!ALLOWED_RULE_TYPES.has(habit?.rule_type)) continue;
            if (!habit.rule_payload || typeof habit.rule_payload !== "object") {
              continue;
            }

            // migrations/007 added the unique index on
            // (elder_id, rule_type, rule_payload), so ON CONFLICT now actually
            // fires and a repeat flywheel run can no longer append the same
            // mined habit again. No conflict target is given so the insert keeps
            // working on a database that has not run 007 yet.
            const inserted = await query<{ id: string }>(
              `INSERT INTO habit_rules (elder_id, rule_type, rule_payload, confidence, updated_at)
               VALUES ($1, $2, $3::jsonb, $4, NOW())
               ON CONFLICT DO NOTHING
               RETURNING id`,
              [
                elder_id,
                habit.rule_type,
                JSON.stringify(habit.rule_payload),
                0.8,
              ],
            );
            if (inserted.length > 0) habitsCreated++;
          }
        }
      } catch (err) {
        console.error(
          "Failed to parse AI response for habits:",
          aiResponse.text,
        );
      }

      processedElders.push(elder_id);
    }

    return NextResponse.json({
      success: true,
      data: {
        processed_elders: processedElders.length,
        habits_created: habitsCreated,
      },
    });
  } catch (error) {
    console.error("Habit Mining Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
