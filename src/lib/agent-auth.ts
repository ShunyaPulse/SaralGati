import { getDeviceSession, setDeviceSession } from './redis';
import { queryOne } from './db';
import crypto from 'crypto';

export async function validateDeviceToken(request: Request): Promise<{ elderId: string; caregiverId: string }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const token = authHeader.substring(7);
  
  // Try Redis first
  const session = await getDeviceSession(token);
  if (session) {
    return session;
  }

  // Fallback to DB
  const profile = await queryOne<{ id: string; caregiver_id: string }>(
    'SELECT id, caregiver_id FROM elder_profiles WHERE device_token = $1 AND is_active = true',
    [token]
  );

  if (!profile) {
    throw new Error('Unauthorized');
  }

  const data = { elderId: profile.id, caregiverId: profile.caregiver_id };
  
  // Cache in Redis for future requests (24 hours)
  await setDeviceSession(token, data, 86400);

  return data;
}

export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
