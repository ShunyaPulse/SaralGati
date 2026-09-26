import crypto from "crypto";

/**
 * The Android companion signs every request with HMAC-SHA256 using the configured
 * API_SECRET (or FLYWHEEL_SECRET). No placeholder fallbacks are permitted.
 */
function getApiSecret(): string | null {
  const secret = process.env.API_SECRET?.trim() || process.env.FLYWHEEL_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
}

/** Constant-time comparison that tolerates unequal lengths instead of throwing. */
function timingSafeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function verifyAndroidHmac(request: Request): boolean {
  const apiSecret = getApiSecret();
  if (!apiSecret) {
    console.error(
      "API_SECRET is not configured - rejecting companion request with a signature",
    );
    return false;
  }

  const timestamp = request.headers.get("X-App-Timestamp");
  const signature = request.headers.get("X-App-Signature");

  if (!timestamp || !signature) {
    return false;
  }

  // Prevent replay attacks (allow 5 min drift)
  const reqTime = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(reqTime)) {
    return false;
  }
  if (Math.abs(Date.now() - reqTime) > 5 * 60 * 1000) {
    return false;
  }

  const url = new URL(request.url);
  const message = `${request.method}${url.pathname}${timestamp}`;

  const expectedSignature = crypto
    .createHmac("sha256", apiSecret)
    .update(message)
    .digest("base64");

  return timingSafeEqualString(signature, expectedSignature);
}
