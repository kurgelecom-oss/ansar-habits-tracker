import { createHash, timingSafeEqual } from 'node:crypto';
import { runMaintenance } from '../../app/lib/assessments/service';
import { syncSchoolSnapshot } from '../../app/lib/school-snapshot';

// Netlify invokes *-background functions asynchronously with a 15-minute budget.
// The platform acknowledges dispatch with 202; this is not a completion receipt.
export default async function assessmentMaintenance(request: Request): Promise<void> {
  const secret = process.env.ASSESSMENT_CRON_SECRET;
  if (request.method !== 'POST' || !secret) return;
  const expected = createHash('sha256').update(`Bearer ${secret}`).digest();
  const actual = createHash('sha256').update(request.headers.get('authorization') || '').digest();
  if (!timingSafeEqual(expected, actual)) return;
  // Phase 2: the board's own copy of the programme is refreshed by the same
  // nightly run. It is deliberately LAST and deliberately swallowed -- the
  // assessment pipeline is the job this function exists for, and a snapshot
  // failure must not cost a night of curriculum sync. Nothing reads the
  // snapshot yet, so a missed refresh costs nothing today.
  await runMaintenance();
  try { await syncSchoolSnapshot(); } catch { /* snapshot is additive; never fail the night on it */ }
}
