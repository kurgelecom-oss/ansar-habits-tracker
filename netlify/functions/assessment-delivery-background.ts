import {createHash,timingSafeEqual} from 'node:crypto';
import {expireAttempts} from '../../app/lib/assessments/service';
import {deliverPending} from '../../app/lib/assessments/delivery';
export default async function delivery(request:Request):Promise<void>{
 const secret=process.env.ASSESSMENT_CRON_SECRET;
 if(request.method!=='POST'||!secret)return;
 const digest=(s:string)=>createHash('sha256').update(s).digest();
 if(!timingSafeEqual(digest(request.headers.get('authorization')??''),digest(`Bearer ${secret}`)))return;
 await expireAttempts();
 for(let i=0;i<10;i++){const r=await deliverPending();if(!r.sent&&!r.failed)break;}
}
