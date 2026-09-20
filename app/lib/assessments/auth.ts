import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { adminClient } from '../supabase-admin';
import { AssessmentError } from './engine';
const COOKIE='ansar_assessment_device',PRACTICE_COOKIE='ansar_assessment_practice';
type SessionPurpose='learner'|'practice';
function secret(){const s=process.env.ASSESSMENT_SESSION_SECRET;if(!s)throw new AssessmentError('Assessment access is not configured.',503);return s;}
function signature(value:string){return createHmac('sha256',secret()).update(value).digest('base64url');}
export function signSession(expires:number,purpose:SessionPurpose='learner'){const value=Buffer.from(JSON.stringify({expires,id:randomUUID(),role:purpose})).toString('base64url');return `${value}.${signature(value)}`;}
export function validSession(token:string|undefined,now=Date.now(),purpose:SessionPurpose='learner'){
  if(!token)return false;
  try {const [value,sig,...extra]=token.split('.');const expected=signature(value);if(extra.length||!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;
    const payload=JSON.parse(Buffer.from(value,'base64url').toString());return payload.role===purpose&&Number.isFinite(payload.expires)&&payload.expires>now;
  }catch{return false;}
}
export async function requireSession(){if(!validSession((await cookies()).get(COOKIE)?.value))throw new AssessmentError('Nihal can unlock this device with the parent PIN.',401);}
export async function requirePracticeSession(){if(!validSession((await cookies()).get(PRACTICE_COOKIE)?.value,Date.now(),'practice'))throw new AssessmentError('Unlock parent practice with the parent PIN.',401);}
export function requireSameOrigin(request:Request){
  // Netlify's proxy can expose an internal request URL to Next.js. Compare the
  // browser Origin with server-configured public URLs, never forwarded headers.
  const configured=[process.env.ASSESSMENT_SITE_URL,process.env.DEPLOY_PRIME_URL,process.env.DEPLOY_URL].filter((value):value is string=>Boolean(value));
  const allowed=new Set(configured.map(value=>new URL(value).origin));
  if(process.env.NODE_ENV!=='production'||allowed.size===0)allowed.add(new URL(request.url).origin);
  const origin=request.headers.get('origin');
  if(!origin||!allowed.has(origin))throw new AssessmentError('Open this form on the assessment site.',403);
}
export async function verifyParent(pin:unknown){
  const expected=process.env.PARENT_OVERRIDE_PIN;
  if(!expected)throw new AssessmentError('Parent PIN is not configured.',503);
  const actual=typeof pin==='string'?pin:'';
  const correct=Buffer.byteLength(actual)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(actual),Buffer.from(expected));
  const {data,error}=await adminClient().rpc('check_ansar_parent',{p_correct:correct});
  if(error)throw new AssessmentError('Parent verification is temporarily unavailable.',503);
  if(data==='locked')throw new AssessmentError('Too many PIN attempts. Wait 15 minutes.',429);
  if(data!=='ok')throw new AssessmentError('Incorrect parent PIN.',403);

}
export async function setDeviceSession(){(await cookies()).set(COOKIE,signSession(Date.now()+30*86400000),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/assessments',maxAge:30*86400});}
export async function clearDeviceSession(){(await cookies()).set(COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/assessments',maxAge:0});}
export async function setPracticeSession(){(await cookies()).set(PRACTICE_COOKIE,signSession(Date.now()+8*60*60*1000,'practice'),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/assessments/practice',maxAge:8*60*60});}
export async function clearPracticeSession(){(await cookies()).set(PRACTICE_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/assessments/practice',maxAge:0});}
export function requireCron(request:Request){const expected=process.env.ASSESSMENT_CRON_SECRET;const given=request.headers.get('authorization')??'';if(!expected||given.length!==`Bearer ${expected}`.length||!timingSafeEqual(Buffer.from(given),Buffer.from(`Bearer ${expected}`)))throw new AssessmentError('Unauthorized.',401);}
