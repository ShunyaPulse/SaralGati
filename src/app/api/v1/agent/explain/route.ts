import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateAIResponse } from "@/lib/aiFallback";
import { isFlywheelRequest, validateDeviceToken } from "@/lib/agent-auth";
import {
  analyzeForFraud,
  sentinelExplanation,
  shouldInterceptFraud,
} from "@/lib/fraudSentinel";
import { rateLimiter } from "@/lib/redis";

const explainRequestSchema = z.object({
  app_package: z
    .string()
    .min(1, "app_package is required")
    .max(200)
    .regex(/^[a-zA-Z][a-zA-Z0-9._]*$/),
  ui_elements: z.array(z.string().max(1000)).min(1).max(500),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate first
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

    // 2. Rate limit: screen explanations are never cached, so without this a
    // single paired device could spend the whole AI budget in a minute.
    const rateLimitId = isFlywheel
      ? "explain:flywheel"
      : `explain:device:${auth.elderId ?? req.headers.get("x-forwarded-for") ?? "anon"}`;
    const rateLimit = await rateLimiter(rateLimitId, isFlywheel ? 120 : 20, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please wait a moment." },
        { status: 429 },
      );
    }

    // 3. Validate payload with Zod
    const rawBody = await req.json();
    const parseResult = explainRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid payload" },
        { status: 400 },
      );
    }

    const { app_package: safeAppPackage, ui_elements: safeUIElements } =
      parseResult.data;

    // === SECURITY GATE: AUTONOMOUS ANTI-FRAUD SENTINEL ===
    // Screen explanations are pushed proactively, so a scam screen must be warned
    // about here too instead of being politely described to the elder.
    const fraudVerdict = analyzeForFraud({
      app_package: safeAppPackage,
      ui_elements: safeUIElements,
    });
    if (shouldInterceptFraud(fraudVerdict)) {
      console.warn(
        `Anti-fraud sentinel blocked screen explanation for elder ${auth.elderId ?? "unknown"}: ` +
          `${fraudVerdict.threat_level}/${fraudVerdict.threat_category} - ${fraudVerdict.risk_reasoning}`,
      );
      return NextResponse.json({
        success: true,
        data: {
          explanation: sentinelExplanation(fraudVerdict),
          source: "fraud_sentinel",
          model_used: "anti_fraud_sentinel",
          safety: fraudVerdict,
        },
      });
    }
    // A softer verdict still travels with the explanation so the companion can
    // show the advisory (SHOW_WARNING) without losing the screen guidance.
    const safety = fraudVerdict.threat_level === "SAFE" ? null : fraudVerdict;

    const systemPrompt = `You are SaralGati, a patient companion for Indian elders.
The user is currently looking at an app with package name: ${safeAppPackage}.
Here are the text elements visible on their screen:
${safeUIElements.join(" | ")}

Explain this screen to the elder in 1 or 2 very simple Hinglish (Hindi written in English script) sentences. 
Tell them where they are and what they can do next. Be comforting and respectful. Do not mention that you are an AI. Only output the Hinglish sentence.`;

    const aiResult = await generateAIResponse({
      systemPrompt,
      userPrompt:
        "Is screen ke baare mein samjhao aur batao mujhe kya karna chahiye.",
    });

    return NextResponse.json({
      success: true,
      data: {
        explanation: aiResult.text,
        source: aiResult.source,
        model_used: aiResult.modelUsed,
        ...(safety ? { safety } : {}),
      },
    });
  } catch (error) {
    console.error("Agent Explain Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process screen context" },
      { status: 500 },
    );
  }
}
