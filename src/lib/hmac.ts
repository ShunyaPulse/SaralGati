import crypto from "crypto";

/**
 * The Android companion signs every request with HMAC-SHA256 using a shared
 * secret. We support the configured secret from API_SECRET / FLYWHEEL_SECRET,
 * with fallback to the standard placeholder 'YOUR_API_SECRET' for transition
 * support with installed companion APKs.
 */
function getCandidateSecrets(): string[] {
  const secrets: string[] = [];
  const primary = process.env.API_SECRET?.trim() || process.env.FLYWHEEL_SECRET?.trim();
  if (primary) {
    secrets.push(primary);
  }
  const fallback = "YOUR_API_SECRET";
  if (!secrets.includes(fallback)) {
    secrets.push(fallback);
  }
  return secrets;
}

/** Constant-time comparison that tolerates unequal lengths instead of throwing. */
function timingSafeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function verifyAndroidHmac(request: Request): boolean {
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

  const candidateSecrets = getCandidateSecrets();
  for (const secret of candidateSecrets) {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(message)
      .digest("base64");

    if (timingSafeEqualString(signature, expectedSignature)) {
      return true;
    }
  }

  return false;
}
