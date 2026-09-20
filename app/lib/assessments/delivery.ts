import { createHash } from 'node:crypto';
import { adminClient } from '../supabase-admin';
import type { Attempt, Paper } from './types';

const OUTBOX = 'ansar_assessment_outbox';
const SITE = 'https://ansar-habits-tracker.netlify.app';
type Payload = { subject: string; text: string; report?: string; graphMessageId?: string; graphSendStartedAt?: string; resendStartedAt?: string; gmailSendStartedAt?: string };
type Job = { id: string; channel: 'notion' | 'email'; payload: Payload; attempts: number };
class DeliveryError extends Error {}

export function deliveryConfiguration() {
  return {
    notion: Boolean(process.env.NOTION_TOKEN && process.env.ASSESSMENT_NOTION_DB_ID),
    email: Boolean(process.env.ASSESSMENT_EMAIL_TO && ((process.env.ASSESSMENT_COMPOSIO_API_KEY && process.env.ASSESSMENT_GMAIL_ACCOUNT_ID) || (process.env.ASSESSMENT_MS_CLIENT_ID && process.env.ASSESSMENT_MS_CLIENT_SECRET && process.env.ASSESSMENT_MS_REFRESH_TOKEN) || (process.env.RESEND_API_KEY && process.env.ASSESSMENT_EMAIL_FROM))),
  };
}
function workspaceUrl() { return `${(process.env.ASSESSMENT_SITE_URL || SITE).replace(/\/$/, '')}/tests`; }
function digest(value: string) { return createHash('sha256').update(value).digest('hex').slice(0, 32); }
function statusText(attempt: Attempt) {
  const result = attempt.result;
  const pending = result?.writtenPending || 0;
  return `${attempt.status === 'reviewed' ? 'Parent reviewed' : 'Submitted'}${result?.percentage != null ? ` · ${result.percentage}%${pending ? ' provisional' : ''}` : ''}${pending ? ` · ${pending} written responses awaiting review` : ''}`;
}
export function attemptReport(attempt: Attempt): Payload {
  const paper = attempt.paper_snapshot;
  const review = attempt.parent_review;
  const report = [
    `${paper.title}\nSubject: ${paper.subject}\nDue: ${paper.due_date}\nStatus: ${statusText(attempt)}\nSubmitted: ${attempt.submitted_at || 'Not recorded'}`,
    `Coverage: ${paper.coverage_note}\nSource lessons:\n${paper.lessons.map(l => `${l.date} · ${l.subject} · ${l.topic}\n${l.task}\n${l.url}`).join('\n\n') || 'No source lessons recorded'}`,
    `Result: ${attempt.result?.summary || 'Awaiting review'}\nObjective: ${attempt.result?.objectiveCorrect ?? 0}/${attempt.result?.objectiveTotal ?? 0}\nWritten: ${attempt.result?.writtenPoints ?? 0}/${attempt.result?.writtenTotal ?? 0}; pending: ${attempt.result?.writtenPending ?? 0}\nGaps: ${attempt.result?.gaps.join('; ') || 'None recorded'}`,
    `Parent feedback: ${review?.feedback || 'Awaiting parent review'}\nNext step: ${review?.nextStep || 'Awaiting parent review'}\nReviewed: ${review?.reviewedAt || 'Not yet'}\nPractical demonstration: ${review?.practicalConfirmed ? 'Confirmed' : 'Not confirmed'}`,
    ...paper.questions.map((q, index) => {
      const answer = attempt.answers[q.id];
      const response = typeof answer === 'number' ? `${answer + 1}. ${q.options?.[answer] ?? '(invalid selection)'}` : answer || '(no response)';
      return `Question ${index + 1}: ${q.prompt}\n${q.options?.map((o, i) => `${i + 1}. ${o}`).join('\n') || ''}\nResponse: ${response}\nParent mark: ${review?.marks[q.id] ?? 'Not recorded'}\nSource IDs: ${q.sourceIds.join(', ')}`;
    }),
    `Correction (${attempt.correction_at || 'not recorded'}):\n${attempt.correction || 'No correction submitted'}`,
    `Private workspace: ${workspaceUrl()}`,
  ].join('\n\n');
  return { subject: `Ansar assessment: ${paper.subject} — ${attempt.correction_at ? 'correction recorded' : attempt.status === 'reviewed' ? 'reviewed' : 'submitted'}`, text: `${statusText(attempt)}.\nView the private learning record: ${workspaceUrl()}`, report };
}
async function enqueue(jobs: Omit<Job, 'attempts'>[]) {
  if (!jobs.length) return;
  const { error } = await adminClient().from(OUTBOX).upsert(jobs.map(j => ({ ...j, status: 'pending' })), { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw new DeliveryError('Could not persist assessment notifications');
}
export async function queueAttemptReport(attempt: Attempt): Promise<void> {
  if (attempt.status === 'in_progress') return;
  const event = `attempt-${digest([attempt.id, attempt.status, attempt.parent_review?.reviewedAt || '', attempt.correction_at || ''].join(':'))}`;
  const payload = attemptReport(attempt);
  // Detailed work is present only in the private Notion job, never the email job.
  await enqueue([{ id: `${event}-notion`, channel: 'notion', payload }, { id: `${event}-email`, channel: 'email', payload: { subject: payload.subject, text: payload.text } }]);
}
export function reminderPapers(today: string, papers: Paper[], completedIds: Set<string>): Paper[] {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const daysInMonth = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0)).getUTCDate();
  const examWindow = Number(today.slice(8, 10)) >= daysInMonth - 6;
  return papers.filter(p => p.status === 'published' && p.opens_on <= today && !completedIds.has(p.id) && (
    (weekday === 5 && p.kind === 'review' && p.due_date === today) ||
    (p.kind === 'exam' && today <= p.due_date && examWindow) ||
    (weekday === 1 && p.due_date < today)
  ));
}
export async function queueDueReminders(today: string): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new DeliveryError('Invalid reminder date');
  const db = adminClient();
  const { data: papers, error } = await db.from('ansar_assessment_papers').select('*').eq('status', 'published').lte('opens_on', today);
  if (error) throw new DeliveryError('Could not read assignments for reminders');
  if (!papers?.length) return;
  const { data: attempts, error: attemptsError } = await db.from('ansar_assessment_attempts').select('paper_id').in('paper_id', papers.map(p => p.id)).in('status', ['submitted', 'reviewed']);
  if (attemptsError) throw new DeliveryError('Could not read submissions for reminders');
  const due = reminderPapers(today, papers as Paper[], new Set((attempts || []).map(a => a.paper_id))).sort((a, b) => a.id.localeCompare(b.id));
  if (!due.length) return;
  const id = `reminder-${today}-${digest(due.map(p => `${p.id}:${p.due_date < today ? 'overdue' : p.kind}`).join('|'))}`;
  await enqueue([{ id, channel: 'email', payload: { subject: 'Ansar: learning work due', text: `Work awaiting submission:\n${due.map(p => `${p.subject}: ${p.title} — due ${p.due_date}${p.due_date < today ? ' (overdue)' : ''}`).join('\n')}\n\nOpen the private workspace: ${workspaceUrl()}\nSubmission records completion; parent review assesses understanding.` } }]);
}
// Pack the complete report into a single create-page request: retries can locate
// its stable title, and cannot leave a half-appended report after a timeout.
export function notionBlocks(report: string) {
  const blocks = [];
  const characters = Array.from(report);
  for (let offset = 0; offset < characters.length; offset += 3000) {
    const part = characters.slice(offset, offset + 3000);
    const richText = [];
    for (let i = 0; i < part.length; i += 1000) richText.push({ type: 'text', text: { content: part.slice(i, i + 1000).join('') } });
    blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: richText } });
  }
  if (blocks.length > 100 || Buffer.byteLength(JSON.stringify(blocks), 'utf8') > 450_000) throw new DeliveryError('Report exceeds Notion request limits; retained for manual delivery');
  return blocks;
}
async function request(url: string, init: RequestInit, provider: string): Promise<Response> {
  let response: Response;
  try { response = await fetch(url, { ...init, signal: AbortSignal.timeout(12_000), cache: 'no-store' }); }
  catch { throw new DeliveryError(`${provider} network request failed`); }
  if (!response.ok) throw new DeliveryError(`${provider} request failed (${response.status})`);
  return response;
}
async function deliverNotion(job: Job) {
  if (!deliveryConfiguration().notion) throw new DeliveryError('Notion is not configured: set NOTION_TOKEN and ASSESSMENT_NOTION_DB_ID');
  const headers = { Authorization: `Bearer ${process.env.NOTION_TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' };
  const query = await request(`https://api.notion.com/v1/databases/${process.env.ASSESSMENT_NOTION_DB_ID}/query`, { method: 'POST', headers, body: JSON.stringify({ filter: { property: 'Name', title: { equals: job.id } }, page_size: 1 }) }, 'Notion');
  if ((await query.json()).results?.length) return;
  await request('https://api.notion.com/v1/pages', { method: 'POST', headers, body: JSON.stringify({ parent: { database_id: process.env.ASSESSMENT_NOTION_DB_ID }, properties: { Name: { title: [{ text: { content: job.id } }] } }, children: notionBlocks(job.payload.report || job.payload.text) }) }, 'Notion');
}
async function persistPayload(job: Job) {
  const { error } = await adminClient().from(OUTBOX).update({ payload: job.payload }).eq('id', job.id);
  if (error) throw new DeliveryError('Could not persist email delivery checkpoint');
}
async function deliverGraph(job: Job) {
  const tokenResponse = await request('https://login.microsoftonline.com/common/oauth2/v2.0/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.ASSESSMENT_MS_CLIENT_ID!, client_secret: process.env.ASSESSMENT_MS_CLIENT_SECRET!, refresh_token: process.env.ASSESSMENT_MS_REFRESH_TOKEN!, grant_type: 'refresh_token', scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access' }) }, 'Microsoft authentication');
  const token = (await tokenResponse.json()).access_token;
  if (!token) throw new DeliveryError('Microsoft authentication returned no access token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'IdType="ImmutableId"' };
  if (!job.payload.graphMessageId) {
    const draft = await request('https://graph.microsoft.com/v1.0/me/messages', { method: 'POST', headers, body: JSON.stringify({ subject: job.payload.subject, body: { contentType: 'Text', content: job.payload.text }, toRecipients: [{ emailAddress: { address: process.env.ASSESSMENT_EMAIL_TO } }] }) }, 'Microsoft mail');
    job.payload.graphMessageId = (await draft.json()).id;
    if (!job.payload.graphMessageId) throw new DeliveryError('Microsoft mail returned no draft ID');
    await persistPayload(job);
  } else {
    const message = await request(`https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(job.payload.graphMessageId)}?$select=isDraft`, { headers }, 'Microsoft mail');
    if ((await message.json()).isDraft === false) return;
    // Sending is asynchronous. An ambiguous previous send must be reconciled
    // through its immutable message ID, not blindly sent a second time.
    if (job.payload.graphSendStartedAt) throw new DeliveryError('Microsoft send is awaiting confirmation; retained for reconciliation');
  }
  job.payload.graphSendStartedAt = new Date().toISOString();
  await persistPayload(job);
  await request(`https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(job.payload.graphMessageId!)}/send`, { method: 'POST', headers }, 'Microsoft mail');
}
async function composio(tool: string, args: Record<string, unknown>) {
  const response = await request(`https://backend.composio.dev/api/v3/tools/execute/${tool}`, {
    method: 'POST', headers: { 'x-api-key': process.env.ASSESSMENT_COMPOSIO_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ connected_account_id: process.env.ASSESSMENT_GMAIL_ACCOUNT_ID, version: 'latest', arguments: args }),
  }, 'Gmail');
  const result = await response.json();
  if (result.successful !== true) throw new DeliveryError('Gmail operation failed; check the connected account');
  return result.data;
}
async function deliverGmail(job: Job) {
  const marker = `ansar-${digest(job.id)}`;
  const found = await composio('GMAIL_FETCH_EMAILS', { query: `in:sent subject:"${marker}"`, max_results: 1, ids_only: true, user_id: 'me' });
  const messages = found?.messages ?? found?.emails ?? (found?.resultSizeEstimate === 0 ? [] : undefined);
  if (!Array.isArray(messages)) throw new DeliveryError('Gmail search returned an unexpected response');
  if (messages.length) return;
  // Gmail search indexing can lag after send. An empty search after a prior
  // ambiguous attempt is not proof that sending failed: never blindly resend.
  if (job.payload.gmailSendStartedAt) throw new DeliveryError('Gmail send is awaiting confirmation; retained for reconciliation');
  job.payload.gmailSendStartedAt = new Date().toISOString();
  await persistPayload(job);
  await composio('GMAIL_SEND_EMAIL', { recipient_email: process.env.ASSESSMENT_EMAIL_TO, subject: `${job.payload.subject} [${marker}]`, body: job.payload.text, is_html: false, user_id: 'me' });
}
async function deliverEmail(job: Job) {
  if (!deliveryConfiguration().email) throw new DeliveryError('Email is not configured: set ASSESSMENT_EMAIL_TO and Composio Gmail, Microsoft credentials, or RESEND_API_KEY / ASSESSMENT_EMAIL_FROM');
  if (job.payload.gmailSendStartedAt || (!job.payload.graphMessageId && !job.payload.resendStartedAt && process.env.ASSESSMENT_COMPOSIO_API_KEY && process.env.ASSESSMENT_GMAIL_ACCOUNT_ID)) return deliverGmail(job);
  if (job.payload.graphMessageId || (process.env.ASSESSMENT_MS_CLIENT_ID && process.env.ASSESSMENT_MS_CLIENT_SECRET && process.env.ASSESSMENT_MS_REFRESH_TOKEN)) return deliverGraph(job);
  // Resend retains idempotency keys for 24 hours. Beyond that window an
  // ambiguous delivery needs reconciliation instead of risking a duplicate.
  if (job.payload.resendStartedAt && Date.now() - Date.parse(job.payload.resendStartedAt) >= 23 * 60 * 60 * 1000) throw new DeliveryError('Resend delivery confirmation expired; retained for manual reconciliation');
  if (!job.payload.resendStartedAt) { job.payload.resendStartedAt = new Date().toISOString(); await persistPayload(job); }
  await request('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': job.id }, body: JSON.stringify({ from: process.env.ASSESSMENT_EMAIL_FROM, to: [process.env.ASSESSMENT_EMAIL_TO], subject: job.payload.subject, text: job.payload.text }) }, 'Resend');
}
export async function deliverPending(): Promise<{ sent: number; failed: number }> {
  const db = adminClient();
  const { data, error } = await db.rpc('claim_ansar_assessment_outbox', { batch_size: 10 });
  if (error) throw new DeliveryError('Could not claim pending assessment notifications');
  const results = await Promise.all(((data || []) as Job[]).map(async job => {
    try {
      if (job.channel === 'notion') await deliverNotion(job); else await deliverEmail(job);
      const { error: saveError } = await db.from(OUTBOX).update({ status: 'sent', last_error: null, delivered_at: new Date().toISOString(), locked_until: null }).eq('id', job.id);
      if (saveError) throw new DeliveryError('Provider accepted delivery but recording confirmation failed; retry required');
      return true;
    } catch (error) {
      // Never persist provider response bodies, tokens, or student answers.
      const message = error instanceof DeliveryError ? error.message : 'Assessment delivery failed; retry required';
      const { error: saveError } = await db.from(OUTBOX).update({ last_error: message, locked_until: new Date(Date.now() + 15 * 60 * 1000).toISOString() }).eq('id', job.id);
      if (saveError) throw new DeliveryError('Could not record assessment delivery failure');
      return false;
    }
  }));
  return { sent: results.filter(Boolean).length, failed: results.filter(r => !r).length };
}
