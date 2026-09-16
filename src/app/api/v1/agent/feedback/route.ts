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
    let corrected = false;
    let evicted = false;

    const normalizedQuestion = updatedRow.question
      .trim()
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u097F]/g, '')
      .replace(/\s+/g, ' ');

    const statsKey = `screen_stats:${updatedRow.screen_hash}:${normalizedQuestion}`;
    const cacheKey = `screen_cache:${updatedRow.app_package}:${updatedRow.screen_hash}:${normalizedQuestion}`;

    // 2. Continuous Learning Loop
    if (feedback === 'tapped_highlight' && updatedRow.suggested_index !== null) {
      // 2A. Positive Reinforcement: User tapped the suggested button
      try {
        verifiedCount = await redis.hincrby(statsKey, 'verified_count', 1);
        await redis.expire(statsKey, 60 * 86400); // Retain stats for 60 days

        // Auto-promote to Golden Cache if verified count >= 2
        if (verifiedCount >= 2) {
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
    } else if (feedback === 'tapped_other' && actual_tapped_index !== undefined && actual_tapped_index !== null) {
      // 2B. User Correction Flywheel: User tapped a different button than suggested
      try {
        // Increment votes for this user-corrected index
        const correctionKey = `correction:${actual_tapped_index}`;
        const correctionVotes = await redis.hincrby(statsKey, correctionKey, 1);
        const rejectionCount = await redis.hincrby(statsKey, 'rejection_count', 1);
        await redis.expire(statsKey, 60 * 86400);

        // Bad Cache Eviction: If rejections >= 2, evict existing stale/wrong cache entry
        if (rejectionCount >= 2) {
          await redis.del(cacheKey);
          evicted = true;
        }

        // Auto-Correction Promotion: If 2 or more users tap the same alternative button, promote as new Golden Answer
        if (correctionVotes >= 2) {
          await cacheSet(
            cacheKey,
            {
              explanation: updatedRow.explanation,
              highlight_index: actual_tapped_index,
            },
            30 * 86400 // 30-day extended TTL for corrected golden answer
          );
          corrected = true;
        }
      } catch (redisErr) {
        console.error('Failed to process tapped_other correction in Redis:', redisErr);
      }
    } else if (feedback === 'disliked') {
      // 2C. Direct Dislike: Invalidate cache if consistently rejected
      try {
        const rejectionCount = await redis.hincrby(statsKey, 'rejection_count', 1);
        await redis.expire(statsKey, 60 * 86400);
        if (rejectionCount >= 2) {
          await redis.del(cacheKey);
          evicted = true;
        }
      } catch (redisErr) {
        console.error('Failed to record dislike in Redis:', redisErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        interaction_id,
        status: newStatus,
        verified_count: verifiedCount,
        promoted_to_golden_cache: promoted,
        auto_corrected_golden_cache: corrected,
        bad_cache_evicted: evicted,
      },
    });
  } catch (error) {
    console.error('Agent Feedback Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
