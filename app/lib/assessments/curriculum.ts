import { adminClient } from '../supabase-admin';
import { PROGRAMME_DS, GUIDES_DS } from '../notion-sources';
import { addDays, sydneyDateKey, weekStartOf } from '../time';
import { coverageNote, curriculumFingerprint, generateExam, subjectSlug } from './generation';
import type { Lesson, Paper } from './types';

type RichText = { plain_text?: string; text?: { content?: string } };
type Property = { rich_text?: RichText[]; title?: RichText[]; date?: { start?: string } | null; relation?: { id: string }[] };
export type NotionPage = { id: string; url?: string; archived?: boolean; in_trash?: boolean; properties: Record<string, Property> };
const readText = (p: Record<string, Property>, key: string) => (p[key]?.rich_text || p[key]?.title || []).map(t => t.plain_text ?? t.text?.content ?? '').join('').trim();

export function fridayFor(date: string): string {
  // Weekend programme work belongs to the next Friday, never a past deadline.
  const friday = addDays(weekStartOf(date), 4);
  return friday < date ? addDays(friday, 7) : friday;
}

function subjectsFor(label: string): string[] {
  if (/review|tidy|catch.?up|go deeper|flex/i.test(label)) return [];
  if (/skills mix/i.test(label)) return ['Technologies', 'Languages', 'HASS'];
  const subjects: string[] = [];
  for (const [pattern, subject] of [
    [/math/i, 'Maths'], [/english|grammar/i, 'English'], [/hass|humanities|history|geography/i, 'HASS'],
    [/science/i, 'Science'], [/technolog|coding/i, 'Technologies'], [/language|turkish/i, 'Languages'],
    [/\barts?\b/i, 'The Arts'], [/health|\bpe\b|soccer/i, 'Health & PE'],
  ] as [RegExp, string][]) if (pattern.test(label)) subjects.push(subject);
  return subjects;
}

function splitTask(task: string, subject: string, combined: boolean): string {
  if (!combined) return task;
  // Preserve domain names such as Typing.com and Code.org while separating sentences.
  const parts = task.split(/(?<=[.!?])\s+|\n|;\s*|\s+Then\s+/i);
  const pattern = subject === 'Languages' ? /duolingo|turkish|arabic|language/i
    : subject === 'Technologies' ? /scratch|code\.org|typing|program|comput|coding/i : /everfi|financial|money|budget/i;
  return parts.filter(p => pattern.test(p)).map(p => p.replace(/^Then\s+/i, '')).join(' ').trim();
}

/** Immutable-date keys retain last month's row even when Notion reuses the page. */
export function mapProgramme(programme: NotionPage[], guides: NotionPage[]): { lessons: Lesson[]; warnings: string[] } {
  const guideMap = new Map(guides.map(g => [g.id, g]));
  const lessons: Lesson[] = [];
  const warnings: string[] = [];
  for (const page of programme) {
    if (page.archived || page.in_trash) continue;
    const p = page.properties;
    const rawDate = p.Date?.date?.start;
    const date = rawDate?.slice(0, 10);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || addDays(date, 0) !== date) continue;
    const label = readText(p, 'Label') || readText(p, 'Name');
    const subjects = subjectsFor(label);
    const task = readText(p, 'Task');
    if (!subjects.length || !task) continue;
    for (const subject of subjects) {
      const ownTask = splitTask(task, subject, subjects.length > 1);
      if (!ownTask) { warnings.push(`${date}: ${subject} has no separable task detail`); continue; }
      // Standing guides are background only; attach the correct subject's guide to combined rows.
      const relevant = new Map<string, NotionPage>();
      for (const ref of p.Guide?.relation || []) {
        const g = guideMap.get(ref.id);
        if (g && subjectsFor(readText(g.properties, 'Name')).includes(subject) && !/skills mix/i.test(readText(g.properties, 'Name'))) relevant.set(g.id, g);
      }
      for (const g of guides) if (subjectsFor(readText(g.properties, 'Name')).includes(subject) && !/skills mix/i.test(readText(g.properties, 'Name'))) relevant.set(g.id, g);
      lessons.push({ id: `${page.id}:${date}:${subjectSlug(subject)}`, date, subject, task: ownTask, topic: readText(p, 'Day Topic'), week: readText(p, 'Week'), guide: [...relevant.values()].map(g => readText(g.properties, 'Guide')).filter(Boolean), url: page.url || `https://www.notion.so/${page.id.replace(/-/g, '')}` });
    }
  }
  return { lessons: lessons.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)), warnings };
}

export function buildWeeklyReview(lessons: Lesson[], due: string): Paper {
  if (!lessons.length || new Set(lessons.map(l => l.subject)).size !== 1) throw new Error('Weekly review requires one subject');
  const subject = lessons[0].subject;
  const sourceIds = lessons.map(l => l.id);
  const focus = [...new Set(lessons.map(l => l.task))].join('\n');
  const rubric = 'Nihal checks the response against the dated tasks and actual work. Score accuracy, explanation and application separately across this review: 0 = missing or incorrect, 1 = partial, 2 = accurate and clear. Completion alone is not mastery.';
  const prompts = [
    `Without opening notes, recall three things you learned in ${subject} from the dated tasks below. Use your own words. If a task was not completed, say so.\n${focus}`,
    `Choose one of those ${subject} tasks. Explain the main idea and give a specific example from your own work. Name the task or date.`,
    `Apply one idea from those ${subject} tasks to a new example, or connect two of the tasks. Explain each step and why the connection works.`,
    `What is still unclear in those ${subject} tasks? Write one specific question and one action you will take next to resolve it.`,
  ];
  return { id: `review:${due}:${subjectSlug(subject)}`, kind: 'review', month: due.slice(0, 7), due_date: due, opens_on: due, subject, title: `${subject} · Friday recall · ${due}`, status: 'published', duration_minutes: null, questions: prompts.map((prompt, i) => ({ id: `q${i + 1}`, type: 'written', prompt, sourceIds, rubric })), lessons, coverage_note: coverageNote(lessons) };
}

