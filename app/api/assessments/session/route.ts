import {NextResponse} from 'next/server';
import {requireSameOrigin,verifyParent,setDeviceSession,clearDeviceSession} from '../../../lib/assessments/auth';
import {AssessmentError} from '../../../lib/assessments/engine';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{requireSameOrigin(request);const body=await request.text();if(body.length>1000)throw new AssessmentError('Request too large.');const {pin}=JSON.parse(body);await verifyParent(pin);await setDeviceSession();return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});}catch(e){return NextResponse.json({message:e instanceof AssessmentError?e.message:'Unable to unlock this device.'},{status:e instanceof AssessmentError?e.status:503});}}
export async function DELETE(request:Request){try{requireSameOrigin(request);await clearDeviceSession();return NextResponse.json({ok:true});}catch(e){return NextResponse.json({message:'Unable to lock this device.'},{status:403});}}
