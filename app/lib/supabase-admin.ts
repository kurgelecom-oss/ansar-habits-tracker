/* ════════════════════════════════════════════════════════════════════════════
   Supabase SERVICE ROLE client — SERVER ONLY.

   The service role key bypasses RLS. It is the reason /api/tick can be the only
   thing on earth that writes a completion row once the policies in
   db/tick_hardening.sql are applied.

   THREE RULES:
     1. This module must never be imported from a "use client" file. The guard
        below turns that mistake into an immediate crash instead of a key that
        ships in the browser bundle.
     2. The env var is SUPABASE_SERVICE_ROLE_KEY — deliberately WITHOUT the
        NEXT_PUBLIC_ prefix. Next.js only inlines NEXT_PUBLIC_* into client
        bundles, so the missing prefix is itself part of the protection.
     3. Never log the key, never return it in a response body, never put it in
        an error message.
   ══════════════════════════════════════════════════════════════════════════ */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Whether the server is configured to write at all. Routes check this and return
 * a plain 503 rather than a stack trace, so a missing env var reads as
 * "not configured yet" instead of "the app is broken".
 */
export function hasServiceRole(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

let cached: SupabaseClient | null = null;

export function adminClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("supabase-admin was imported into the browser bundle");
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY " +
      "in the Netlify environment for this site.",
    );
  }
  if (!cached) {
    cached = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      // No session to persist and nothing to refresh — this client is a
      // short-lived server actor, not a signed-in user.
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
