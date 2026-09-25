import { getDeviceSession, setDeviceSession } from './redis';
import { queryOne } from './db';
import crypto from 'crypto';
import { verifyAndroidHmac } from './hmac';

export interface DeviceAuthResult {
  elderId?: string;
  caregiverId?: string;
  isAuthenticated: boolean;
}

export async function validateDeviceToken(request: Request): Promise<DeviceAuthResult> {
  if (!verifyAndroidHmac(request)) {
    return { isAuthenticated: false };
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isAuthenticated: false };
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return { isAuthenticated: false };
  }

  // 1. Try Redis first (sub-millisecond fast path)
  const session = await getDeviceSession(token);
  if (session) {
    return { elderId: session.elderId, caregiverId: session.caregiverId, isAuthenticated: true };
  }

  // 2. Fallback to PostgreSQL (support direct token or elder UUID matching)
  try {
    const profile = await queryOne<{ id: string; caregiver_id: string }>(
      `SELECT id, caregiver_id 
       FROM elder_profiles 
       WHERE (device_token = $1 OR id::text = $1) AND is_active = true`,
      [token]
    );

    if (profile) {
      const data = { elderId: profile.id, caregiverId: profile.caregiver_id };
      // Cache in Redis for 7 days
      await setDeviceSession(token, data, 7 * 86400);
      return { ...data, isAuthenticated: true };
    }
  } catch (err) {
    console.error('Database device token validation error:', err);
  }

  return { isAuthenticated: false };
}

export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Shared secret used by the internal flywheel jobs (GitHub Actions + Kaggle) to
 * call the agent API without a paired device. Read lazily so a rotated value is
 * picked up without a restart, and never with a fallback literal - a placeholder
 * default would turn a missing env var into an open door, since the value would
 * be public in this repository.
 */
export function getInternalSecret(): string | null {
  const secret = process.env.FLYWHEEL_SECRET || process.env.API_SECRET;
  return secret && secret.trim().length > 0 ? secret : null;
}

/** Constant-time comparison that tolerates unequal lengths instead of throwing. */
function timingSafeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/**
 * True only when the caller presents the configured internal secret. Returns
 * false (deny) when the secret is unset, so an unconfigured deployment fails
 * closed instead of accepting a well-known placeholder.
 */
export function isFlywheelRequest(request: Request): boolean {
  const expected = getInternalSecret();
  if (!expected) {
    console.error(
      'FLYWHEEL_SECRET/API_SECRET is not configured - refusing internal agent request',
    );
    return false;
  }

  const headerSecret = request.headers.get('x-flywheel-secret');
  if (headerSecret && timingSafeEqualString(headerSecret, expected)) {
    return true;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return timingSafeEqualString(authHeader.slice(7).trim(), expected);
  }

  return false;
}
