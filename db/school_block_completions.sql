-- ────────────────────────────────────────────────────────────────────────────
-- school_block_completions — one row per school BLOCK per day.
-- Run this in the Supabase SQL editor for project nwxokxjytgplygwbzsla
-- (the same project that holds habit_completions).
--
-- PHASE 1 OF THE RESTRUCTURE. Additive and invisible to Ansar.
--
-- Today a whole school day — five hours, four to six subjects — is a single
-- row in habit_completions with habit_id = 'homeschool_session'. That one row
-- is why the system can say "school: yes" and can never say "he did Maths and
-- skipped Science". Every missing thing above it (the week view, the term arc,
-- the mastery map, per-subject evidence) is downstream of that.
--
-- This table records the blocks. It does NOT replace the single tick and does
-- NOT change a single point: habit_completions and scoring.ts are untouched,
-- and 'homeschool_session' still pays its 5 points exactly as before. The two
-- write alongside each other until a week of real data proves they agree.
--
-- Keyed on the NOTION ROW, not on a derived slug. app/lib/homeschool.ts builds
-- a display id from label + position ("block-1-maths-0"), which moves when a
-- day is reordered — fine for React keys, useless as a durable record. The
-- Notion page id survives reordering, renaming and re-dating, so a completion
-- stays attached to the lesson it was actually for.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.school_block_completions (
  id             bigint generated always as identity primary key,
  -- Notion page id of the Daily Programme row, dashes stripped.
  notion_row_id  text        not null,
  completed_date date        not null,
  -- Denormalised ON PURPOSE. A Notion row can be re-dated, re-labelled or
  -- deleted; the evidence of what was ticked that day must not change when it
  -- is. These three columns are the record, not a cache of Notion.
  subject_label  text        not null,
  day_topic      text,
  task           text,
  completed_at   timestamptz not null default now()
);

-- One completion per lesson row per day. Re-ticking is an upsert, not a
-- duplicate, which keeps "how many blocks today" a plain count.
create unique index if not exists school_block_completions_row_date_uniq
  on public.school_block_completions (notion_row_id, completed_date);

create index if not exists school_block_completions_date_idx
  on public.school_block_completions (completed_date);

-- Same hardened posture as habit_completions after db/tick_hardening.sql:
-- the browser reads, only the service role writes. A table the client could
-- insert into would be a new way to claim work that was never done, which is
-- exactly what the tick endpoint was hardened to prevent.
alter table public.school_block_completions enable row level security;

do $$
declare p text;
begin
  for p in select policyname from pg_policies
            where schemaname = 'public' and tablename = 'school_block_completions'
  loop
    execute format('drop policy %I on public.school_block_completions', p);
  end loop;
end $$;

create policy school_block_completions_select
  on public.school_block_completions
  for select
  to anon, authenticated
  using (true);

-- No INSERT / UPDATE / DELETE policy for anon or authenticated. With RLS on
-- and no permissive policy those verbs are denied; the revoke below is
-- belt-and-braces, in case a policy is ever added back by accident.
revoke insert, update, delete on public.school_block_completions from anon;
revoke insert, update, delete on public.school_block_completions from authenticated;
grant select on public.school_block_completions to anon, authenticated;
