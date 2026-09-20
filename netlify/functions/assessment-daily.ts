// 21:00 UTC is 07:00 AEST / 08:00 AEDT; calendar logic lives on the server.
export const config = { schedule: '0 21 * * *' };
export default async function assessmentDaily(): Promise<Response> {
  const secret = process.env.ASSESSMENT_CRON_SECRET;
  if (!secret) return new Response('Assessment scheduler is not configured', { status: 503 });
  const site = (process.env.ASSESSMENT_SITE_URL || 'https://ansar-habits-tracker.netlify.app').replace(/\/$/, '');
  try {
    const response = await fetch(`${site}/.netlify/functions/assessment-maintenance-background`, { method: 'POST', headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(25_000) });
    if (!response.ok) return new Response('Assessment maintenance failed', { status: 502 });
    return new Response(null, { status: 204 });
  } catch { return new Response('Assessment maintenance did not complete', { status: 502 }); }
}
