import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// A cookie-free Supabase client for public, user-agnostic reads. Unlike
// utils/supabase/server.ts it never touches next/headers `cookies()`, so a
// route that uses it stays cacheable at the Vercel edge: no per-user
// `Set-Cookie` gets attached to the response, so the CDN can hold one shared
// entry (kept warm by the field-history cron) instead of every visitor going
// to the origin. Anon key only, the same access the SSR client had for these
// reads.
export function createAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
