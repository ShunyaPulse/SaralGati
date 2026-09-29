import { fail, ok, type ServiceResult } from '@/server/http';
import { getAuthSession } from '@/lib/auth/auth';
import { query, queryOne } from '@/lib/data/db';
import { cacheGet, cacheSet, invalidatePattern } from '@/lib/data/redis';
import { elderProfileSchema } from '@/lib/shared/validations';
import { toApiElder } from '@/lib/shared/utils';
import { ElderProfile, ApiResponse } from '@/types';

/** GET /api/elders - the caregiver's elder profiles, cached for 5 minutes. */
export async function listElders(): Promise<ServiceResult<ApiResponse<ElderProfile[]>>> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return fail(401, { success: false, error: 'Unauthorized' });
    }

    const userId = session.user.id;
    const cacheKey = `elders:${userId}`;

    // Try cache first
    const cached = await cacheGet<ElderProfile[]>(cacheKey);
    if (cached) {
      return ok({ success: true, data: cached });
    }

    // DB Query
    const elders = await query<ElderProfile>(
      `SELECT * FROM elder_profiles WHERE caregiver_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    // Never hand the device bearer token to the browser, or cache it
    const safeElders = elders.map(toApiElder);

    // Set cache
    await cacheSet(cacheKey, safeElders, 300); // 5 minutes

    return ok({ success: true, data: safeElders });
  } catch (error) {
    console.error('Error fetching elders:', error);
    return fail(500, { success: false, error: 'Internal Server Error' });
  }
}

/** POST /api/elders - create an elder profile for the signed-in caregiver. */
export async function createElder(request: Request): Promise<ServiceResult<ApiResponse<ElderProfile>>> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return fail(401, { success: false, error: 'Unauthorized' });
    }

    const body = await request.json();
    const validatedData = elderProfileSchema.parse(body);
    const userId = session.user.id;

    // Insert into DB
    const newElder = await queryOne<ElderProfile>(
      `INSERT INTO elder_profiles (
        caregiver_id, elder_name, phone_model, os_version, emergency_contact, preferred_lang
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        userId,
        validatedData.elder_name,
        validatedData.phone_model || null,
        validatedData.os_version || null,
        validatedData.emergency_contact || null,
        validatedData.preferred_lang || 'hi'
      ]
    );

    if (!newElder) {
      throw new Error('Failed to create elder profile');
    }

    // Invalidate cache
    await invalidatePattern(`elders:${userId}*`);

    return fail(201, { success: true, data: toApiElder(newElder) });
  } catch (error: any) {
    console.error('Error creating elder:', error);

    if (error.name === 'ZodError') {
      return fail(400, { success: false, error: 'Validation Error', details: error.issues });
    }

    return fail(500, { success: false, error: 'Internal Server Error' });
  }
}
