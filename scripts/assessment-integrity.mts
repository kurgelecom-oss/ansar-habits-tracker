// Live database integrity check. Only creates/deletes uniquely named verification fixtures.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {adminClient} from '../app/lib/supabase-admin';
const db=adminClient(),id=`verification:${randomUUID()}`;
const paper={id,kind:'exam',month:'2099-12',due_date:'2099-12-31',opens_on:'2020-01-01',subject:'Verification only',title:'Temporary integrity test — not learner evidence',status:'published',duration_minutes:25,questions:[{id:'q1',type:'choice',prompt:'Test',options:['A','B'],answer:0,sourceIds:[]}],lessons:[],coverage_note:'Verification fixture'};
try{
 assert.equal((await db.from('ansar_assessment_papers').insert(paper)).error,null);
 const start=()=>db.rpc('start_ansar_assessment',{p_paper_id:id});const [a,b]=await Promise.all([start(),start()]);assert.equal(a.error,null);assert.equal(b.error,null);assert.equal(a.data.id,b.data.id);assert.equal(a.data.expires_at,b.data.expires_at);
 const attempt=a.data;
 const save=(revision:number,answers:object)=>db.rpc('save_ansar_assessment',{p_attempt_id:attempt.id,p_revision:revision,p_answers:answers,p_submit:false});
 assert.equal((await save(0,{q1:0})).error,null);assert.ok((await save(0,{q1:1})).error);
 assert.ok((await db.from('ansar_assessment_papers').update({questions:[]}).eq('id',id)).error);
 const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
 const read=await anon.from('ansar_assessment_attempts').select('id').eq('id',attempt.id);assert.ok(read.error||!read.data?.length);
 assert.ok((await anon.rpc('start_ansar_assessment',{p_paper_id:id})).error);
 await db.from('ansar_assessment_attempts').update({expires_at:new Date(Date.now()-1000).toISOString()}).eq('id',attempt.id);
 const late=await save(1,{q1:1});assert.equal(late.error,null);assert.equal(late.data.status,'submitted');assert.deepEqual(late.data.answers,{q1:0});
 const retry=await save(2,{q1:1});assert.equal(retry.data.revision,late.data.revision);assert.deepEqual(retry.data.answers,{q1:0});
 console.log('PASS: concurrent start, fixed deadline, stale save rejection, immutable paper, private records, late-answer rejection, idempotent submission.');
}finally{
 await db.from('ansar_assessment_attempts').delete().eq('paper_id',id);
 await db.from('ansar_assessment_papers').delete().eq('id',id);
}
