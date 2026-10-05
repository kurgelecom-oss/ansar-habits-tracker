import { formatTime, type DayPlan } from "../pathway/data/week";

/**
 * What the two Today pillars show, as plain data.
 *
 * Both academies are reduced to the SAME shape so one card can draw either of
 * them: that is what makes them peers on the dashboard rather than one being
 * the other's sidebar. Summaries only — ticking a school block happens on
 * /school and ticking a session on /pathway, where the full rows live.
 */
export type PillarRow = { id: string; title: string; detail: string; meta: string | null };
export type PillarSummary = {
  subtitle: string;
  done: number;
  total: number;
  /** Up to ROWS_SHOWN things still to do, in order. */
  rows: PillarRow[];
  /** A line shown instead of, or under, the rows. Null when the rows say it all. */
  note: string | null;
};

const ROWS_SHOWN = 2;

type SchoolBlock = { rowId: string; label: string; duration: string | null; task: string; done: boolean };
type SchoolDay = { date: string; weekday: string; dayTopic: string; isToday: boolean; blocks: SchoolBlock[] };
/** The slice of /api/school-week this summary reads. */
export type SchoolWeek = { today: string; weekTitle: string; days: SchoolDay[] };

export function schoolPillar(week: SchoolWeek): PillarSummary {
  const today = week.days.find(d => d.isToday);
  if (!today) {
    const next = week.days.find(d => d.date > week.today && d.blocks.length > 0);
    return {
      subtitle: week.weekTitle || "School", done: 0, total: 0, rows: [],
      note: next
        ? `No school today. Next: ${next.weekday}${next.dayTopic ? ` — ${next.dayTopic}` : ""} · ${next.blocks.length} blocks`
        : "No school today.",
    };
  }
  const left = today.blocks.filter(b => !b.done);
  return {
    subtitle: today.dayTopic || week.weekTitle || "School",
    done: today.blocks.length - left.length,
    total: today.blocks.length,
    rows: left.slice(0, ROWS_SHOWN).map(b => ({ id: b.rowId, title: b.label, detail: b.task, meta: b.duration })),
    note: today.blocks.length === 0 ? "No blocks are loaded for today."
      : left.length === 0 ? "Every block done today." : null,
  };
}

export function footballPillar(plan: DayPlan, doneIds: string[]): PillarSummary {
  const sessions = plan.sessions.filter(s => s.kind !== "rest");
  const left = sessions.filter(s => !doneIds.includes(s.id));
  return {
    subtitle: plan.theme,
    done: sessions.length - left.length,
    total: sessions.length,
    rows: left.slice(0, ROWS_SHOWN).map(s => ({
      id: s.id, title: `${s.icon} ${s.title}`, detail: s.what[0] ?? "",
      meta: `${formatTime(s.start)}${s.minutes ? ` · ${s.minutes} min` : ""}`,
    })),
    note: sessions.length === 0 ? "Rest day."
      : left.length === 0 ? "Every session done today." : null,
  };
}
