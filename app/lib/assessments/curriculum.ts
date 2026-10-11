import { adminClient } from '../supabase-admin';
import { PROGRAMME_DS, GUIDES_DS } from '../notion-sources';
import { addDays, dayNameOf, sydneyDateKey, weekStartOf } from '../time';
import { coverageNote, curriculumFingerprint, generateExam, subjectSlug } from './generation';
import type { Lesson, Paper, Question } from './types';

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
  // Rows written as "Technology: … Turkish: … Financial learning: …" keep each
  // whole section, not just the sentences that happen to repeat the keyword.
  const sections = task.split(/(?=(?:^|\s)(?:Technology|Typing|Turkish|Arabic|Financial learning):\s)/).map(s => s.trim());
  if (sections.length > 1) {
    const mine = subject === 'Languages' ? /^(Turkish|Arabic):/ : subject === 'Technologies' ? /^(Technology|Typing):/ : /^Financial learning:/;
    const own = sections.filter(s => mine.test(s)).join(' ');
    if (own) return own;
  }
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
      // Since 11 Oct 2026 Turkish has its own block, so a skills mix without it is expected.
      if (!ownTask) { if (!(subject === 'Languages' && /skills mix/i.test(label))) warnings.push(`${date}: ${subject} has no separable task detail`); continue; }
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

/** How many days of one subject the Friday review asks about. Two keeps a full
 *  week near fifteen short answers; every day would be closer to thirty. */
const REVIEW_DAYS_PER_SUBJECT = 2;

/** Subjects in the order a school day runs, so every Friday reads the same way. */
const REVIEW_ORDER = ['Maths', 'English', 'HASS', 'Science', 'The Arts', 'Technologies', 'Languages', 'Health & PE'];

/** One-day practical subjects: the "show it" question is the whole check. */
const SHOW_ONLY = new Set(['Science', 'The Arts', 'Technologies']);

