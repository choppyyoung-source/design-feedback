// SSRF protection for server-side URL fetches.
//
// Design: resolve the hostname, verify EVERY resolved IP is public, then pass
// the original URL to fetch. This closes the DNS-rebinding window only on
// providers that cache DNS between the check and the fetch — for a stronger
// guarantee we'd need to pin the IP, but Next.js's fetch doesn't expose that.
// The check still blocks the overwhelming majority of SSRF attempts (static
// private IPs, loopback, link-local, cloud metadata).

import { lookup } from "node:dns/promises";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
]);

// IPv4 private / reserved ranges
const IPV4_BLOCKED_RANGES: Array<[string, number]> = [
  ["0.0.0.0", 8],        // current network
  ["10.0.0.0", 8],       // private
  ["100.64.0.0", 10],    // CGNAT
  ["127.0.0.0", 8],      // loopback
  ["169.254.0.0", 16],   // link-local (AWS/GCP/Azure metadata lives here)
  ["172.16.0.0", 12],    // private
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],     // TEST-NET
  ["192.168.0.0", 16],   // private
  ["198.18.0.0", 15],    // benchmark
  ["198.51.100.0", 24],  // TEST-NET-2
  ["203.0.113.0", 24],   // TEST-NET-3
  ["224.0.0.0", 4],      // multicast
  ["240.0.0.0", 4],      // reserved
  ["255.255.255.255", 32],
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
}

function ipv4InRange(ip: string, baseIp: string, bits: number): boolean {
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(baseIp);
  if (ipInt === null || baseInt === null) return false;
  if (bits === 0) return true;
  const mask = bits === 32 ? 0xffffffff : (~((1 << (32 - bits)) - 1)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

function isPrivateIPv4(ip: string): boolean {
  for (const [base, bits] of IPV4_BLOCKED_RANGES) {
    if (ipv4InRange(ip, base, bits)) return true;
  }
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // Loopback, unspecified
  if (lower === "::1" || lower === "::") return true;
  // Link-local fe80::/10
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
  // Unique local fc00::/7
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  // IPv4-mapped ::ffff:x.x.x.x — extract and reuse IPv4 check
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

export class SSRFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SSRFError";
  }
}

export interface ValidateOptions {
  allowedProtocols?: string[];
}

/**
 * Validates a URL string for server-side fetch. Throws SSRFError on any violation.
 * Returns the parsed URL on success.
 */
export async function validateFetchUrl(
  raw: string,
  opts: ValidateOptions = {}
): Promise<URL> {
  const allowedProtocols = opts.allowedProtocols ?? ["http:", "https:"];

  let parsed: URL;
  try {
    parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    throw new SSRFError("Invalid URL");
  }

  if (!allowedProtocols.includes(parsed.protocol)) {
    throw new SSRFError(`Protocol not allowed: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname) throw new SSRFError("Missing hostname");
  if (BLOCKED_HOSTS.has(hostname)) {
    throw new SSRFError(`Blocked hostname: ${hostname}`);
  }

  // If hostname is already an IP literal, check it directly.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    if (isPrivateIPv4(hostname)) {
      throw new SSRFError(`Blocked private IPv4: ${hostname}`);
    }
    return parsed;
  }
  if (hostname.includes(":")) {
    if (isPrivateIPv6(hostname)) {
      throw new SSRFError(`Blocked private IPv6: ${hostname}`);
    }
    return parsed;
  }

  // DNS resolve — check ALL resolved addresses.
  let addrs: { address: string; family: number }[];
  try {
    addrs = await lookup(hostname, { all: true });
  } catch {
    throw new SSRFError(`DNS resolution failed for ${hostname}`);
  }

  if (addrs.length === 0) {
    throw new SSRFError(`No DNS records for ${hostname}`);
  }

  for (const addr of addrs) {
    if (addr.family === 4 && isPrivateIPv4(addr.address)) {
      throw new SSRFError(`${hostname} resolves to private IPv4 ${addr.address}`);
    }
    if (addr.family === 6 && isPrivateIPv6(addr.address)) {
      throw new SSRFError(`${hostname} resolves to private IPv6 ${addr.address}`);
    }
  }

  return parsed;
}
