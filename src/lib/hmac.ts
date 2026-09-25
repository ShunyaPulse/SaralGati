import crypto from "crypto";

/**
 * The Android companion signs every request with HMAC-SHA256 using this shared
 * secret. There is deliberately no fallback literal: a default here would be
 * public in the repository, so a deployment missing `API_SECRET` would accept
 * signatures anyone could compute. Missing configuration must deny instead.
 */
function getApiSecret(): string | null {
  const secret = process.env.API_SECRET;
  return secret && secret.trim().length > 0 ? secret : null;
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
