import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control",  value: "on" },
  { key: "X-Frame-Options",         value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options",  value: "nosniff" },
  { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",      value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // Next.js requires unsafe-inline/eval in dev; tighten post-build if needed
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co https://accounts.google.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

// Derive the canonical site URL for every build environment:
//   - Vercel (preview & prod): VERCEL_URL is auto-injected by Vercel at build time
//     (it's the deployment hostname without scheme, e.g. myapp-abc123.vercel.app)
//   - Local dev: fall back to NEXT_PUBLIC_SITE_URL from .env.local, then localhost
// Exposed as NEXT_PUBLIC_SITE_URL so it's baked into the client bundle and available
// without window — which matters because Supabase's redirect validation is server-side.
const siteUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SITE_URL: siteUrl,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
