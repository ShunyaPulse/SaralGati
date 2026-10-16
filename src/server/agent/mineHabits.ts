import type { NextRequest } from "next/server";

import { fail, ok, type ServiceResult } from '@/server/http';
import { query } from "@/lib/data/db";
import { cacheDelete } from "@/lib/data/redis";
import { generateAIResponse } from "@/lib/ai/aiFallback";
import { isFlywheelRequest } from "@/lib/auth/agent-auth";
import { parseGeofence } from "@/lib/geo/geo";
import { elementLabel } from "@/lib/guidance/uiElement";

/** Mirrors the CHECK constraint on habit_rules.rule_type. */
const ALLOWED_RULE_TYPES = new Set([
  "frequent_contact",
  "app_trigger",
  "time_routine",
  "location_trigger",
]);

const RELATION_KEYWORDS = new Set([
  "beta",
  "beti",
  "bahu",
  "bahoo",
  "pota",
  "poti",
  "dada",
  "dadi",
  "nana",
  "nani",
  "bhaiya",
  "didi",
  "doctor",
  "daktar",
  "son",
  "daughter",
  "wife",
  "husband",
]);

interface MinedHabitCandidate {
  rule_type: string;
  rule_payload: Record<string, unknown>;
  confidence: number;
}

/**
 * Tier 1 SOTA Deterministic Apriori Co-Occurrence Miner:
 * Finds statistically significant (query_token -> tapped_element_label) associations
 * with support >= 2 and confidence >= 0.6 across verified elder interactions.
 */
export function mineStatisticalCoOccurrenceHabits(
  interactions: Array<{
    question: string;
    app_package: string;
    ui_elements: unknown;
    actual_tapped_index: number;
  }>,
): MinedHabitCandidate[] {
  const relationToTargetCounts = new Map<string, Map<string, number>>();
  const relationTotals = new Map<string, number>();
  const appTargetCounts = new Map<string, { app: string; label: string; count: number }>();

  for (const row of interactions) {
    const elements: string[] = Array.isArray(row.ui_elements)
      ? row.ui_elements
      : (() => {
          try {
            return JSON.parse(String(row.ui_elements || "[]"));
          } catch {
            return [];
          }
        })();
    const rawTarget = elements[row.actual_tapped_index];
    if (typeof rawTarget !== "string" || !rawTarget.trim()) continue;
    const cleanLabel = elementLabel(rawTarget).trim();
    if (!cleanLabel || cleanLabel.length < 2) continue;

    const qTokens = row.question
      .toLowerCase()
      .split(/[^a-z0-9\u0900-\u097F]+/)
      .filter((t) => t.length >= 3);

    for (const token of qTokens) {
      if (RELATION_KEYWORDS.has(token)) {
        relationTotals.set(token, (relationTotals.get(token) ?? 0) + 1);
        const byTarget = relationToTargetCounts.get(token) ?? new Map<string, number>();
        byTarget.set(cleanLabel, (byTarget.get(cleanLabel) ?? 0) + 1);
        relationToTargetCounts.set(token, byTarget);
      }
    }

    const appKey = `${row.app_package}::${cleanLabel}`;
    const existingApp = appTargetCounts.get(appKey);
    if (existingApp) {
      existingApp.count += 1;
    } else {
      appTargetCounts.set(appKey, { app: row.app_package, label: cleanLabel, count: 1 });
    }
  }

  const results: MinedHabitCandidate[] = [];

  for (const [relation, byTarget] of relationToTargetCounts.entries()) {
    const total = relationTotals.get(relation) ?? 0;
    if (total < 2) continue;
    for (const [targetLabel, support] of byTarget.entries()) {
      const confidence = support / total;
      if (support >= 2 && confidence >= 0.6) {
        results.push({
          rule_type: "frequent_contact",
          rule_payload: { relation, name: targetLabel },
          confidence: Math.min(0.95, Math.round(confidence * 100) / 100),
        });
      }
    }
  }

  for (const { app, label, count } of appTargetCounts.values()) {
    if (count >= 3) {
      results.push({
        rule_type: "app_trigger",
        rule_payload: { app_package: app, target: label },
        confidence: Math.min(0.9, Math.round((0.5 + count * 0.1) * 100) / 100),
      });
    }
  }

  return results;
}

