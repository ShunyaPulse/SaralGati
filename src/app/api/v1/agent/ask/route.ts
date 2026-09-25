import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { generateAIResponse } from "@/lib/aiFallback";
import { cacheGet, cacheSet } from "@/lib/redis";
import { matchFastPathRule } from "@/lib/agentFastPath";
import { pruneUITree } from "@/lib/uiPruner";
import { evaluateMultiStepFlow } from "@/lib/flowEngine";
import { formatRelevantFewShots } from "@/lib/fewShotGrounding";
import { validateSemanticTarget } from "@/lib/semanticValidator";
import { query } from "@/lib/db";
import { isFlywheelRequest, validateDeviceToken } from "@/lib/agent-auth";
import { rateLimiter } from "@/lib/redis";

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
});

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
}) {
  try {
    await query(
      `INSERT INTO model_interactions 
       (id, elder_id, app_package, screen_hash, question, ui_elements, suggested_index, explanation, source, model_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
      ],
    );
  } catch (err) {
    console.error("Error recording interaction:", err);
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

    const normalizedQuestion = safeQuestion
      .trim()
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u097F]/g, "")
      .replace(/\s+/g, " ");
    const historyHash =
      safeConversationHistory.length > 0
        ? `:${crypto.createHash("sha256").update(JSON.stringify(safeConversationHistory)).digest("hex").slice(0, 8)}`
        : "";
    const cacheKeyRaw = `${safeAppPackage}:${screenHash}:${normalizedQuestion}${historyHash}`;
    const cacheKeyHash = crypto
      .createHash("sha256")
      .update(cacheKeyRaw)
      .digest("hex");
    const cacheKey = `screen_cache:${cacheKeyHash}`;

    let finalResult: {
      explanation: string;
      highlightIndex: number | null;
      source: string;
      modelUsed: string;
      flow?: any;
      confidence?: number;
      arbitration?: any;
    } | null = null;

    // === METHOD 0: MULTI-STEP FLOW ENGINE (Stateful Redis Sessions) ===
    const flowResult = await evaluateMultiStepFlow(
      effectiveElderId || undefined,
      safeQuestion,
      safeUIElements,
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

    // === METHOD 1: BACKEND FAST-PATH ENGINE ===
    // The per-app rule chain lives in lib/agentFastPath so this slice of the
    // product can be tested without a device token, database or Redis.
    if (!finalResult) {
      const fastPath = matchFastPathRule(
        safeAppPackage,
        safeQuestion,
        safeUIElements,
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
      const fewShots = formatRelevantFewShots(safeAppPackage, safeQuestion, 4);

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

      const systemPrompt = `You are SaralGati, a patient, warm companion for Indian elders.${knownHabitsStr}
The user is looking at an Android app: ${safeAppPackage}.
Here are the numbered interactive elements on their screen:
${formattedElements}

Instructions:
1. Answer the user's question in 1 or 2 simple, comforting Hinglish (Hindi written in English script) sentences.
2. Elements on screen are prefixed with their role:
   - [BUTTON]: Clickable button or icon that can be tapped.
   - [INPUT]: Text input box for typing.
   - [TOGGLE]: Switch or checkbox.
   - [TEXT]: Plain static non-clickable text or title.
3. When guiding the user to tap, open, or take action, ALWAYS target an interactive element ([BUTTON], [INPUT], or [TOGGLE]). Never target static [TEXT] unless specifically asked to read or verify text.
4. If your answer directs the user to tap or look at a specific element on screen, append " TARGET:[index]" at the very end of your response, where [index] is the exact number of that element (for example: TARGET:2).
5. If no specific element needs to be tapped, do NOT output any TARGET tag.
6. Do not mention that you are an AI. Only output the Hinglish sentence.

Few-shot Grounding Examples:
${fewShots}`;

      const aiResult = await generateAIResponse({
        systemPrompt,
        userPrompt: safeQuestion,
        conversationHistory: safeConversationHistory,
        uiElements: safeUIElements,
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

      if (validation.isValid) {
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
