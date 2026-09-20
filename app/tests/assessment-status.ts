import type { Paper } from "../lib/assessments/types";

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
