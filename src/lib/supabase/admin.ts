// Admin-level Supabase client for server-only work that must bypass RLS.
// NEVER import this from client code. The service_role key can read and write
// anything — guarding the import boundary matters more than the usual RLS
// rules.
//
// Set SUPABASE_SERVICE_ROLE_KEY in your env. If missing, callers get null and
// must handle it (don't throw at import time — lets the app still build when
// the env var isn't configured locally).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}
