// Local end-to-end API test against disposable fixtures. Never sends notifications.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {adminClient} from '../app/lib/supabase-admin';
import {sydneyDateKey} from '../app/lib/time';
const db=adminClient(), marker=`System verification ${randomUUID()}`, id=`verification:${randomUUID()}`,base='http://localhost:3017';
let cookie='';
async function request(body?:object,path='/api/assessments'){
 const r=await fetch(base+path,{method:body?'POST':'GET',headers:{origin:base,'content-type':'application/json',cookie},...(body?{body:JSON.stringify(body)}:{})});
 const json=await r.json();return {status:r.status,json,response:r};
}
const questions=[{id:'q1',type:'choice',prompt:'Verification arithmetic: 2+2?',options:['4','5','6','7'],answer:0,explanation:'2+2=4',sourceIds:[]},{id:'q2',type:'written',prompt:'Explain your method.',rubric:'0 absent, 1 partial, 2 clear explanation',sourceIds:[]}];
try{
 assert.equal((await request()).status,401);
 const auth=await request({pin:process.env.ASSESSMENT_TEST_PIN},'/api/assessments/session');assert.equal(auth.status,200);cookie=auth.response.headers.get('set-cookie')!.split(';')[0];
 const today=sydneyDateKey();assert.equal((await db.from('ansar_assessment_papers').insert({id,kind:'exam',month:today.slice(0,7),due_date:today,opens_on:today,subject:marker,title:marker,status:'draft',duration_minutes:25,questions,lessons:[],coverage_note:'Temporary verification only'})).error,null);
 let room=await request();assert.deepEqual(room.json.papers.find((p:any)=>p.id===id).questions,[]);
 assert.equal((await request({action:'preview',paperId:id,pin:process.env.ASSESSMENT_TEST_PIN})).status,200);
 let preview=(await request({action:'preview',paperId:id,pin:process.env.ASSESSMENT_TEST_PIN})).json;
 await db.from('ansar_assessment_papers').update({questions:questions.map((q,i)=>i? q:{...q,prompt:q.prompt+' Updated.'})}).eq('id',id);
 const publish=(version:string)=>request({action:'publish',paperId:id,pin:process.env.ASSESSMENT_TEST_PIN,durationMinutes:25,coverageConfirmed:true,previewVersion:version});
 assert.equal((await publish(preview.previewVersion)).status,409);
 preview=(await request({action:'preview',paperId:id,pin:process.env.ASSESSMENT_TEST_PIN})).json;assert.equal((await publish(preview.previewVersion)).status,200);
 let a=(await request({action:'start',paperId:id})).json.attempt;assert.ok(a.id);assert.equal(a.paper_snapshot.questions[0].answer,undefined);
 const saved=await request({action:'save',attemptId:a.id,revision:a.revision,answers:{q1:0,q2:'Two pairs make four objects.'}});assert.equal(saved.status,200);a=saved.json.attempt;
 const submit=await request({action:'submit',attemptId:a.id,revision:a.revision,answers:a.answers});assert.equal(submit.status,200);a=submit.json.attempt;assert.equal(a.result.objectiveCorrect,1);assert.equal(a.result.percentage,null);assert.equal(a.paper_snapshot.questions[0].answer,0);
 const review=await request({action:'review',attemptId:a.id,pin:process.env.ASSESSMENT_TEST_PIN,marks:{q2:2},feedback:'Clear explanation for this system test.',nextStep:'No learner action; verification only.'});assert.equal(review.status,200);a=review.json.attempt;assert.equal(a.result.percentage,100);
 const correction=await request({action:'correction',attemptId:a.id,text:'This is a test correction for the verification fixture.'});assert.equal(correction.status,200);assert.equal(correction.json.attempt.answers.q2,'Two pairs make four objects.');assert.ok(correction.json.attempt.correction_at);
 const jobs=await db.from('ansar_assessment_outbox').select('id').like('payload->>subject',`%${marker}%`);assert.equal(jobs.data?.length,6);
 console.log('PASS: login, private GET, hidden questions, PIN-only preview, stale approval409, publish, timed start, autosave, objective score, parent review100%, preserved correction, six durable delivery jobs.');
}finally{
 await db.from('ansar_assessment_outbox').delete().like('payload->>subject',`%${marker}%`);
 await db.from('ansar_assessment_attempts').delete().eq('paper_id',id);
 await db.from('ansar_assessment_papers').delete().eq('id',id);
 console.log('Verification fixtures and queued test jobs removed; no test email sent.');
}