async function queryAll(source: string): Promise<NotionPage[]> {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error('Notion curriculum connection is not configured');
  let cursor: string | undefined;
  const rows: NotionPage[] = [];
  const cursors = new Set<string>();
  do {
    const response = await fetch(`https://api.notion.com/v1/data_sources/${source}/query`, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    if (!response.ok) throw new Error(`Notion curriculum query returned HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.results)) throw new Error('Notion returned invalid curriculum data');
    rows.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
    if (data.has_more && (!cursor || cursors.has(cursor))) throw new Error('Notion pagination did not advance');
    if (cursor) cursors.add(cursor);
  } while (cursor);
  return rows;
}

export async function syncCurriculum(): Promise<{ lessons: number; reviews: number; exams: number; warnings: string[] }> {
  if (typeof window !== 'undefined') throw new Error('Curriculum sync is server-only');
  const summary = { lessons: 0, reviews: 0, exams: 0, warnings: [] as string[] };
  const db = adminClient();
  const [programme, guides] = await Promise.all([queryAll(PROGRAMME_DS), queryAll(GUIDES_DS)]);
  const mapped = mapProgramme(programme, guides);
  summary.warnings.push(...mapped.warnings);
  if (!mapped.lessons.length) summary.warnings.push('No dated subject lessons are available from Notion; no curriculum was invented.');
  // Never delete historical snapshots. Date is part of the primary key.
  for (let i = 0; i < mapped.lessons.length; i += 100) {
    const { error } = await db.from('ansar_assessment_lessons').upsert(mapped.lessons.slice(i, i + 100).map(l => ({ id: l.id, date: l.date, subject: l.subject, payload: l, updated_at: new Date().toISOString() })), { onConflict: 'id' });
    if (error) throw new Error('Could not preserve curriculum snapshots');
  }
  summary.lessons = mapped.lessons.length;
  const stored: Lesson[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('ansar_assessment_lessons').select('payload').order('id').range(offset, offset + 999);
    if (error) throw new Error('Could not read curriculum snapshots');
    stored.push(...(data || []).map(r => r.payload as Lesson));
    if (!data || data.length < 1000) break;
  }
  const today = sydneyDateKey();
  const weekly = new Map<string, Lesson[]>();
  const monthly = new Map<string, Lesson[]>();
  for (const lesson of stored) {
    if (lesson.date > today) continue; // Future scheduled work is not taught coverage.
    for (const [map, key] of [[weekly, `${fridayFor(lesson.date)}:${lesson.subject}`], [monthly, `${lesson.date.slice(0, 7)}:${lesson.subject}`]] as const) map.set(key, [...(map.get(key) || []), lesson]);
  }
  const getPaper = async (id: string): Promise<Paper | null> => {
    const { data, error } = await db.from('ansar_assessment_papers').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error('Could not read existing assessment paper');
    return data as Paper | null;
  };
  const attempted = async (id: string) => {
    const { data, error } = await db.from('ansar_assessment_attempts').select('id').eq('paper_id', id).limit(1);
    if (error) throw new Error('Could not check assessment attempt protection');
    return !!data?.length;
  };
  const save = async (paper: Paper, existing: Paper | null): Promise<boolean> => {
    if (await attempted(paper.id)) return false;
    // An update never inserts, and insertion never overwrites a concurrent publisher.
    const query = existing
      ? db.from('ansar_assessment_papers').update(paper).eq('id', paper.id).eq('status', existing.status)
      : db.from('ansar_assessment_papers').upsert(paper, { onConflict: 'id', ignoreDuplicates: true });
    const { error } = await query;
    if (error) throw new Error('Paper could not be saved; existing work was preserved');
    return true;
  };
  for (const [key, lessons] of weekly) {
    const paper = buildWeeklyReview(lessons, key.slice(0, 10));
    const existing = await getPaper(paper.id);
    if (existing && curriculumFingerprint(existing.lessons) === curriculumFingerprint(lessons)) continue;
    if (await save(paper, existing)) summary.reviews++;
  }
  const pending = [...monthly.entries()].sort(([a], [b]) => b.localeCompare(a));
  if (!process.env.ANTHROPIC_API_KEY) {
    if (pending.length) summary.warnings.push('ANTHROPIC_API_KEY is not configured; monthly exams remain unavailable until source-grounded drafts can be generated.');
    return summary;
  }
  let next = 0;
  // Background execution allows all subjects; cap concurrent model calls at two.
  const worker = async () => {
    while (next < pending.length) {
      const [key, lessons] = pending[next++];
      const month = key.slice(0, 7);
      const id = `exam:${month}:${subjectSlug(lessons[0].subject)}`;
      try {
        const existing = await getPaper(id);
        if (existing?.status === 'published' || (existing && curriculumFingerprint(existing.lessons) === curriculumFingerprint(lessons)) || await attempted(id)) continue;
        const paper = await generateExam(lessons, month);
        // Re-read because generation can take seconds and parent approval can race.
        const current = await getPaper(id);
        if (current?.status === 'published') continue;
        if (await save(paper, current)) summary.exams++;
      } catch (error) {
        summary.warnings.push(`${lessons[0].subject} (${month}): ${error instanceof Error ? error.message : 'Draft generation unavailable'}`);
      }
    }
  };
  await Promise.all([worker(), worker()]);
  summary.warnings = [...new Set(summary.warnings)];
  return summary;
}
