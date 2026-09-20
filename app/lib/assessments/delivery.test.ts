import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Attempt, Paper } from './types';
import daily, { config } from '../../../netlify/functions/assessment-daily';
const mocks = vi.hoisted(() => ({ upsert: vi.fn(), rpc: vi.fn(), update: vi.fn(), eq: vi.fn() }));
vi.mock('../supabase-admin', () => ({ adminClient: () => ({ from: () => ({ upsert: mocks.upsert, update: mocks.update }), rpc: mocks.rpc }) }));
import { attemptReport, deliverPending, notionBlocks, queueAttemptReport, reminderPapers } from './delivery';
const paper: Paper = { id: 'p1', kind: 'review', month: '2026-09', due_date: '2026-09-25', opens_on: '2026-09-21', subject: 'Maths', title: 'Friday Maths', status: 'published', duration_minutes: null, questions: [{ id: 'q1', type: 'written', prompt: 'Explain fractions', sourceIds: ['l1'] }], lessons: [{ id: 'l1', date: '2026-09-22', subject: 'Maths', task: 'Compare fractions', topic: 'Fractions', week: '4', guide: [], url: 'https://notion.so/lesson' }], coverage_note: 'Only dated source rows' };
const attempt: Attempt = { id: 'a1', paper_id: 'p1', status: 'submitted', answers: { q1: 'PRIVATE CHILD RESPONSE' }, started_at: '2026-09-25T00:00:00Z', expires_at: null, submitted_at: '2026-09-25T01:00:00Z', result: { objectiveCorrect: 0, objectiveTotal: 0, writtenPending: 1, writtenPoints: 0, writtenTotal: 2, percentage: null, summary: 'Awaiting review', gaps: [] }, parent_review: null, correction: null, correction_at: null, revision: 1, paper_snapshot: paper };
const envs = ['ASSESSMENT_COMPOSIO_API_KEY', 'ASSESSMENT_GMAIL_ACCOUNT_ID', 'NOTION_TOKEN', 'ASSESSMENT_NOTION_DB_ID', 'ASSESSMENT_EMAIL_TO', 'ASSESSMENT_MS_CLIENT_ID', 'ASSESSMENT_MS_CLIENT_SECRET', 'ASSESSMENT_MS_REFRESH_TOKEN', 'RESEND_API_KEY', 'ASSESSMENT_EMAIL_FROM'];
beforeEach(() => {
  vi.clearAllMocks();
  for (const name of envs) vi.stubEnv(name, '');
  mocks.upsert.mockResolvedValue({ error: null }); mocks.eq.mockResolvedValue({ error: null }); mocks.update.mockReturnValue({ eq: mocks.eq });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('durable learning reports', () => {
  it('deduplicates retries without resetting sent rows and queues separate review/correction events', async () => {
    await queueAttemptReport(attempt); await queueAttemptReport(attempt);
    expect(mocks.upsert.mock.calls[0]).toEqual(mocks.upsert.mock.calls[1]);
    expect(mocks.upsert.mock.calls[0][1]).toEqual({ onConflict: 'id', ignoreDuplicates: true });
    await queueAttemptReport({ ...attempt, status: 'reviewed' });
    await queueAttemptReport({ ...attempt, correction: 'Correction', correction_at: '2026-09-26T00:00:00Z' });
    expect(new Set(mocks.upsert.mock.calls.map(c => c[0][0].id)).size).toBe(3);
  });
  it('keeps full prompts, answers, source dates, feedback and next steps private to Notion', async () => {
    const reviewed: Attempt = { ...attempt, parent_review: { marks: { q1: 1 }, feedback: 'PRIVATE FEEDBACK', nextStep: 'PRIVATE NEXT STEP', reviewedAt: '2026-09-26', reviewer: 'Nihal' } };
    await queueAttemptReport(reviewed);
    const jobs = mocks.upsert.mock.calls[0][0];
    expect(jobs[0].payload.report).toContain('PRIVATE CHILD RESPONSE');
    expect(jobs[0].payload.report).toContain('2026-09-22');
    expect(jobs[0].payload.report).toContain('Explain fractions');
    expect(jobs[0].payload.report).toContain('PRIVATE FEEDBACK');
    expect(jobs[0].payload.report).toContain('PRIVATE NEXT STEP');
    expect(JSON.stringify(jobs[1])).not.toContain('PRIVATE');
    expect(jobs[1].payload.text).toContain('awaiting review');
    expect(attemptReport(attempt).text).not.toContain('100%');
  });
  it('does not queue drafts or silently swallow persistence failures', async () => {
    await queueAttemptReport({ ...attempt, status: 'in_progress' }); expect(mocks.upsert).not.toHaveBeenCalled();
    mocks.upsert.mockResolvedValue({ error: { message: 'database unavailable' } });
    await expect(queueAttemptReport(attempt)).rejects.toThrow('persist');
  });
  it('packs long reports without clipping text or exceeding Notion block/text limits', () => {
    const report = 'Some long written work. '.repeat(2000);
    const blocks = notionBlocks(report);
    expect(blocks.length).toBeLessThanOrEqual(100);
    const parts = blocks.flatMap(b => b.paragraph.rich_text.map(t => t.text.content));
    expect(parts.every(p => p.length <= 2000)).toBe(true);
    expect(parts.join('')).toBe(report);
    expect(() => notionBlocks('x'.repeat(610000))).toThrow('limits');
  });
  it('keeps unconfigured jobs pending with useful errors and makes no provider calls', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    mocks.rpc.mockResolvedValue({ data: [{ id: 'n', channel: 'notion', payload: {} }, { id: 'e', channel: 'email', payload: {} }], error: null });
    expect(await deliverPending()).toEqual({ sent: 0, failed: 2 });
    expect(fetcher).not.toHaveBeenCalled();
    expect(mocks.update.mock.calls.every(c => !c[0].status && c[0].last_error.includes('not configured'))).toBe(true);
  });
  it('recognizes a previously created Notion page after a lost delivery confirmation', async () => {
    vi.stubEnv('NOTION_TOKEN', 'private-token'); vi.stubEnv('ASSESSMENT_NOTION_DB_ID', 'database');
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [{ id: 'existing' }] }))); vi.stubGlobal('fetch', fetcher);
    mocks.rpc.mockResolvedValue({ data: [{ id: 'event-notion', channel: 'notion', payload: { text: 'record' } }], error: null });
    expect(await deliverPending()).toEqual({ sent: 1, failed: 0 });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(JSON.parse(fetcher.mock.calls[0][1].body).filter.property).toBe('Name');
    expect(JSON.parse(fetcher.mock.calls[0][1].body).filter.title.equals).toBe('event-notion');
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'sent' }));
  });
  it('contains upstream failures without persisting provider response bodies', async () => {
    vi.stubEnv('NOTION_TOKEN', 'private-token'); vi.stubEnv('ASSESSMENT_NOTION_DB_ID', 'database');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private-token CHILD ANSWERS', { status: 429 })));
    mocks.rpc.mockResolvedValue({ data: [{ id: 'n', channel: 'notion', payload: { text: 'record' } }], error: null });
    expect(await deliverPending()).toEqual({ sent: 0, failed: 1 });
    expect(mocks.update.mock.calls[0][0].last_error).toBe('Notion request failed (429)');
  });
  it('uses provider idempotency keys for retries within the Resend confirmation window', async () => {
    vi.stubEnv('RESEND_API_KEY', 'private-key'); vi.stubEnv('ASSESSMENT_EMAIL_FROM', 'from@example.com'); vi.stubEnv('ASSESSMENT_EMAIL_TO', 'parent@example.com');
    const fetcher = vi.fn().mockResolvedValue(new Response('{}')); vi.stubGlobal('fetch', fetcher);
    mocks.rpc.mockResolvedValue({ data: [{ id: 'stable-email-id', channel: 'email', payload: { subject: 'Result', text: 'Private link' } }], error: null });
    expect(await deliverPending()).toEqual({ sent: 1, failed: 0 });
    expect(fetcher.mock.calls[0][1].headers['Idempotency-Key']).toBe('stable-email-id');
    expect(mocks.update.mock.calls[0][0].payload.resendStartedAt).toBeTruthy();
  });
});
describe('Gmail delivery reconciliation', () => {
  beforeEach(() => {
    vi.stubEnv('ASSESSMENT_COMPOSIO_API_KEY', 'private-key');
    vi.stubEnv('ASSESSMENT_GMAIL_ACCOUNT_ID', 'connected-account');
    vi.stubEnv('ASSESSMENT_EMAIL_TO', 'parent@example.com');
  });
  it('checks sent mail and checkpoints the job before sending a minimal marked email', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ successful: true, data: { resultSizeEstimate: 0 } }))).mockResolvedValueOnce(new Response(JSON.stringify({ successful: true, data: { id: 'sent-message' } })));
    vi.stubGlobal('fetch', fetcher);
    mocks.rpc.mockResolvedValue({ data: [{ id: 'email-job', channel: 'email', payload: { subject: 'Result', text: 'Private link' } }], error: null });
    expect(await deliverPending()).toEqual({ sent: 1, failed: 0 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][0]).toContain('GMAIL_FETCH_EMAILS');
    const args = JSON.parse(fetcher.mock.calls[1][1].body).arguments;
    expect(args.subject).toMatch(/Result \[ansar-[a-f0-9]+\]/);
    expect(args.body).toBe('Private link');
    expect(mocks.update.mock.calls[0][0].payload.gmailSendStartedAt).toBeTruthy();
  });
  it('does not resend when a previous send is visible in sent mail', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ successful: true, data: { messages: [{ messageId: 'already-sent' }] } })));
    vi.stubGlobal('fetch', fetcher);
    mocks.rpc.mockResolvedValue({ data: [{ id: 'email-job', channel: 'email', payload: { subject: 'Result', text: 'Private link', gmailSendStartedAt: '2026-09-20T00:00:00Z' } }], error: null });
    expect(await deliverPending()).toEqual({ sent: 1, failed: 0 });
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('leaves ambiguous sends pending when Gmail search may still be indexing', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ successful: true, data: { messages: [] } })));
    vi.stubGlobal('fetch', fetcher);
    mocks.rpc.mockResolvedValue({ data: [{ id: 'email-job', channel: 'email', payload: { subject: 'Result', text: 'Private link', gmailSendStartedAt: '2026-09-20T00:00:00Z' } }], error: null });
    expect(await deliverPending()).toEqual({ sent: 0, failed: 1 });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(mocks.update.mock.calls[0][0].last_error).toContain('awaiting confirmation');
  });
  it('does not treat an HTTP 200 tool error as successful delivery', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ successful: false, error: 'private upstream response' }))));
    mocks.rpc.mockResolvedValue({ data: [{ id: 'email-job', channel: 'email', payload: { subject: 'Result', text: 'Private link' } }], error: null });
    expect(await deliverPending()).toEqual({ sent: 0, failed: 1 });
    expect(JSON.stringify(mocks.update.mock.calls)).not.toContain('private upstream');
  });
});
describe('reminder eligibility', () => {
  it('reminds only published Friday work that is not submitted or reviewed', () => {
    expect(reminderPapers('2026-09-25', [paper, { ...paper, id: 'draft', status: 'draft' }], new Set()).map(p => p.id)).toEqual(['p1']);
    expect(reminderPapers('2026-09-25', [paper], new Set(['p1']))).toEqual([]);
  });
  it('uses the last seven calendar days for exams and Monday for overdue work', () => {
    const exam: Paper = { ...paper, id: 'exam', kind: 'exam', due_date: '2026-09-30', opens_on: '2026-09-01' };
    expect(reminderPapers('2026-09-23', [exam], new Set())).toEqual([]);
    expect(reminderPapers('2026-09-24', [exam], new Set())).toHaveLength(1);
    expect(reminderPapers('2026-09-28', [paper], new Set())).toHaveLength(1);
    expect(reminderPapers('2026-09-29', [paper], new Set())).toHaveLength(0);
  });
});

describe('daily assessment dispatch', () => {
  it('invokes the authenticated background runner exactly once', async () => {
    vi.stubEnv('ASSESSMENT_CRON_SECRET', 'cron-secret');
    vi.stubEnv('ASSESSMENT_SITE_URL', 'https://example.com/');
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetcher);
    expect(config.schedule).toBe('0 21 * * *');
    expect((await daily()).status).toBe(204);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith('https://example.com/.netlify/functions/assessment-maintenance-background', expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer cron-secret' } }));
  });
  it('does not dispatch without authentication configuration', async () => {
    vi.stubEnv('ASSESSMENT_CRON_SECRET', '');
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    expect((await daily()).status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
