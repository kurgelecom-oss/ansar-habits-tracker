import {NextResponse} from 'next/server';
import {requireSession,requireSameOrigin,verifyParent} from '../../lib/assessments/auth';
import {AssessmentError} from '../../lib/assessments/engine';
import {workspace,startPaper,saveAttempt,publishPaper,reviewAttempt,correctAttempt,previewPaper} from '../../lib/assessments/service';
import {sydneyDateKey} from '../../lib/time';
export const dynamic='force-dynamic';
export const maxDuration=60;
const headers={'Cache-Control':'no-store'};
function fail(e:unknown){return NextResponse.json({message:e instanceof AssessmentError?e.message:'The assessment service is temporarily unavailable. Your saved work is safe.'},{status:e instanceof AssessmentError?e.status:503,headers});}
export async function GET(request:Request){try{await requireSession();return NextResponse.json(await workspace(new URL(request.url).searchParams.get('month')??sydneyDateKey().slice(0,7)),{headers});}catch(e){return fail(e);}}
export async function POST(request:Request){try{
 requireSameOrigin(request);await requireSession();const raw=await request.text();if(raw.length>110000)throw new AssessmentError('Request too large.',413);
 let b:Record<string,unknown>;try{b=JSON.parse(raw);if(!b||Array.isArray(b)||typeof b!=='object')throw new Error();}catch{throw new AssessmentError('Invalid request.');}
 if(['publish','review','sync','preview'].includes(String(b.action)))await verifyParent(b.pin);
 switch(b.action){
  case 'start':return NextResponse.json({attempt:await startPaper(b.paperId)},{headers});
  case 'save':case 'submit':return NextResponse.json({attempt:await saveAttempt(b)},{headers});
  case 'preview':return NextResponse.json(await previewPaper(b.paperId),{headers});
  case 'publish':return NextResponse.json({paper:await publishPaper(b)},{headers});
  case 'review':return NextResponse.json({attempt:await reviewAttempt(b)},{headers});
  case 'correction':return NextResponse.json({attempt:await correctAttempt(b)},{headers});
  case 'sync':{
   const key=process.env.ASSESSMENT_CRON_SECRET;if(!key)throw new AssessmentError('Curriculum automation is not configured.',503);
   const response=await fetch(`${process.env.ASSESSMENT_SITE_URL??new URL(request.url).origin}/.netlify/functions/assessment-maintenance-background`,{method:'POST',headers:{authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw new AssessmentError('Could not start curriculum refresh. Try again.',503);
   return NextResponse.json({ok:true,message:'Curriculum refresh started. New exam drafts may take a few minutes; reload to see them.'},{status:202,headers});
  }
  default:throw new AssessmentError('Unknown action.');
 }
}catch(e){return fail(e);}}
