// Finalise abandoned exams and retry notifications even when no browser is open.
export const config={schedule:'*/10 * * * *'};
export default async function delivery():Promise<Response>{
 const secret=process.env.ASSESSMENT_CRON_SECRET;if(!secret)return new Response('Not configured',{status:503});
 const site=process.env.ASSESSMENT_SITE_URL||'https://ansar-habits-tracker.netlify.app';
 const r=await fetch(`${site}/.netlify/functions/assessment-delivery-background`,{method:'POST',headers:{authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(20000)});
 return new Response(null,{status:r.ok?204:502});
}
