import { NextResponse } from 'next/server';
import { assessmentLock, liftLockForToday } from '../../../lib/assessments/gate';
import { requireSameOrigin, verifyParent } from '../../../lib/assessments/auth';
import { AssessmentError } from '../../../lib/assessments/engine';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };

/** Is the board locked behind a paper right now? Read by the Today board. */
export async function GET() {
  return NextResponse.json(await assessmentLock(), { headers: noStore });
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
