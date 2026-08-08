-- ════════════════════════════════════════════════════════════════════════════
-- WEEK RESULTS + GOLDEN BOOT — run this in the Supabase SQL editor for project
-- nwxokxjytgplygwbzsla (the project that holds habit_completions).
--
-- WHAT IT DOES
--   1. Creates week_results — one FINALISED row per Mon–Fri squad week.
--   2. Creates golden_boot_awards — one row per completed run of four
--      consecutive First Team weeks.
--   3. RLS: anon may SELECT both and nothing else. Writes are service-role only,
--      the same posture habit_completions and stretch_completions already have.
--
-- WHY A TABLE AT ALL. The /55 is recomputed from raw habit_completions on every
-- page load, which is right for the CURRENT week and wrong for history: the
-- rules it is computed under keep changing (WEEKLY_MAX was 56; homeschool used
-- to score 3+1+1 across three habits; the weekend used to schedule nothing).
-- Recomputing 2026-07-20 a year from now would score it under next year's rules.
-- A finalised week is a FACT, and facts get stored. week_results is that record,
-- and the Golden Boot streak is counted off it — never off a live recomputation.
--
-- Safe to re-run: every statement is idempotent.
-- ════════════════════════════════════════════════════════════════════════════


-- ── 1. week_results ─────────────────────────────────────────────────────────
-- week_start is the PRIMARY KEY, and deliberately a date rather than a surrogate
-- id: it is the Monday lib/time.ts weekStartOf() produces for the Sydney week,
-- so the key is the same string the app already computes and there is exactly
-- one row per week by construction. An upsert on it is the whole idempotency
-- story — a finalise routine that runs twice writes the same row.
create table if not exists public.week_results (
  week_start           date        primary key,
  total_points         integer     not null,
  -- The getThreshold() label, STORED rather than derived. If the thresholds are
  -- ever retuned, past weeks keep the tier they were actually awarded.
  tier                 text        not null,
  perfect_week         boolean     not null,
  -- TRUE when the week predates the DATA, not when the week went badly. Set for
  -- any week whose Monday falls before the earliest completion on record: the
  -- tracker started mid-week on a Wednesday, so that first week has no Mon/Tue
  -- rows and its total is an artefact of missing history. Partial weeks are
  -- excluded from the Golden Boot streak — a week nobody could have played must
  -- not break a run, and must not count toward one either.
  partial              boolean     not null default false,
  finalized_at         timestamptz not null default now(),
  -- Reserved for the parent-confirmation step. Nothing writes it yet; the column
  -- exists now so adding that step is a UI change rather than a migration.
  confirmed_by_taylan  boolean     not null default false
);

comment on table public.week_results is
  'One finalised Mon-Fri squad week. Written only by /api/golden-boot with the service role.';


-- ── 2. golden_boot_awards ───────────────────────────────────────────────────
-- Keyed by the week that COMPLETED the run of four, so the award is idempotent
-- for free: finalising the same week twice cannot mint a second Golden Boot.
create table if not exists public.golden_boot_awards (
  week_start    date        primary key,
  reward        text,
  acknowledged  boolean     not null default false,
  created_at    timestamptz not null default now()
);

-- Not a foreign key to week_results, on purpose. An award is a historical fact
-- about a week that was finalised; deleting a week_results row (only a human
-- with the service role can) must not silently delete a trophy already handed
-- over.
comment on table public.golden_boot_awards is
  'One completed run of four consecutive First Team weeks, keyed by the week that finished the run.';


-- ── 3. RLS: anon may read, and only read ────────────────────────────────────
-- Same shape as db/tick_hardening.sql section 3. Neither table holds anything
-- sensitive — they are scoreboard history — so SELECT is open to anon and the
-- board can read them with the browser key. Writes are not: a child who can
-- write week_results can award himself a Golden Boot.

alter table public.week_results       enable row level security;
alter table public.golden_boot_awards enable row level security;

-- Drop whatever policies happen to exist, by name, rather than a fixed list.
-- These tables are new so there should be none, but this file is meant to stay
-- re-runnable after someone has clicked around in the Supabase policy editor.
do $$
declare p record;
begin
  for p in select tablename, policyname from pg_policies
            where schemaname = 'public'
              and tablename in ('week_results', 'golden_boot_awards')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

create policy week_results_select
  on public.week_results
  for select
  to anon, authenticated
  using (true);

create policy golden_boot_awards_select
  on public.golden_boot_awards
  for select
  to anon, authenticated
  using (true);

-- No INSERT / UPDATE / DELETE policy is created. With RLS enabled and no
-- permissive policy those verbs are denied; the service role bypasses RLS
-- entirely and is unaffected.
--
-- The revokes are belt-and-braces: PostgREST checks table privileges BEFORE
-- RLS, so a write is refused even if a permissive policy is later added by
-- accident in the dashboard.
revoke insert, update, delete on public.week_results       from anon, authenticated;
revoke insert, update, delete on public.golden_boot_awards from anon, authenticated;
grant  select                  on public.week_results       to anon, authenticated;
grant  select                  on public.golden_boot_awards to anon, authenticated;


-- ── 4. Verify ───────────────────────────────────────────────────────────────
-- Expected: exactly one SELECT policy per table, and no others.
select tablename, policyname, cmd, roles
  from pg_policies
 where schemaname = 'public'
   and tablename in ('week_results', 'golden_boot_awards')
 order by tablename, policyname;

-- Expected: anon and authenticated hold SELECT on both tables and nothing else.
select table_name, grantee, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public'
   and table_name in ('week_results', 'golden_boot_awards')
   and grantee in ('anon', 'authenticated')
 order by table_name, grantee, privilege_type;

-- Expected: both tables present, zero rows until the backfill runs.
select 'week_results' as t, count(*) from public.week_results
union all
select 'golden_boot_awards', count(*) from public.golden_boot_awards;
