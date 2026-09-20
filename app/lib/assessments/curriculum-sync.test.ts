import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROGRAMME_DS } from '../notion-sources';
import type { Lesson, Paper } from './types';

const state = vi.hoisted(() => ({ lessons: new Map<string, { id: string; payload: Lesson }>(), papers: new Map<string, Paper>(), attempts: new Set<string>() }));
vi.mock('../supabase-admin', () => ({ adminClient: () => ({ from: (table: string) => {
  let id = ''; let status = ''; let write: Paper | undefined;
  const rows = () => table.endsWith('lessons') ? [...state.lessons.values()] : table.endsWith('attempts') ? (state.attempts.has(id) ? [{ id: 'attempt' }] : []) : [...state.papers.values()].filter(p => !id || p.id === id);
  const query = {
    select: () => query,
    order: () => query,
    eq: (key: string, value: string) => { if (key === 'id' || key === 'paper_id') id = value; if (key === 'status') status = value; return query; },
    range: async (start: number, end: number) => ({ data: rows().slice(start, end + 1), error: null }),
    maybeSingle: async () => ({ data: rows()[0] || null, error: null }),
    limit: async () => ({ data: rows(), error: null }),
    upsert: (data: unknown, options: { ignoreDuplicates?: boolean }) => {
      if (table.endsWith('lessons')) for (const l of data as { id: string; payload: Lesson }[]) state.lessons.set(l.id, l);
      else { const paper = data as Paper; if (!options.ignoreDuplicates || !state.papers.has(paper.id)) state.papers.set(paper.id, paper); }
      return Promise.resolve({ error: null });
    },
    update: (paper: Paper) => { write = paper; return query; },
    then: (resolve: (value: unknown) => unknown) => { if (write && state.papers.get(id)?.status === status) state.papers.set(id, write); return Promise.resolve(resolve({ error: null })); },
  };
  return query;
} }) }));
import { syncCurriculum } from './curriculum';
const row = (date: string, task = 'Calculate the cost of three sacks at two coins each.') => ({ id: 'reused-page', properties: { Date: { date: { start: date } }, Label: { rich_text: [{ plain_text: 'Maths' }] }, Task: { rich_text: [{ plain_text: task }] }, Active: { checkbox: false } } });
let source: ReturnType<typeof row>[];
beforeEach(() => {
  state.lessons.clear(); state.papers.clear(); state.attempts.clear();
  vi.stubGlobal('window', undefined); vi.stubEnv('NOTION_TOKEN', 'test'); vi.stubEnv('ANTHROPIC_API_KEY', '');
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-20T03:00:00Z'));
  source = [row('2026-09-14')];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => ({ results: url.includes(PROGRAMME_DS) ? source : [], has_more: false }) })));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('curriculum persistence', () => {
  it('is idempotent, retains historical dates when Notion reuses a row and protects attempted papers', async () => {
    expect((await syncCurriculum()).reviews).toBe(1);
    expect((await syncCurriculum()).reviews).toBe(0);
    const id = 'review:2026-09-18:maths';
    const original = state.papers.get(id);
    state.attempts.add(id);
    source = [row('2026-09-14', 'A changed programme task about fractions.')];
    await syncCurriculum();
    expect(state.papers.get(id)).toEqual(original);
    source = [row('2026-09-07')];
    await syncCurriculum();
    expect(state.lessons.size).toBe(2);
    expect(state.papers.size).toBe(2);
    expect([...state.papers.values()].every(p => p.kind === 'review')).toBe(true);
  });
  it('refreshes unattempted review prompts when the source lessons are unchanged', async () => {
    await syncCurriculum();
    const paper = state.papers.get('review:2026-09-18:maths')!;
    paper.questions[0].prompt = 'Old prompt includes full source answers';
    expect((await syncCurriculum()).reviews).toBe(1);
    expect(state.papers.get(paper.id)?.questions[0].prompt).not.toContain('full source answers');
  });
  it('does not generate retroactive or future exams, while backfilling Friday recall', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    source = [row('2026-08-31'), row('2026-10-01')];
    const result = await syncCurriculum();
    expect(result.exams).toBe(0);
    expect(result.reviews).toBe(1);
    expect(state.papers.has('review:2026-09-04:maths')).toBe(true);
    expect(vi.mocked(fetch).mock.calls.every(call => String(call[0]).includes('api.notion.com'))).toBe(true);
  });
  it('follows Notion cursors without an Active filter', async () => {
    const fetch = vi.fn(async (url: string, options: { body: string }) => {
      const body = JSON.parse(options.body);
      expect(body.filter).toBeUndefined();
      const first = url.includes(PROGRAMME_DS) && !body.start_cursor;
      return { ok: true, json: async () => ({ results: url.includes(PROGRAMME_DS) ? [row(first ? '2026-09-14' : '2026-09-07')] : [], has_more: first, next_cursor: first ? 'next' : null }) };
    });
    vi.stubGlobal('fetch', fetch);
    expect((await syncCurriculum()).lessons).toBe(2);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
