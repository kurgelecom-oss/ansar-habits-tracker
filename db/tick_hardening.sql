-- ════════════════════════════════════════════════════════════════════════════
-- TICK HARDENING — run this in the Supabase SQL editor for project
-- nwxokxjytgplygwbzsla (the project that holds habit_completions).
--
-- WHAT IT DOES
--   1. Creates override_log (the parent-override audit trail).
--   2. Adds the unique key /api/tick's upsert needs.
--   3. Revokes anon's ability to INSERT, UPDATE or DELETE habit_completions and
--      stretch_completions. anon keeps SELECT. All writes move to the service
--      role, which only /api/tick and /api/stretch hold.
--
-- WHY IT MATTERS
--   Before this runs, the browser's anon key can write completion rows directly
--   — which was measured, not assumed:
--
--     POST /rest/v1/habit_completions  with the anon key  → HTTP 201
--     DELETE /rest/v1/habit_completions with the anon key → HTTP 200
--
--   Every gate in app/lib/gating.ts is bypassable with one curl until the
--   policies below are in place. THE GATES ARE NOT ENFORCED UNTIL THIS RUNS.
--
-- ORDER OF OPERATIONS — do not skip:
--   a. Set SUPABASE_SERVICE_ROLE_KEY in the Netlify environment FIRST.
--   b. Deploy the branch so /api/tick can write.
--   c. Then run this file. Running it before (a) leaves nothing able to write.
--
-- Safe to re-run: every statement is idempotent.
-- ════════════════════════════════════════════════════════════════════════════


-- ── 0. Clean up one test row ────────────────────────────────────────────────
-- Proving anon could still write left a probe row behind in each table. The
-- habit_completions one deleted cleanly; the stretch_completions one did not,
-- because that table has a SELECT and an INSERT policy but no DELETE policy —
-- so the DELETE returned HTTP 200 having matched zero rows. (A 200 from
-- PostgREST means "the statement ran", not "a row went away". Always re-SELECT.)
--
-- The surviving row is inert: item_id '__rls_probe__', completed_date
-- '2000-01-01', minutes 0. The wallet only ever sums the current Mon–Sun week,
-- so it has never been included in a balance. Removing it anyway.
delete from public.stretch_completions where item_id = '__rls_probe__';
delete from public.habit_completions  where habit_id = '__rls_probe__';


-- ── 1. override_log ─────────────────────────────────────────────────────────
-- Every parent override, permanently. `created_at` is the SERVER's timestamp,
-- written explicitly by /api/tick from its own clock rather than taken from the
-- request — the same rule the completion rows follow.
create table if not exists public.override_log (
  id          bigint generated always as identity primary key,
  habit_id    text        not null,
  date        date        not null,
  created_at  timestamptz not null default now(),
  reason      text        not null default ''
);

create index if not exists override_log_date_idx on public.override_log (date);

-- Nobody but the service role touches this table. No anon policy is created at
-- all, so with RLS on, anon sees nothing and writes nothing. An override trail
-- the overridden party can read is a hint sheet; one they can write is useless.
alter table public.override_log enable row level security;


-- ── 2. The upsert key ───────────────────────────────────────────────────────
-- /api/tick upserts on (habit_id, completed_date) so a double-tap is idempotent
-- rather than a duplicate row. Postgres needs a real unique constraint for
-- ON CONFLICT to resolve.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'habit_completions_habit_date_key'
  ) then
    -- Collapse any pre-existing duplicates first, keeping the earliest row for
    -- each (habit, date) — the earliest is the one that reflects when the habit
    -- was actually first marked done.
    delete from public.habit_completions a
      using public.habit_completions b
     where a.habit_id = b.habit_id
       and a.completed_date = b.completed_date
       and a.completed_at > b.completed_at;

    alter table public.habit_completions
      add constraint habit_completions_habit_date_key
      unique (habit_id, completed_date);
  end if;
end $$;


-- ── 3. RLS: anon may read, and only read ────────────────────────────────────

-- habit_completions ---------------------------------------------------------
alter table public.habit_completions enable row level security;

-- Drop every policy currently on the table, whatever it happens to be named.
-- The table predates this file and its policies were created by hand, so a
-- fixed list of DROP POLICY statements would miss anything named differently.
do $$
declare p record;
begin
  for p in select policyname from pg_policies
            where schemaname = 'public' and tablename = 'habit_completions'
  loop
    execute format('drop policy %I on public.habit_completions', p.policyname);
  end loop;
end $$;

create policy habit_completions_select
  on public.habit_completions
  for select
  to anon, authenticated
  using (true);

-- No INSERT / UPDATE / DELETE policy is created for anon or authenticated.
-- With RLS enabled and no permissive policy, those verbs are denied. The
-- service role bypasses RLS entirely and is unaffected.
--
-- The revoke below is belt-and-braces: PostgREST checks table privileges before
-- RLS, so revoking the privilege means a write is refused even if a permissive
-- policy is ever added back by accident.
revoke insert, update, delete on public.habit_completions from anon;
revoke insert, update, delete on public.habit_completions from authenticated;
grant select on public.habit_completions to anon, authenticated;


-- stretch_completions -------------------------------------------------------
alter table public.stretch_completions enable row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies
            where schemaname = 'public' and tablename = 'stretch_completions'
  loop
    execute format('drop policy %I on public.stretch_completions', p.policyname);
  end loop;
end $$;

create policy stretch_completions_select
  on public.stretch_completions
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.stretch_completions from anon;
revoke insert, update, delete on public.stretch_completions from authenticated;
grant select on public.stretch_completions to anon, authenticated;


-- ── 4. Verify ───────────────────────────────────────────────────────────────
-- Expected: exactly one SELECT policy per table, and no others.
select tablename, policyname, cmd, roles
  from pg_policies
 where schemaname = 'public'
   and tablename in ('habit_completions', 'stretch_completions', 'override_log')
 order by tablename, policyname;

-- Expected: anon holds SELECT and nothing else on both tables.
select table_name, grantee, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public'
   and table_name in ('habit_completions', 'stretch_completions')
   and grantee in ('anon', 'authenticated')
 order by table_name, grantee, privilege_type;
