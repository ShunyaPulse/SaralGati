import { fail, ok, type ServiceResult } from '@/server/http';
import { getAuthSession } from '@/lib/auth/auth';
import { queryOne } from '@/lib/data/db';
import { cacheDelete, invalidatePattern } from '@/lib/data/redis';
import { validateDeviceToken } from '@/lib/auth/agent-auth';
import { elderProfileSchema, elderPreferencesSchema } from '@/lib/shared/validations';
import { toApiElder } from '@/lib/shared/utils';
import { ElderProfile, ApiResponse } from '@/types';

/**
 * GET /api/elders/:id - three callers on one URL: the caregiver dashboard, the
 * paired companion app (device token), and the pairing handshake that only needs
 * to know the elder exists (by Elder UUID or `sg_...` manual pairing token).
 * Thinner payloads as trust decreases, and `device_token` is never echoed back.
 */
export async function getElder(
  request: Request,
  elderId: string
): Promise<ServiceResult<ApiResponse<ElderProfile>>> {
  try {
    const session = await getAuthSession();

    if (session?.user?.id) {
      const userId = session.user.id;
      const elder = await queryOne<ElderProfile>(
        `SELECT * FROM elder_profiles WHERE id = $1 AND caregiver_id = $2`,
        [elderId, userId]
      );

      if (!elder) {
        return fail(404, { success: false, error: 'Not Found' });
      }

      return ok({ success: true, data: toApiElder(elder) });
    }

    // Companion app / device token check: a paired device may only inspect its own elder profile
    const auth = await validateDeviceToken(request);
    if (auth.isAuthenticated && auth.elderId) {
      const elder = await queryOne<ElderProfile>(
        `SELECT * FROM elder_profiles
         WHERE id = $1 AND (id::text = $2 OR device_token = $2) AND is_active = true`,
        [auth.elderId, elderId]
      );
      if (elder) {
        return ok({ success: true, data: toApiElder(elder) });
      }
    }

    // Public existence check for initial pairing handshake (accepts Elder UUID or sg_... pairing token)
    const existingElder = await queryOne<ElderProfile>(
      `SELECT id, caregiver_id, elder_name, phone_model, os_version, battery_status,
              emergency_contact, preferred_lang, last_heartbeat, is_active
       FROM elder_profiles
       WHERE (id::text = $1 OR device_token = $1) AND is_active = true`,
      [elderId]
    );

    if (existingElder) {
      return ok({ success: true, data: toApiElder(existingElder) });
    }

    return fail(404, { success: false, error: 'Elder not found' });
  } catch (error) {
    console.error('Error fetching elder:', error);
    return fail(500, { success: false, error: 'Internal Server Error' });
  }
}

/**
 * PATCH /api/elders/:id - preferences a caregiver toggles without editing the
 * profile. Separate from PUT so a mute switch cannot blank out fields the toggle
 * never sent.
 */
export async function updateElderPreferences(
  request: Request,
  elderId: string
): Promise<ServiceResult<ApiResponse<ElderProfile>>> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return fail(401, { success: false, error: 'Unauthorized' });
    }

    const userId = session.user.id;
    const parsed = elderPreferencesSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return fail(400, {
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid payload',
      });
    }

    const updatedElder = await queryOne<ElderProfile>(
      `UPDATE elder_profiles SET
        safe_zone_email_enabled = $1, updated_at = NOW()
       WHERE id = $2 AND caregiver_id = $3 RETURNING *`,
      [parsed.data.safe_zone_email_enabled, elderId, userId]
    );

    if (!updatedElder) {
      return fail(404, { success: false, error: 'Not Found or Unauthorized' });
    }

    await cacheDelete(`elders:${userId}`);

    return ok({ success: true, data: toApiElder(updatedElder) });
  } catch (error: any) {
    console.error('Error updating elder preferences:', error);
    if (error?.code === '42703') {
      return fail(503, {
        success: false,
        error: 'This preference is not available yet - a database migration is pending.',
      });
    }
    return fail(500, { success: false, error: 'Internal Server Error' });
  }
}

/** PUT /api/elders/:id - full profile edit from the dashboard. */
export async function replaceElder(
  request: Request,
  elderId: string
): Promise<ServiceResult<ApiResponse<ElderProfile>>> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return fail(401, { success: false, error: 'Unauthorized' });
    }

    const userId = session.user.id;
    const body = await request.json();
    const validatedData = elderProfileSchema.parse(body);

    const existing = await queryOne(`SELECT id FROM elder_profiles WHERE id = $1 AND caregiver_id = $2`, [elderId, userId]);
    if (!existing) {
      return fail(404, { success: false, error: 'Not Found or Unauthorized' });
    }

    const updatedElder = await queryOne<ElderProfile>(
      `UPDATE elder_profiles SET
        elder_name = $1, phone_model = $2, os_version = $3, emergency_contact = $4,
        preferred_lang = $5, updated_at = NOW()
       WHERE id = $6 AND caregiver_id = $7 RETURNING *`,
      [
        validatedData.elder_name,
        validatedData.phone_model || null,
        validatedData.os_version || null,
        validatedData.emergency_contact || null,
        validatedData.preferred_lang || 'hi',
        elderId,
        userId
      ]
    );

    if (!updatedElder) {
      throw new Error('Update failed');
    }

    // O(1) cache delete
    await cacheDelete(`elders:${userId}`);
    await cacheDelete(`agent-config:${elderId}`);

    return ok({ success: true, data: toApiElder(updatedElder) });
  } catch (error: any) {
    console.error('Error updating elder:', error);
    if (error.name === 'ZodError') {
      return fail(400, { success: false, error: 'Validation Error', details: error.issues });
    }
    return fail(500, { success: false, error: 'Internal Server Error' });
  }
}

/** DELETE /api/elders/:id - remove an elder profile the caregiver owns. */
export async function deleteElder(
  elderId: string
): Promise<ServiceResult<ApiResponse<null>>> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return fail(401, { success: false, error: 'Unauthorized' });
    }

    const userId = session.user.id;

    const result = await queryOne(
      `DELETE FROM elder_profiles WHERE id = $1 AND caregiver_id = $2 RETURNING id`,
      [elderId, userId]
    );

    if (!result) {
      return fail(404, { success: false, error: 'Not Found or Unauthorized' });
    }

    await cacheDelete(`elders:${userId}`);
    await invalidatePattern(`alerts:${userId}*`);
    await cacheDelete(`agent-config:${elderId}`);
    await cacheDelete(`agent-habits:${elderId}`);
    await cacheDelete(`agent-geofences:${elderId}`);

    return ok({ success: true, data: null });
  } catch (error) {
    console.error('Error deleting elder:', error);
    return fail(500, { success: false, error: 'Internal Server Error' });
  }
}
