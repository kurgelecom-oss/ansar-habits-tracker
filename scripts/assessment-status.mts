// Read-only operational evidence; never prints student responses or credentials.
// node --env-file=.env.local --import tsx scripts/assessment-status.mts YYYY-MM
import {adminClient} from '../app/lib/supabase-admin';
import {validateMonth} from '../app/lib/assessments/engine';
import {sydneyDateKey} from '../app/lib/time';

const today=sydneyDateKey();
const month=validateMonth(process.argv[2]||today.slice(0,7));
const db=adminClient();
const end=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),1)).toISOString().slice(0,10);
const [lessons,papers,attempts,state,outbox]=await Promise.all([
 db.from('ansar_assessment_lessons').select('id,date,subject').gte('date',month+'-01').lt('date',end).order('date').limit(1000),
 db.from('ansar_assessment_papers').select('id,kind,subject,status,due_date,opens_on,is_practice').eq('month',month).eq('is_practice',false).order('due_date').order('subject'),
 db.from('ansar_assessment_attempts').select('paper_id,status').eq('paper_snapshot->>month',month),
 db.from('ansar_assessment_state').select('updated_at,payload').eq('id','curriculum').maybeSingle(),
 db.from('ansar_assessment_outbox').select('id',{count:'exact',head:true}).eq('status','pending'),
]);
for(const response of [lessons,papers,attempts,state,outbox])if(response.error)throw new Error('Unable to read assessment status. Check the private connection and deployed schema.');
if((lessons.data||[]).length===1000)throw new Error('Month has at least 1,000 lesson snapshots; use a paginated audit before claiming complete coverage.');
const learnerPaperIds=new Set((papers.data||[]).map(p=>p.id));
const learnerAttempts=(attempts.data||[]).filter(a=>learnerPaperIds.has(a.paper_id));
const subjects=[...new Set((lessons.data||[]).map(l=>l.subject))].sort();
console.log(JSON.stringify({
 month,today,completedSyncAt:state.data?.updated_at||null,
 warnings:state.data?.payload?.warnings||[],pendingDeliveries:outbox.count||0,
 sourceCoverage:subjects.map(subject=>{
  const rows=(lessons.data||[]).filter(l=>l.subject===subject);
  return {subject,datedSnapshots:rows.length,eligibleDatedSnapshots:rows.filter(l=>l.date<=today).length,futureDatedSnapshots:rows.filter(l=>l.date>today).length,dates:[...new Set(rows.map(l=>l.date))]};
 }),
 learnerPapers:papers.data,
 learnerAttemptCounts:Object.fromEntries(['in_progress','submitted','reviewed'].map(status=>[status,learnerAttempts.filter(a=>a.status===status).length])),
 note:'Read-only status. Eligible dates do not prove teaching or mastery. Practice records excluded. A completed sync timestamp must be newer than the refresh you requested.',
},null,2));
