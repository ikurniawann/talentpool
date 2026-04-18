// Simple in-memory rate limiter
// For production, use Redis or similar

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const RATE_LIMIT = 100; // requests per window
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || now > entry.resetTime) {
    // Reset or create new entry
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetTime: now + RATE_LIMIT_WINDOW };
  }
  
  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }
  
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT - entry.count, resetTime: entry.resetTime };
}

export function getRateLimitHeaders(identifier: string): Record<string, string> {
  const entry = rateLimitMap.get(identifier);
  if (!entry) {
    return {
      "X-RateLimit-Limit": String(RATE_LIMIT),
      "X-RateLimit-Remaining": String(RATE_LIMIT),
      "X-RateLimit-Reset": String(Date.now() + RATE_LIMIT_WINDOW),
    };
  }
  
  return {
    "X-RateLimit-Limit": String(RATE_LIMIT),
    "X-RateLimit-Remaining": String(Math.max(0, RATE_LIMIT - entry.count)),
    "X-RateLimit-Reset": String(entry.resetTime),
  };
}
