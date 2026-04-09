// Discord webhook-based error reporting for critical server-side failures
// (payment/payout flows). Fire-and-forget: never blocks the response, never
// throws. Silently no-ops if DISCORD_WEBHOOK_URL is unset so local dev stays
// clean.
//
// Rate-limited via an in-memory sliding window so a misbehaving route can't
// drain Discord's rate limit (30 req/min per webhook). Scoped per `route`
// key, not global, so one noisy endpoint doesn't silence the others.

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Max alerts per route per window. Keep low — alerts are supposed to be rare.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

const buckets = new Map<string, number[]>();

function shouldSend(key: string): boolean {
  const now = Date.now();
  const arr = buckets.get(key) ?? [];
  const fresh = arr.filter((t) => now - t < WINDOW_MS);
  if (fresh.length >= MAX_PER_WINDOW) {
    buckets.set(key, fresh);
    return false;
  }
  fresh.push(now);
  buckets.set(key, fresh);
  return true;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + "...";
}

export interface ReportErrorOptions {
  route: string;
  error: unknown;
  context?: Record<string, unknown>;
}

export function reportError(opts: ReportErrorOptions): void {
  // Always log locally so the usual `console.error` trail still exists.
  console.error(`[${opts.route}]`, opts.error, opts.context ?? "");

  if (!WEBHOOK_URL) return;
  if (!shouldSend(opts.route)) return;

  const err = opts.error;
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error && err.stack ? err.stack : undefined;

  // Discord embed — max 4096 chars for description, 1024 per field value.
  const embed: Record<string, unknown> = {
    title: `🚨 ${opts.route}`,
    description: truncate("```\n" + message + "\n```", 4000),
    color: 0xdc2626,
    timestamp: new Date().toISOString(),
    fields: [] as Array<{ name: string; value: string; inline?: boolean }>,
  };

  const fields = embed.fields as Array<{ name: string; value: string; inline?: boolean }>;

  if (opts.context && Object.keys(opts.context).length > 0) {
    fields.push({
      name: "Context",
      value: truncate("```json\n" + JSON.stringify(opts.context, null, 2) + "\n```", 1000),
    });
  }
  if (stack) {
    fields.push({
      name: "Stack",
      value: truncate("```\n" + stack + "\n```", 1000),
    });
  }

  // Fire-and-forget. Never await in the caller's critical path — if Discord
  // is down, the user still gets their response.
  fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "design-feedback",
      embeds: [embed],
    }),
  }).catch((e) => {
    // If even the webhook call itself fails, we've done our best.
    console.error("[report-error] webhook post failed:", e);
  });
}
