import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Attempt, Paper } from './types';
import daily, { config } from '../../../netlify/functions/assessment-daily';
const mocks = vi.hoisted(() => ({ upsert: vi.fn(), rpc: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn() }));
vi.mock('../supabase-admin', () => ({ adminClient: () => ({ from: () => ({ upsert: mocks.upsert, update: mocks.update, select: mocks.select }), rpc: mocks.rpc }) }));
import { attemptReport, deliverPending, notionBlocks, practiceAttemptReport, queueAttemptReport, queuePracticeReport, queueDueReminders, reminderPapers } from './delivery';
const paper: Paper = { id: 'p1', kind: 'review', month: '2026-09', due_date: '2026-09-25', opens_on: '2026-09-21', subject: 'Maths', title: 'Friday Maths', status: 'published', duration_minutes: null, questions: [{ id: 'q1', type: 'written', prompt: 'Explain fractions', sourceIds: ['l1'] }], lessons: [{ id: 'l1', date: '2026-09-22', subject: 'Maths', task: 'Compare fractions', topic: 'Fractions', week: '4', guide: [], url: 'https://notion.so/lesson' }], coverage_note: 'Only dated source rows' };
const attempt: Attempt = { id: 'a1', paper_id: 'p1', status: 'submitted', answers: { q1: 'PRIVATE CHILD RESPONSE' }, started_at: '2026-09-25T00:00:00Z', expires_at: null, submitted_at: '2026-09-25T01:00:00Z', result: { objectiveCorrect: 0, objectiveTotal: 0, writtenPending: 1, writtenPoints: 0, writtenTotal: 2, percentage: null, summary: 'Awaiting review', gaps: [] }, parent_review: null, correction: null, correction_at: null, revision: 1, paper_snapshot: paper };
const envs = ['ASSESSMENT_GMAIL_ENTITY_ID', 'ASSESSMENT_COMPOSIO_API_KEY', 'ASSESSMENT_GMAIL_ACCOUNT_ID', 'NOTION_TOKEN', 'ASSESSMENT_NOTION_DB_ID', 'ASSESSMENT_EMAIL_TO', 'ASSESSMENT_MS_CLIENT_ID', 'ASSESSMENT_MS_CLIENT_SECRET', 'ASSESSMENT_MS_REFRESH_TOKEN', 'RESEND_API_KEY', 'ASSESSMENT_EMAIL_FROM'];
beforeEach(() => {
  vi.clearAllMocks();
  for (const name of envs) vi.stubEnv(name, '');
  mocks.upsert.mockResolvedValue({ error: null }); mocks.eq.mockResolvedValue({ error: null }); mocks.update.mockReturnValue({ eq: mocks.eq });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('durable learning reports', () => {
  it('suppresses practice at automatic report entry and labels explicit practice delivery as system data', async()=>{
    const practice={...attempt,paper_snapshot:{...paper,is_practice:true}};
    await queueAttemptReport(practice);
    expect(mocks.upsert).not.toHaveBeenCalled();
    const payload=practiceAttemptReport(practice);
    expect(payload.subject).toContain('PARENT PRACTICE');
    expect(payload.metadata).toMatchObject({kind:'system',status:'system',score:null});
    await queuePracticeReport(practice);
    const jobs=mocks.upsert.mock.calls[0][0];
    expect(jobs.map((j:{id:string})=>j.id)).toEqual(expect.arrayContaining([expect.stringMatching(/^practice-/),expect.stringMatching(/^practice-/)]));
    expect(jobs.every((j:{payload:{practiceExplicit?:boolean}})=>j.payload.practiceExplicit===true)).toBe(true);
  });
  it('blocks a labelled practice email at delivery when it lacks the explicit manual marker',async()=>{
    vi.stubEnv('RESEND_API_KEY','private-key');vi.stubEnv('ASSESSMENT_EMAIL_FROM','from@example.com');vi.stubEnv('ASSESSMENT_EMAIL_TO','parent@example.com');
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
    mocks.rpc.mockResolvedValue({data:[{id:'unsafe-practice',channel:'email',payload:{subject:'PARENT PRACTICE: report',text:'practice'}}],error:null});
    expect(await deliverPending()).toEqual({sent:0,failed:1});
    expect(fetcher).not.toHaveBeenCalled();
    expect(mocks.update.mock.calls[0][0].last_error).toContain('suppressed');
  });
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
    expect(jobs[1].payload).not.toHaveProperty('metadata');
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
    expect(JSON.parse(fetcher.mock.calls[0][1].body).filter.property).toBe('Event ID');
    expect(JSON.parse(fetcher.mock.calls[0][1].body).filter.rich_text.equals).toBe('event-notion');
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'sent' }));
  });
  it('creates a family-readable Notion record with filterable report properties and a private event ID', async () => {
    vi.stubEnv('NOTION_TOKEN', 'private-token'); vi.stubEnv('ASSESSMENT_NOTION_DB_ID', 'database');
    const payload = attemptReport(attempt);
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }))).mockResolvedValueOnce(new Response(JSON.stringify({ id: 'created' })));
    vi.stubGlobal('fetch', fetcher);
    mocks.rpc.mockResolvedValue({ data: [{ id: 'event-notion', channel: 'notion', payload }], error: null });
    expect(await deliverPending()).toEqual({ sent: 1, failed: 0 });
    const body = JSON.parse(fetcher.mock.calls[1][1].body);
    expect(body.properties.Name.title[0].text.content).toBe('Friday Maths — submitted');
    expect(body.properties['Event ID'].rich_text[0].text.content).toBe('event-notion');
    expect(body.properties.Subject.rich_text[0].text.content).toBe('Maths');
    expect(body.properties.Kind.select.name).toBe('review');
    expect(body.properties.Status.select.name).toBe('submitted');
    expect(body.properties.Month.rich_text[0].text.content).toBe('2026-09');
    expect(body.properties.Due.date.start).toBe('2026-09-25');
    expect(body.properties.Submitted.date.start).toBe(attempt.submitted_at);
    expect(body.properties.Score.number).toBeNull();
    expect(JSON.stringify(body.children)).toContain('PRIVATE CHILD RESPONSE');
    expect(attemptReport({ ...attempt, status: 'reviewed', result: { ...attempt.result!, writtenPending: 0, percentage: 75 }, correction_at: '2026-09-26T00:00:00Z' }).metadata).toMatchObject({ status: 'correction', score: 75 });
  });
  it('creates a readable system record when a setup job has no assessment metadata', async () => {
    vi.stubEnv('NOTION_TOKEN', 'private-token'); vi.stubEnv('ASSESSMENT_NOTION_DB_ID', 'database');
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }))).mockResolvedValueOnce(new Response(JSON.stringify({ id: 'created' })));
    vi.stubGlobal('fetch', fetcher);
    mocks.rpc.mockResolvedValue({ data: [{ id: 'setup', channel: 'notion', payload: { subject: 'Learning record ready', text: 'Setup complete' } }], error: null });
    expect(await deliverPending()).toEqual({ sent: 1, failed: 0 });
    const props = JSON.parse(fetcher.mock.calls[1][1].body).properties;
    expect(props.Name.title[0].text.content).toBe('Learning record ready — system');
    expect(props.Kind.select.name).toBe('system');
    expect(props.Status.select.name).toBe('system');
    expect(props.Due.date).toBeNull();
    expect(props.Submitted.date).toBeNull();
    expect(props.Score.number).toBeNull();
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
    const execution = JSON.parse(fetcher.mock.calls[1][1].body);
    expect(execution).toEqual({ connected_account_id: 'connected-account', entity_id: 'default', version: 'latest', arguments: { recipient_email: 'parent@example.com', subject: expect.stringMatching(/^Result \[ansar-[a-f0-9]+\]$/), body: 'Private link', is_html: false, user_id: 'me' } });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ connected_account_id: 'connected-account', entity_id: 'default', version: 'latest', arguments: { query: expect.stringMatching(/^in:sent subject:"ansar-[a-f0-9]+"$/), max_results: 1, ids_only: true, user_id: 'me' } });
    const args = execution.arguments;
    expect(args.subject).toMatch(/Result \[ansar-[a-f0-9]+\]/);
    expect(args.body).toBe('Private link');
    expect(mocks.update.mock.calls[0][0].payload.gmailSendStartedAt).toBeTruthy();
  });
  it('passes an explicitly configured Composio account entity without changing the Gmail mailbox user', async () => {
    vi.stubEnv('ASSESSMENT_GMAIL_ENTITY_ID', 'configured-entity');
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ successful: true, data: { messages: [{ messageId: 'already-sent' }] } })));
    vi.stubGlobal('fetch', fetcher);
    mocks.rpc.mockResolvedValue({ data: [{ id: 'email-job', channel: 'email', payload: { subject: 'Result', text: 'Private link' } }], error: null });
    expect(await deliverPending()).toEqual({ sent: 1, failed: 0 });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ entity_id: 'configured-entity', connected_account_id: 'connected-account', arguments: { user_id: 'me' } });
  });
  it('retries a definitively rejected Gmail send after HTTP 429', async () => {
    const job = { id: 'rejected-email', channel: 'email', payload: { subject: 'Result', text: 'Private link', gmailSendStartedAt: undefined as string | undefined } };
    const emptySearch = () => new Response(JSON.stringify({ successful: true, data: { messages: [] } }));
    const fetcher = vi.fn().mockResolvedValueOnce(emptySearch()).mockResolvedValueOnce(new Response('rate limit', { status: 429 })).mockResolvedValueOnce(emptySearch()).mockResolvedValueOnce(new Response(JSON.stringify({ successful: true, data: { id: 'sent' } })));
    vi.stubGlobal('fetch', fetcher);
    mocks.rpc.mockResolvedValue({ data: [job], error: null });
    expect(await deliverPending()).toEqual({ sent: 0, failed: 1 });
    expect(job.payload.gmailSendStartedAt).toBeUndefined();
    expect(await deliverPending()).toEqual({ sent: 1, failed: 0 });
    expect(fetcher.mock.calls.filter(c => String(c[0]).endsWith('GMAIL_SEND_EMAIL'))).toHaveLength(2);
  });
  it.each([408, 502, 'tool-error'])('does not blindly resend after ambiguous Gmail failure %s', async failure => {
    const job = { id: 'ambiguous-email', channel: 'email', payload: { subject: 'Result', text: 'Private link', gmailSendStartedAt: undefined as string | undefined } };
    const emptySearch = () => new Response(JSON.stringify({ successful: true, data: { messages: [] } }));
    const rejected = typeof failure === 'number' ? new Response('ambiguous', { status: failure }) : new Response(JSON.stringify({ successful: false, error: 'unknown timeout' }));
    const fetcher = vi.fn().mockResolvedValueOnce(emptySearch()).mockResolvedValueOnce(rejected).mockResolvedValueOnce(emptySearch());
    vi.stubGlobal('fetch', fetcher); mocks.rpc.mockResolvedValue({ data: [job], error: null });
    expect(await deliverPending()).toEqual({ sent: 0, failed: 1 });
    expect(job.payload.gmailSendStartedAt).toBeTruthy();
    expect(await deliverPending()).toEqual({ sent: 0, failed: 1 });
    expect(fetcher.mock.calls.filter(c => String(c[0]).endsWith('GMAIL_SEND_EMAIL'))).toHaveLength(1);
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
describe('Microsoft rejection recovery', () => {
  it('reuses the persisted draft and retries send after HTTP 429', async () => {
    vi.stubEnv('ASSESSMENT_EMAIL_TO', 'parent@example.com');
    vi.stubEnv('ASSESSMENT_MS_CLIENT_ID', 'client'); vi.stubEnv('ASSESSMENT_MS_CLIENT_SECRET', 'secret'); vi.stubEnv('ASSESSMENT_MS_REFRESH_TOKEN', 'refresh');
    const job = { id: 'graph-email', channel: 'email', payload: { subject: 'Result', text: 'Private link', graphMessageId: undefined as string | undefined, graphSendStartedAt: undefined as string | undefined } };
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'immutable-draft' })))
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ isDraft: true })))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetcher); mocks.rpc.mockResolvedValue({ data: [job], error: null });
    expect(await deliverPending()).toEqual({ sent: 0, failed: 1 });
    expect(job.payload.graphMessageId).toBe('immutable-draft');
    expect(job.payload.graphSendStartedAt).toBeUndefined();
    expect(await deliverPending()).toEqual({ sent: 1, failed: 0 });
    expect(fetcher.mock.calls.filter(c => String(c[0]).endsWith('/send'))).toHaveLength(2);
    expect(fetcher.mock.calls.filter(c => String(c[0]).endsWith('/me/messages'))).toHaveLength(1);
  });
});
describe('reminder eligibility', () => {
  it('excludes practice papers before reminder selection',()=>{
    expect(reminderPapers('2026-09-25',[{...paper,is_practice:true}],new Set())).toEqual([]);
  });
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

describe('fair parent and learner reminders', () => {
  function reminders(papers: Paper[], attempts: { paper_id: string; status: string }[] = []) {
    mocks.select.mockImplementation((columns: string) => columns === '*'
      ? { eq: () => ({ in: () => ({ lte: () => Promise.resolve({ data: papers, error: null }) }) }) }
      : { in: () => ({ in: () => Promise.resolve({ data: attempts, error: null }) }) });
  }
  it('does not mark historical baseline papers overdue when first created after their due date in Sydney', () => {
    // 14:30 UTC on Friday is already Saturday in Sydney.
    const retroactive = { ...paper, created_at: '2026-09-25T14:30:00Z' };
    const assignedInTime = { ...paper, id: 'on-time', created_at: '2026-09-25T13:30:00Z' };
    expect(reminderPapers('2026-09-28', [retroactive, assignedInTime], new Set()).map(p => p.id)).toEqual(['on-time']);
  });
  it('does not call an exam overdue when its draft existed earlier but parent approval arrived late', () => {
    const lateApproval: Paper = { ...paper, kind: 'exam', due_date: '2026-09-30', opens_on: '2026-09-24', created_at: '2026-09-20T00:00:00Z', published_at: '2026-10-01T00:00:00Z' };
    const timelyApproval: Paper = { ...lateApproval, id: 'timely', published_at: '2026-09-29T00:00:00Z' };
    expect(reminderPapers('2026-10-05', [lateApproval, timelyApproval], new Set()).map(p => p.id)).toEqual(['timely']);
  });
  it('accounts for Sydney daylight saving in historical assignment fairness', () => {
    const retroactive = { ...paper, due_date: '2026-10-23', opens_on: '2026-10-23', created_at: '2026-10-23T13:30:00Z' };
    expect(reminderPapers('2026-10-26', [retroactive], new Set())).toEqual([]);
  });
  it('queues separate approval and feedback digests without answers or already reviewed work', async () => {
    const draft = { ...paper, id: 'exam-draft', kind: 'exam' as const, status: 'draft' as const, due_date: '2026-09-30', opens_on: '2026-09-24' };
    const reviewed = { ...paper, id: 'already-reviewed', title: 'Already reviewed private title' };
    reminders([paper, draft, reviewed], [{ paper_id: paper.id, status: 'submitted' }, { paper_id: reviewed.id, status: 'reviewed' }]);
    await queueDueReminders('2026-09-25');
    const jobs = mocks.upsert.mock.calls[0][0];
    expect(jobs.map((j: { payload: { subject: string } }) => j.payload.subject)).toEqual(['Nihal: approve monthly exam papers', 'Nihal: review submitted learning work']);
    expect(JSON.stringify(jobs)).not.toContain('Explain fractions');
    expect(JSON.stringify(jobs)).not.toContain('PRIVATE CHILD RESPONSE');
    expect(JSON.stringify(jobs)).not.toContain('Already reviewed private title');
    expect(mocks.select).toHaveBeenCalledWith('paper_id,status');
  });
  it('sends no draft approval before the exam window, or after its due date', async () => {
    const draft = { ...paper, id: 'exam-draft', kind: 'exam' as const, status: 'draft' as const, due_date: '2026-09-30', opens_on: '2026-09-01' };
    reminders([draft]);
    await queueDueReminders('2026-09-23');
    await queueDueReminders('2026-10-01');
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it('reminds Nihal about submitted work on Monday and Friday only', async () => {
    reminders([paper], [{ paper_id: paper.id, status: 'submitted' }]);
    await queueDueReminders('2026-09-28');
    expect(mocks.upsert.mock.calls[0][0][0].id).toBe('reminder-2026-09-28-parent-feedback');
    mocks.upsert.mockClear();
    await queueDueReminders('2026-09-29');
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it('keeps the same daily digest ID when another assignment is added', async () => {
    reminders([paper]); await queueDueReminders('2026-09-25');
    reminders([paper, { ...paper, id: 'second' }]); await queueDueReminders('2026-09-25');
    expect(mocks.upsert.mock.calls[0][0][0].id).toBe(mocks.upsert.mock.calls[1][0][0].id);
    expect(mocks.upsert.mock.calls[1][1].ignoreDuplicates).toBe(true);
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
