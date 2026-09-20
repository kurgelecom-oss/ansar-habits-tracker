-- Additive parent-practice isolation. Apply after db/assessments.sql.
alter table public.ansar_assessment_papers add column if not exists is_practice boolean not null default false;
create index if not exists ansar_assessment_papers_scope_month on public.ansar_assessment_papers(is_practice,month);
create index if not exists ansar_assessment_attempts_snapshot_scope on public.ansar_assessment_attempts((coalesce((paper_snapshot->>'is_practice')::boolean,false)));

create or replace function public.start_ansar_assessment_scoped(p_paper_id text,p_is_practice boolean default false) returns public.ansar_assessment_attempts language plpgsql set search_path=public as $$
declare p ansar_assessment_papers; a ansar_assessment_attempts;
begin
 select * into p from ansar_assessment_papers where id=p_paper_id and is_practice=p_is_practice for update;
 if not found then raise exception 'Assessment not found in this scope'; end if;
 select * into a from ansar_assessment_attempts where paper_id=p_paper_id;
 if found then
   if coalesce((a.paper_snapshot->>'is_practice')::boolean,false)<>p_is_practice then raise exception 'Assessment scope mismatch'; end if;
   return a;
 end if;
 if p.status<>'published' then raise exception 'This paper needs parent approval'; end if;
 if p.opens_on>(now() at time zone 'Australia/Sydney')::date then raise exception 'This assessment is not open yet'; end if;
 insert into ansar_assessment_attempts(paper_id,paper_snapshot,expires_at) values(p.id,to_jsonb(p),case when p.kind='exam' then now()+make_interval(mins=>p.duration_minutes) else null end) returning * into a;
 return a;
end $$;

create or replace function public.save_ansar_assessment_scoped(p_attempt_id uuid,p_answers jsonb,p_revision integer,p_submit boolean default false,p_is_practice boolean default false) returns public.ansar_assessment_attempts language plpgsql set search_path=public as $$
declare a ansar_assessment_attempts;
begin
 select * into a from ansar_assessment_attempts where id=p_attempt_id and coalesce((paper_snapshot->>'is_practice')::boolean,false)=p_is_practice for update;
 if not found then raise exception 'Attempt not found in this scope'; end if;
 if a.status<>'in_progress' then return a; end if;
 if a.expires_at is not null and clock_timestamp()>=a.expires_at then update ansar_assessment_attempts set status='submitted',submitted_at=clock_timestamp(),revision=revision+1 where id=a.id returning * into a;return a;end if;
 if a.revision<>p_revision then raise exception 'Revision conflict: reload to see saved work'; end if;
 update ansar_assessment_attempts set answers=p_answers,revision=revision+1,status=case when p_submit then 'submitted' else 'in_progress' end,submitted_at=case when p_submit then clock_timestamp() else null end where id=a.id returning * into a;
 return a;
end $$;

create or replace function public.expire_ansar_practice_assessment(p_attempt_id uuid) returns public.ansar_assessment_attempts language plpgsql set search_path=public as $$
declare a ansar_assessment_attempts;
begin
 select * into a from ansar_assessment_attempts where id=p_attempt_id and coalesce((paper_snapshot->>'is_practice')::boolean,false)=true for update;
 if not found then raise exception 'Practice attempt not found'; end if;
 if a.status='in_progress' then update ansar_assessment_attempts set expires_at=clock_timestamp(),status='submitted',submitted_at=clock_timestamp(),revision=revision+1 where id=a.id returning * into a;end if;
 return a;
end $$;

revoke all on function public.start_ansar_assessment_scoped(text,boolean),public.save_ansar_assessment_scoped(uuid,jsonb,integer,boolean,boolean),public.expire_ansar_practice_assessment(uuid) from public,anon,authenticated;
grant execute on function public.start_ansar_assessment_scoped(text,boolean),public.save_ansar_assessment_scoped(uuid,jsonb,integer,boolean,boolean),public.expire_ansar_practice_assessment(uuid) to service_role;
