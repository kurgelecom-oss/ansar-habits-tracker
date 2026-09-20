import type { Paper, Workspace } from "../lib/assessments/types";

/** A newly backfilled paper cannot have been missed before it existed. */
export function isHistoricalBaseline(paper: Pick<Paper, "created_at" | "due_date">): boolean {
  if (!paper.created_at) return false;
  const created = new Date(paper.created_at);
  if (!Number.isFinite(created.getTime())) return false;
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(created);
  const part = (type: string) => parts.find(value => value.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}` > paper.due_date.slice(0, 10);
}

/** Resume first; otherwise put the most recent actionable recall in view. */
export function preferredPaperId(workspace: Workspace): string {
  const active = workspace.attempts.find(attempt => attempt.status === "in_progress");
  if (active) return active.paper_id;
  const attempted = new Set(workspace.attempts.map(attempt => attempt.paper_id));
  const available = workspace.papers.filter(paper => paper.status === "published" && paper.opens_on <= workspace.today && !attempted.has(paper.id));
  const newestFirst = (a: Paper, b: Paper) => b.due_date.localeCompare(a.due_date) || a.subject.localeCompare(b.subject);
  const due = available.filter(paper => paper.due_date <= workspace.today).sort(newestFirst);
  return due.find(paper => paper.kind === "review")?.id || due[0]?.id || available.sort(newestFirst)[0]?.id || workspace.papers[0]?.id || "";
}
