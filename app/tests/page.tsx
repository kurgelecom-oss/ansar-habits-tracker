"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import ClubNavigation from "../components/dashboard/ClubNavigation";
import type { Answers, Attempt, Paper, Workspace } from "../lib/assessments/types";
import styles from "./tests.module.css";
import { isHistoricalBaseline, preferredPaperId } from "./assessment-status";

class RequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function request<T>(url: string, body?: unknown, method?: string): Promise<T> {
  const response = await fetch(url, { method: method || (body ? "POST" : "GET"), credentials: "same-origin", cache: "no-store", ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new RequestError(data.message || "We couldn’t connect. Please try again.", response.status);
  return data;
}
const mutate = (body: unknown) => request<{ attempt?: Attempt; paper?: Paper; previewVersion?: string; message?: string }>("/api/assessments", body);
const message = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Please try again.";
const monthNow = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit" }).format(new Date()).replace(/^(\d{2})\/(\d{4})$/, "$2-$1");
function shiftMonth(month: string, step: number) { const [year, number] = month.split("-").map(Number); const date = new Date(Date.UTC(year, number - 1 + step)); return date.toISOString().slice(0, 7); }
function dateLabel(date: string) { return new Date(`${date.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short" }); }
function statusLabel(paper: Paper, attempt: Attempt | undefined, today: string) {
  if (attempt?.status === "reviewed") return "Reviewed";
  if (attempt?.status === "submitted") return "Awaiting Nihal";
  if (attempt?.status === "in_progress") return "In progress";
  if (paper.status === "draft") return "Parent approval";
  if (isHistoricalBaseline(paper)) return paper.kind === "review" ? "Baseline review" : "Baseline exam";
  if (paper.due_date < today) return "Overdue";
  if (paper.opens_on > today) return `Opens ${dateLabel(paper.opens_on)}`;
  return "Ready";
}
function PinField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label>Parent PIN<input type="password" inputMode="numeric" autoComplete="off" value={value} onChange={e => onChange(e.target.value)} required /></label>;
}

export default function TestsPage() {
  const [month, setMonth] = useState(monthNow);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState("");
  const [filter, setFilter] = useState("all");
  const [parentOpen, setParentOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadVersion, setLoadVersion] = useState(0);
  const loadId = useRef(0);
  const load = useCallback(async () => {
    const id = ++loadId.current;
    setLoading(true); setError("");
    try {
      const data = await request<Workspace>(`/api/assessments?month=${month}`);
      if (id !== loadId.current) return;
      setWorkspace(data); setLocked(false); setOffset(Date.parse(data.serverNow) - Date.now()); setLoadVersion(v => v + 1);
      setSelected(current => data.attempts.find(a => a.status === "in_progress")?.paper_id || (data.papers.some(p => p.id === current) ? current : preferredPaperId(data)));
    } catch (err) {
      if (id !== loadId.current) return;
      if (err instanceof RequestError && err.status === 401) { setLocked(true); setWorkspace(null); }
      else setError(message(err));
    } finally { if (id === loadId.current) setLoading(false); }
  }, [month]);
  useEffect(() => { void load(); return () => { loadId.current++; }; }, [load]);
  async function unlock(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await request("/api/assessments/session", { pin }); setPin(""); await load(); }
    catch (err) { setError(message(err)); } finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError("");
    try { await request("/api/assessments/session", undefined, "DELETE"); setWorkspace(null); setLocked(true); setParentOpen(false); }
    catch (err) { setError(message(err)); } finally { setBusy(false); }
  }
  function updateAttempt(attempt: Attempt) {
    setWorkspace(current => current ? { ...current, attempts: [...current.attempts.filter(a => a.id !== attempt.id), attempt] } : current);
  }
  const paper = workspace?.papers.find(p => p.id === selected);
  const attempt = workspace?.attempts.find(a => a.paper_id === selected);
  const inProgress = workspace?.attempts.some(a => a.status === "in_progress");
  const papers = workspace?.papers.filter(p => filter === "all" || p.kind === filter) || [];
  const submitted = workspace?.attempts.filter(a => a.status !== "in_progress") || [];
  return <main className={styles.page} aria-label="ANSAR OS Tests">
    <ClubNavigation activeLabel="Tests" />
    <div className={styles.content}>
      <header className={styles.hero}><div><p className={styles.eyebrow}>ANSAR OS · ASSESSMENT ROOM</p><h1>Show what stayed.</h1><p className={styles.lead}>Recall the lesson. Explain your thinking. Build on the gaps.</p></div><span className={styles.heroMark} aria-hidden="true">A<span>LEARNING RECORD</span></span></header>
      {error && <div role="alert" className={styles.error}>{error} {!locked && <button onClick={() => void load()}>Try again</button>}</div>}
      {notice && <p role="status" className={styles.notice}>{notice}</p>}
      {locked ? <section className={styles.unlock}><p className={styles.eyebrow}>A PRIVATE SPACE TO LEARN</p><h2>Parent, unlock this device.</h2><p>Use your existing parent PIN once, then Ansar can work on this device. Publishing papers and reviewing answers still need your PIN.</p><form onSubmit={unlock}><PinField value={pin} onChange={setPin} /><button className={styles.primary} disabled={busy}>{busy ? "Unlocking…" : "Unlock assessment room"}</button></form></section> : <>
        <div className={styles.toolbar}><div className={styles.monthNav}><button aria-label="Previous month" disabled={loading || inProgress} onClick={() => setMonth(m => shiftMonth(m, -1))}>←</button><h2>{new Date(`${month}-15T12:00:00Z`).toLocaleDateString("en-AU", { month: "long", year: "numeric" })}</h2><button aria-label="Next month" disabled={loading || inProgress} onClick={() => setMonth(m => shiftMonth(m, 1))}>→</button></div>{workspace && <div className={styles.actions}><button disabled={inProgress} onClick={() => setParentOpen(v => !v)} aria-expanded={parentOpen}>Parent tools</button><button disabled={busy || inProgress} onClick={() => void logout()}>Lock device</button></div>}</div>
        {loading && <p role="status" className={styles.loading}>Opening your learning record…</p>}
        {workspace && <>
          <section className={styles.stats} aria-label="Monthly overview"><div><strong>{workspace.papers.filter(p => p.kind === "review").length}</strong><span>Friday recalls</span></div><div><strong>{workspace.papers.filter(p => p.kind === "exam").length}</strong><span>Monthly exams</span></div><div><strong>{submitted.length}</strong><span>Submitted</span></div><div><strong>{submitted.filter(a => a.status === "submitted").length}</strong><span>Awaiting Nihal</span></div></section>
          <div className={styles.source}><span className={styles.dot} /><details className={styles.coverageDetails}><summary>Curriculum &amp; coverage<span>{workspace.sourceStatus.split(/\.\s/)[0].slice(0, 140)}</span></summary><p>{workspace.sourceStatus}</p></details><small>Sydney time</small></div>
          {parentOpen && !inProgress && <ParentSync integrations={workspace.integrations} onComplete={async text => { setNotice(text); await load(); }} />}
          {inProgress && <p className={styles.muted}>Finish the open assessment before switching papers or months. Your draft is saved if you leave this page.</p>}
          <div className={styles.room}>
            <aside className={styles.assignments} aria-label="Assessments"><div className={styles.sectionHeading}><h2>Your work</h2><span>{workspace.papers.length} papers</span></div><div className={styles.filters} aria-label="Assessment type">{[["all", "All"], ["review", "Friday recall"], ["exam", "Monthly exam"]].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
              {papers.length === 0 && <p className={styles.empty}>No {filter === "all" ? "assessments" : filter === "exam" ? "monthly exams" : "Friday recalls"} yet. Papers appear here when programme coverage is available.</p>}
              <label className={styles.mobilePicker}>Choose assessment<select value={selected} disabled={inProgress} onChange={e => setSelected(e.target.value)}>{workspace.papers.map(p => <option key={p.id} value={p.id}>{dateLabel(p.due_date)} · {p.subject} · {statusLabel(p, workspace.attempts.find(a => a.paper_id === p.id), workspace.today)}</option>)}</select></label>
              <div className={styles.paperList}>{papers.map(p => { const current = workspace.attempts.find(a => a.paper_id === p.id); const status = statusLabel(p, current, workspace.today); return <button key={p.id} disabled={attempt?.status === "in_progress" && p.id !== selected} onClick={() => setSelected(p.id)} className={`${styles.paperCard} ${selected === p.id ? styles.active : ""}`} aria-pressed={selected === p.id}><span className={styles.paperKind}>{p.kind === "exam" ? "MONTHLY EXAM" : "FRIDAY RECALL"} · {dateLabel(p.due_date)}</span><strong>{p.subject}</strong><span className={styles.paperTitle}>{p.title}</span><span className={`${styles.badge} ${status === "Overdue" ? styles.overdue : ""}`}>{status}</span></button>; })}</div>
            </aside>
            <section className={styles.station} aria-label="Selected assessment">
              {paper ? <><div className={styles.stationHeader}><p className={styles.eyebrow}>{paper.kind === "exam" ? "MONTHLY EXAM" : "FRIDAY RECALL"}</p><h2>{paper.subject}</h2><p>{paper.title}</p><div className={styles.metadata}><span>{isHistoricalBaseline(paper) ? "Coverage through" : "Due"} {dateLabel(paper.due_date)}</span><span>{paper.kind === "exam" && !attempt ? 12 : paper.questions.length} questions</span><span>{paper.kind === "exam" ? `${paper.duration_minutes || 25} minutes` : "Take your time"}</span></div></div>
                {!attempt && <>{isHistoricalBaseline(paper) && <p className={styles.notice}>This is a baseline for earlier learning. It was created after the coverage date, so it is not overdue.</p>}<p className={styles.coverage}>{paper.coverage_note}</p><details className={styles.lessons}><summary>What this covers · {paper.lessons.length} lessons</summary>{paper.lessons.map(lesson => <div key={lesson.id}><strong>{lesson.topic}</strong><p>{dateLabel(lesson.date)}</p></div>)}</details>{paper.status === "draft" ? <><p className={styles.notice}>This paper needs a parent to confirm the taught material before you begin.</p><PublishForm key={paper.id} paper={paper} onComplete={load} /></> : <StartForm key={paper.id} paper={paper} today={workspace.today} onStarted={updateAttempt} />}</>}
                {attempt?.status === "in_progress" && <AttemptForm key={`${attempt.id}:${loadVersion}`} attempt={attempt} offset={offset} onAttempt={updateAttempt} onReload={load} />}
                {attempt && attempt.status !== "in_progress" && <SubmittedWork key={attempt.id} attempt={attempt} onAttempt={updateAttempt} />}
              </> : <div className={styles.empty}><h2>A fresh learning record.</h2><p>Your Friday recalls and monthly exams will appear after the programme is synced. Nihal can refresh the curriculum in Parent tools.</p></div>}
            </section>
          </div>
          <section className={styles.results}><div className={styles.sectionHeading}><h2>The learning record</h2><span>Completion is not mastery.</span></div><p className={styles.muted}>A submission shows the work was done. Feedback and a fresh explanation show what to practise next.</p>{submitted.length === 0 ? <p className={styles.empty}>Submitted work and next steps will collect here.</p> : submitted.map(a => <button key={a.id} disabled={attempt?.status === "in_progress" && a.paper_id !== selected} onClick={() => setSelected(a.paper_id)} className={styles.resultRow}><strong>{a.paper_snapshot.subject}</strong><span>{a.status === "reviewed" ? a.result?.percentage === null || a.result?.percentage === undefined ? "Reviewed" : `${a.result.percentage}% · reviewed` : "Awaiting Nihal"}</span><small>{a.parent_review?.nextStep || "Written responses need a parent review."}</small></button>)}</section>
        </>}
      </>}
      <footer className={styles.footer}>ANSAR FC · Progress comes from the next good explanation.</footer>
    </div>
  </main>;
}

function ParentSync({ integrations, onComplete }: { integrations: Workspace["integrations"]; onComplete: (text: string) => Promise<void> }) {
  const [pin, setPin] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <section className={styles.parentPanel}><h3>Parent tools</h3><p>Refresh the Daily Programme to create source-grounded draft papers. Submitted work keeps its original lesson snapshot.</p><small>Notion {integrations.notion ? "connected" : "not configured"} · Email {integrations.email ? "configured" : "not configured"} · {integrations.pending} delivery jobs pending</small><form className={styles.inlineForm} onSubmit={async e => { e.preventDefault(); setBusy(true); setError(""); try { const result = await mutate({ action: "sync", pin }); setPin(""); await onComplete(result.message || "Curriculum refreshed."); } catch (err) { setError(message(err)); } finally { setBusy(false); } }}><PinField value={pin} onChange={setPin} /><button disabled={busy}>{busy ? "Refreshing…" : "Refresh curriculum"}</button></form>{error && <p role="alert" className={styles.error}>{error}</p>}</section>;
}

function PublishForm({ paper, onComplete }: { paper: Paper; onComplete: () => Promise<void> }) {
  const [pin, setPin] = useState("");
  const [preview, setPreview] = useState<Paper | null>(null);
  const [previewVersion, setPreviewVersion] = useState<string | null>(null);
  const previewRequest = useRef(0);
  const [duration, setDuration] = useState(paper.duration_minutes || 25);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (!preview) {
        const requestId = ++previewRequest.current;
        const result = await mutate({ action: "preview", paperId: paper.id, pin });
        if (requestId !== previewRequest.current) return;
        if (!result.paper || !result.previewVersion) throw new Error("The answer-key preview could not be loaded. Please retry.");
        setPreview(result.paper); setPreviewVersion(result.previewVersion);
      } else {
        await mutate({ action: "publish", paperId: paper.id, pin, durationMinutes: duration, coverageConfirmed: confirmed, previewVersion });
        setPin(""); setPreview(null); setPreviewVersion(null); setConfirmed(false); await onComplete();
      }
    } catch (err) { setError(message(err)); if (err instanceof RequestError && err.status === 409) { setPreview(null); setPreviewVersion(null); setConfirmed(false); } } finally { setBusy(false); }
  }
  return <details className={styles.parentPanel} onToggle={e => { if (!e.currentTarget.open) { previewRequest.current++; setPreview(null); setPreviewVersion(null); setPin(""); setConfirmed(false); } }}>
    <summary>Parent · approve this paper</summary>
    <form onSubmit={submit}>
      <p>{preview ? "Check every question, answer and marking guide against the taught material before approving." : "Enter your parent PIN to inspect the answer key and marking guides before publishing."}</p>
      <PinField value={pin} onChange={value => { previewRequest.current++; setPin(value); setPreview(null); setPreviewVersion(null); setConfirmed(false); }} />
      {preview && <>
        <div className={styles.preview}><h3>Parent answer-key preview</h3><p className={styles.muted}>{preview.coverage_note}</p>
          {preview.questions.map((q, i) => <section key={q.id} className={styles.answerReview}>
            <p className={styles.eyebrow}>QUESTION {i + 1}</p><h3>{q.prompt}</h3>
            {q.options && <ol className={styles.previewOptions}>{q.options.map((option, index) => <li key={index}>{option}{q.answer === index ? " — correct answer" : ""}</li>)}</ol>}
            {q.explanation && <p className={styles.muted}><strong>Explanation:</strong> {q.explanation}</p>}
            {q.rubric && <p className={styles.muted}><strong>Marking guide:</strong> {q.rubric}</p>}
          </section>)}
        </div>
        {paper.kind === "exam" && <label>Time allowed (minutes)<input type="number" min={10} max={90} value={duration} onChange={e => setDuration(Number(e.target.value))} required /><small>Extra time must be agreed before the exam starts.</small></label>}
        <label className={styles.check}><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} required />I checked the questions and marking guides, and confirm this material has been taught.</label>
      </>}
      <button disabled={busy || (preview !== null && !confirmed)} className={styles.primary}>{busy ? preview ? "Publishing…" : "Loading preview…" : preview ? "Approve and publish" : "View parent answer-key preview"}</button>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </form>
  </details>;
}

function StartForm({ paper, today, onStarted }: { paper: Paper; today: string; onStarted: (attempt: Attempt) => void }) {
  const [confirmed, setConfirmed] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  if (paper.opens_on > today) return <p className={styles.notice}>This assessment opens {dateLabel(paper.opens_on)}.</p>;
  return <form className={styles.startForm} onSubmit={async e => { e.preventDefault(); setBusy(true); setError(""); try { const data = await mutate({ action: "start", paperId: paper.id }); if (!data.attempt) throw new Error("No attempt returned. Please refresh before trying again."); onStarted(data.attempt); } catch (err) { setError(message(err)); } finally { setBusy(false); } }}><h3>{paper.kind === "exam" ? "Ready for your monthly check?" : "Explain it in your own words."}</h3><p>{paper.kind === "exam" ? "Your answers save as you work. The server timer continues if you leave, and saved answers submit when time runs out." : "Four prompts help you recall, explain, apply and name what is still unclear. Give each prompt a meaningful answer of at least 10 characters. Your draft is saved if you leave and return."}</p>{paper.kind === "exam" && <label className={styles.check}><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} required />I’m ready. Starting begins the {paper.duration_minutes || 25}-minute timer.</label>}<button className={styles.primary} disabled={busy || (paper.kind === "exam" && !confirmed)}>{busy ? "Starting…" : paper.kind === "exam" ? "Start timed exam" : "Begin Friday recall"}</button>{error && <p role="alert" className={styles.error}>{error}</p>}</form>;
}

function draftKey(id: string) { return `ansar-assessment-draft:${id}`; }
function removeDraft(id: string) { try { localStorage.removeItem(draftKey(id)); } catch { /* Storage can be unavailable on private devices. */ } }
function AttemptForm({ attempt, offset, onAttempt, onReload }: { attempt: Attempt; offset: number; onAttempt: (attempt: Attempt) => void; onReload: () => Promise<void> }) {
  const [answers, setAnswers] = useState<Answers>(attempt.answers);
  const answerRef = useRef(attempt.answers); const revision = useRef(attempt.revision);
  const queue = useRef<Promise<void>>(Promise.resolve()); const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false); const stopped = useRef(false); const submitting = useRef(false); const mounted = useRef(true);
  const [saveState, setSaveState] = useState("All answers saved"); const [error, setError] = useState(""); const [conflict, setConflict] = useState(false); const [busy, setBusy] = useState(false); const [confirm, setConfirm] = useState(false); const [now, setNow] = useState(Date.now() + offset);
  const expired = attempt.expires_at ? now >= Date.parse(attempt.expires_at) : false;
  const remaining = attempt.expires_at ? Math.max(0, Math.ceil((Date.parse(attempt.expires_at) - now) / 1000)) : null;
  const completed = attempt.paper_snapshot.questions.filter(q => answers[q.id] !== undefined && String(answers[q.id]).trim() !== "").length;
  function persist(value: Answers) { try { localStorage.setItem(draftKey(attempt.id), JSON.stringify({ answers: value, revision: revision.current })); } catch { /* Server autosave remains available. */ } }
  function handleError(err: unknown) {
    setError(message(err)); setSaveState("Not saved — retry needed");
    if (err instanceof RequestError && err.status === 409) { stopped.current = true; setConflict(true); setError("This attempt changed on another device. Reload the saved version before continuing."); }
  }
  function save(value: Answers): Promise<void> {
    const run = queue.current.then(async () => {
      if (stopped.current || submitting.current) return;
      setSaveState("Saving…");
      const response = await mutate({ action: "save", attemptId: attempt.id, answers: value, revision: revision.current });
      if (!response.attempt) throw new Error("Save was not confirmed. Please retry.");
      revision.current = response.attempt.revision;
      if (response.attempt.status !== "in_progress") { stopped.current = true; removeDraft(attempt.id); onAttempt(response.attempt); return; }
      const latest = JSON.stringify(value) === JSON.stringify(answerRef.current);
      dirty.current = !latest; persist(answerRef.current);
      if (mounted.current) { setSaveState(latest ? "All answers saved" : "Unsaved changes"); setError(""); }
    });
    queue.current = run.catch(err => { if (mounted.current) handleError(err); });
    return queue.current;
  }
  const saveRef = useRef(save); saveRef.current = save;
  useEffect(() => {
    mounted.current = true;
    try {
      const raw = localStorage.getItem(draftKey(attempt.id));
      if (raw) { const local = JSON.parse(raw); if (local.revision === attempt.revision && local.answers && typeof local.answers === "object" && !Array.isArray(local.answers)) { const allowed = new Set(attempt.paper_snapshot.questions.map(q => q.id)); const recovered = Object.fromEntries(Object.entries(local.answers).filter(([key, value]) => allowed.has(key) && (typeof value === "number" || typeof value === "string"))) as Answers; answerRef.current = recovered; setAnswers(recovered); dirty.current = true; setSaveState("Recovered this device’s draft — saving…"); debounce.current = setTimeout(() => void saveRef.current(recovered), 700); } else removeDraft(attempt.id); }
    } catch { removeDraft(attempt.id); }
    const warn = (e: BeforeUnloadEvent) => { if (dirty.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => { mounted.current = false; window.removeEventListener("beforeunload", warn); if (debounce.current) clearTimeout(debounce.current); if (dirty.current && !stopped.current && !submitting.current) void saveRef.current(answerRef.current); };
  // The editor mounts once for each immutable attempt ID.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt.id]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now() + offset), 1000); return () => clearInterval(timer); }, [offset]);
  function change(id: string, value: string | number) {
    const next = { ...answerRef.current, [id]: value }; answerRef.current = next; setAnswers(next); dirty.current = true; persist(next); setSaveState("Unsaved changes");
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void saveRef.current(next), 700);
  }
  async function submit() {
    if (submitting.current || stopped.current) return;
    submitting.current = true; setBusy(true); setError("");
    if (debounce.current) clearTimeout(debounce.current);
    await queue.current;
    if (stopped.current) { submitting.current = false; setBusy(false); return; }
    try {
      const response = await mutate({ action: "submit", attemptId: attempt.id, answers: answerRef.current, revision: revision.current });
      if (!response.attempt) throw new Error("Submission was not confirmed. Your draft is still on this device.");
      stopped.current = true; dirty.current = false; removeDraft(attempt.id); onAttempt(response.attempt);
    } catch (err) { handleError(err); } finally { submitting.current = false; if (mounted.current) setBusy(false); }
  }
  const submitRef = useRef(submit); submitRef.current = submit;
  const autoSubmitted = useRef(false);
  useEffect(() => { if (expired && !autoSubmitted.current) { autoSubmitted.current = true; void submitRef.current(); } }, [expired]);
  return <div className={styles.editor}><div className={styles.editorBar}><span>{completed} / {attempt.paper_snapshot.questions.length} answered</span>{remaining !== null && <strong className={remaining < 120 ? styles.timerUrgent : styles.timer} aria-label="Time remaining">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</strong>}<span role="status">{saveState}</span></div>
    {error && <div role="alert" className={styles.error}>{error}{conflict ? <button onClick={() => { removeDraft(attempt.id); void onReload(); }}>Reload saved attempt</button> : <button disabled={busy} onClick={() => expired ? void submit() : void save(answerRef.current)}>{expired ? "Retry submission" : "Retry save"}</button>}</div>}
    {expired && <p className={styles.notice}>Time is up. Your saved answers are being submitted. If the connection failed, retry submission.</p>}
    <form onSubmit={e => { e.preventDefault(); void submit(); }}>
      <fieldset disabled={expired || busy || conflict} className={styles.questions}>{attempt.paper_snapshot.questions.map((q, index) => <fieldset key={q.id} className={styles.question}><legend><span className={styles.questionNumber}>{String(index + 1).padStart(2, "0")}</span>{q.prompt}</legend>{q.type === "choice" ? <div className={styles.options}>{q.options?.map((option, i) => <label key={i} className={answers[q.id] === i ? styles.chosen : ""}><input type="radio" name={q.id} checked={answers[q.id] === i} onChange={() => change(q.id, i)} /><span>{option}</span></label>)}</div> : <textarea aria-label={`Answer ${index + 1}`} value={String(answers[q.id] ?? "")} onChange={e => change(q.id, e.target.value)} placeholder="Explain your thinking in your own words…" rows={5} maxLength={8000} minLength={attempt.paper_snapshot.kind === "review" ? 10 : undefined} required={attempt.paper_snapshot.kind === "review"} />}</fieldset>)}</fieldset>
      {!expired && <div className={styles.submitPanel}><p>Submitting keeps your original answers as a learning record. You can add a correction after feedback.</p><label className={styles.check}><input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} required disabled={busy || conflict} />I’ve checked my work and I’m ready to submit.{completed < attempt.paper_snapshot.questions.length ? ` ${attempt.paper_snapshot.questions.length - completed} answers are still blank.` : ""}</label><button className={styles.primary} disabled={busy || !confirm || conflict}>{busy ? "Submitting…" : "Submit for review"}</button></div>}
    </form>
  </div>;
}

function SubmittedWork({ attempt, onAttempt }: { attempt: Attempt; onAttempt: (attempt: Attempt) => void }) {
  const [correction, setCorrection] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <div className={styles.submitted}><div className={styles.feedbackHeader}><span className={styles.badge}>{attempt.status === "reviewed" ? "Reviewed by Nihal" : "Submitted · awaiting Nihal"}</span><h3>{attempt.result?.summary || "Your work is safely submitted."}</h3>{attempt.result && <p>{attempt.result.objectiveTotal > 0 && `${attempt.result.objectiveCorrect}/${attempt.result.objectiveTotal} multiple choice correct · `}{attempt.result.writtenPending ? `${attempt.result.writtenPending} written responses awaiting review` : `${attempt.result.writtenPoints}/${attempt.result.writtenTotal} written points`}</p>}<small>Your original answers stay unchanged. Completion does not mean mastery.</small></div>
    {attempt.parent_review && <section className={styles.parentFeedback}><h3>Nihal’s feedback</h3><p>{attempt.parent_review.feedback}</p><h4>Next step</h4><p>{attempt.parent_review.nextStep}</p>{attempt.parent_review.practicalConfirmed && <small>Practical demonstration recorded.</small>}</section>}
    {attempt.paper_snapshot.questions.map((q, i) => <section key={q.id} className={styles.answerReview}><p className={styles.eyebrow}>QUESTION {i + 1} {q.type === "written" && attempt.parent_review ? `· ${attempt.parent_review.marks[q.id] ?? 0}/2` : ""}</p><h3>{q.prompt}</h3><p className={styles.originalAnswer}>{q.type === "choice" ? q.options?.[Number(attempt.answers[q.id])] || "No answer" : String(attempt.answers[q.id] || "No answer")}</p>{q.type === "choice" && q.answer !== undefined && <p className={styles.correctAnswer}>Correct answer: {q.options?.[q.answer]}</p>}{q.explanation && <p className={styles.muted}>{q.explanation}</p>}{q.rubric && <p className={styles.muted}><strong>What a strong answer includes:</strong> {q.rubric}</p>}</section>)}
    {attempt.status === "submitted" && <ReviewForm attempt={attempt} onAttempt={onAttempt} />}
    <section className={styles.parentPanel}><h3>My correction</h3><p>Explain what you understand now. This sits alongside your original submission.</p>{attempt.status !== "reviewed" ? <p className={styles.muted}>Your correction opens after Nihal’s feedback.</p> : attempt.correction ? <p className={styles.originalAnswer}>{attempt.correction}</p> : <form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(""); try { const data = await mutate({ action: "correction", attemptId: attempt.id, text: correction }); if (data.attempt) onAttempt(data.attempt); else throw new Error("Correction was not confirmed. Please retry."); } catch (err) { setError(message(err)); } finally { setBusy(false); } }}><label>What I understand now<textarea rows={4} required value={correction} onChange={e => setCorrection(e.target.value)} minLength={20} maxLength={8000} /></label><button disabled={busy || correction.trim().length < 20}>{busy ? "Saving…" : "Save correction"}</button>{error && <p role="alert" className={styles.error}>{error}</p>}</form>}</section>
  </div>;
}

function ReviewForm({ attempt, onAttempt }: { attempt: Attempt; onAttempt: (attempt: Attempt) => void }) {
  const [pin, setPin] = useState(""); const [marks, setMarks] = useState<Record<string, number>>({}); const [feedback, setFeedback] = useState(""); const [nextStep, setNextStep] = useState(""); const [practical, setPractical] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <details className={styles.parentPanel}><summary>Nihal · review this work</summary><form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(""); try { const data = await mutate({ action: "review", attemptId: attempt.id, pin, marks, feedback, nextStep, practicalConfirmed: practical }); if (!data.attempt) throw new Error("Review was not confirmed. Please retry."); setPin(""); onAttempt(data.attempt); } catch (err) { setError(message(err)); } finally { setBusy(false); } }}><p>Use each rubric to assess accuracy, explanation and application. 0 = not yet shown, 1 = partly shown, 2 = clearly shown.</p>{attempt.paper_snapshot.questions.filter(q => q.type === "written").map(q => <label key={q.id}>{q.prompt}<small>{q.rubric || "Check accuracy, explanation and application against the taught lesson."}</small><select aria-label={`Mark: ${q.prompt}`} required value={marks[q.id] ?? ""} onChange={e => setMarks(current => ({ ...current, [q.id]: Number(e.target.value) }))}><option value="" disabled>Choose a mark</option><option value={0}>0 — Not yet shown</option><option value={1}>1 — Partly shown</option><option value={2}>2 — Clearly shown</option></select></label>)}<label>Feedback<textarea rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} required minLength={5} maxLength={4000} /></label><label>Next learning step<textarea rows={2} value={nextStep} onChange={e => setNextStep(e.target.value)} required minLength={5} maxLength={4000} /></label><label className={styles.check}><input type="checkbox" checked={practical} onChange={e => setPractical(e.target.checked)} />I observed the practical demonstration (required for practical subjects).</label><PinField value={pin} onChange={setPin} /><button className={styles.primary} disabled={busy}>{busy ? "Recording review…" : "Record review"}</button>{error && <p role="alert" className={styles.error}>{error}</p>}</form></details>;
}