/** Turkish words taught this week, read from "anne (mother)" pairs in the tasks. */
export function taughtWords(lessons: Lesson[]): string[] {
  const words = new Set<string>();
  for (const l of lessons) for (const m of l.task.matchAll(/([\p{L}'’-]+) \(([^)]{1,40})\)/gu)) {
    if (!/^(?:the|a|an|my|to|is|and)$/i.test(m[1])) words.add(m[1]);
  }
  return [...words].slice(0, 8);
}

const join = (topics: string[]) => topics.length ? topics.join('; ') : 'this week';

/** The subject-specific question, built from what was set this week. */
function showIt(subject: string, own: Lesson[]): Question | null {
  const topics = [...new Set(own.map(l => l.topic.trim()).filter(Boolean))].map(t => t.slice(0, 60));
  const ids = own.map(l => l.id);
  const id = `q-${subjectSlug(subject)}-show`;
  const plain = (prompt: string, rubric: string): Question => ({ id, type: 'written', sourceIds: ids, prompt, rubric });
  switch (subject) {
    case 'Maths': return plain(
      `Maths (${join(topics)}): make up one new question like the ones you did this week. Use new numbers. Then solve it and show your working.`,
      'Show it: 0 = no question, or not like this week\'s work; 1 = a fair question but the working or answer is wrong or missing; 2 = a question that uses this week\'s skill, solved correctly with working shown.');
    case 'HASS': return plain(
      `History (${join(topics)}): write 3 facts you learned this week and 1 date. Say why the date matters.`,
      'Show it: 0 = no facts, or mostly wrong; 1 = some correct facts, or the date is missing or wrong; 2 = three correct facts from this week and a correct date with a reason.');
    case 'Languages': {
      const words = taughtWords(own);
      return plain(words.length
        ? `Turkish: write what each word means in English: ${words.join(', ')}. Then write one sentence in Turkish that uses two of them.`
        : 'Turkish: write 4 words you learned this week and what they mean. Then write one sentence in Turkish.',
        'Show it: 0 = fewer than half right; 1 = most meanings right but no correct sentence; 2 = the meanings right and one sentence that makes sense.');
    }
    case 'Science': return plain(
      `Science (${join(topics)}): what did you guess would happen before you started? What really happened? Were you right?`,
      'Show it: 0 = cannot say what the experiment was; 1 = describes it, but the guess or the real result is missing; 2 = gives the guess, the real result, and says if the guess was right. A wrong guess is fine.');
    case 'The Arts': return plain(
      `Art (${join(topics)}): what did you make? Describe it in 2 sentences. Which part are you proud of?`,
      'Show it: 0 = cannot say what was made; 1 = says what was made but no detail; 2 = clear description of the piece and one part he is proud of.');
    case 'Technologies': return plain(
      `Scratch (${join(topics)}): what does your project do? Name 2 blocks you used and what each one does.`,
      'Show it: 0 = cannot say what the project does; 1 = says what it does but cannot name the blocks; 2 = explains the project and two blocks correctly.');
    default: return null;
  }
}

/**
 * One review for the whole week, built from that week's work (tk, 5 + 11 Oct 2026).
 *
 * HARD RULE: every question comes from the week's own dated lessons. Each
 * subject gets the same three-part recall for up to two days it was worked on
 * (what did you do, show one step, what did you get), then one question built
 * for that subject from the week's tasks. Practical one-day subjects get only
 * the second kind. It ends with what is still confusing.
 *
 * Plain words for a 12-year-old. The task text itself is NOT printed: that
 * would hand him the answer. Day, topic and, for Turkish, the words are cues.
 */
export function buildWeeklyReview(lessons: Lesson[], due: string): Paper {
  if (!lessons.length) throw new Error('Weekly review requires source lessons');
  const rank = (s: string) => { const i = REVIEW_ORDER.indexOf(s); return i < 0 ? 99 : i; };
  const subjects = [...new Set(lessons.map(l => l.subject))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const questions: Question[] = subjects.flatMap(subject => {
    const own = lessons.filter(l => l.subject === subject);
    const dates = [...new Set(own.map(l => l.date))].sort();
    const asked = SHOW_ONLY.has(subject) ? [] : dates.length <= REVIEW_DAYS_PER_SUBJECT ? dates : [dates[0], dates[dates.length - 1]];
    const name = subject === 'Languages' && own.every(l => /turkish/i.test(l.task)) ? 'Turkish' : subject;
    const days = asked.map((date): Question => {
      const day = own.filter(l => l.date === date);
      const topics = [...new Set(day.map(l => l.topic.trim()).filter(Boolean))].map(topic => topic.slice(0, 80)).join('; ');
      return {
        id: `q-${subjectSlug(subject)}-${date}`, type: 'written', sourceIds: day.map(l => l.id),
        prompt: `${name}, ${dayNameOf(date)} ${date}${topics ? ` (${topics})` : ''}. No notes. 1) What did you do? 2) Show one step. 3) What did you get or make? If you did not do it, say so.`,
        rubric: `Recall: 0 = cannot say what the work was, or mostly wrong; 1 = says what the work was, but the step or the result is missing or unclear; 2 = says what he did, shows a real step and gives the answer or result, checked against the ${subject} work for that day. Saying honestly it was not done is recorded as not done, not marked wrong. Finishing is not the same as mastering.`,
      };
    });
    const show = showIt(subject, own);
    return show ? [...days, show] : days;
  });
  questions.push({
    id: 'q-unclear', type: 'written', sourceIds: lessons.map(l => l.id),
    prompt: 'What is still confusing from this week? Write one question about it. Then write what you will do to fix it.',
    rubric: 'Still confusing: 0 = nothing written; 1 = a real question but no plan, or a plan with no question; 2 = an honest, specific question and a clear next step. Do not penalize admitting uncertainty; this mark rewards an honest question and a plan, not claimed mastery.',
  });
  // A written recall is not a demonstration, so the practical check stays with the monthly exam.
  return { id: `review:${due}:week`, kind: 'review', month: due.slice(0, 7), due_date: due, opens_on: due, subject: 'All subjects', title: `Friday review · week ending ${due}`, status: 'published', duration_minutes: null, questions, lessons, coverage_note: coverageNote(lessons, false) };
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
    for (const [map, key] of [[weekly, fridayFor(lesson.date)], [monthly, `${lesson.date.slice(0, 7)}:${lesson.subject}`]] as const) map.set(key, [...(map.get(key) || []), lesson]);
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
  for (const [due, lessons] of weekly) {
    const paper = buildWeeklyReview(lessons, due);
    // Weeks set before the single weekly recall hold one paper per subject.
    const perSubject = await db.from('ansar_assessment_papers').select('id').like('id', `review:${due}:%`).neq('id', paper.id);
    if (perSubject.error) throw new Error('Could not read existing weekly reviews');
    const ids = (perSubject.data || []).map(p => p.id as string);
    if (ids.length) {
      // Past and started weeks keep the papers they were set with.
      if (due < today || (await Promise.all(ids.map(attempted))).some(Boolean)) continue;
      const removed = await db.from('ansar_assessment_papers').delete().in('id', ids);
      if (removed.error) throw new Error('Could not replace per-subject weekly reviews; existing work was preserved');
    }
    const existing = await getPaper(paper.id);
    if (existing && curriculumFingerprint(existing.lessons) === curriculumFingerprint(lessons) && JSON.stringify(existing.questions) === JSON.stringify(paper.questions)) continue;
    if (await save(paper, existing)) summary.reviews++;
  }
  // Keep historical snapshots and papers, but never create surprise retroactive exams.
  const pending = [...monthly.entries()].filter(([key]) => key.startsWith(`${today.slice(0, 7)}:`)).sort(([a], [b]) => b.localeCompare(a));
  let next = 0;
  // Background execution allows all subjects; cap concurrent model calls at two.
  const worker = async () => {
    while (next < pending.length) {
      const [key, lessons] = pending[next++];
      const month = key.slice(0, 7);
      const id = `exam:${month}:${subjectSlug(lessons[0].subject)}`;
      try {
        const existing = await getPaper(id);
        if (existing?.status === 'published') {
          if (curriculumFingerprint(existing.lessons) !== curriculumFingerprint(lessons)) summary.warnings.push(`${lessons[0].subject}: new lesson coverage arrived after this exam was approved; this paper still tests its recorded source dates.`);
          continue;
        }
        if ((existing && curriculumFingerprint(existing.lessons) === curriculumFingerprint(lessons)) || await attempted(id)) continue;
        if (!process.env.ANTHROPIC_API_KEY) {
          summary.warnings.push('ANTHROPIC_API_KEY is not configured; monthly exams remain unavailable until source-grounded drafts can be generated.');
          continue;
        }
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
