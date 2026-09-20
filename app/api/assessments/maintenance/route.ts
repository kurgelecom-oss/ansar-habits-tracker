import {NextResponse} from 'next/server';
import {requireCron} from '../../../lib/assessments/auth';
import {AssessmentError} from '../../../lib/assessments/engine';
import {expireAttempts} from '../../../lib/assessments/service';
import {deliverPending} from '../../../lib/assessments/delivery';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function POST(request:Request){try{requireCron(request);await expireAttempts();return NextResponse.json(await deliverPending(),{headers:{'Cache-Control':'no-store'}});}catch(e){return NextResponse.json({message:e instanceof AssessmentError?e.message:'Maintenance failed; jobs remain queued.'},{status:e instanceof AssessmentError?e.status:503});}}
