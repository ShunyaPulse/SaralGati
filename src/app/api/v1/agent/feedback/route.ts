import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { queryOne } from '@/lib/db';
import redis, { cacheSet, rateLimiter } from '@/lib/redis';
import { isFlywheelRequest, validateDeviceToken } from '@/lib/agent-auth';

/**
 * Feedback drives the self-learning cache: a verified answer is promoted to a
 * 30-day "golden" entry that is then served to every elder on that screen. The
 * route used to accept anything from anyone, so a single anonymous request
 * could confirm or evict any interaction id and poison what elders get told to
 * tap. It now requires the same trust as the other agent routes.
 */
const feedbackSchema = z.object({
  interaction_id: z.string().uuid('interaction_id must be a UUID'),
  feedback: z.enum(['tapped_highlight', 'tapped_other', 'timeout', 'disliked']),
  actual_tapped_index: z.number().int().min(0).max(500).nullish(),
});

const STATUS_BY_FEEDBACK = {
  tapped_highlight: 'verified',
  tapped_other: 'rejected',
  disliked: 'rejected',
  timeout: 'timeout',
} as const;

export async function POST(req: NextRequest) {
  try {
    const isFlywheel = isFlywheelRequest(req);
    const auth = isFlywheel ? null : await validateDeviceToken(req);
    const elderId = auth?.elderId ?? null;

    if (!isFlywheel && !auth?.isAuthenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // A flywheel session posts a correction per simulated screen (~110), so give
    // it more headroom than a single paired device.
    const rateLimit = await rateLimiter(
      isFlywheel ? 'feedback:flywheel' : `feedback:device:${elderId}`,
      isFlywheel ? 240 : 60,
      60,
    );
    if (!rateLimit.allowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const parsed = feedbackSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { interaction_id, feedback, actual_tapped_index } = parsed.data;
    const newStatus = STATUS_BY_FEEDBACK[feedback];
    const sanitizedIndex = actual_tapped_index ?? null;

    // 1. Update the interaction record in PostgreSQL. A paired device may only
    // touch its own elder's interactions; the flywheel is intentionally unscoped.
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
           actual_tapped_index = CASE 
               WHEN $1 = 'verified' THEN COALESCE($2, suggested_index) 
               ELSE COALESCE($2, actual_tapped_index) 
           END,
           explanation = CASE
               WHEN $1 = 'rejected' AND $2 IS NOT NULL AND $2 != suggested_index THEN 'Yahan dabayein.'
               ELSE explanation
           END,
           updated_at = NOW()
       WHERE id = $3 AND ($4::uuid IS NULL OR elder_id = $4::uuid)
       RETURNING id, app_package, screen_hash, question, suggested_index, explanation`,
      [newStatus, sanitizedIndex, interaction_id, elderId]
    );

    if (!updatedRow) {
      return NextResponse.json({ success: false, error: 'Interaction not found' }, { status: 404 });
    }

    let verifiedCount = 0;
    let promoted = false;
    let corrected = false;
    let evicted = false;
    let demoted = false;

    const normalizedQuestion = updatedRow.question
      .trim()
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u097F]/g, '')
      .replace(/\s+/g, ' ');

    const statsKey = `screen_stats:${updatedRow.screen_hash}:${normalizedQuestion}`;
    const cacheKeyRaw = `${updatedRow.app_package}:${updatedRow.screen_hash}:${normalizedQuestion}`;
    const cacheKeyHash = crypto.createHash('sha256').update(cacheKeyRaw).digest('hex');
    const cacheKey = `screen_cache:${cacheKeyHash}`;

    // 2. Continuous Learning Loop
    if (feedback === 'tapped_highlight' && updatedRow.suggested_index !== null) {
      // 2A. Positive Reinforcement: User tapped the suggested button
      try {
        verifiedCount = await redis.hincrby(statsKey, 'verified_count', 1);
        await redis.hset(statsKey, 'consecutive_rejections', '0'); // Reset consecutive failure streak
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
    } else if (feedback === 'tapped_other' || feedback === 'disliked') {
      // 2B. Negative Feedback, Cache Demotion, & Invalidation
      try {
        const rejectionCount = await redis.hincrby(statsKey, 'rejection_count', 1);
        const consecutiveRejections = await redis.hincrby(statsKey, 'consecutive_rejections', 1);
        const curVerified = parseInt((await redis.hget(statsKey, 'verified_count')) || '0', 10);
        await redis.expire(statsKey, 60 * 86400);

        // Trust score: positive verifications weighted against double rejections
        const trustScore = curVerified - (2 * rejectionCount);

        // Immediate Invalidation / Eviction:
        // Evict if 2 consecutive rejections OR negative trust score OR unreconciled rejection
        if (consecutiveRejections >= 2 || trustScore < 0 || rejectionCount >= 2) {
          await redis.del(cacheKey);
          evicted = true;
        } else {
          // Demotion: entry is questionable, downgrade TTL to 1 hour instead of 30 days
          await redis.expire(cacheKey, 3600);
          demoted = true;
        }

        // 2C. User Correction Flywheel (if elder tapped an alternative button)
        if (feedback === 'tapped_other' && sanitizedIndex !== null) {
          const correctionKey = `correction:${sanitizedIndex}`;
          const correctionVotes = await redis.hincrby(statsKey, correctionKey, 1);

          // Auto-Correction Promotion: If 2 or more users independently tap this corrected index
          if (correctionVotes >= 2) {
            await cacheSet(
              cacheKey,
              {
                explanation: updatedRow.explanation,
                highlight_index: sanitizedIndex,
              },
              30 * 86400 // 30-day extended TTL for corrected golden answer
            );
            // Reset rejection counters for the newly promoted golden answer
            await redis.hset(statsKey, 'consecutive_rejections', '0');
            await redis.hset(statsKey, 'rejection_count', '0');
            corrected = true;
            evicted = false; // Overwritten with correct golden answer
          }
        }
      } catch (redisErr) {
        console.error('Failed to process negative feedback / demotion in Redis:', redisErr);
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
        cache_demoted: demoted,
      },
    });
  } catch (error) {
    console.error('Agent Feedback Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
