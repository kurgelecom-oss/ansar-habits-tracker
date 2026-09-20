import { createHash, timingSafeEqual } from 'node:crypto';
import { runMaintenance } from '../../app/lib/assessments/service';

// Netlify invokes *-background functions asynchronously with a 15-minute budget.
// The platform acknowledges dispatch with 202; this is not a completion receipt.
export default async function assessmentMaintenance(request: Request): Promise<void> {
  const secret = process.env.ASSESSMENT_CRON_SECRET;
  if (request.method !== 'POST' || !secret) return;
  const expected = createHash('sha256').update(`Bearer ${secret}`).digest();
  const actual = createHash('sha256').update(request.headers.get('authorization') || '').digest();
  if (!timingSafeEqual(expected, actual)) return;
  await runMaintenance();
}
