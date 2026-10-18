import { NextResponse } from 'next/server';
import { requireSession } from '../../../lib/assessments/auth';
import { AssessmentError } from '../../../lib/assessments/engine';
import { hasServiceRole } from '../../../lib/supabase-admin';
import { SAMPLE_WEEK } from '../../../lib/week-story-sample';
import { getWeekReport, importWeekReports, listWeekReports } from '../../../lib/week-story-store';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };

/**
 * GET ?week=YYYY-MM-DD → { weeks, report } for the week film. Lives under /api/assessments so
 * it only answers on a device unlocked with the parent PIN: the film quotes his journal.
 * ?sample=1 returns the invented preview week and needs no unlock.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.has('sample')) return NextResponse.json({ weeks: [{ week: SAMPLE_WEEK.week, label: SAMPLE_WEEK.label, call: SAMPLE_WEEK.call }], report: SAMPLE_WEEK }, { headers: noStore });
  try {
    await requireSession();
    if (!hasServiceRole()) return NextResponse.json({ weeks: [], report: null }, { headers: noStore });
    await importWeekReports();
    const weeks = await listWeekReports();
    const want = url.searchParams.get('week');
    const week = want && weeks.some(w => w.week === want) ? want : weeks[0]?.week;
    return NextResponse.json({ weeks, report: week ? await getWeekReport(week) : null }, { headers: noStore });
  } catch (error) {
    const status = error instanceof AssessmentError ? error.status : 500;
    return NextResponse.json({ message: error instanceof AssessmentError ? error.message : 'Could not load the week film.' }, { status, headers: noStore });
  }
}
