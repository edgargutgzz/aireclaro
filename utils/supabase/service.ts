import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for server-only writes that must bypass RLS (cron
// jobs, ingestion). Never import this into a "use client" component or
// anything that reaches the browser bundle: the service role key grants
// full table access.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
