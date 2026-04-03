/**
 * SERVER-ONLY Supabase admin client.
 *
 * Uses the service-role (secret) key which bypasses Row-Level Security.
 * The "server-only" import below causes a hard build error if this file
 * is ever accidentally imported into a Client Component.
 *
 * Required env vars (set in .env.local and Vercel — NOT prefixed NEXT_PUBLIC):
 *   SUPABASE_URL         — project URL (same value as NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SECRET_KEY  — service role key (never expose to the browser)
 *
 * Only use this client in:
 *   - API route handlers  (app/api/**)
 *   - Server Actions
 *   - Server-only utilities
 *   - Background/cron jobs
 *
 * For normal user-authenticated UI flows use lib/supabase.ts (browser client)
 * or createServerClient() from @supabase/ssr (server components / middleware).
 */
import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) throw new Error("SUPABASE_URL env var is not set (server-only)");
if (!supabaseSecretKey) throw new Error("SUPABASE_SECRET_KEY env var is not set (server-only)");

export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    // Admin client never manages user sessions — disable persistence entirely
    autoRefreshToken: false,
    persistSession: false,
  },
});
