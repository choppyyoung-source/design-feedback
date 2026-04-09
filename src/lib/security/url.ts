// URL sanitization — blocks javascript:, data:, vbscript:, file: and other
// dangerous protocols that would allow XSS via href attributes.
//
// Returns null for anything not http(s) or mailto. Callers should either fall
// back to not rendering the link, or render as plain text.

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

export function sanitizeLinkHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Reject control chars / whitespace-obfuscated schemes (e.g. "java\tscript:...")
  // by stripping them and checking the scheme again.
  const normalized = trimmed.replace(/[\u0000-\u001f\u007f]/g, "");

  // Parse with a base URL so relative paths don't throw — but we only accept absolute.
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return null;
  }

  if (!SAFE_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
    return null;
  }

  return parsed.toString();
}
