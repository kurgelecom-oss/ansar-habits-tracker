import assert from 'node:assert/strict';
const base=(process.env.ASSESSMENT_SITE_URL||'http://localhost:3000').replace(/\/$/,'');
const pin=process.env.PARENT_OVERRIDE_PIN;if(!pin)throw new Error('Set PARENT_OVERRIDE_PIN for the opt-in practice smoke test.');
let cookie='';
async function call(path:string,init:RequestInit={}){const response=await fetch(`${base}${path}`,{...init,headers:{origin:base,'content-type':'application/json',cookie,...init.headers}});const set=response.headers.get('set-cookie');if(set)cookie=set.split(';',1)[0];const body=await response.json();assert.ok(response.ok,`${path}: ${response.status} ${JSON.stringify(body)}`);return body;}
await call('/api/assessments/practice/session',{method:'POST',body:JSON.stringify({pin})});
const created=await call('/api/assessments/practice',{method:'POST',body:JSON.stringify({action:'create',kind:'exam'})});assert.equal(created.paper.is_practice,true);assert.equal(created.paper.questions.length,12);
const started=await call('/api/assessments/practice',{method:'POST',body:JSON.stringify({action:'start',paperId:created.paper.id})});
const answers=Object.fromEntries(created.paper.questions.map((q:{id:string,type:string})=>[q.id,q.type==='choice'?0:'A fictional practice response with enough detail.']));
const submitted=await call('/api/assessments/practice',{method:'POST',body:JSON.stringify({action:'submit',attemptId:started.attempt.id,revision:started.attempt.revision,answers})});assert.equal(submitted.attempt.status,'submitted');
const preview=await call('/api/assessments/practice',{method:'POST',body:JSON.stringify({action:'report-preview',attemptId:started.attempt.id})});assert.match(preview.report.subject,/PARENT PRACTICE/);assert.equal(preview.report.metadata.score,null);
console.log(JSON.stringify({ok:true,paperId:created.paper.id,attemptId:started.attempt.id,status:submitted.attempt.status}));
