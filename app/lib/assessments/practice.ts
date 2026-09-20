import {randomUUID} from 'node:crypto';
import {adminClient} from '../supabase-admin';
import {sydneyDateKey} from '../time';
import {AssessmentError} from './engine';
import {attemptReport,queuePracticeReport} from './delivery';
import {publicAttempt,withResult} from './service';
import type {Attempt,Paper,Question} from './types';
const choiceSamples=[
 ['Which sample value is even?',['3','8','11','15'],1,'8 divides into whole pairs.'],
 ['Which sample fraction equals one half?',['1/3','2/4','3/4','4/5'],1,'Two of four equal parts is one half.'],
 ['Which sample word is a noun?',['quickly','garden','bright','under'],1,'Garden names a place.'],
 ['Which sample sentence is punctuated correctly?',['Where are you.','Where are you?','where are you?','Where are you'],1,'A question begins with a capital and ends with a question mark.'],
 ['Which sample unit measures length?',['litre','kilogram','centimetre','minute'],2,'A centimetre is a unit of length.'],
 ['Which sample shape has three sides?',['square','circle','triangle','rectangle'],2,'A triangle has three sides.'],
 ['Which sample number is greatest?',['19','91','29','49'],1,'91 has the greatest tens value.'],
 ['Which sample operation finds a total?',['addition','division','subtraction','comparison'],0,'Addition combines amounts to find a total.'],
] as const;
export function practicePaper(kind:'exam'|'review',today=sydneyDateKey(),nonce:string=randomUUID()):Paper{
 const sourceId=`practice-source-${kind}`;
 const prompts=kind==='review'?['Recall one useful strategy from this fictional sample and describe it.','Explain the sample idea in your own words.','Apply the sample idea to a new made-up example.','Name one part that could still be confusing and a next step.']:['Explain how you know that 24 is even.','Show one way to calculate 18 + 27.','Explain why 3/6 and 1/2 are equivalent.','Write a short, correctly punctuated question about a triangle.'];
 const written:Question[]=prompts.map((prompt,i)=>({id:`practice-${kind}-written-${i+1}`,type:'written',prompt,rubric:'Award 0 for no relevant reasoning, 1 for a partly explained idea, or 2 for clear reasoning with a supporting detail.',sourceIds:[sourceId]}));
 const choices:Question[]=choiceSamples.map(([prompt,options,answer,explanation],i)=>({id:`practice-exam-choice-${i+1}`,type:'choice',prompt,options:[...options],answer,explanation,sourceIds:[sourceId]}));
 return {id:`practice-${kind}-${nonce}`,kind,month:today.slice(0,7),due_date:today,opens_on:today,subject:'Parent Practice',title:`PARENT PRACTICE — Sample ${kind==='exam'?'Exam':'Review'} · ${today} · ${nonce.slice(0,8)}`,status:'published',duration_minutes:kind==='exam'?10:null,questions:kind==='exam'?[...choices,...written]:written,lessons:[],coverage_note:'Fictional sample content for parent workflow rehearsal only. It makes no claim about learner progress.',is_practice:true,published_at:new Date().toISOString()};
}
export async function createPracticePaper(kind:unknown){if(kind!=='exam'&&kind!=='review')throw new AssessmentError('Choose exam or review.');const paper=practicePaper(kind);const {data,error}=await adminClient().from('ansar_assessment_papers').insert(paper).select('*').single();if(error||!data)throw new AssessmentError('Could not create the practice paper.',503);return data as Paper;}
async function practiceAttempt(id:unknown){if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))throw new AssessmentError('Invalid attempt.');const {data,error}=await adminClient().from('ansar_assessment_attempts').select('*').eq('id',id).eq('paper_snapshot->>is_practice','true').maybeSingle();if(error)throw new AssessmentError('Assessment storage is unavailable.',503);if(!data)throw new AssessmentError('Practice attempt not found.',404);return data as Attempt;}
export async function expirePracticeAttempt(id:unknown){const a=await practiceAttempt(id);if(a.status!=='in_progress')return publicAttempt(a);const {data,error}=await adminClient().rpc('expire_ansar_practice_assessment',{p_attempt_id:a.id});if(error||!data)throw new AssessmentError('Could not expire the practice timer.',409);return publicAttempt(data as Attempt);}
export async function previewPracticeReport(id:unknown){const a=await practiceAttempt(id);if(a.status==='in_progress')throw new AssessmentError('Submit the practice attempt before previewing its report.',409);return attemptReport(withResult(a),true);}
export async function sendPracticeReport(id:unknown){const a=await practiceAttempt(id);if(a.status==='in_progress')throw new AssessmentError('Submit the practice attempt before sending its report.',409);await queuePracticeReport(withResult(a));return 'PARENT PRACTICE report queued for delivery.';}
