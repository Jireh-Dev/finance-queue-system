import prisma from './db';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodically purge expired buckets every 5 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  limit?: number; // max allowed requests within window
  windowSeconds?: number; // duration of the sliding window in seconds
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const limit = options.limit ?? 5; // default 5 attempts
  const windowSeconds = options.windowSeconds ?? 60; // default 60s
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      retryAfterSeconds: 0,
    };
  }

  if (record.count >= limit) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(retryAfterSeconds, 1),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: limit - record.count,
    retryAfterSeconds: 0,
  };
}

/**
 * Task 3: Distributed Rate-Limiting for Authentication Endpoints.
 * Checks rate limits using:
 * 1. Upstash / Redis REST API if UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN are present
 * 2. Database-backed distributed tracking via AuditLog (failed attempts) across Vercel serverless instances
 * 3. In-memory sliding window fallback for instant local throttling
 */
export async function checkDistributedRateLimit(
  key: string,
  options: RateLimitOptions = {}
): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
  const limit = options.limit ?? 5;
  const windowSeconds = options.windowSeconds ?? 60;
  const now = Date.now();

  // 1. Check Upstash Redis if configured
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const response = await fetch(`${redisUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', `ratelimit:${key}`],
          ['EXPIRE', `ratelimit:${key}`, windowSeconds],
        ]),
        cache: 'no-store',
      });

      if (response.ok) {
        const results = await response.json();
        const currentCount = results[0]?.result || 1;
        if (currentCount > limit) {
          return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: windowSeconds,
          };
        }
        return {
          allowed: true,
          remaining: Math.max(0, limit - currentCount),
          retryAfterSeconds: 0,
        };
      }
    } catch (redisErr) {
      console.warn('Distributed Redis rate-limit fallback triggered:', redisErr);
    }
  }

  // 2. Distributed fallback using database audit log (multi-instance serverless resilience)
  try {
    const windowStart = new Date(now - windowSeconds * 1000);
    const recentFailures = await prisma.auditLog.count({
      where: {
        action: 'LOGIN_FAILED',
        details: {
          contains: key,
        },
        timestamp: {
          gte: windowStart,
        },
      },
    });

    if (recentFailures >= limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: windowSeconds,
      };
    }
  } catch (dbErr) {
    // If db query fails, continue to in-memory check
  }

  // 3. Fallback to in-memory check
  return checkRateLimit(key, options);
}

