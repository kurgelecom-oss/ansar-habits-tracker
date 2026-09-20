// Opt-in live functional stress checks. Creates only labelled practice attempts;
// the temporary learner-scope guard fixture is removed in finally. No email sends.
// ASSESSMENT_TEST_PIN must be supplied privately, never committed.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {adminClient} from '../app/lib/supabase-admin';
import {practicePaper} from '../app/lib/assessments/practice';
import {sydneyDateKey} from '../app/lib/time';
const site=(process.env.ASSESSMENT_SITE_URL||'http://localhost:3000').replace(/\/$/,'');
const pin=process.env.ASSESSMENT_TEST_PIN;if(!pin)throw new Error('Provide ASSESSMENT_TEST_PIN privately.');
const db=adminClient(),month=sydneyDateKey().slice(0,7);
async function call(path:string,cookie='',body?:unknown,expected=200){
 const response=await fetch(site+path,{method:body?'POST':'GET',headers:{origin:site,'content-type':'application/json',cookie},...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json();assert.equal(response.status,expected,`${path}: ${response.status} ${data.message||''}`);
 return {data,cookie:response.headers.get('set-cookie')?.split(';')[0]||''};
}
const live='/api/assessments',practice=live+'/practice';
await call(practice+'?month='+month,'',undefined,401);
const learnerCookie=(await call(live+'/session','',{pin})).cookie;
await call(practice+'?month='+month,learnerCookie,undefined,401);
const parentCookie=(await call(practice+'/session','',{pin})).cookie;
await call(live+'?month='+month,parentCookie,undefined,401);
const before=(await call(live+'?month='+month,learnerCookie)).data;
const beforeWork=JSON.stringify(before.attempts);
const fixture={...practicePaper('exam'),id:'verify-practice-scope-'+randomUUID(),is_practice:false,title:'Temporary scope guard fixture'};
const inserted=await db.from('ansar_assessment_papers').insert(fixture);if(inserted.error)throw inserted.error;
try{
 await call(practice,parentCookie,{action:'start',paperId:fixture.id},409);
 const guard=await db.from('ansar_assessment_attempts').select('id').eq('paper_id',fixture.id);assert.equal(guard.data?.length,0,'Practice must not start learner paper');
 const paper=(await call(practice,parentCookie,{action:'create',kind:'exam'})).data.paper;
 await call(live,learnerCookie,{action:'start',paperId:paper.id},409);
 const starting=await Promise.all([call(practice,parentCookie,{action:'start',paperId:paper.id}),call(practice,parentCookie,{action:'start',paperId:paper.id})]);
 const initial=starting[0].data.attempt;assert.equal(initial.id,starting[1].data.attempt.id);assert.equal(initial.expires_at,starting[1].data.attempt.expires_at);
 assert.ok(initial.paper_snapshot.questions.every((q:any)=>q.answer===undefined));
 const choices=paper.questions.filter((q:any)=>q.type==='choice');
 const answers=Object.fromEntries(paper.questions.map((q:any,index:number)=>[q.id,q.type==='choice'?(index===0?(q.answer+1)%4:q.answer):'Parent practice: I explained the sample reasoning and supporting detail.']));
 const saved=(await call(practice,parentCookie,{action:'save',attemptId:initial.id,revision:initial.revision,answers})).data.attempt;
 await call(practice,parentCookie,{action:'save',attemptId:initial.id,revision:initial.revision,answers:{}},409);
 await call(live,learnerCookie,{action:'save',attemptId:initial.id,revision:saved.revision,answers:{}},404);
 const reloaded=(await call(practice+'?month='+month,parentCookie)).data.attempts.find((a:any)=>a.id===initial.id);assert.deepEqual(reloaded.answers,answers);assert.equal(reloaded.expires_at,initial.expires_at);
 const submitted=(await call(practice,parentCookie,{action:'submit',attemptId:initial.id,revision:saved.revision,answers})).data.attempt;
 assert.equal(submitted.result.objectiveCorrect,choices.length-1);assert.equal(submitted.result.writtenPending,4);assert.equal(submitted.result.percentage,null);
 const marks=Object.fromEntries(paper.questions.filter((q:any)=>q.type==='written').map((q:any)=>[q.id,2]));
 const reviewed=(await call(practice,parentCookie,{action:'review',attemptId:initial.id,pin,marks,feedback:'Parent practice feedback: check the deliberately wrong first choice.',nextStep:'Explain the correct first choice using a new sample.'})).data.attempt;
 assert.equal(reviewed.result.percentage,94);
 const corrected=(await call(practice,parentCookie,{action:'correction',attemptId:initial.id,text:'Parent practice correction: I checked the first sample and can now explain its correct answer.'})).data.attempt;
 assert.deepEqual(corrected.answers,answers);assert.ok(corrected.correction);
 const preview=(await call(practice,parentCookie,{action:'report-preview',attemptId:initial.id})).data.report;
 assert.match(preview.subject,/PARENT PRACTICE/);assert.match(preview.report,/94%/);assert.match(preview.report,/Parent practice correction/);assert.equal(preview.metadata.kind,'system');assert.equal(preview.metadata.score,null);
 const deadlinePaper=(await call(practice,parentCookie,{action:'create',kind:'exam'})).data.paper;
 const deadlineStart=(await call(practice,parentCookie,{action:'start',paperId:deadlinePaper.id})).data.attempt;
 const firstQuestion=deadlinePaper.questions[0];const savedAnswer={[firstQuestion.id]:firstQuestion.answer};
 const deadlineSave=(await call(practice,parentCookie,{action:'save',attemptId:deadlineStart.id,revision:deadlineStart.revision,answers:savedAnswer})).data.attempt;
 const expired=(await call(practice,parentCookie,{action:'expire',attemptId:deadlineStart.id})).data.attempt;assert.equal(expired.status,'submitted');assert.deepEqual(expired.answers,savedAnswer);
 const late=(await call(practice,parentCookie,{action:'save',attemptId:deadlineStart.id,revision:deadlineSave.revision,answers:{}})).data.attempt;assert.deepEqual(late.answers,savedAnswer);
 const expiryReport=(await call(practice,parentCookie,{action:'report-preview',attemptId:deadlineStart.id})).data.report;assert.match(expiryReport.report,/Objective: 1\/8/);
 const leaked=await db.from('ansar_assessment_outbox').select('id').like('id','attempt-%').like('payload->>subject','%Parent Practice%');assert.equal(leaked.data?.length,0,'Practice must not enqueue automatic learner reports');
 const liveAfter=(await call(live+'?month='+month,learnerCookie)).data;
 assert.ok(!liveAfter.papers.some((p:any)=>p.is_practice));assert.ok(!liveAfter.attempts.some((a:any)=>a.paper_snapshot.is_practice));assert.equal(JSON.stringify(liveAfter.attempts),beforeWork,'Existing learner work must remain unchanged');
 console.log(JSON.stringify({ok:true,checks:['separate session access','bidirectional scope isolation','concurrent idempotent start','answer-key redaction','autosave reload','stale revision rejection','objective and written marking','immutable correction','full labelled report','server expiry discards late edits','no automatic reports','learner record unchanged'],reviewedPracticeAttempt:initial.id,expiredPracticeAttempt:deadlineStart.id}));
}finally{
 const cleanedAttempts=await db.from('ansar_assessment_attempts').delete().eq('paper_id',fixture.id);if(cleanedAttempts.error)throw cleanedAttempts.error;
 const clean=await db.from('ansar_assessment_papers').delete().eq('id',fixture.id);if(clean.error)throw clean.error;
}
