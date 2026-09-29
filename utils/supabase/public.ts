import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// The app's client for public reads: anon key, no cookie or session handling
// (the site has no logins). Never touching next/headers `cookies()` keeps
// routes cacheable and makes it safe inside unstable_cache. Only for tables
// with open-read RLS; the cron's writes use utils/supabase/service.ts.
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
