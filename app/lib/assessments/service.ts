import {createHash} from 'node:crypto';
import { adminClient } from '../supabase-admin';
import { sydneyDateKey } from '../time';
import { AssessmentError, grade, publicPaper, validateAnswers, validateMarks, validateMonth } from './engine';
import type { Attempt, Paper, Workspace, ParentReview } from './types';
import { syncCurriculum } from './curriculum';
import { queueAttemptReport, queueDueReminders, deliverPending } from './delivery';
const PAPERS='ansar_assessment_papers',ATTEMPTS='ansar_assessment_attempts';
function checked<T>(r:{data:T;error:unknown}):T {if(r.error)throw new AssessmentError('Assessment storage is unavailable. Your saved work is safe; try again.',503);return r.data;}
export function withResult(a:Attempt):Attempt{return {...a,result:a.status==='in_progress'?null:grade(a.paper_snapshot,a.answers,a.parent_review?.marks)};}
export function publicAttempt(a:Attempt):Attempt {return {...withResult(a),paper_snapshot:publicPaper(a.paper_snapshot,a.status!=='in_progress')};}
async function report(a:Attempt){
 if(a.status==='in_progress')return;
 const full=withResult(a);
 if(JSON.stringify(a.result)!==JSON.stringify(full.result)){
   const {error}=await adminClient().from(ATTEMPTS).update({result:full.result}).eq('id',a.id).eq('revision',a.revision);
   if(error)throw new AssessmentError('Your answers are saved; the result is waiting to sync. Try again.',503);
 }
 await queueAttemptReport(full);
}
export async function expireAttempts(){
 const db=adminClient();const expired=checked(await db.from(ATTEMPTS).select('*').eq('status','in_progress').lt('expires_at',new Date().toISOString()));
 for(const a of expired??[]){const r=await db.rpc('save_ansar_assessment',{p_attempt_id:a.id,p_answers:{},p_revision:a.revision,p_submit:true});if(r.error)throw new AssessmentError('Unable to finalise expired exams.',503);await report(r.data as Attempt);}
}
export async function workspace(month:string):Promise<Workspace>{
 validateMonth(month);await expireAttempts();const db=adminClient();
 const [p,a,o,s]=await Promise.all([db.from(PAPERS).select('*').eq('month',month).order('due_date').order('subject'),db.from(ATTEMPTS).select('*').eq('paper_snapshot->>month',month),db.from('ansar_assessment_outbox').select('id',{head:true,count:'exact'}).eq('status','pending'),db.from('ansar_assessment_state').select('payload,updated_at').eq('id','curriculum').maybeSingle()]);
 const papers=checked(p) as Paper[],attempts=checked(a) as Attempt[];if(o.error||s.error)throw new AssessmentError('Assessment status is temporarily unavailable.',503);
 const state=s.data?.payload;const sourceStatus=state?`${state.summary??'Curriculum synced.'}${state.warnings?.length?' '+state.warnings.join(' '):''}`:'Curriculum has not been synced yet. Nihal can refresh it below.';
 return {month,today:sydneyDateKey(),serverNow:new Date().toISOString(),papers:papers.map(p=>{const a=attempts.find(a=>a.paper_id===p.id);return p.kind==='exam'&&!a?{...p,questions:[]}:publicPaper(p,!!a&&a.status!=='in_progress')}),attempts:attempts.map(publicAttempt),sourceStatus,integrations:{notion:Boolean(process.env.NOTION_TOKEN&&process.env.ASSESSMENT_NOTION_DB_ID),email:Boolean(process.env.ASSESSMENT_EMAIL_TO&&((process.env.ASSESSMENT_COMPOSIO_API_KEY&&process.env.ASSESSMENT_GMAIL_ACCOUNT_ID)||(process.env.RESEND_API_KEY&&process.env.ASSESSMENT_EMAIL_FROM)||(process.env.ASSESSMENT_MS_REFRESH_TOKEN&&process.env.ASSESSMENT_MS_CLIENT_ID&&process.env.ASSESSMENT_MS_CLIENT_SECRET))),pending:o.count??0}};
}
async function getAttempt(id:unknown){if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))throw new AssessmentError('Invalid attempt.');const a=checked(await adminClient().from(ATTEMPTS).select('*').eq('id',id).maybeSingle());if(!a)throw new AssessmentError('Attempt not found.',404);return a as Attempt;}
function textValue(value:unknown,label:string,min=5,max=4000){if(typeof value!=='string'||value.trim().length<min||value.length>max)throw new AssessmentError(`${label} must contain ${min}–${max} characters.`);return value.trim();}
export async function startPaper(id:unknown){if(typeof id!=='string'||id.length>180)throw new AssessmentError('Invalid assessment.');const r=await adminClient().rpc('start_ansar_assessment',{p_paper_id:id});if(r.error)throw new AssessmentError(/not open/.test(r.error.message)?'This assessment is not open yet.':/approval/.test(r.error.message)?'Nihal needs to approve this exam first.':'Unable to start this assessment.',409);return publicAttempt(r.data as Attempt);}
export async function saveAttempt(body:Record<string,unknown>){
 const a=await getAttempt(body.attemptId);if(a.status!=='in_progress'){await report(a);return publicAttempt(a);}
 const answers=validateAnswers(a.paper_snapshot,body.answers);if(!Number.isInteger(body.revision))throw new AssessmentError('Refresh to load the saved version.',409);
 if(body.action==='submit'&&(!a.expires_at||Date.now()<Date.parse(a.expires_at))&&a.paper_snapshot.kind==='review'&&a.paper_snapshot.questions.some(q=>typeof answers[q.id]!=='string'||String(answers[q.id]).trim().length<10))throw new AssessmentError('Give each recall prompt a meaningful answer (at least 10 characters).');
 const r=await adminClient().rpc('save_ansar_assessment',{p_attempt_id:a.id,p_answers:answers,p_revision:body.revision,p_submit:body.action==='submit'});
 if(r.error)throw new AssessmentError(/Revision conflict/.test(r.error.message)?'A newer version is saved. Reload before continuing.':'Could not save. Keep this page open and try again.',409);
 const updated=r.data as Attempt;await report(updated);return publicAttempt(updated);
}
export async function publishPaper(body:Record<string,unknown>){
 if(body.coverageConfirmed!==true)throw new AssessmentError('Confirm the paper matches what Ansar studied.');
 if(typeof body.paperId!=='string')throw new AssessmentError('Choose a paper.');
 const duration=body.durationMinutes;if(typeof duration!=='number'||!Number.isInteger(duration)||duration<10||duration>90)throw new AssessmentError('Choose 10–90 minutes before the exam starts.');
 const preview=await previewPaper(body.paperId);if(body.previewVersion!==preview.previewVersion)throw new AssessmentError('The curriculum changed after your preview. Review the new paper before approving.',409);
 const r=await adminClient().from(PAPERS).update({status:'published',duration_minutes:duration}).eq('id',body.paperId).eq('kind','exam').eq('status','draft').eq('questions',JSON.stringify(preview.paper.questions)).eq('lessons',JSON.stringify(preview.paper.lessons)).select('*').maybeSingle();
 if(r.error||!r.data)throw new AssessmentError('This paper has already been approved or started. Refresh to check.',409);
 return publicPaper(r.data as Paper);
}
export async function reviewAttempt(body:Record<string,unknown>){
 const a=await getAttempt(body.attemptId);if(a.status==='reviewed'){await report(a);return publicAttempt(a);}if(a.status!=='submitted')throw new AssessmentError('Only submitted work can be reviewed.',409);
 await report(a);
 const marks=validateMarks(a.paper_snapshot,body.marks);
 if(/practical|demonstration/i.test(a.paper_snapshot.coverage_note)&&body.practicalConfirmed!==true)throw new AssessmentError('Record the practical demonstration before confirming this subject.');
 const review:ParentReview={marks,feedback:textValue(body.feedback,'Feedback'),nextStep:textValue(body.nextStep,'Next step'),reviewer:'Nihal',reviewedAt:new Date().toISOString(),practicalConfirmed:body.practicalConfirmed===true};
 const r=await adminClient().from(ATTEMPTS).update({parent_review:review,status:'reviewed',revision:a.revision+1}).eq('id',a.id).eq('status','submitted').eq('revision',a.revision).select('*').maybeSingle();
 if(r.error||!r.data)throw new AssessmentError('This work changed. Refresh before reviewing.',409);
 await report(r.data as Attempt);return publicAttempt(r.data as Attempt);
}
export async function correctAttempt(body:Record<string,unknown>){
 const a=await getAttempt(body.attemptId);if(a.status!=='reviewed')throw new AssessmentError('Wait for Nihal’s feedback before writing your correction.');
 await report(a);
 if(a.correction)return publicAttempt(a);
 const r=await adminClient().from(ATTEMPTS).update({correction:textValue(body.text,'Correction',20,8000),correction_at:new Date().toISOString(),revision:a.revision+1}).eq('id',a.id).eq('revision',a.revision).is('correction',null).select('*').maybeSingle();
 if(r.error||!r.data)throw new AssessmentError('This work changed. Refresh to see the latest version.',409);
 await report(r.data as Attempt);return publicAttempt(r.data as Attempt);
}
export async function runMaintenance(){
 const db=adminClient();const now=Date.now();
 // Lease prevents a scheduled run and parent refresh from generating concurrently.
 const lease=await db.from('ansar_assessment_state').insert({id:'maintenance-lock',payload:{},updated_at:new Date(now).toISOString()});
 if(lease.error&&lease.error.code!=='23505')throw new AssessmentError('Unable to acquire the maintenance lock.',503);
 if(lease.error){const lock=await db.from('ansar_assessment_state').update({updated_at:new Date(now).toISOString()}).eq('id','maintenance-lock').lt('updated_at',new Date(now-16*60000).toISOString()).select('id');if(lock.error||!lock.data?.length)return {busy:true};}
 try {
   await expireAttempts();
   let result;try{result=await syncCurriculum();}catch{result={lessons:0,reviews:0,exams:0,warnings:['Curriculum sync failed. Existing papers and saved work remain available; delivery retries continue.']};}
   const status=await db.from('ansar_assessment_state').upsert({id:'curriculum',payload:{...result,summary:`${result.lessons} lesson snapshots · ${result.reviews} Friday reviews · ${result.exams} exam drafts processed.`},updated_at:new Date().toISOString()});if(status.error)throw new Error('Unable to save sync status');
   // Reconstruct unsent report jobs after a process crash between submission and enqueue.
   let offset=0;
   while(true){const rows=checked(await db.from(ATTEMPTS).select('*').neq('status','in_progress').order('started_at').range(offset,offset+99)) as Attempt[];for(const a of rows)await report(a);if(rows.length<100)break;offset+=100;}
   await queueDueReminders(sydneyDateKey());let sent=0,failed=0;
   for(let i=0;i<10;i++){const batch=await deliverPending();sent+=batch.sent;failed+=batch.failed;if(batch.sent+batch.failed===0)break;}
   return {...result,sent,failed};
 } finally {await db.from('ansar_assessment_state').delete().eq('id','maintenance-lock');}
}

export async function previewPaper(id:unknown){
 if(typeof id!=='string'||id.length>180)throw new AssessmentError('Choose a paper.');
 const p=checked(await adminClient().from(PAPERS).select('*').eq('id',id).maybeSingle());
 if(!p)throw new AssessmentError('Paper not found.',404);const paper=p as Paper;return {paper,previewVersion:createHash('sha256').update(JSON.stringify({questions:paper.questions,lessons:paper.lessons})).digest('hex')};
}
