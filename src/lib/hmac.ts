import crypto from 'crypto';

const API_SECRET = process.env.API_SECRET || 'saralgati_super_secret_key_2024';

export function verifyAndroidHmac(request: Request): boolean {
  const timestamp = request.headers.get('X-App-Timestamp');
  const signature = request.headers.get('X-App-Signature');

  if (!timestamp || !signature) {
    return false;
  }

  // Prevent replay attacks (allow 5 min drift)
  const now = Date.now();
  const reqTime = parseInt(timestamp, 10);
  if (Math.abs(now - reqTime) > 5 * 60 * 1000) {
    return false;
  }

  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const message = `${method}${path}${timestamp}`;
  const expectedSignature = crypto
    .createHmac('sha256', API_SECRET)
    .update(message)
    .digest('base64');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (e) {
    return false;
  }
}
