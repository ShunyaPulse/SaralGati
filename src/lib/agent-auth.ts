import { getDeviceSession, setDeviceSession } from './redis';
import { queryOne } from './db';
import crypto from 'crypto';

export interface DeviceAuthResult {
  elderId?: string;
  caregiverId?: string;
  isAuthenticated: boolean;
}

export async function validateDeviceToken(request: Request): Promise<DeviceAuthResult> {
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

