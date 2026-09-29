import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { generateAIResponse } from "@/lib/ai/aiFallback";
import { cacheGet, cacheSet } from "@/lib/data/redis";
import { matchFastPathRule } from "@/lib/guidance/agentFastPath";
import { pruneUITree } from "@/lib/guidance/uiPruner";
import { evaluateMultiStepFlow } from "@/lib/data/flowEngine";
import { formatRelevantFewShots } from "@/lib/ai/fewShotGrounding";
import { validateSemanticTarget } from "@/lib/guidance/semanticValidator";
import { query } from "@/lib/data/db";
import { isFlywheelRequest, validateDeviceToken } from "@/lib/auth/agent-auth";
import { MIN_PROMOTABLE_CONFIDENCE } from "@/lib/ai/confidenceScorer";
import { hasDevanagari, type GuidanceLang } from "@/lib/guidance/guidanceLanguage";
import { buildAskSystemPrompt } from "@/lib/guidance/guidancePrompt";
import { normalizeScreenQuestion, screenCacheKey } from "@/lib/guidance/screenCache";
import { sentinelExplanation, shouldInterceptFraud } from "@/lib/fraud/fraudSentinel";
import {
  analyzeForFraudWithAdvisor,
  INTERACTIVE_ADVISOR_TIMEOUT_MS,
} from "@/lib/fraud/fraudAdvisor";
import { rateLimiter } from "@/lib/data/redis";

const askRequestSchema = z.object({
  app_package: z
    .string()
    .min(1, "app_package is required")
    .max(200)
    .regex(/^[a-zA-Z][a-zA-Z0-9._]*$/),
  question: z.string().min(1, "question is required").max(2000),
  ui_elements: z.array(z.string().max(1000)).min(1).max(500),
  conversation_history: z
    .array(
      z.object({
        role: z.string(),
        content: z.string().max(2000),
      }),
    )
    .optional()
    .default([]),
  guidance_lang: z.enum(["hi", "en"]).optional().default("hi"),
});

/**
 * Self-consistency sampling (k draws, plurality validated target wins) costs
 * model calls, so it runs where it buys something and nowhere else.
 *
 * The flywheel runs in a batch with nobody waiting, and the label it writes is
 * what the next adapter learns from - a wrong label is re-taught for weeks, so
 * the teacher is sampled three times and the majority answer becomes the label.
 * The LoRA is deliberately left greedy (`scope` defaults to 'teacher'): it is the
 * student those very rows train, and voting on a model's own opinions only
 * teaches it its own habits back. `AI_SELF_CONSISTENCY=2|3` opts the interactive
 * paths in instead - there nothing is trained, so voting both engines is simply
 * a better chance at a better answer, at the cost of the elder waiting for it.
 */
function selfConsistencyOptions(isFlywheel: boolean): {
  selfConsistency?: number;
  selfConsistencyScope?: "teacher" | "all";
} {
  if (isFlywheel) return { selfConsistency: 3 };
  const override = Number(process.env.AI_SELF_CONSISTENCY ?? "");
  return Number.isFinite(override) && override > 1
    ? { selfConsistency: Math.min(3, Math.floor(override)), selfConsistencyScope: "all" }
    : {};
}

