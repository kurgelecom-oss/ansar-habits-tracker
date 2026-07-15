-- ────────────────────────────────────────────────────────────────────────────
-- stretch_completions — append-only ledger for the daily Stretch Wallet.
-- Run this in the Supabase SQL editor for project nwxokxjytgplygwbzsla
-- (the same project that holds habit_completions).
--
-- One row per earn/spend event:
--   • Earn row  → item_id = a stretch item id, minutes ≥ 0 (already clamped to
--                 the 75-min/day cap by the client; a past-cap completion logs
--                 minutes = 0 for the record).
--   • Spend row → item_id = '__spend__', minutes < 0.
-- Balance for a day = SUM(minutes) WHERE completed_date = that day.
--
-- Mirrors habit_completions (text id + date), extended with a signed `minutes`
-- ledger column since stretch items can be completed repeatedly and spent.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.stretch_completions (
  id             bigint generated always as identity primary key,
  item_id        text        not null,
  completed_date date        not null default current_date,
  minutes        integer     not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists stretch_completions_date_idx
  on public.stretch_completions (completed_date);

-- RLS: the app talks to Supabase with the browser anon key (same as
-- habit_completions). Enable RLS and allow anon/authenticated to read and
-- append. The ledger is append-only, so no update/delete policy is granted.
alter table public.stretch_completions enable row level security;

drop policy if exists stretch_completions_select on public.stretch_completions;
create policy stretch_completions_select
  on public.stretch_completions
  for select
  to anon, authenticated
  using (true);

drop policy if exists stretch_completions_insert on public.stretch_completions;
create policy stretch_completions_insert
  on public.stretch_completions
  for insert
  to anon, authenticated
  with check (true);
