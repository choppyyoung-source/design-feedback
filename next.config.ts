import type { NextConfig } from "next";

// Security headers applied to every response.
// CSP kept loose-ish for now (unsafe-inline for styles because Tailwind/base-ui
// inline their runtime styles; 'unsafe-eval' left out). Tighten once the app is
// verified against the CSP in report-only mode.
const SECURITY_HEADERS = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      // Scripts: self + Stripe + Cloudflare Web Analytics beacon
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://static.cloudflareinsights.com",
      // Styles: unsafe-inline required by Tailwind JIT + base-ui runtime
      "style-src 'self' 'unsafe-inline'",
      // Images: self + Supabase storage + data/blob for base64 screenshots
      "img-src 'self' data: blob: https://*.supabase.co https://api.microlink.io https://cdn.microlink.io",
      "font-src 'self' data:",
      // Network: Supabase, Stripe, LemonSqueezy, Microlink, CF beacons
      "connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.lemonsqueezy.com https://api.microlink.io https://cloudflareinsights.com",
      "frame-src https://js.stripe.com https://checkout.stripe.com https://*.lemonsqueezy.com",
      "worker-src 'self' blob:",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
