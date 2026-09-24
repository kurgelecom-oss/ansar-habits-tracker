-- ────────────────────────────────────────────────────────────────────────────
-- pathway_log — the Football Pathway's memory (ticks, personal bests, weekly focus).
-- Run in the Supabase SQL editor for project nwxokxjytgplygwbzsla.
--
-- Until this runs, /pathway still works: /api/pathway answers
-- storage:"unavailable" and the page keeps ticks on the device instead.
-- After it runs, ticks survive across devices and Nihal OS can see them.
--
--   kind = 'tick'  item_id = a checklist id (e.g. 'dawn_touches'), value 1
--   kind = 'pb'    item_id = a benchmark id (e.g. 'juggle_alt'),   value = the score
--   kind = 'focus' item_id = 'week',                              note  = Mum's one focus
--   kind = 'match' item_id = 'm-YYYY-MM-DD' (the match day), value = his 1–10 rating,
--                  note = JSON {min, goals, assists, rating, learn}
--
-- Writes happen ONLY through /api/pathway with the service role, so RLS is on
-- with NO anon policies: the browser key cannot read or write this table.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.pathway_log (
  id         bigint generated always as identity primary key,
  log_date   date        not null,
  kind       text        not null check (kind in ('tick', 'pb', 'focus', 'match')),
  item_id    text        not null,
  value      numeric,
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (log_date, kind, item_id)
);

create index if not exists pathway_log_date_idx on public.pathway_log (log_date);
create index if not exists pathway_log_kind_idx on public.pathway_log (kind, item_id);

alter table public.pathway_log enable row level security;
