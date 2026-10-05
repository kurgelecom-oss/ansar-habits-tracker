-- ────────────────────────────────────────────────────────────────────────────
-- target_proofs — one proof per Target Map zone per week (5 Oct 2026).
-- Run in the Supabase SQL editor for project nwxokxjytgplygwbzsla.
--
-- Ansar logs what he did (note); a parent confirms it with the PIN
-- (confirmed_at). Only confirmed proofs make a zone "done". Writes go through
-- /api/targets with the service role; RLS on, no anon policies.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.target_proofs (
  id           bigint generated always as identity primary key,
  week_start   date        not null,
  zone         text        not null check (zone in ('football','scholar','languages','quran','digital','outdoors','combat','chess')),
  note         text        not null check (char_length(note) between 3 and 500),
  logged_at    timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (week_start, zone)
);

alter table public.target_proofs enable row level security;
