-- Private learning records; never readable with the site's public Supabase key.
create table if not exists public.ansar_assessment_lessons (
 id text primary key, date date not null, subject text not null, payload jsonb not null, updated_at timestamptz not null default now()
);
create table if not exists public.ansar_assessment_papers (
 id text primary key, kind text not null check(kind in ('review','exam')), month text not null,
 due_date date not null, opens_on date not null, subject text not null, title text not null,
 status text not null check(status in ('draft','published')), duration_minutes integer,
 questions jsonb not null, lessons jsonb not null, coverage_note text not null default '', created_at timestamptz not null default now(),
 check((kind='review' and duration_minutes is null) or (kind='exam' and duration_minutes between 10 and 90))
);
create table if not exists public.ansar_assessment_attempts (
 id uuid primary key default gen_random_uuid(), paper_id text not null unique references public.ansar_assessment_papers(id),
 status text not null default 'in_progress' check(status in ('in_progress','submitted','reviewed')),
 answers jsonb not null default '{}', started_at timestamptz not null default now(), expires_at timestamptz,
 submitted_at timestamptz, result jsonb, parent_review jsonb, correction text, correction_at timestamptz,
 revision integer not null default 0, paper_snapshot jsonb not null
);
create table if not exists public.ansar_assessment_outbox (
 id text primary key, channel text not null check(channel in ('notion','email')), payload jsonb not null,
 status text not null default 'pending' check(status in ('pending','sent')), attempts integer not null default 0,
 last_error text, delivered_at timestamptz, created_at timestamptz not null default now(), locked_until timestamptz
);
create table if not exists public.ansar_assessment_state (id text primary key, payload jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.ansar_assessment_pin_failures (id bigint generated always as identity primary key, failed_at timestamptz not null default now());

alter table public.ansar_assessment_lessons enable row level security;
alter table public.ansar_assessment_papers enable row level security;
alter table public.ansar_assessment_attempts enable row level security;
alter table public.ansar_assessment_outbox enable row level security;
alter table public.ansar_assessment_state enable row level security;
alter table public.ansar_assessment_pin_failures enable row level security;
revoke all on public.ansar_assessment_lessons,public.ansar_assessment_papers,public.ansar_assessment_attempts,public.ansar_assessment_outbox,public.ansar_assessment_state,public.ansar_assessment_pin_failures from anon,authenticated;
grant all on public.ansar_assessment_lessons,public.ansar_assessment_papers,public.ansar_assessment_attempts,public.ansar_assessment_outbox,public.ansar_assessment_state,public.ansar_assessment_pin_failures to service_role;
grant usage,select on sequence public.ansar_assessment_pin_failures_id_seq to service_role;

create or replace function public.protect_ansar_paper() returns trigger language plpgsql set search_path=public as $$
begin
 if exists(select 1 from ansar_assessment_attempts where paper_id=old.id) then
   if new is distinct from old then raise exception 'Assessment already started; preserve the original paper'; end if;
 elsif old.kind='exam' and old.status='published' and (new.questions is distinct from old.questions or new.lessons is distinct from old.lessons or new.status<>old.status) then
   raise exception 'Published exam is immutable';
 end if;
 return new;
end $$;
drop trigger if exists protect_ansar_paper on public.ansar_assessment_papers;
create trigger protect_ansar_paper before update on public.ansar_assessment_papers for each row execute function public.protect_ansar_paper();

create or replace function public.start_ansar_assessment(p_paper_id text) returns public.ansar_assessment_attempts language plpgsql set search_path=public as $$
declare p ansar_assessment_papers; a ansar_assessment_attempts;
begin
 select * into p from ansar_assessment_papers where id=p_paper_id for update;
 if not found then raise exception 'Assessment not found'; end if;
 select * into a from ansar_assessment_attempts where paper_id=p_paper_id;
 if found then return a; end if;
 if p.status<>'published' then raise exception 'This paper needs parent approval'; end if;
 if p.opens_on>(now() at time zone 'Australia/Sydney')::date then raise exception 'This assessment is not open yet'; end if;
 insert into ansar_assessment_attempts(paper_id,paper_snapshot,expires_at) values(p.id,to_jsonb(p),case when p.kind='exam' then now()+make_interval(mins=>p.duration_minutes) else null end) returning * into a;
 return a;
end $$;

create or replace function public.save_ansar_assessment(p_attempt_id uuid,p_answers jsonb,p_revision integer,p_submit boolean default false) returns public.ansar_assessment_attempts language plpgsql set search_path=public as $$
declare a ansar_assessment_attempts;
begin
 select * into a from ansar_assessment_attempts where id=p_attempt_id for update;
 if not found then raise exception 'Attempt not found'; end if;
 if a.status<>'in_progress' then return a; end if;
 -- Deadline takes precedence even over a stale client. Late answers cannot enter the record.
 if a.expires_at is not null and clock_timestamp()>=a.expires_at then
   update ansar_assessment_attempts set status='submitted',submitted_at=clock_timestamp(),revision=revision+1 where id=a.id returning * into a;
   return a;
 end if;
 if a.revision<>p_revision then raise exception 'Revision conflict: reload to see saved work'; end if;
 update ansar_assessment_attempts set answers=p_answers,revision=revision+1,
   status=case when p_submit then 'submitted' else 'in_progress' end,
   submitted_at=case when p_submit then clock_timestamp() else null end
 where id=a.id returning * into a;
 return a;
end $$;
create or replace function public.claim_ansar_assessment_outbox(batch_size integer default 20)
 returns setof public.ansar_assessment_outbox language sql set search_path=public as $$
 update ansar_assessment_outbox set locked_until=now()+interval '10 minutes',attempts=attempts+1
 where id in (select id from ansar_assessment_outbox where status='pending' and (locked_until is null or locked_until<now()) order by created_at for update skip locked limit least(batch_size,50)) returning *;
$$;
revoke all on function public.start_ansar_assessment(text),public.save_ansar_assessment(uuid,jsonb,integer,boolean),public.claim_ansar_assessment_outbox(integer),public.protect_ansar_paper() from public,anon,authenticated;
grant execute on function public.start_ansar_assessment(text),public.save_ansar_assessment(uuid,jsonb,integer,boolean),public.claim_ansar_assessment_outbox(integer),public.protect_ansar_paper() to service_role;

-- Serialize failed guesses globally; successful parent actions do not consume attempts.
create or replace function public.check_ansar_parent(p_correct boolean) returns text language plpgsql set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtext('ansar-assessment-parent-pin'));
 if (select count(*) from ansar_assessment_pin_failures where failed_at>now()-interval '15 minutes')>=5 then return 'locked'; end if;
 if p_correct then return 'ok'; end if;
 insert into ansar_assessment_pin_failures default values;
 return 'invalid';
end $$;
revoke all on function public.check_ansar_parent(boolean) from public,anon,authenticated;
grant execute on function public.check_ansar_parent(boolean) to service_role;

-- Assignment time distinguishes a late parent approval from a missed learner deadline.
alter table public.ansar_assessment_papers add column if not exists published_at timestamptz;
