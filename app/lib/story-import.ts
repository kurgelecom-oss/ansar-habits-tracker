/* Brings the week's story from Notion onto the board (tk, 18 Oct 2026).

   The Kawthar routine writes one row per week into "📖 Kawthar Monday Stories"
   (ANSAR OS — Control Room) with Status = Ready and the story as one JSON code
   block in the page body. GET /api/story calls importReady() at most every
   15 minutes; each valid Ready row is stored as `story:<monday>` and flipped to
   Published. An invalid row is flipped to Rejected with the reason in Note, so
   a bad story never reaches him. Needs NOTION_TOKEN (already set for the
   programme sync) and the database shared with that integration. */
import { adminClient } from './supabase-admin';
import { dayNameOf } from './time';
import { saveStory, type Story } from './story';

export const STORIES_DS = 'cedf64ca-9e73-4608-ac87-4bc44db70417';
const NOTION_VERSION = '2025-09-03';
const CHECK_ID = 'story-import-check';
const EVERY_MS = 15 * 60 * 1000;
export const FALLBACK_IMAGE = { src: '/story/sample-hammam.jpg', alt: 'An old brick hammam in Bukhara', credit: 'Ancient hammam, Bukhara. Photo: Davide Mauro, CC BY-SA 4.0, Wikimedia Commons' };

const str = (v: unknown, max = 4000) => typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null;

/** Checks a story the routine wrote. Returns the story or the first problem. No I/O. */
export function validateStory(raw: unknown, week: string): Story | string {
  const r = raw as Record<string, any>;
  if (!r || typeof r !== 'object') return 'Not a JSON object';
  if (dayNameOf(week) !== 'Monday') return `Week ${week} is not a Monday`;
  for (const k of ['topic', 'kicker', 'headline', 'deck', 'lesson', 'reflection']) if (!str(r[k])) return `Missing ${k}`;
  if (!Array.isArray(r.lenses) || r.lenses.length !== 3 || r.lenses.some((l: any) => !str(l?.title) || !str(l?.body))) return 'Need exactly 3 lenses with title and body';
  if (!str(r.story?.title) || !str(r.story?.pull) || !Array.isArray(r.story?.paragraphs) || r.story.paragraphs.length < 4 || r.story.paragraphs.some((p: unknown) => !str(p))) return 'Story needs title, pull and at least 4 paragraphs';
  if (!Array.isArray(r.questions) || r.questions.length < 5 || r.questions.length > 8) return 'Need 5 to 8 questions';
  const ids = new Set<string>();
  for (const q of r.questions) {
    if (!str(q?.id) || ids.has(q.id) || !str(q?.prompt) || !str(q?.section) || !str(q?.why)) return 'Each question needs a unique id, prompt, section and why';
    if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 4 || q.options.some((o: unknown) => !str(o, 300))) return `Question ${q.id}: 3 or 4 options`;
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) return `Question ${q.id}: answer is not one of the options`;
    ids.add(q.id);
  }
  const img = r.image;
  const image = img && /^https:\/\//.test(img.src ?? '') && str(img.alt) ? { src: img.src, alt: img.alt, credit: str(img.credit) ?? '' } : FALLBACK_IMAGE;
  return {
    weekStart: week, status: 'published', topic: r.topic.trim(), kicker: r.kicker.trim(), headline: r.headline.trim(), deck: r.deck.trim(), image,
    lenses: r.lenses.map((l: any) => ({ title: l.title.trim(), body: l.body.trim() })),
    story: { title: r.story.title.trim(), pull: r.story.pull.trim(), paragraphs: r.story.paragraphs.map((p: string) => p.trim()) },
    lesson: r.lesson.trim(), reflection: r.reflection.trim(),
    questions: r.questions.map((q: any) => ({ id: q.id, prompt: q.prompt, options: q.options, answer: q.answer, why: q.why, section: q.section })),
  };
}

/** The JSON inside the first code block, joined across Notion's 2000-char text chunks. */
export function codeBlockText(blocks: any[]): string | null {
  const code = blocks.find(b => b?.type === 'code');
  return code ? (code.code.rich_text as { plain_text: string }[]).map(t => t.plain_text).join('') : null;
}

async function notion(path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    ...init, cache: 'no-store', signal: AbortSignal.timeout(10_000),
    headers: { Authorization: `Bearer ${process.env.NOTION_TOKEN}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Notion ${path}: ${res.status}`);
  return res.json();
}
const mark = (id: string, status: 'Published' | 'Rejected', note: string) => notion(`pages/${id}`, {
  method: 'PATCH', body: JSON.stringify({ properties: { Status: { select: { name: status } }, Note: { rich_text: [{ text: { content: note.slice(0, 1900) } }] } } }),
});

/** Imports every Ready row of a "Status / Week / Note + JSON code block" Notion database.
    `accept` validates and stores one row, returning the error text to reject it or null when stored.
    Throttled to every 15 minutes per `checkId`; never throws (the board must not break). */
export async function importFromNotion(ds: string, checkId: string, accept: (week: string, json: unknown) => Promise<string | null>, now = Date.now()): Promise<void> {
  if (!process.env.NOTION_TOKEN) return;
  try {
    const db = adminClient();
    const last = await db.from('ansar_assessment_state').select('payload').eq('id', checkId).maybeSingle();
    if (now - Number(last.data?.payload?.at ?? 0) < EVERY_MS) return;
    await db.from('ansar_assessment_state').upsert({ id: checkId, payload: { at: now }, updated_at: new Date(now).toISOString() });
    const rows = await notion(`data_sources/${ds}/query`, { method: 'POST', body: JSON.stringify({ filter: { property: 'Status', select: { equals: 'Ready' } }, page_size: 10 }) });
    for (const page of rows.results ?? []) {
      const week = page.properties?.Week?.date?.start?.slice(0, 10);
      try {
        const blocks = await notion(`blocks/${page.id}/children?page_size=100`);
        const json = codeBlockText(blocks.results ?? []);
        if (!week || !json) { await mark(page.id, 'Rejected', 'No Week date or no JSON code block'); continue; }
        const problem = await accept(week, JSON.parse(json));
        if (problem) { await mark(page.id, 'Rejected', problem); continue; }
        await mark(page.id, 'Published', `On the board from ${week}. Imported ${new Date(now).toISOString()}`);
      } catch (e) {
        await mark(page.id, 'Rejected', e instanceof SyntaxError ? 'The code block is not valid JSON' : 'Import failed').catch(() => {});
      }
    }
  } catch { /* try again in 15 minutes */ }
}

/** The Monday stories. */
export const importReady = (now = Date.now()) => importFromNotion(STORIES_DS, CHECK_ID, async (week, json) => {
  const story = validateStory(json, week);
  if (typeof story === 'string') return story;
  await saveStory(story);
  return null;
}, now);