/** Extract a JSON array from an LLM reply even if wrapped in prose or trailing TARGET tags. */
function extractJsonArray(rawText: string): unknown[] {
  const withoutTarget = rawText.replace(/TARGET:\s*\d+/gi, "").trim();
  const fenced = withoutTarget
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = fenced.indexOf("[");
  const end = fenced.lastIndexOf("]");
  const slice = start >= 0 && end > start ? fenced.slice(start, end + 1) : fenced;
  const parsed = JSON.parse(slice);
  return Array.isArray(parsed) ? parsed : [];
}

export async function mineHabits(req: NextRequest): Promise<ServiceResult> {
  try {
    if (!isFlywheelRequest(req)) {
      return fail(401, { success: false, error: "Unauthorized" });
    }

    const eldersRes = await query<{ elder_id: string }>(
      `SELECT DISTINCT elder_id 
       FROM model_interactions 
       WHERE feedback_status = 'verified' AND elder_id IS NOT NULL 
       ORDER BY elder_id LIMIT 10`,
    );

    const processedElders: string[] = [];
    let habitsCreated = 0;

    for (const { elder_id } of eldersRes || []) {
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

      if (!interactions || interactions.length < 3) continue;

      // Tier 1: Deterministic Statistical Apriori Co-Occurrence Mining
      const candidates: MinedHabitCandidate[] = [
        ...mineStatisticalCoOccurrenceHabits(interactions),
      ];

      // Tier 2: LLM Semantic Habit Extraction
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

      try {
        const aiResponse = await generateAIResponse({
          systemPrompt,
          userPrompt: `Here is the elder's verified interaction history:\n${historyText}\n\nExtract their habits.`,
        });
        const extracted = extractJsonArray(aiResponse.text);
        for (const item of extracted) {
          if (item && typeof item === "object" && "rule_type" in item && "rule_payload" in item) {
            const habit = item as { rule_type: string; rule_payload: Record<string, unknown> };
            candidates.push({
              rule_type: habit.rule_type,
              rule_payload: habit.rule_payload,
              confidence: 0.8,
            });
          }
        }
      } catch (err) {
        console.warn("LLM habit extraction fallback (using statistical habits):", err);
      }

      if (candidates.length > 0) {
        let createdForElder = 0;
        for (const habit of candidates) {
          if (!ALLOWED_RULE_TYPES.has(habit?.rule_type)) continue;
          if (!habit.rule_payload || typeof habit.rule_payload !== "object" || Array.isArray(habit.rule_payload)) {
            continue;
          }
          if (habit.rule_type === "location_trigger" && !parseGeofence(habit.rule_payload)) {
            continue;
          }

          const inserted = await query<{ id: string }>(
            `INSERT INTO habit_rules (elder_id, rule_type, rule_payload, confidence, updated_at)
             VALUES ($1, $2, $3::jsonb, $4, NOW())
             ON CONFLICT DO NOTHING
             RETURNING id`,
            [
              elder_id,
              habit.rule_type,
              JSON.stringify(habit.rule_payload),
              habit.confidence,
            ],
          );
          if (inserted.length > 0) {
            habitsCreated++;
            createdForElder++;
          }
        }
        if (createdForElder > 0) {
          await cacheDelete(`agent-config:${elder_id}`);
          await cacheDelete(`agent-habits:${elder_id}`);
        }
      }

      processedElders.push(elder_id);
    }

    return ok({
      success: true,
      data: {
        processed_elders: processedElders.length,
        habits_created: habitsCreated,
      },
    });
  } catch (error) {
    console.error("Habit Mining Error:", error);
    return fail(500, { success: false, error: "Internal server error" });
  }
}