async function recordModelInteraction(params: {
  interactionId: string;
  elderId: string | null;
  appPackage: string;
  screenHash: string;
  question: string;
  uiElements: string[];
  suggestedIndex: number | null;
  explanation: string;
  source: string;
  modelUsed?: string;
  /**
   * Which language this answer was produced in. The flywheel trains on the pair
   * (instruction, answer), so a row without its language would be re-exported
   * under the wrong instruction - see src/lib/trainingDataExport.ts.
   */
  guidanceLang: GuidanceLang;
}) {
  try {
    await query(
      `INSERT INTO model_interactions 
       (id, elder_id, app_package, screen_hash, question, ui_elements, suggested_index, explanation, source, model_used, guidance_lang)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [
        params.interactionId,
        params.elderId,
        params.appPackage,
        params.screenHash,
        params.question,
        JSON.stringify(params.uiElements),
        params.suggestedIndex,
        params.explanation,
        params.source,
        params.modelUsed || "unknown",
        params.guidanceLang,
      ],
    );
  } catch (err) {
    // A missing guidance_lang column means migration 011 has not been applied.
    // Say so here: the only other symptom is that the flywheel pool quietly
    // stops growing, which is a confusing thing to debug later.
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("guidance_lang")) {
      console.error(
        "Error recording interaction (is migrations/011_add_guidance_lang.sql applied?):",
        err,
      );
    } else {
      console.error("Error recording interaction:", err);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate device session via Redis/DB or internal Flywheel secret FIRST
    const isFlywheel = isFlywheelRequest(req);

    const auth = isFlywheel
      ? { isAuthenticated: true, elderId: undefined }
      : await validateDeviceToken(req);

    if (!auth.isAuthenticated) {
      return NextResponse.json({
        success: true,
        data: {
          explanation:
            "Aapki Elder ID invalid hai. Kripya SaralGati website se naya app download karke sahi Elder ID dalein.",
          source: "security_gate",
          model_used: "none",
        },
      });
    }

    const effectiveElderId = auth.elderId || null;

    // 2. Validate request body against strict Zod schema
    const rawBody = await req.json();
    const parseResult = askRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid payload" },
        { status: 400 },
      );
    }

    const {
      app_package: safeAppPackage,
      question: safeQuestion,
      ui_elements: safeUIElements,
      conversation_history: safeConversationHistory,
      guidance_lang: guidanceLang,
    } = parseResult.data;

    // 3. Apply strict AI processing rate limit (30 req/min per device/IP, 120 for flywheel)
    const rateLimitId = isFlywheel
      ? `ask:flywheel`
      : `ask:device:${auth.elderId ?? req.headers.get("x-forwarded-for") ?? "anon"}`;
    const rateLimit = await rateLimiter(rateLimitId, isFlywheel ? 120 : 30, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many queries. Please wait a moment." },
        { status: 429 },
      );
    }

    const interactionId = crypto.randomUUID();
    const normalizedElements = safeUIElements
      .map((el: string) =>
        el
          .trim()
          .toLowerCase()
          .replace(/\b\d{1,2}:\d{2}\s*(am|pm)?\b/gi, "")
          .replace(/\b\d+%/g, "")
          .replace(/\\(\d+\s*(unread|new)\\)/gi, "")
          .trim(),
      )
      .join("|");
    const screenHash = crypto
      .createHash("sha256")
      .update(normalizedElements)
      .digest("hex")
      .slice(0, 16);

    const normalizedQuestion = normalizeScreenQuestion(safeQuestion);
    const historyHash =
      safeConversationHistory.length > 0
        ? `:${crypto.createHash("sha256").update(JSON.stringify(safeConversationHistory)).digest("hex").slice(0, 8)}`
        : "";
    // The language is part of the key (see src/lib/screenCache.ts): without it a
    // Hindi answer cached for a screen was handed straight back to an elder who
    // had chosen English, which is exactly why "Everything in English" still
    // spoke Hindi. The feedback route builds the same key to promote a verified
    // answer or evict a bad one.
    const cacheKey = screenCacheKey({
      lang: guidanceLang,
      appPackage: safeAppPackage,
      screenHash,
      normalizedQuestion,
      historyHash,
    });

    let finalResult: {
      explanation: string;
      highlightIndex: number | null;
      source: string;
      modelUsed: string;
      flow?: any;
      confidence?: number;
      arbitration?: any;
    } | null = null;

    // === SECURITY GATE: AUTONOMOUS ANTI-FRAUD SENTINEL ===
    // Runs before any guidance (fast path, cache, LLM) because a scam screen must
    // never receive a placement hint. Only DANGEROUS/CRITICAL verdicts intercept;
    // a SUSPICIOUS verdict still travels with the normal answer as a soft warning.
    // The deterministic rules decide first; the fine-tuned LoRA may only raise
    // the verdict (never lower it), which is how the fraud flywheel reaches
    // production instead of stopping at the training data. Short budget: the
    // elder is waiting on spoken guidance, so a stalled model falls back to the
    // rule verdict that is already computed.
    const fraudVerdict = await analyzeForFraudWithAdvisor(
      {
        app_package: safeAppPackage,
        question: safeQuestion,
        ui_elements: safeUIElements,
      },
      { timeoutMs: INTERACTIVE_ADVISOR_TIMEOUT_MS },
    );
    if (shouldInterceptFraud(fraudVerdict)) {
      finalResult = {
        explanation: sentinelExplanation(fraudVerdict, guidanceLang),
        // Point the spotlight at the visible way out, not at the trap.
        highlightIndex: fraudVerdict.action_decision.safe_action_index,
        source: "fraud_sentinel",
        modelUsed: "anti_fraud_sentinel",
      };
      console.warn(
        `Anti-fraud sentinel blocked guidance for elder ${effectiveElderId ?? "unknown"}: ` +
          `${fraudVerdict.threat_level}/${fraudVerdict.threat_category} - ${fraudVerdict.risk_reasoning}`,
      );
    }
    const safety = fraudVerdict.threat_level === "SAFE" ? null : fraudVerdict;

    // === METHOD 0: MULTI-STEP FLOW ENGINE (Stateful Redis Sessions) ===
    if (!finalResult) {
      const flowResult = await evaluateMultiStepFlow(
        effectiveElderId || undefined,
        safeQuestion,
        safeUIElements,
        guidanceLang,
      );
      if (
        flowResult &&
        flowResult.isFlowActive &&
        typeof flowResult.highlightIndex === "number" &&
        flowResult.highlightIndex >= 0
      ) {
        finalResult = {
          explanation: flowResult.explanation || "",
          highlightIndex: flowResult.highlightIndex,
          source: "multi_step_flow",
          modelUsed: flowResult.flowId || "multi_step_flow",
          flow: {
            flow_id: flowResult.flowId,
            current_step: flowResult.currentStep,
            total_steps: flowResult.totalSteps,
            step_label: flowResult.stepLabel,
          },
        };
      }
    }

    // === METHOD 1: BACKEND FAST-PATH ENGINE ===
    // The per-app rule chain lives in lib/agentFastPath so this slice of the
    // product can be tested without a device token, database or Redis.
    if (!finalResult) {
      const fastPath = matchFastPathRule(
        safeAppPackage,
        safeQuestion,
        safeUIElements,
        guidanceLang,
      );
      if (fastPath) {
        finalResult = {
          explanation: fastPath.explanation,
          highlightIndex: fastPath.index,
          source: "fast_path",
          modelUsed: "fast_path_rules",
        };
      }
    }

    // === METHOD 2: REDIS GLOBAL SCREEN CACHE ===
    if (!finalResult) {
      const cached = await cacheGet<{
        explanation: string;
        highlight_index: number | null;
      }>(cacheKey);
      if (
        cached &&
        typeof cached.explanation === "string" &&
        (cached.highlight_index === null ||
          typeof cached.highlight_index === "number")
      ) {
        finalResult = {
          explanation: cached.explanation,
          highlightIndex: cached.highlight_index,
          source: "redis_cache",
          modelUsed: "global_screen_cache",
        };
      }
    }

    // === METHOD 3: LLM & SEMANTIC GROUNDING ===
    if (!finalResult) {
      const { formattedString: formattedElements } = pruneUITree(
        safeUIElements,
        safeQuestion,
      );
      const fewShots = formatRelevantFewShots(
        safeAppPackage,
        safeQuestion,
        4,
        guidanceLang,
      );

      let knownHabitsStr = "";
      if (effectiveElderId) {
        try {
          const habits = await query(
            `SELECT rule_type, rule_payload FROM habit_rules WHERE elder_id = $1 AND confidence >= 0.3 ORDER BY updated_at DESC LIMIT 15`,
            [effectiveElderId],
          );
          if (habits && habits.length > 0) {
            knownHabitsStr =
              "\n\nKnown User Habits/Preferences (Use these to resolve ambiguous names, relations, or routines):\n" +
              habits
                .map((h: any) => {
                  const p =
                    typeof h.rule_payload === "string"
                      ? h.rule_payload
                      : JSON.stringify(h.rule_payload);
                  return `- ${h.rule_type}: ${p}`;
                })
                .join("\n");
          }
        } catch (err) {
          console.error("Error fetching habits:", err);
        }
      }

      // Built by src/lib/guidancePrompt.ts, which the training-data export uses
      // too: the adapter has to be fine-tuned on the prompt the app really sends.
      const systemPrompt = buildAskSystemPrompt({
        lang: guidanceLang,
        appPackage: safeAppPackage,
        elementsBlock: formattedElements,
        habitsBlock: knownHabitsStr,
        fewShotsBlock: fewShots,
      });

      const aiResult = await generateAIResponse({
        systemPrompt,
        userPrompt: safeQuestion,
        conversationHistory: safeConversationHistory,
        uiElements: safeUIElements,
        lang: guidanceLang,
        ...selfConsistencyOptions(isFlywheel),
      });

      const rawExplanation = aiResult.text;
      const targetMatch = rawExplanation.match(/TARGET:\s*(\d+)/i);
      let rawHighlightIndex: number | null = null;
      let cleanExplanation = rawExplanation;

      if (targetMatch) {
        rawHighlightIndex = parseInt(targetMatch[1], 10);
        cleanExplanation = rawExplanation.replace(/TARGET:\s*\d+/gi, "").trim();
      }

      // Semantic Target Validation
      const validation = validateSemanticTarget(
        safeQuestion,
        rawHighlightIndex,
        safeUIElements,
        cleanExplanation,
      );
      const highlightIndex = validation.validatedIndex;

      finalResult = {
        explanation: cleanExplanation,
        highlightIndex,
        source:
          validation.status === "recovered_intent" ||
          validation.status === "recovered_role"
            ? "validated_fallback"
            : aiResult.source,
        modelUsed: aiResult.modelUsed || "unknown",
        confidence: aiResult.confidence,
        arbitration: aiResult.competingResults,
      };

      // Never promote an answer written in the wrong language into the 7-day
      // cache: one Hinglish reply left there would be replayed to an English
      // elder for a week, which is the bug this change is fixing.
      const answerMatchesLanguage =
        guidanceLang !== "en" || !hasDevanagari(cleanExplanation);
      // ...and never promote a weak answer either. The score is the grounded one
      // the arbiter already computed: an answer with no validated target, or one
      // whose sentence names a different button, or one the other engine
      // disagreed with, stays uncached instead of being replayed to every elder
      // on this screen for a week. A cache entry is the strongest claim this
      // system makes, so only a grounded answer is allowed to make it.
      const confidence = aiResult.confidence ?? 0;
      // An answer whose own sentence names a different button is never cached,
      // whatever it scores: the mismatch is a fact about this answer, and the
      // 25-point penalty alone is not always enough to fall under the floor.
      const contradictsTarget = aiResult.grounding?.contradictsTarget === true;
      const cacheable =
        validation.isValid &&
        answerMatchesLanguage &&
        !contradictsTarget &&
        confidence >= MIN_PROMOTABLE_CONFIDENCE;
      if (cacheable) {
        console.log(
          `[Screen Cache] Promoting ${guidanceLang} answer for ${safeAppPackage} ` +
            `(confidence ${confidence}, target ${highlightIndex}).`,
        );
        await cacheSet(
          cacheKey,
          {
            explanation: cleanExplanation,
            highlight_index: highlightIndex,
          },
          7 * 86400,
        );
      }
    }

    // 4. Log interaction asynchronously (single unconditioned call point at end of request)
    await recordModelInteraction({
      interactionId,
      elderId: effectiveElderId,
      appPackage: safeAppPackage,
      screenHash,
      question: safeQuestion,
      uiElements: safeUIElements,
      suggestedIndex: finalResult.highlightIndex,
      explanation: finalResult.explanation,
      source: finalResult.source,
      modelUsed: finalResult.modelUsed,
      guidanceLang,
    });

    return NextResponse.json({
      success: true,
      data: {
        interaction_id: interactionId,
        explanation: finalResult.explanation,
        highlight_index: finalResult.highlightIndex,
        source: finalResult.source,
        model_used: finalResult.modelUsed,
        ...(finalResult.flow ? { flow: finalResult.flow } : {}),
        ...(finalResult.confidence !== undefined
          ? { confidence: finalResult.confidence }
          : {}),
        ...(finalResult.arbitration
          ? { arbitration: finalResult.arbitration }
          : {}),
        ...(safety ? { safety } : {}),
      },
    });
  } catch (error) {
    console.error("Agent Ask Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to answer user question" },
      { status: 500 },
    );
  }
}
