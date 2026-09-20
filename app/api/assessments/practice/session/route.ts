import {NextResponse} from 'next/server';
import {clearPracticeSession,requireSameOrigin,setPracticeSession,verifyParent} from '../../../../lib/assessments/auth';
import {AssessmentError} from '../../../../lib/assessments/engine';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{requireSameOrigin(request);const raw=await request.text();if(raw.length>1000)throw new AssessmentError('Request too large.',413);const {pin}=JSON.parse(raw);await verifyParent(pin);await setPracticeSession();return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});}catch(e){return NextResponse.json({message:e instanceof AssessmentError?e.message:'Unable to unlock parent practice.'},{status:e instanceof AssessmentError?e.status:503});}}
export async function DELETE(request:Request){try{requireSameOrigin(request);await clearPracticeSession();return NextResponse.json({ok:true});}catch{return NextResponse.json({message:'Unable to lock parent practice.'},{status:403});}}
