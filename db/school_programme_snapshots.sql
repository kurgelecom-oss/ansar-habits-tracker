-- ────────────────────────────────────────────────────────────────────────────
-- school_programme_snapshots — the board's own copy of the Daily Programme.
-- Run this in the Supabase SQL editor for project nwxokxjytgplygwbzsla.
--
-- PHASE 2 OF THE RESTRUCTURE.
--
-- Today Ansar's board phones Notion live on every load. That is why a renamed
-- column can blank the screen, why a Notion outage takes the board with it,
-- and why there is a wait before anything is usable. Notion is a good place to
-- WRITE a week and a bad place to SERVE one.
--
-- WHY NOT ansar_assessment_lessons
-- The restructure proposal assumed the existing curriculum sync could feed the
-- board too. It cannot. That table is shaped for ASSESSMENT -- one row per
-- subject per day -- and it is lossy for this purpose in three specific ways,
-- confirmed against the stored rows for 5 Oct 2026:
--
--   1. No Label, Order or Duration. The board renders ordered, timed blocks
--      ("Block 1 — Maths", 45 min). None of those three survive the import.
--   2. One Notion row can become SEVERAL lessons. "Block 4 — Technologies +
--      Languages" is stored as two rows, so 4 blocks read back as 5.
--   3. The task text is split and shortened per subject. The board would show
--      "Technology: Scratch — loops inside loops." where Notion says far more.
--
-- Serving the board from that table would silently reorder his day and
-- truncate his work. So the board gets its own snapshot, one row per Notion
-- programme row per date, keyed on the same notion_row_id that Phase 1's
-- school_block_completions already uses. The two line up by construction.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.school_programme_snapshots (
  notion_row_id  text        not null,
  lesson_date    date        not null,
  -- Board shape. Every one of these is a field the assessment store drops.
  label          text        not null,
  block_order    numeric,
  duration       text,
  task           text        not null default '',
  day_topic      text        not null default '',
  day_note       text        not null default '',
  week_title     text        not null default '',
  weekday        text,
  guide          jsonb       not null default '[]'::jsonb,
  -- Provenance, so a stale copy can be told from a fresh one on sight.
  synced_at      timestamptz not null default now(),
  primary key (notion_row_id, lesson_date)
);

create index if not exists school_programme_snapshots_date_idx
  on public.school_programme_snapshots (lesson_date);

-- Same hardened posture as habit_completions and school_block_completions:
-- the browser reads, only the service role writes.
alter table public.school_programme_snapshots enable row level security;

do $$
declare p text;
begin
  for p in select policyname from pg_policies
            where schemaname = 'public' and tablename = 'school_programme_snapshots'
  loop
    execute format('drop policy %I on public.school_programme_snapshots', p);
  end loop;
end $$;

create policy school_programme_snapshots_select
  on public.school_programme_snapshots
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.school_programme_snapshots from anon;
revoke insert, update, delete on public.school_programme_snapshots from authenticated;
grant select on public.school_programme_snapshots to anon, authenticated;
