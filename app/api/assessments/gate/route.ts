import { NextResponse } from 'next/server';
import { assessmentLock, liftLockForToday, noticeFacts } from '../../../lib/assessments/gate';
import { requireSameOrigin, requireSession, verifyParent } from '../../../lib/assessments/auth';
import { AssessmentError } from '../../../lib/assessments/engine';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };

/**
 * Is the board locked behind a paper right now? Read by the Today board. The
 * message board reads the same answer for `facts` and `unlocked`, so it can
 * drop a message once the thing it asks for is done.
 */
export async function GET() {
  const [lock, facts, unlocked] = await Promise.all([
    assessmentLock(), noticeFacts(), requireSession().then(() => true, () => false),
  ]);
  return NextResponse.json({ ...lock, facts, unlocked }, { headers: noStore });
}

/** A parent lifts the lock for today with the parent PIN. */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    await verifyParent(body.pin);
    await liftLockForToday();
    return NextResponse.json({ ok: true, locked: false }, { headers: noStore });
  } catch (error) {
    const status = error instanceof AssessmentError ? error.status : 500;
    const message = error instanceof AssessmentError ? error.message : 'Could not lift the lock.';
    return NextResponse.json({ ok: false, message }, { status, headers: noStore });
  }
}
