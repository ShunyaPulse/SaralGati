import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import redis, { cacheSet } from '@/lib/redis';

interface FeedbackPayload {
  interaction_id: string;
  feedback: 'tapped_highlight' | 'tapped_other' | 'timeout' | 'disliked';
  actual_tapped_index?: number | null;
}

export async function POST(req: NextRequest) {
  try {
    const body: FeedbackPayload = await req.json();
    const { interaction_id, feedback, actual_tapped_index } = body;

    if (!interaction_id || !feedback) {
      return NextResponse.json({ success: false, error: 'Missing interaction_id or feedback' }, { status: 400 });
    }

    const statusMapping: Record<string, string> = {
      tapped_highlight: 'verified',
      tapped_other: 'rejected',
      disliked: 'rejected',
      timeout: 'timeout',
    };

    const newStatus = statusMapping[feedback] || 'pending';

    // 1. Update the interaction record in PostgreSQL
    const updatedRow = await queryOne<{
      id: string;
      app_package: string;
      screen_hash: string;
      question: string;
      suggested_index: number | null;
      explanation: string;
    }>(
      `UPDATE model_interactions
       SET feedback_status = $1,
           actual_tapped_index = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, app_package, screen_hash, question, suggested_index, explanation`,
      [newStatus, actual_tapped_index ?? null, interaction_id]
    );

    if (!updatedRow) {
      return NextResponse.json({ success: false, error: 'Interaction not found' }, { status: 404 });
    }

    let verifiedCount = 0;
    let promoted = false;

    // 2. Continuous Learning: If user successfully tapped the suggested button, promote to Redis GSC
    if (feedback === 'tapped_highlight' && updatedRow.suggested_index !== null) {
      const normalizedQuestion = updatedRow.question
        .trim()
        .toLowerCase()
        .replace(/[^\w\s\u0900-\u097F]/g, '')
        .replace(/\s+/g, ' ');

      const statsKey = `screen_stats:${updatedRow.screen_hash}:${normalizedQuestion}`;

      try {
        verifiedCount = await redis.hincrby(statsKey, 'verified_count', 1);
        await redis.expire(statsKey, 60 * 86400); // Retain stats for 60 days

        // Auto-promote to Golden Cache if verified count >= 2 (or on first success for instant feedback)
        if (verifiedCount >= 2) {
          const cacheKey = `screen_cache:${updatedRow.app_package}:${updatedRow.screen_hash}:${normalizedQuestion}`;
          await cacheSet(
            cacheKey,
            {
              explanation: updatedRow.explanation,
              highlight_index: updatedRow.suggested_index,
            },
            30 * 86400 // 30-day extended TTL for verified golden answers
          );
          promoted = true;
        }
      } catch (redisErr) {
        console.error('Failed to update Redis feedback stats:', redisErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        interaction_id,
        status: newStatus,
        verified_count: verifiedCount,
        promoted_to_golden_cache: promoted,
      },
    });
  } catch (error) {
    console.error('Agent Feedback Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
