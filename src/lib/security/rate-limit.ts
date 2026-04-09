// Per-IP sliding-window rate limiter.
//
// In-memory only. On Vercel serverless this is per-instance, which means a
// determined attacker can defeat it by hitting different lambda instances. It
// still dampens casual abuse and protects the instance from burning
// screenshot/microlink budget. For a real rate limit, swap the Map for Upstash
// Redis once you have the integration set up.

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

// Eviction: cap the map size so misbehaving clients can't blow up memory
const MAX_BUCKETS = 5000;

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetMs: number;
}

export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const cutoff = now - opts.windowMs;

  let bucket = buckets.get(opts.key);
  if (!bucket) {
    if (buckets.size >= MAX_BUCKETS) {
      // Drop the oldest entry — cheap LRU approximation
      const firstKey = buckets.keys().next().value;
      if (firstKey !== undefined) buckets.delete(firstKey);
    }
    bucket = { timestamps: [] };
    buckets.set(opts.key, bucket);
  }

  // Drop timestamps outside the window
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= opts.limit) {
    const oldest = bucket.timestamps[0];
    return {
      ok: false,
      remaining: 0,
      resetMs: Math.max(0, oldest + opts.windowMs - now),
    };
  }

  bucket.timestamps.push(now);
  return {
    ok: true,
    remaining: opts.limit - bucket.timestamps.length,
    resetMs: opts.windowMs,
  };
}

/** Extract the client IP from a Next.js request headers. */
export function getClientIp(headers: Headers): string {
  // Vercel / standard proxies
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
