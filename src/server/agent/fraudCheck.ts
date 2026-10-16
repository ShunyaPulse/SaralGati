import type { NextRequest } from "next/server";

import { fail, ok, type ServiceResult } from '@/server/http';
import crypto from "crypto";
import { z } from "zod";
import { isFlywheelRequest, validateDeviceToken } from "@/lib/auth/agent-auth";
import {
  analyzeForFraudWithAdvisor,
  DEVICE_ADVISOR_TIMEOUT_MS,
} from "@/lib/fraud/fraudAdvisor";
import type { FraudSentinelVerdict } from "@/lib/fraud/fraudSentinel";
import { FRAUD_INTERCEPT_KIND } from "@/lib/notify/alerts";
import { query, queryOne } from "@/lib/data/db";
import { deduplicateAlert, getClientIp, invalidatePattern, rateLimiter } from "@/lib/data/redis";

/**
 * Record a caregiver-visible alert in `assistance_logs` when the anti-fraud
 * sentinel intercepts a DANGEROUS or CRITICAL scam screen on a paired elder's
 * phone. Deduplicated per (elderId, appPackage, threatCategory) so repeated
 * screen polls do not flood the caregiver feed.
 */
export async function recordFraudInterceptAlert(params: {
  elderId: string;
  caregiverId?: string;
  appPackage?: string | null;
  verdict: FraudSentinelVerdict;
}): Promise<void> {
  const { elderId, appPackage, verdict } = params;
  if (
    verdict.threat_level !== "DANGEROUS" &&
    verdict.threat_level !== "CRITICAL"
  ) {
    return;
  }

  try {
    const dedupeKey = `fraud:${appPackage || "unknown"}:${verdict.threat_category}`;
    const isDuplicate = await deduplicateAlert(elderId, dedupeKey);
    if (isDuplicate) return;

    let caregiverId = params.caregiverId;
    if (!caregiverId) {
      const elder = await queryOne<{ caregiver_id: string }>(
        `SELECT caregiver_id FROM elder_profiles WHERE id = $1`,
        [elderId],
      );
      caregiverId = elder?.caregiver_id;
    }

    const titleEn =
      verdict.user_alert.title_en || verdict.user_alert.title || "Scam Alert";
    const severity =
      verdict.threat_level === "CRITICAL" ? "critical" : "high";
    const metadata = {
      kind: FRAUD_INTERCEPT_KIND,
      threat_level: verdict.threat_level,
      threat_category: verdict.threat_category,
      severity,
      description: `${titleEn} (${verdict.threat_level}) intercepted on ${appPackage || "companion"}`,
    };

    await queryOne(
      `INSERT INTO assistance_logs (
        elder_id, event_type, screen_name, app_package, duration_ms, metadata
      ) VALUES ($1, 'emergency', $2, $3, 0, $4) RETURNING id`,
      [
        elderId,
        titleEn.slice(0, 255),
        (appPackage || "com.saralgati.app").slice(0, 255),
        JSON.stringify(metadata),
      ],
    );

    if (caregiverId) {
      await invalidatePattern(`alerts:${caregiverId}*`);
    }
  } catch (err) {
    console.error("Failed to record caregiver fraud intercept alert:", err);
  }
}

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
 */
export async function checkFraud(req: NextRequest): Promise<ServiceResult> {
  try {
    const isFlywheel = isFlywheelRequest(req);
    const auth = isFlywheel
      ? { isAuthenticated: true, elderId: undefined, caregiverId: undefined }
      : await validateDeviceToken(req);

    if (!auth.isAuthenticated) {
      return fail(401, { success: false, error: "Unauthorized" });
    }

    const rateLimitId = isFlywheel
      ? "fraud:flywheel"
      : `fraud:device:${auth.elderId ?? getClientIp(req)}`;
    const rateLimit = await rateLimiter(rateLimitId, isFlywheel ? 240 : 120, 60);
    if (!rateLimit.allowed) {
      return fail(429, { success: false, error: "Too many requests. Please wait a moment." });
    }

    const rawBody = await req.json().catch(() => null);
    const parseResult = fraudCheckRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return fail(400, { success: false, error: "Invalid payload" });
    }

    const verdict = await analyzeForFraudWithAdvisor(parseResult.data, {
      timeoutMs: DEVICE_ADVISOR_TIMEOUT_MS,
    });

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
            verdict.threat_level === expectedLevel &&
              (!expectedCategory || verdict.threat_category === expectedCategory),
          ],
        );
      } catch (persistError) {
        console.error("Fraud training capture failed:", persistError);
      }
    }

    if (
      !isFlywheel &&
      (verdict.threat_level === "DANGEROUS" ||
        verdict.threat_level === "CRITICAL")
    ) {
      const effectiveAppPackage =
        parseResult.data.app_package ??
        parseResult.data.app_package_hint ??
        null;

      if (auth.elderId) {
        await recordFraudInterceptAlert({
          elderId: auth.elderId,
          caregiverId: auth.caregiverId,
          appPackage: effectiveAppPackage,
          verdict,
        });
      }

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

        await query(
          `INSERT INTO fraud_training_cases
             (elder_id, app_package, screen_hash, input_signals, verdict,
              predicted_level, predicted_category, is_correct, source)
           SELECT $1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, NULL, 'device'
           WHERE NOT EXISTS (
             SELECT 1 FROM fraud_training_cases WHERE screen_hash = $3
           )`,
          [
            auth.elderId ?? null,
            effectiveAppPackage,
            screenHash,
            JSON.stringify(signals),
            JSON.stringify(verdict),
            verdict.threat_level,
            verdict.threat_category ?? null,
          ],
        );
      } catch (persistError) {
        console.error("Device fraud capture failed:", persistError);
      }
    }

    if (
      verdict.threat_level === "DANGEROUS" ||
      verdict.threat_level === "CRITICAL"
    ) {
      console.warn(
        `Anti-fraud sentinel: ${verdict.threat_level}/${verdict.threat_category} ` +
          `for elder ${auth.elderId ?? "unknown"} - ${verdict.risk_reasoning}`,
      );
    }

    return ok(verdict);
  } catch (error) {
    console.error("Anti-Fraud Sentinel Error:", error);
    return fail(500, { success: false, error: "Failed to analyse input" });
  }
}
