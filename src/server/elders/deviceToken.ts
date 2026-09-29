import { fail, ok, type ServiceResult } from '@/server/http';
import { getAuthSession } from '@/lib/auth/auth';
import { queryOne } from '@/lib/data/db';
import { cacheDelete, setDeviceSession } from '@/lib/data/redis';
import { randomBytes } from 'crypto';

/**
 * POST /api/device-token - mint (and rotate) the bearer token a paired phone
 * uses for every companion request.
 */
export async function issueDeviceToken(request: Request): Promise<ServiceResult> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return fail(401, { success: false, error: 'Unauthorized' });
    }

    const body = await request.json();
    const { elderId } = body;
    const userId = session.user.id;

    if (!elderId) {
      return fail(400, { success: false, error: 'elderId is required' });
    }

    // Verify ownership
    const elder = await queryOne<{ id: string; elder_name: string }>(
      `SELECT id, elder_name FROM elder_profiles WHERE id = $1 AND caregiver_id = $2`,
      [elderId, userId]
    );
    if (!elder) {
      return fail(404, { success: false, error: 'Not Found or Unauthorized' });
    }

    // Read the token being replaced first: rotating it has to retire the cached
    // session for the old value too, otherwise a token that leaked from a lost
    // phone keeps working until its (up to) 30 day Redis entry expires.
    const previous = await queryOne<{ device_token: string | null }>(
      `SELECT device_token FROM elder_profiles WHERE id = $1`,
      [elderId]
    );

    // Generate bearer token: sg_ + 32 random hex chars
    const plainToken = `sg_${randomBytes(16).toString('hex')}`;

    // Save token in DB
    const updated = await queryOne(`
      UPDATE elder_profiles 
      SET device_token = $1, updated_at = NOW() 
      WHERE id = $2 RETURNING id
    `, [plainToken, elderId]);

    if (!updated) {
      throw new Error('Failed to save device token');
    }

    // Cache in Redis device session for 30 days
    try {
      const staleToken = previous?.device_token;
      if (staleToken && staleToken !== plainToken) {
        await cacheDelete(`device_session:${staleToken}`);
      }
      await setDeviceSession(plainToken, { elderId: elder.id, caregiverId: userId }, 30 * 86400);
    } catch (redisErr) {
      console.error('Failed to cache device session in Redis:', redisErr);
    }

    // Derive the API base URL from the request that generated the token, so a
    // self-hosted or staging deployment never hands the phone a hardcoded URL
    // pointing at some other environment.
    const forwardedHost = request.headers.get('x-forwarded-host');
    const host = forwardedHost || request.headers.get('host');
    const proto = forwardedHost
      ? (request.headers.get('x-forwarded-proto') || 'https')
      : 'https';
    const apiUrl = host
      ? `${proto}://${host}`
      : (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '');

    return ok({
      success: true,
      data: {
        token: plainToken,
        elderId: elder.id,
        elderName: elder.elder_name,
        apiUrl
      }
    });
  } catch (error) {
    console.error('Error generating device token:', error);
    return fail(500, { success: false, error: 'Internal Server Error' });
  }
}
