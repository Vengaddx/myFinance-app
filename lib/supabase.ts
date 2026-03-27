import { createBrowserClient } from "@supabase/ssr";

// createBrowserClient stores the auth session in cookies (not localStorage),
// so server-side routes and API routes can read it via createServerClient.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
