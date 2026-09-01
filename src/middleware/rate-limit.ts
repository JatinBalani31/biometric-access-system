import { Request, Response, NextFunction } from 'express';

/**
 * Fixed-window rate limiter held in process memory.
 *
 * Cloud Functions runs several instances, so a caller spread across them gets
 * roughly `limit × instances` — this raises the cost of scripted abuse rather than
 * providing a hard cap. Move the counters to Firestore or Redis when a strict
 * global limit is needed.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Drop expired buckets so a long-lived instance does not grow unboundedly.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitOptions {
  /** Requests permitted per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Distinguishes buckets when several limiters are mounted. */
  name: string;
  message?: string;
}

export function rateLimit({ limit, windowMs, name, message }: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    sweep(now);

    // Behind Hosting/Cloud Run the socket address is the proxy, so prefer the
    // forwarded client IP. Express only trusts it when `trust proxy` is set.
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${name}:${clientIp}`;

    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Remaining', String(limit - 1));
      return next();
    }

    bucket.count += 1;
    if (bucket.count > limit) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.setHeader('X-RateLimit-Remaining', '0');
      return res.status(429).json({
        error: message || 'Too many requests. Please try again shortly.',
        code: 'RATE_LIMITED',
        retryAfterSeconds: retryAfter,
      });
    }

    res.setHeader('X-RateLimit-Remaining', String(limit - bucket.count));
    next();
  };
}
