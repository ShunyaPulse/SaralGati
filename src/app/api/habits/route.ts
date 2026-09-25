import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { cacheDelete } from '@/lib/redis';
import { HabitRule, ApiResponse } from '@/types';
import { habitRuleSchema } from '@/lib/validations';

export async function GET(request: Request): Promise<NextResponse<ApiResponse<HabitRule[]>>> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const elderId = searchParams.get('elder_id');
    const userId = session.user.id;

    if (!elderId) {
      return NextResponse.json({ success: false, error: 'elder_id is required' }, { status: 400 });
    }

    // Verify ownership
    const elder = await queryOne(`SELECT id FROM elder_profiles WHERE id = $1 AND caregiver_id = $2`, [elderId, userId]);
    if (!elder) {
      return NextResponse.json({ success: false, error: 'Not Found or Unauthorized' }, { status: 404 });
    }

    const habits = await query<HabitRule>(
      `SELECT * FROM habit_rules WHERE elder_id = $1 ORDER BY created_at DESC`,
      [elderId]
    );

    return NextResponse.json({ success: true, data: habits });
  } catch (error) {
    console.error('Error fetching habits:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse<ApiResponse<HabitRule>>> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = habitRuleSchema.parse(body);
    const userId = session.user.id;

    // Verify ownership
    const elder = await queryOne(`SELECT id FROM elder_profiles WHERE id = $1 AND caregiver_id = $2`, [validatedData.elder_id, userId]);
    if (!elder) {
      return NextResponse.json({ success: false, error: 'Not Found or Unauthorized' }, { status: 404 });
    }

    const newHabit = await queryOne<HabitRule>(
      `INSERT INTO habit_rules (
        elder_id, rule_type, rule_payload, confidence, is_active, updated_at
      ) VALUES ($1, $2, $3::jsonb, $4, $5, NOW()) RETURNING *`,
      [
        validatedData.elder_id,
        validatedData.rule_type,
        JSON.stringify(validatedData.rule_payload),
        validatedData.confidence,
        validatedData.is_active,
      ]
    );

    if (!newHabit) {
      throw new Error('Failed to create habit rule');
    }

    // Invalidate config cache for this elder
    await cacheDelete(`agent-config:${validatedData.elder_id}`);

    return NextResponse.json({ success: true, data: newHabit }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating habit:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: 'Validation Error', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
