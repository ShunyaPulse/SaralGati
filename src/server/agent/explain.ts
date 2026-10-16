import type { NextRequest } from "next/server";

import { fail, ok, type ServiceResult } from '@/server/http';
import { z } from "zod";
import { generateAIResponse } from "@/lib/ai/aiFallback";
import { isFlywheelRequest, validateDeviceToken } from "@/lib/auth/agent-auth";
import { sentinelExplanation, shouldInterceptFraud } from "@/lib/fraud/fraudSentinel";
import { recordFraudInterceptAlert } from "./fraudCheck";
import {
  analyzeForFraudWithAdvisor,
  INTERACTIVE_ADVISOR_TIMEOUT_MS,
} from "@/lib/fraud/fraudAdvisor";
import { getClientIp, rateLimiter } from "@/lib/data/redis";
import { isActionableElement, elementLabelLower } from "@/lib/guidance/uiElement";
import { isNoiseElement } from "@/lib/guidance/noiseElement";
import { pruneUITree, stripLeadingElementIndex } from "@/lib/guidance/uiPruner";

const explainRequestSchema = z.object({
  app_package: z
    .string()
    .min(1, "app_package is required")
    .max(200)
    .regex(/^[a-zA-Z][a-zA-Z0-9._]*$/),
  ui_elements: z.array(z.string().max(1000)).min(1).max(500),
  guidance_lang: z.enum(["hi", "en"]).optional().default("hi"),
});

export async function explainScreen(req: NextRequest): Promise<ServiceResult> {
  try {
    // 1. Authenticate first
    const isFlywheel = isFlywheelRequest(req);

    const auth = isFlywheel
      ? { isAuthenticated: true, elderId: undefined, caregiverId: undefined }
      : await validateDeviceToken(req);
    if (!auth.isAuthenticated) {
      return ok({
        success: true,
        data: {
          explanation:
            "Aapki Elder ID invalid hai. Kripya SaralGati website se naya app download karke sahi Elder ID dalein.",
          source: "security_gate",
          model_used: "none",
        },
      });
    }

    // 2. Rate limit: screen explanations are never cached, so without this a
    // single paired device could spend the whole AI budget in a minute.
    const rateLimitId = isFlywheel
      ? "explain:flywheel"
      : `explain:device:${auth.elderId ?? getClientIp(req)}`;
    const rateLimit = await rateLimiter(rateLimitId, isFlywheel ? 120 : 20, 60);
    if (!rateLimit.allowed) {
      return fail(429, { success: false, error: "Too many requests. Please wait a moment." });
    }

    // 3. Validate payload with Zod
    const rawBody = await req.json();
    const parseResult = explainRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return fail(400, { success: false, error: "Invalid payload" });
    }

    const {
      app_package: safeAppPackage,
      ui_elements: rawUIElements,
      guidance_lang: guidanceLang,
    } = parseResult.data;

    const safeUIElements = rawUIElements.map((el) => stripLeadingElementIndex(el));

    // === SECURITY GATE: AUTONOMOUS ANTI-FRAUD SENTINEL ===
    // Screen explanations are pushed proactively, so a scam screen must be warned
    // about here too instead of being politely described to the elder.
    // The rules decide; the LoRA may only raise the verdict. Explanations are
    // pushed proactively, so the model gets a short budget instead of holding
    // the screen up.
    const fraudVerdict = await analyzeForFraudWithAdvisor(
      { app_package: safeAppPackage, ui_elements: safeUIElements },
      { timeoutMs: INTERACTIVE_ADVISOR_TIMEOUT_MS },
    );
    if (shouldInterceptFraud(fraudVerdict)) {
      if (!isFlywheel && auth.elderId) {
        await recordFraudInterceptAlert({
          elderId: auth.elderId,
          caregiverId: auth.caregiverId,
          appPackage: safeAppPackage,
          verdict: fraudVerdict,
        });
      }
      console.warn(
        `Anti-fraud sentinel blocked screen explanation for elder ${auth.elderId ?? "unknown"}: ` +
          `${fraudVerdict.threat_level}/${fraudVerdict.threat_category} - ${fraudVerdict.risk_reasoning}`,
      );
      return ok({
        success: true,
        data: {
          explanation: sentinelExplanation(fraudVerdict, guidanceLang),
          highlight_index: fraudVerdict.action_decision.safe_action_index,
          source: "fraud_sentinel",
          model_used: "anti_fraud_sentinel",
          safety: fraudVerdict,
        },
      });
    }
    // A softer verdict still travels with the explanation so the companion can
    // show the advisory (SHOW_WARNING) without losing the screen guidance.
    const safety = fraudVerdict.threat_level === "SAFE" ? null : fraudVerdict;

    const { formattedString: formattedElements } = pruneUITree(safeUIElements);

    const langInstruction =
      guidanceLang === "en"
        ? "Explain this screen in 1 or 2 very simple English sentences. Write only in English words and Latin script, never in Hindi or Devanagari. Only output the English sentence."
        : "Explain this screen in 1 or 2 very simple Hinglish (Hindi written in English script) sentences. Only output the Hinglish sentence.";

    const systemPrompt = `You are SaralGati, a patient companion for Indian elders.
The user is currently looking at an app with package name: ${safeAppPackage}.
Here are the indexed UI elements visible on their screen:
${formattedElements}

${langInstruction}
Tell them where they are and what they can do next. Be comforting and respectful. Do not mention that you are an AI.`;

    const aiResult = await generateAIResponse({
      systemPrompt,
      userPrompt:
        guidanceLang === "en"
          ? "Explain this screen and tell me what I should do."
          : "Is screen ke baare mein samjhao aur batao mujhe kya karna chahiye.",
      lang: guidanceLang,
      // The screen travels with the request: without it the two engines were
      // compared on a score that could not tell a well-grounded sentence from an
      // invented one, because nothing was available to ground against.
      uiElements: safeUIElements,
    });

    // Fine-tuned LoRA adapters and LLM responses may append `TARGET:n`. Strip
    // the control tag so TTS never reads "TARGET 2" aloud, and expose a valid
    // actionable index as `highlight_index` for the companion's spotlight.
    const rawExplanation = aiResult.text;
    const targetMatch = rawExplanation.match(/TARGET:\s*(\d+)/i);
    const cleanExplanation = rawExplanation.replace(/TARGET:\s*\d+/gi, "").trim();
    let highlightIndex: number | null = null;
    if (targetMatch) {
      const candidateIdx = Number.parseInt(targetMatch[1], 10);
      if (
        Number.isInteger(candidateIdx) &&
        candidateIdx >= 0 &&
        candidateIdx < safeUIElements.length
      ) {
        const el = safeUIElements[candidateIdx];
        const actionable = isActionableElement(el);
        if (actionable && !isNoiseElement(elementLabelLower(el), { actionable })) {
          highlightIndex = candidateIdx;
        }
      }
    }

    return ok({
      success: true,
      data: {
        explanation: cleanExplanation,
        highlight_index: highlightIndex,
        source: aiResult.source,
        model_used: aiResult.modelUsed,
        ...(safety ? { safety } : {}),
      },
    });
  } catch (error) {
    console.error("Agent Explain Error:", error);
    return fail(500, { success: false, error: "Failed to process screen context" });
  }
}
