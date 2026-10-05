-- ────────────────────────────────────────────────────────────────────────────
-- zone_log — memory for the Target Map's zone OSes (5 Oct 2026).
-- Same shape as pathway_log, scoped by zone. Standalone: nothing on the board
-- reads it (tk: "not connected to his program yet").
--
--   kind = 'tick'   item_id = a session id,    value 1      (per day)
--   kind = 'pb'     item_id = a benchmark id,  value score
--   kind = 'focus'  item_id = 'week',          note  = Mum's one focus
--
-- Writes only through /api/os/[zone] with the service role. RLS on, no anon policies.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.zone_log (
  id         bigint generated always as identity primary key,
  zone       text        not null check (zone in ('scholar','languages','quran','digital','outdoors','combat','chess')),
  log_date   date        not null,
  kind       text        not null check (kind in ('tick','pb','focus')),
  item_id    text        not null,
  value      numeric,
  note       text,
  updated_at timestamptz not null default now(),
  unique (zone, log_date, kind, item_id)
);

create index if not exists zone_log_zone_kind_idx on public.zone_log (zone, kind, log_date);

alter table public.zone_log enable row level security;
