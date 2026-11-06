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

