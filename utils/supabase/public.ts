import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Anon-key client with no cookie/session handling. Unlike utils/supabase/server.ts,
// this doesn't call cookies() from next/headers, so it's safe to use inside
// unstable_cache (which forbids reading cookies mid-execution) or any other
// context outside a request. Only for tables with open-read RLS.
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
