import { NextResponse } from 'next/server';
import { requireSameOrigin } from '../../lib/assessments/auth';
import { queueEmail } from '../../lib/assessments/delivery';
import { hasServiceRole } from '../../lib/supabase-admin';
import { creditSeconds, currentStory, grade, publicStory, saveSession, storyDue, storyReport, type StorySession } from '../../lib/story';
import { sydneyDateKey } from '../../lib/time';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };

/**
 * GET: is this week's story due? If so, the story without its answers and his
 * session so far. The first read of the week starts the session clock.
 * Any failure answers `due: false`: the board must never be trapped.
 */
export async function GET() {
  if (process.env.STORY_GATE === 'off' || !hasServiceRole()) return NextResponse.json({ due: false }, { headers: noStore });
  try {
    const today = sydneyDateKey();
    const { story, session, bypassed } = await currentStory(today);
    if (!story || !storyDue(today, story, session, bypassed)) return NextResponse.json({ due: false }, { headers: noStore });
    const s: StorySession = session ?? { openedAt: new Date().toISOString(), activeSeconds: 0, maxScroll: 0, attempts: [] };
    if (!session) await saveSession(story.weekStart, s);
    return NextResponse.json({
      due: true, story: publicStory(story),
      session: { activeSeconds: s.activeSeconds, maxScroll: s.maxScroll, attempts: s.attempts.map(a => ({ score: a.score, total: a.total, wrong: a.wrong })) },
    }, { headers: noStore });
  } catch {
    return NextResponse.json({ due: false }, { headers: noStore });
  }
}

/** POST { action: 'progress' | 'submit', activeSeconds, scroll, answers?, reflection? } */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const today = sydneyDateKey();
    const { story, session } = await currentStory(today);
    if (!story || !session || session.completedAt) return NextResponse.json({ ok: false, message: 'No story is open.' }, { status: 409, headers: noStore });

    session.activeSeconds = creditSeconds(session, Number(body.activeSeconds));
    session.maxScroll = Math.max(session.maxScroll, Math.min(100, Number(body.scroll) || 0));

    if (body.action !== 'submit') {
      await saveSession(story.weekStart, session);
      return NextResponse.json({ ok: true }, { headers: noStore });
    }

    const pub = publicStory(story);
    if (session.activeSeconds < pub.minReadSeconds || session.maxScroll < 95) {
      await saveSession(story.weekStart, session);
      return NextResponse.json({ ok: false, message: 'Read to the end first.' }, { status: 409, headers: noStore });
    }
    const raw = (body.answers ?? {}) as Record<string, unknown>;
    const answers = Object.fromEntries(story.questions.map(q => [q.id, Number.isInteger(raw[q.id]) ? raw[q.id] as number : -1]));
    const reflection = String(body.reflection ?? '').trim().slice(0, 2000);
    if (reflection.split(/\s+/).filter(Boolean).length < 8) return NextResponse.json({ ok: false, message: 'Write at least one full sentence in your own words.' }, { status: 400, headers: noStore });

    const result = grade(story, answers);
    session.attempts.push({ at: new Date().toISOString(), answers, score: result.score, total: result.total, wrong: result.wrong });
    session.reflection = reflection;
    if (result.passed) session.completedAt = new Date().toISOString();
    await saveSession(story.weekStart, session);
    if (result.passed) {
      const { subject, text } = storyReport(story, session);
      await queueEmail(`story-${story.weekStart}-email`, subject, text);
    }
    const sections = result.wrong.map(id => story.questions.find(q => q.id === id)!.section);
    return NextResponse.json({ ok: true, passed: result.passed, score: result.score, total: result.total, wrong: result.wrong, reread: [...new Set(sections)] }, { headers: noStore });
  } catch {
    return NextResponse.json({ ok: false, message: 'Could not save. Try again.' }, { status: 500, headers: noStore });
  }
}
