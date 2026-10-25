import { createHash } from 'node:crypto';
import { adminClient } from '../supabase-admin';
import { sydneyDateKey } from '../time';
import type { Attempt, Paper } from './types';
import { PALETTES, actionCard, callCard, day, daysBetween, email, monthName, rowsCard, statsCard, tidyTitle, type Palette } from './email-html';

const OUTBOX = 'ansar_assessment_outbox';
const SITE = 'https://ansar-habits-tracker.netlify.app';
type ReportMetadata = { title: string; subject: string; kind: 'review' | 'exam' | 'system'; status: 'submitted' | 'reviewed' | 'correction' | 'system'; month: string; dueDate: string | null; submittedAt: string | null; score: number | null };
type Payload = { subject: string; text: string; html?: string; report?: string; metadata?: ReportMetadata; practiceExplicit?: boolean; graphMessageId?: string; graphSendStartedAt?: string; resendStartedAt?: string; gmailSendStartedAt?: string };
type Job = { id: string; channel: 'notion' | 'email'; payload: Payload; attempts: number };
class DeliveryError extends Error {
  constructor(message: string, readonly httpStatus?: number) { super(message); }
}
function definitivelyRejected(error: unknown): boolean {
  return error instanceof DeliveryError && error.httpStatus !== undefined && error.httpStatus >= 400 && error.httpStatus < 500 && error.httpStatus !== 408;
}
function assignedByDueDate(paper: Paper): boolean {
  const assignedAt = paper.kind === 'exam' ? paper.published_at || paper.created_at : paper.created_at;
  return !assignedAt || sydneyDateKey(new Date(assignedAt)) <= paper.due_date;
}

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
function attemptHtml(attempt: Attempt, practice: boolean) {
  const paper = attempt.paper_snapshot, r = attempt.result, p: Palette = practice ? PALETTES.practice : PALETTES.report;
  const state = attempt.correction_at ? 'CORRECTION RECORDED' : attempt.status === 'reviewed' ? 'REVIEWED' : 'SUBMITTED';
  const pending = r?.writtenPending || 0;
  return email(p, { kicker: practice ? 'Parent practice · fictional rehearsal' : `Homeschool · ${paper.kind === 'exam' ? 'Monthly exam' : 'Friday review'}`, title: paper.subject, sub: `${tidyTitle(paper.subject, paper.title)} · due ${day(paper.due_date)}` }, [
    callCard(p, 'Where it stands', practice ? `PRACTICE · ${state}` : state, `${statusText(attempt)}.`),
    statsCard(p, 'The numbers', [
      { value: r?.percentage != null ? `${r.percentage}%` : '—', label: pending ? 'Score, provisional' : 'Score', filled: true },
      { value: `${r?.objectiveCorrect ?? 0}/${r?.objectiveTotal ?? 0}`, label: 'Objective' },
      { value: `${r?.writtenPoints ?? 0}/${r?.writtenTotal ?? 0}`, label: 'Written' },
      { value: String(pending), label: 'Awaiting marks', alert: pending > 0 },
    ]),
    actionCard(p, attempt.status === 'reviewed' ? 'The record' : 'Your part', attempt.status === 'reviewed' ? 'Marks, feedback and the next step are saved in the private learning record.' : 'Read his responses, mark the written answers and set the next learning step.', { label: practice ? 'Open the rehearsal' : 'Open the learning record', url: practice ? `${workspaceUrl()}/practice` : workspaceUrl() }),
  ], practice ? 'PARENT PRACTICE: fictional workflow rehearsal only. Nothing here is Ansar\'s record.' : 'Detailed responses stay in the private record, never in email.');
}
export function attemptReport(attempt: Attempt, practice=false): Payload {
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
    `Private workspace: ${practice?`${workspaceUrl()}/practice`:workspaceUrl()}`,
  ].join('\n\n');
  if(practice)return {subject:`PARENT PRACTICE: ${paper.subject} — report`,text:`PARENT PRACTICE. ${statusText(attempt)}.\nView the rehearsal: ${workspaceUrl()}/practice`,html:attemptHtml(attempt,true),report:`PARENT PRACTICE — fictional workflow rehearsal only.\n\n${report}`,metadata:{title:`PARENT PRACTICE — ${paper.title}`,subject:'Assessment system',kind:'system',status:'system',month:'',dueDate:null,submittedAt:null,score:null},practiceExplicit:true};
  return { subject: `Ansar assessment: ${paper.subject} — ${attempt.correction_at ? 'correction recorded' : attempt.status === 'reviewed' ? 'reviewed' : 'submitted'}`, text: `${statusText(attempt)}.\nView the private learning record: ${workspaceUrl()}`, html: attemptHtml(attempt, false), report, metadata: { title: paper.title, subject: paper.subject, kind: paper.kind, status: attempt.correction_at ? 'correction' : attempt.status === 'reviewed' ? 'reviewed' : 'submitted', month: paper.month, dueDate: paper.due_date, submittedAt: attempt.submitted_at, score: attempt.result?.percentage ?? null } };
}
export function practiceAttemptReport(attempt:Attempt){return attemptReport(attempt,true);}
async function enqueue(jobs: Omit<Job, 'attempts'>[]) {
  if (!jobs.length) return;
  const { error } = await adminClient().from(OUTBOX).upsert(jobs.map(j => ({ ...j, status: 'pending' })), { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw new DeliveryError('Could not persist assessment notifications');
}
/** One plain email to the parent address, sent by the same outbox (the Monday story). */
export async function queueEmail(id: string, subject: string, text: string, html?: string): Promise<void> {
  await enqueue([{ id, channel: 'email', payload: { subject, text, html } }]);
}
export async function queueAttemptReport(attempt: Attempt): Promise<void> {
  if (attempt.status === 'in_progress'||attempt.paper_snapshot.is_practice===true) return;
  const event = `attempt-${digest([attempt.id, attempt.status, attempt.parent_review?.reviewedAt || '', attempt.correction_at || ''].join(':'))}`;
  const payload = attemptReport(attempt);
  // Detailed work is present only in the private Notion job, never the email job.
  await enqueue([{ id: `${event}-notion`, channel: 'notion', payload }, { id: `${event}-email`, channel: 'email', payload: { subject: payload.subject, text: payload.text, html: payload.html } }]);
}
export async function queuePracticeReport(attempt:Attempt):Promise<void>{
 if(attempt.status==='in_progress'||attempt.paper_snapshot.is_practice!==true)throw new DeliveryError('Only submitted practice attempts can be sent');
 const event=`practice-${digest([attempt.id,attempt.status,attempt.parent_review?.reviewedAt||'',attempt.correction_at||''].join(':'))}`;const payload=practiceAttemptReport(attempt);
 await enqueue([{id:`${event}-notion`,channel:'notion',payload},{id:`${event}-email`,channel:'email',payload:{subject:payload.subject,text:payload.text,html:payload.html,practiceExplicit:true}}]);
}
export function reminderPapers(today: string, papers: Paper[], completedIds: Set<string>): Paper[] {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const daysInMonth = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0)).getUTCDate();
  const examWindow = Number(today.slice(8, 10)) >= daysInMonth - 6;
  return papers.filter(p => p.is_practice!==true && p.status === 'published' && p.opens_on <= today && !completedIds.has(p.id) && (
    (weekday === 5 && p.kind === 'review' && p.due_date === today) ||
    (p.kind === 'exam' && today <= p.due_date && examWindow) ||
    (weekday === 1 && p.due_date < today && assignedByDueDate(p))
  ));
}
const STALE_DAYS = 14;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
export function dueHtml(today: string, due: Paper[]) {
  const p = PALETTES.due, late = due.filter(x => x.due_date < today), next = due.filter(x => x.due_date >= today).map(x => x.due_date).sort()[0];
  return email(p, { kicker: 'Homeschool · Work due', title: "Ansar's work due", sub: day(today) }, [
    callCard(p, 'The call', late.length ? `${late.length} OVERDUE` : `${due.length} DUE`, late.length ? `${plural(late.length, 'piece')} past the due date, ${due.length - late.length} still on time.` : `${plural(due.length, 'piece')} awaiting submission.`, late.length > 0),
    statsCard(p, 'At a glance', [{ value: String(due.length), label: 'Waiting', filled: true }, { value: String(late.length), label: 'Overdue', alert: late.length > 0 }, { value: next ? day(next).slice(4) : '—', label: 'Next due' }]),
    rowsCard(p, 'The list', due.map(x => { const d = daysBetween(x.due_date, today); return { title: x.subject, detail: tidyTitle(x.subject, x.title), pill: d > 0 ? `${plural(d, 'day')} late` : d === 0 ? 'Due today' : `Due ${day(x.due_date)}`, alert: d > 0 }; })),
    actionCard(p, 'What to do', 'Open the private workspace to see each piece. Submission records completion; parent review assesses understanding.', { label: 'Open the workspace', url: workspaceUrl() }),
  ], 'Sent by the assessment room once a day at most.');
}
export function approvalHtml(today: string, drafts: Paper[]) {
  const p = PALETTES.approval, due = drafts.map(x => x.due_date).sort()[0], left = daysBetween(today, due);
  const month = monthName(drafts[0].month || '');
  return email(p, { kicker: 'Homeschool · Exam approval', title: `Approve ${month ? `${month}'s` : 'the'} papers`, sub: `${plural(drafts.length, 'paper')} · due ${day(due)}` }, [
    callCard(p, 'The call', `${drafts.length} TO APPROVE`, "Ansar can't begin until you check what was taught and approve each paper.", left <= 2),
    statsCard(p, 'At a glance', [{ value: String(drafts.length), label: 'Papers', filled: true }, { value: String(Math.max(0, left)), label: left === 1 ? 'Day left' : 'Days left', alert: left <= 2 }, { value: day(due).slice(4), label: 'Due' }]),
    rowsCard(p, 'The papers', drafts.map(x => ({ title: x.subject, detail: tidyTitle(x.subject, x.title), pill: `Due ${day(x.due_date)}` }))),
    actionCard(p, 'What to do', 'Preview the questions and marking guides privately, confirm what was taught, and agree any extra time. Unapproved papers are not assigned to Ansar.', { label: 'Review the papers', url: workspaceUrl() }),
  ], 'Exams stay in draft until you approve them. Approved papers cannot change.');
}
export function feedbackHtml(today: string, waiting: Paper[]) {
  const p = PALETTES.feedback, ages = waiting.map(x => Math.max(0, daysBetween(x.due_date, today))), oldest = Math.max(...ages), stale = ages.filter(a => a >= STALE_DAYS).length;
  return email(p, { kicker: 'Homeschool · Parent review', title: "Ansar's work to review", sub: `${plural(waiting.length, 'submission')} waiting · ${day(today)}` }, [
    callCard(p, 'The call', `${waiting.length} TO REVIEW`, stale ? `${plural(stale, 'piece')} waiting over two weeks. The oldest was due ${plural(oldest, 'day')} ago.` : 'Each needs your marks, feedback and next learning step.', stale > 0),
    statsCard(p, 'At a glance', [{ value: String(waiting.length), label: 'Waiting', filled: true }, { value: `${oldest}d`, label: 'Oldest', alert: oldest >= STALE_DAYS }, { value: String(stale), label: 'Over 2 weeks', alert: stale > 0 }]),
    rowsCard(p, 'Oldest first', waiting.map((x, i) => ({ x, age: ages[i] })).sort((a, b) => b.age - a.age).map(({ x, age }) => ({ title: x.subject, detail: tidyTitle(x.subject, x.title), pill: age ? `${age} days` : 'Today', alert: age >= STALE_DAYS })), 'Age counts from the due date.'),
    actionCard(p, 'What to do', 'Open his private responses and record marks, feedback and the next learning step for each.', { label: 'Start reviewing', url: workspaceUrl() }),
  ], 'Submission records completion; understanding awaits your review.');
}
export async function queueDueReminders(today: string): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new DeliveryError('Invalid reminder date');
  const db = adminClient();
  const { data: papers, error } = await db.from('ansar_assessment_papers').select('*').eq('is_practice',false).in('status', ['published', 'draft']).lte('opens_on', today);
  if (error) throw new DeliveryError('Could not read assignments for reminders');
  if (!papers?.length) return;
  // Read only identifiers/statuses: reminder emails never need student answers.
  const { data: attempts, error: attemptsError } = await db.from('ansar_assessment_attempts').select('paper_id,status').in('paper_id', papers.map(p => p.id)).in('status', ['submitted', 'reviewed']);
  if (attemptsError) throw new DeliveryError('Could not read submissions for reminders');
  const ordered = (papers as Paper[]).filter(p=>p.is_practice!==true).sort((a, b) => a.id.localeCompare(b.id));
  const completed = new Set((attempts || []).map(a => a.paper_id));
  const due = reminderPapers(today, ordered, completed);
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const daysInMonth = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0)).getUTCDate();
  const examWindow = Number(today.slice(8, 10)) >= daysInMonth - 6;
  const drafts = ordered.filter(p => p.kind === 'exam' && p.status === 'draft' && p.opens_on <= today && today <= p.due_date && examWindow && !completed.has(p.id));
  const submitted = new Set((attempts || []).filter(a => a.status === 'submitted').map(a => a.paper_id));
  const awaitingReview = weekday === 1 || weekday === 5 ? ordered.filter(p => submitted.has(p.id)) : [];
  const jobs: Omit<Job, 'attempts'>[] = [];
  // The category/date key allows at most one digest per day even if a parent
  // refreshes after a paper is published or an attempt changes status.
  if (due.length) jobs.push({ id: `reminder-${today}-learner`, channel: 'email', payload: {
    subject: 'Ansar: learning work due',
    html: dueHtml(today, due),
    text: `Work awaiting submission:\n${due.map(p => `${p.subject}: ${p.title} — due ${p.due_date}${p.due_date < today ? ' (overdue)' : ''}`).join('\n')}\n\nOpen the private workspace: ${workspaceUrl()}\nSubmission records completion; parent review assesses understanding.`,
  } });
  if (drafts.length) jobs.push({ id: `reminder-${today}-parent-approval`, channel: 'email', payload: {
    subject: 'Nihal: approve monthly exam papers',
    html: approvalHtml(today, drafts),
    text: `These monthly papers are awaiting your coverage check and approval before Ansar can begin:\n${drafts.map(p => `${p.subject}: ${p.title} — due ${p.due_date}`).join('\n')}\n\nPreview the questions and marking guides privately, confirm what was taught, and agree any extra time: ${workspaceUrl()}\nUnapproved papers are not assigned to Ansar.`,
  } });
  if (awaitingReview.length) jobs.push({ id: `reminder-${today}-parent-feedback`, channel: 'email', payload: {
    subject: 'Nihal: review submitted learning work',
    html: feedbackHtml(today, awaitingReview),
    text: `Ansar has submitted this work and is awaiting your marks, feedback and next learning step:\n${awaitingReview.map(p => `${p.subject}: ${p.title}`).join('\n')}\n\nOpen the private responses and record your review: ${workspaceUrl()}\nSubmission records completion; understanding awaits your review.`,
  } });
  await enqueue(jobs);
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
  if (!response.ok) throw new DeliveryError(`${provider} request failed (${response.status})`, response.status);
  return response;
}
async function deliverNotion(job: Job) {
  if (!deliveryConfiguration().notion) throw new DeliveryError('Notion is not configured: set NOTION_TOKEN and ASSESSMENT_NOTION_DB_ID');
  const headers = { Authorization: `Bearer ${process.env.NOTION_TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' };
  const query = await request(`https://api.notion.com/v1/databases/${process.env.ASSESSMENT_NOTION_DB_ID}/query`, { method: 'POST', headers, body: JSON.stringify({ filter: { property: 'Event ID', rich_text: { equals: job.id } }, page_size: 1 }) }, 'Notion');
  if ((await query.json()).results?.length) return;
  const metadata = job.payload.metadata || { title: job.payload.subject, subject: 'Assessment system', kind: 'system', status: 'system', month: '', dueDate: null, submittedAt: null, score: null };
  const richText = (value: string) => [{ type: 'text', text: { content: value.slice(0, 1900) } }];
  const properties = {
    Name: { title: richText(`${metadata.title} — ${metadata.status}`) },
    'Event ID': { rich_text: richText(job.id) },
    Subject: { rich_text: richText(metadata.subject) },
    Kind: { select: { name: metadata.kind } },
    Status: { select: { name: metadata.status } },
    Month: { rich_text: metadata.month ? richText(metadata.month) : [] },
    Due: { date: metadata.dueDate ? { start: metadata.dueDate } : null },
    Submitted: { date: metadata.submittedAt ? { start: metadata.submittedAt } : null },
    Score: { number: metadata.score },
  };
  await request('https://api.notion.com/v1/pages', { method: 'POST', headers, body: JSON.stringify({ parent: { database_id: process.env.ASSESSMENT_NOTION_DB_ID }, properties, children: notionBlocks(job.payload.report || job.payload.text) }) }, 'Notion');
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
    const draft = await request('https://graph.microsoft.com/v1.0/me/messages', { method: 'POST', headers, body: JSON.stringify({ subject: job.payload.subject, body: job.payload.html ? { contentType: 'HTML', content: job.payload.html } : { contentType: 'Text', content: job.payload.text }, toRecipients: [{ emailAddress: { address: process.env.ASSESSMENT_EMAIL_TO } }] }) }, 'Microsoft mail');
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
  try {
    await request(`https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(job.payload.graphMessageId!)}/send`, { method: 'POST', headers }, 'Microsoft mail');
  } catch (error) {
    if (definitivelyRejected(error)) { delete job.payload.graphSendStartedAt; await persistPayload(job); }
    throw error;
  }
}
async function composio(tool: string, args: Record<string, unknown>) {
  const response = await request(`https://backend.composio.dev/api/v3/tools/execute/${tool}`, {
    method: 'POST', headers: { 'x-api-key': process.env.ASSESSMENT_COMPOSIO_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ connected_account_id: process.env.ASSESSMENT_GMAIL_ACCOUNT_ID, entity_id: process.env.ASSESSMENT_GMAIL_ENTITY_ID || 'default', version: 'latest', arguments: args }),
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
  try {
    await composio('GMAIL_SEND_EMAIL', { recipient_email: process.env.ASSESSMENT_EMAIL_TO, subject: `${job.payload.subject} [${marker}]`, body: job.payload.html || job.payload.text, is_html: Boolean(job.payload.html), user_id: 'me' });
  } catch (error) {
    // HTTP 4xx (other than request timeout) rejects execution. Tool failures
    // inside HTTP 200 may be ambiguous, so their checkpoints remain intact.
    if (definitivelyRejected(error)) { delete job.payload.gmailSendStartedAt; await persistPayload(job); }
    throw error;
  }
}
async function deliverEmail(job: Job) {
  if (!deliveryConfiguration().email) throw new DeliveryError('Email is not configured: set ASSESSMENT_EMAIL_TO and Composio Gmail, Microsoft credentials, or RESEND_API_KEY / ASSESSMENT_EMAIL_FROM');
  if (job.payload.gmailSendStartedAt || (!job.payload.graphMessageId && !job.payload.resendStartedAt && process.env.ASSESSMENT_COMPOSIO_API_KEY && process.env.ASSESSMENT_GMAIL_ACCOUNT_ID)) return deliverGmail(job);
  if (job.payload.graphMessageId || (process.env.ASSESSMENT_MS_CLIENT_ID && process.env.ASSESSMENT_MS_CLIENT_SECRET && process.env.ASSESSMENT_MS_REFRESH_TOKEN)) return deliverGraph(job);
  // Resend retains idempotency keys for 24 hours. Beyond that window an
  // ambiguous delivery needs reconciliation instead of risking a duplicate.
  if (job.payload.resendStartedAt && Date.now() - Date.parse(job.payload.resendStartedAt) >= 23 * 60 * 60 * 1000) throw new DeliveryError('Resend delivery confirmation expired; retained for manual reconciliation');
  if (!job.payload.resendStartedAt) { job.payload.resendStartedAt = new Date().toISOString(); await persistPayload(job); }
  try {
    await request('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': job.id }, body: JSON.stringify({ from: process.env.ASSESSMENT_EMAIL_FROM, to: [process.env.ASSESSMENT_EMAIL_TO], subject: job.payload.subject, text: job.payload.text, ...(job.payload.html ? { html: job.payload.html } : {}) }) }, 'Resend');
  } catch (error) {
    if (definitivelyRejected(error)) { delete job.payload.resendStartedAt; await persistPayload(job); }
    throw error;
  }
}
export async function deliverPending(): Promise<{ sent: number; failed: number }> {
  const db = adminClient();
  const { data, error } = await db.rpc('claim_ansar_assessment_outbox', { batch_size: 10 });
  if (error) throw new DeliveryError('Could not claim pending assessment notifications');
  const results = await Promise.all(((data || []) as Job[]).map(async job => {
    try {
      const practiceLabel=job.payload.subject?.includes('PARENT PRACTICE')||job.payload.metadata?.title.includes('PARENT PRACTICE');
      if(practiceLabel&&job.payload.practiceExplicit!==true)throw new DeliveryError('Automatic practice delivery suppressed');
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
