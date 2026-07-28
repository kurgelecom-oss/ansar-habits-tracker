-- ════════════════════════════════════════════════════════════════════════════
-- pin_attempts — durable brute-force tally for the parent override.
-- Run in the Supabase SQL editor for project nwxokxjytgplygwbzsla.
--
-- WHY. The lockout was first written as a module-scope Map inside
-- app/api/tick/route.ts. Measured on production, five wrong PINs counted down
-- 4, 3, 2 … 4, 3, 2 and the lockout never fired: Netlify spreads requests
-- across warm Lambda instances and each held its own copy of the counter. A
-- counter that resets under exactly the conditions it defends against is worse
-- than no counter, because it reads as protection.
--
-- OPTIONAL BUT PREFERRED. app/lib/pin-lockout.ts already works without this
-- table: if `pin_attempts` is missing it falls back to `override_log` with a
-- sentinel habit_id `__pin_attempt__`, which is durable and service-role-only
-- and is what production is using today. Running this file moves the tally to
-- its own table and keeps the audit log clean. The code switches over on the
-- next cold start, with no deploy.
--
-- Stores no PIN value — only that an attempt failed, and when.
-- Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.pin_attempts (
  id          bigint generated always as identity primary key,
  client_key  text        not null,
  failed_at   timestamptz not null default now()
);

-- The only query shape used: failures for one client inside the last 15 min.
create index if not exists pin_attempts_key_time_idx
  on public.pin_attempts (client_key, failed_at desc);

-- Service role only. No anon policy is created at all, so with RLS enabled the
-- browser can neither read the tally (which would leak how many attempts
-- remain) nor clear it. Same posture as override_log.
alter table public.pin_attempts enable row level security;

revoke all on public.pin_attempts from anon;
revoke all on public.pin_attempts from authenticated;


-- Housekeeping. Rows older than the lockout window are dead weight; nothing
-- reads them. Run occasionally, or attach it to a cron job.
delete from public.pin_attempts where failed_at < now() - interval '1 day';


-- ── Verify ──────────────────────────────────────────────────────────────────
select tablename, policyname, cmd, roles
  from pg_policies where schemaname = 'public' and tablename = 'pin_attempts';

select grantee, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public' and table_name = 'pin_attempts'
   and grantee in ('anon', 'authenticated');
-- Expected: no policies, and no anon/authenticated grants.
