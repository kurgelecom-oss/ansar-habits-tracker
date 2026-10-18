import { NextResponse } from 'next/server';
import { grade, publicStory, storyReport, type StorySession } from '../../../lib/story';
import { SAMPLE_STORY } from '../../../lib/story-sample';

export const dynamic = 'force-dynamic';

/** The approval sample. Reads and writes nothing, sends nothing. */
export async function GET() {
  return NextResponse.json({ story: publicStory(SAMPLE_STORY) });
}

/** Marks the sample and returns the email that WOULD be sent. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { answers?: Record<string, number>; reflection?: string; activeSeconds?: number; scroll?: number; openedAt?: string; previous?: StorySession['attempts'] };
  const answers = body.answers ?? {};
  const r = grade(SAMPLE_STORY, answers);
  const now = new Date().toISOString();
  const attempts = [...(body.previous ?? []), { at: now, answers, score: r.score, total: r.total, wrong: r.wrong }];
  const session: StorySession = { openedAt: body.openedAt ?? now, activeSeconds: Math.floor(body.activeSeconds ?? 0), maxScroll: body.scroll ?? 0, attempts, reflection: body.reflection, completedAt: now };
  const reread = [...new Set(r.wrong.map(id => SAMPLE_STORY.questions.find(q => q.id === id)!.section))];
  return NextResponse.json({ ok: true, passed: r.passed, score: r.score, total: r.total, wrong: r.wrong, reread, attempts, email: r.passed ? storyReport(SAMPLE_STORY, session) : undefined });
}
