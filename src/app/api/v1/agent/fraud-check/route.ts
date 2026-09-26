import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { isFlywheelRequest, validateDeviceToken } from "@/lib/agent-auth";
import { analyzeForFraud } from "@/lib/fraudSentinel";
import { query } from "@/lib/db";
import { rateLimiter } from "@/lib/redis";

/**
 * Request for the Autonomous Anti-Fraud Sentinel.
 *
 * Every field is optional (the companion may only have a notification body, or
 * only a URL), but at least one source must arrive - an empty payload would
 * otherwise always read as "safe".
 */
const fraudCheckRequestSchema = z
  .object({
    ui_elements: z.array(z.string().max(2000)).max(300).optional(),
    screen_text: z.string().max(4000).optional(),
    messages: z.array(z.string().max(2000)).max(50).optional(),
    urls: z.array(z.string().max(2000)).max(50).optional(),
    question: z.string().max(2000).optional(),
    app_package: z.string().max(200).optional(),
    // Ground truth supplied only by the training flywheel. Live companions never
    // send these, and the values are never trusted for the live verdict - they
    // are stored purely as an SFT label for the LoRA flywheel.
    expected_threat_level: z
      .enum(["SAFE", "SUSPICIOUS", "DANGEROUS", "CRITICAL"])
      .optional(),
    expected_threat_category: z.string().max(50).optional(),
    app_package_hint: z.string().max(200).optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.ui_elements?.length ||
          value.screen_text?.trim() ||
          value.messages?.length ||
          value.urls?.length ||
          value.question?.trim(),
      ),
    { message: "At least one input source is required" },
  );

/**
 * POST /api/v1/agent/fraud-check
 *
 * Real-time scam verdict for one screen / message batch. Returns the sentinel
 * JSON as the *whole* body (no {success, data} envelope) because the companion
 * parses it directly and the spec requires the response to be only the verdict.
 * Errors keep a normal error envelope - an authentication failure must never be
 * mistaken for a SAFE verdict.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Same gate as the rest of the agent API: signed companion request with a
    // paired device token, or the internal flywheel secret for training runs.
    const isFlywheel = isFlywheelRequest(req);
    const auth = isFlywheel
      ? { isAuthenticated: true, elderId: undefined }
      : await validateDeviceToken(req);

    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // 2. Rate limit: screen changes are frequent, so the ceiling is higher than
    // /ask but still capped per device.
    const rateLimitId = isFlywheel
      ? "fraud:flywheel"
      : `fraud:device:${auth.elderId ?? req.headers.get("x-forwarded-for") ?? "anon"}`;
    const rateLimit = await rateLimiter(rateLimitId, isFlywheel ? 240 : 60, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please wait a moment." },
        { status: 429 },
      );
    }

    // 3. Validate payload with Zod before any text reaches the rules.
    const rawBody = await req.json().catch(() => null);
    const parseResult = fraudCheckRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid payload" },
        { status: 400 },
      );
    }

    const verdict = analyzeForFraud(parseResult.data);

    // Flywheel-only training capture: when Gemini supplies a ground-truth label,
    // store the verdict against it so the LoRA export (type=fraud) can learn the
    // same scam signals the deterministic rules already catch. Never blocks or
    // changes the live verdict, and a persistence failure cannot fail the check.
    if (isFlywheel && parseResult.data.expected_threat_level) {
      try {
        const { ui_elements, urls, messages, question, screen_text } =
          parseResult.data;
        const signals = {
          ui_elements: ui_elements ?? [],
          urls: urls ?? [],
          messages: messages ?? [],
          question: question ?? "",
          screen_text: screen_text ?? "",
        };
        const screenHash = crypto
          .createHash("sha256")
          .update(JSON.stringify(signals))
          .digest("hex")
          .slice(0, 64);
        const expectedLevel = parseResult.data.expected_threat_level;
        const expectedCategory =
          parseResult.data.expected_threat_category ?? null;

        await query(
          `INSERT INTO fraud_training_cases
             (app_package, screen_hash, input_signals, verdict, predicted_level,
              predicted_category, expected_level, expected_category, is_correct, source)
           VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9, 'flywheel')`,
          [
            parseResult.data.app_package ??
              parseResult.data.app_package_hint ??
              null,
            screenHash,
            JSON.stringify(signals),
            JSON.stringify(verdict),
            verdict.threat_level,
            verdict.threat_category ?? null,
            expectedLevel,
            expectedCategory,
            verdict.threat_level === expectedLevel,
          ],
        );
      } catch (persistError) {
        console.error("Fraud training capture failed:", persistError);
      }
    }

    // Log only the verdict and reasoning, never the elder's raw screen text.
    if (verdict.threat_level === "DANGEROUS" || verdict.threat_level === "CRITICAL") {
      console.warn(
        `Anti-fraud sentinel: ${verdict.threat_level}/${verdict.threat_category} ` +
          `for elder ${auth.elderId ?? "unknown"} - ${verdict.risk_reasoning}`,
      );
    }

    return NextResponse.json(verdict);
  } catch (error) {
    console.error("Anti-Fraud Sentinel Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to analyse input" },
      { status: 500 },
    );
  }
}
