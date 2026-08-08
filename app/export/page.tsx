/* ════════════════════════════════════════════════════════════════════════════
   /export — the month, as a document.

     /export                          the PREVIOUS Sydney calendar month
     /export?month=2026-07            a named month
     /export?month=2026-07&print=0    open without firing the print dialog

   A PRINT ROUTE, NOT A GENERATED FILE. The first version of this export was a
   CLI script that drove headless Chrome on a Mac. That cannot move to the
   dashboard: Netlify's Lambda has no browser, and bundling one costs tens of
   megabytes for a document a human asks for a few times a year. So the server
   renders branded HTML with real @media print rules and the BROWSER makes the
   PDF. The artefact is better for it — vector text that stays selectable and
   searchable, at whatever paper size the person printing actually has.

   THE NUMBERS ARE NOT DECIDED HERE. Every point comes from lib/monthReport.ts,
   which is the assembly the CLI script used, which in turn takes every score
   from scoring.ts and every schedule from days.ts. This file is presentation
   and nothing else.

   READ-ONLY. The anon key is the only credential used, and
   db/tick_hardening.sql revokes insert/update/delete from anon — this route
   could not write a completion if it tried.
   ══════════════════════════════════════════════════════════════════════════ */

import { createClient } from "@supabase/supabase-js";
import { getHabits } from "../lib/notion";
import { addDays } from "../lib/time";
import {
  buildMonthReport, previousSydneyMonth, isMonthKey, monthTitle,
  firstDayOf, lastDayOf, clickTime, dayLabel,
  type Completion, type WeekRow, type DayRow,
} from "../lib/monthReport";
import PrintControls from "./PrintControls";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* The palette is the board's, unchanged: RM navy and Champions-League gold from
   app/page.tsx, on the white the board could never use. Nothing here is a new
   globals.css token — these are local values for one route, and the cyan the
   board uses for the Golden Boot is deliberately absent because #00d4ff on
   white paper is close to illegible. */
const NAVY = "#0d2350";
const GOLD = "#D4AF37";

const BLOCK_ORDER = ["pre_homeschool", "homeschool", "afternoon_evening", "conditional"];
const BLOCK_LABEL: Record<string, string> = {
  pre_homeschool: "Morning",
  homeschool: "Homeschool",
  afternoon_evening: "Afternoon / Evening",
  conditional: "Training",
};

const tierClass = (tier: string): string => "t-" + tier.replace(/\s+/g, "-").toLowerCase();

export default async function ExportPage(
  { searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> },
) {
  const sp = await searchParams;
  const asked = typeof sp.month === "string" ? sp.month : "";
  const month = isMonthKey(asked) ? asked : previousSydneyMonth();
  const autoPrint = sp.print !== "0";

  const monthStart = firstDayOf(month);
  const monthEnd = lastDayOf(month);

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const [roster, completions, weekRows, earliest] = await Promise.all([
    getHabits().catch(() => []),
    db.from("habit_completions")
      .select("habit_id,completed_date,completed_at")
      .gte("completed_date", monthStart).lte("completed_date", monthEnd)
      .order("completed_date", { ascending: true }).limit(5000)
      .then(r => (r.data ?? []) as Completion[]),
    // week_results is created by hand (db/week_results.sql). A deploy that
    // predates that migration must still render the days it does have, so a
    // missing table costs the summary and nothing else.
    db.from("week_results")
      .select("*")
      .gte("week_start", addDays(monthStart, -6)).lte("week_start", monthEnd)
      .order("week_start", { ascending: true })
      .then(r => (r.data ?? []) as WeekRow[]),
    db.from("habit_completions")
      .select("completed_date")
      .order("completed_date", { ascending: true }).limit(1)
      .then(r => r.data?.[0]?.completed_date ?? null),
  ]);

  if (roster.length === 0) {
    // Fail closed and SAY SO. An empty roster scores every day zero, and a
    // document reporting a month of total failure that never happened is worse
    // than no document at all.
    return (
      <>
        <style>{CSS}</style>
        <main className="rp rp-empty">
          <h1>{monthTitle(month)}</h1>
          <p>
            The habit roster could not be read from Notion, so this month cannot be
            scored. Nothing is wrong with the record &mdash; try again shortly.
          </p>
        </main>
      </>
    );
  }

  const report = buildMonthReport({
    month,
    roster: roster.map(h => ({ id: h.id, name: h.name, block: h.block, days: h.days })),
    completions,
    weekRows,
    earliest,
  });

  const finalised = report.weeks.filter(w => w.row);
  const bestTier = finalised.find(w => w.row?.tier === "First Team")
    ? "First Team"
    : finalised[0]?.row?.tier ?? null;

  /* One line, plain English, at the top of the document — the thing a parent
     reads before anything else. */
  const summaryLine = finalised.length === 0
    ? `${report.recordedDays} days recorded, ${report.completions} habits ticked.`
    : `${finalised.length} finalised ${finalised.length === 1 ? "week" : "weeks"}` +
      `, ${report.recordedDays} days recorded, ${report.perfectDays} perfect ` +
      `${report.perfectDays === 1 ? "day" : "days"}` +
      (bestTier ? `, holding ${bestTier}.` : ".");

  return (
    <>
      <style>{CSS}</style>

      <main className="rp">
        <PrintControls autoPrint={autoPrint} />

        {/* ── COVER BAND ────────────────────────────────────────────────── */}
        <header className="rp-cover">
          <img className="rp-crest" src="/real-madrid.png" alt="" />
          <div className="rp-ttl">
            <div className="rp-eyebrow">ANSAR FC &middot; Monthly Record</div>
            <h1>ANSAR &mdash; {report.title}</h1>
            <p className="rp-sum">{summaryLine}</p>
          </div>
        </header>

        <div className="rp-rule" />

        {/* ── SQUAD SUMMARY ─────────────────────────────────────────────── */}
        <section className="rp-block">
          <h2 className="rp-h2">Squad summary</h2>

          <div className="rp-cards">
            {report.weeks.map(w => (
              <div key={w.weekStart} className={"rp-card" + (w.row ? "" : " rp-card-void")}>
                <div className="rp-card-wk">Week of {w.label}</div>
                {w.row ? (
                  <>
                    <div className="rp-card-tot">
                      {w.row.total_points}<span className="rp-of">/55</span>
                    </div>
                    <div className={"rp-chip " + tierClass(w.row.tier)}>{w.row.tier}</div>
                    {w.row.partial && <div className="rp-card-note">partial &mdash; began before the record</div>}
                    {w.row.perfect_week && <div className="rp-card-note">perfect week</div>}
                  </>
                ) : (
                  <>
                    <div className="rp-card-tot rp-muted">&mdash;</div>
                    <div className="rp-chip t-none">not finalised</div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="rp-stats">
            <div><b>{report.recordedDays}</b><span>days recorded</span></div>
            <div><b>{report.monthPoints}</b><span>of {report.monthMax} daily points</span></div>
            <div><b>{report.perfectDays}</b><span>perfect days</span></div>
            <div><b>{report.completions}</b><span>habits ticked</span></div>
          </div>
        </section>

        {/* ── THE DAYS ──────────────────────────────────────────────────── */}
        {report.weeks.map((w, i) => {
          const hasRecord = w.days.some(d => !d.beforeTracking && !d.silent);
          return (
            <section
              key={w.weekStart}
              className="rp-week"
              /* A week starts a fresh page — but only a week with something on
                 it. Two blank weeks at the head of July would otherwise take a
                 page each to say that nothing happened. */
              data-break={i > 0 && hasRecord ? "1" : "0"}
            >
              <h2 className="rp-wk-h">
                <span className="rp-wk-lab">Week of {w.label}</span>
                {w.row && (
                  <>
                    <span className="rp-wk-tot">{w.row.total_points}<span className="rp-of">/55</span></span>
                    <span className={"rp-chip " + tierClass(w.row.tier)}>{w.row.tier}</span>
                  </>
                )}
              </h2>

              {w.days.map(d => <Day key={d.date} d={d} earliest={report.earliest} />)}
            </section>
          );
        })}

        {/* ── HOW TO READ ───────────────────────────────────────────────── */}
        <section className="rp-legend">
          <h2 className="rp-h2">How to read this</h2>
          <p>
            <b className="ok">&#10003;</b> done, with the time it was ticked in Sydney.
            <b className="no">&#10007;</b> applied that day and was not ticked. Only habits
            scheduled for that weekday are listed, so a weekend shows the weekend roster and
            nothing it was never asked to do.
          </p>
          <p>
            Squad totals are the finalised Monday&ndash;Friday record out of 55. Daily points come
            from the same scoring the board and the ledger use, and each day&rsquo;s ceiling is what
            that day would score fully ticked.
          </p>
          <p>
            Days with no record are marked &ldquo;no data&rdquo; rather than shown as missed, and are
            left out of the totals above.
            {report.earliest && ` The record begins ${report.earliest}; anything before that predates the tracker.`}
          </p>
          <p>
            A day can score above its ceiling. Scoring reads what was ticked, not what was
            scheduled, so a habit logged on a day it does not belong to still pays. Those ticks are
            listed under the day that carries them, and the points are left exactly as the board
            counts them.
          </p>
        </section>

        <footer className="rp-foot">
          <span>ANSAR &mdash; {report.title}</span>
          <span>Generated {report.generatedAt} &middot; Australia/Sydney</span>
        </footer>
      </main>
    </>
  );
}

/* ── one day ──────────────────────────────────────────────────────────────── */

function Day({ d, earliest }: { d: DayRow; earliest: string | null }) {
  // An honest gap is a gap. No ✗ is printed for a day whose history is absent,
  // because a wall of crosses reads as a day of refusal rather than a day the
  // tracker was not yet running.
  if (d.beforeTracking || d.silent) {
    return (
      <div className="rp-day rp-day-void">
        <span className="rp-day-n">{dayLabel(d.date)}</span>
        <span className="rp-void-note">
          {d.beforeTracking
            ? `no data — before tracking began${earliest ? ` (first record ${earliest})` : ""}`
            : "no data — nothing recorded this day"}
        </span>
      </div>
    );
  }

  const groups = BLOCK_ORDER
    .map(b => ({ block: b, items: d.applicable.filter(h => h.block === b) }))
    .filter(g => g.items.length > 0);

  return (
    <div className={"rp-day" + (d.weekend ? " rp-day-wknd" : "")}>
      <div className="rp-day-h">
        <span className="rp-day-n">{dayLabel(d.date)}</span>
        {d.weekend && <span className="rp-tag">weekend</span>}
        {d.perfect && <span className="rp-tag rp-tag-gold">perfect day</span>}
        {d.points > d.max && <span className="rp-tag rp-tag-warn">above the day&rsquo;s ceiling</span>}
        <span className="rp-day-pts">{d.points}<span className="rp-of">/{d.max}</span></span>
      </div>

      <div className="rp-grid">
        {groups.map(g => (
          <div className="rp-col" key={g.block}>
            <div className="rp-col-h">{BLOCK_LABEL[g.block] ?? g.block}</div>
            <ul>
              {g.items.map(h => (
                <li key={h.id} className={h.at ? "ok" : "no"}>
                  <span className="mk">{h.at ? "✓" : "✗"}</span>
                  <span className="nm">{h.name}</span>
                  <span className="tm">{h.at ? clickTime(h.at) : "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {d.offSchedule.length > 0 && (
        <div className="rp-aside">
          also ticked, not scheduled this day (still scored):{" "}
          {d.offSchedule.map(r => `${r.name} ${clickTime(r.at)}`).join(" · ")}
        </div>
      )}
      {d.retired.length > 0 && (
        <div className="rp-aside">
          also ticked, no longer on the roster:{" "}
          {d.retired.map(r => `${r.name} ${clickTime(r.at)}`).join(" · ")}
        </div>
      )}
    </div>
  );
}

/* ── styles ───────────────────────────────────────────────────────────────
   Kept in this file rather than globals.css on purpose: globals.css is the
   shared six-surface stylesheet and this document is one route's furniture.
   Nothing below is a token any other surface can reach. */

const CSS = `
@page { size: A4 portrait; margin: 14mm 13mm 17mm; }

/* The shared chrome is for the screen. Paper gets the document alone. */
@media print {
  .topnav { display: none !important; }
  .screen-only { display: none !important; }
  body { background: #ffffff !important; }
  .rp { box-shadow: none !important; margin: 0 !important; max-width: none !important; padding: 0 !important; }
}

.rp {
  background: #ffffff;
  color: #16202f;
  font: 10.5px/1.5 -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
/* On screen it reads as a sheet of paper on the board's dark ground. */
@media screen {
  .rp {
    max-width: 210mm; margin: 22px auto 60px; padding: 26px 30px 40px;
    border-radius: 4px; box-shadow: 0 18px 60px rgba(0,0,0,0.45);
  }
}
.rp h1, .rp h2 { margin: 0; font-weight: 800; }
.rp p { margin: 0; }
.rp ul { list-style: none; margin: 0; padding: 0; }

/* ── print controls (screen only) ─────────────────────────────────────── */
.rp-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
.rp-btn {
  font: 700 12px/1 inherit; letter-spacing: 0.04em; text-transform: uppercase;
  color: #ffffff; background: ${NAVY}; border: 1px solid ${NAVY};
  padding: 10px 16px; border-radius: 5px; cursor: pointer;
}
.rp-btn:hover { background: #143069; }
.rp-btn:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 2px; }
.rp-hint { font-size: 11px; color: #6b7688; }

/* ── cover ────────────────────────────────────────────────────────────── */
.rp-cover {
  display: flex; align-items: center; gap: 20px;
  background: linear-gradient(105deg, ${NAVY} 0%, #143069 62%, #0a1b3f 100%);
  color: #ffffff; padding: 22px 26px; border-radius: 3px;
}
.rp-crest { width: 62px; height: 62px; object-fit: contain; flex: none; }
.rp-ttl { min-width: 0; }
.rp-eyebrow {
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase;
  color: ${GOLD}; margin-bottom: 5px;
}
.rp-cover h1 { font-size: 26px; letter-spacing: -0.015em; line-height: 1.12; }
.rp-sum { margin-top: 6px !important; font-size: 11px; color: #ccd6e8; }
.rp-rule { height: 3px; background: ${GOLD}; margin: 0 0 20px; border-radius: 2px; }

/* ── headings ─────────────────────────────────────────────────────────── */
.rp-h2 {
  font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.16em;
  color: #8a6d1f; margin-bottom: 9px;
}
.rp-block { margin-bottom: 20px; }

/* ── week result cards ────────────────────────────────────────────────── */
.rp-cards { display: flex; gap: 8px; flex-wrap: wrap; }
.rp-card {
  flex: 1 1 0; min-width: 96px; border: 1px solid #dbe1ea; border-top: 3px solid ${NAVY};
  border-radius: 3px; padding: 9px 10px 10px; background: #fbfcfe;
}
.rp-card-void { border-top-color: #c8d0dc; background: #f6f7f9; }
.rp-card-wk { font-size: 8.5px; font-weight: 700; letter-spacing: 0.07em;
              text-transform: uppercase; color: #748094; }
.rp-card-tot { font-size: 22px; font-weight: 800; color: ${NAVY};
               font-variant-numeric: tabular-nums; line-height: 1.15; margin: 2px 0 5px; }
.rp-muted { color: #aab3c0 !important; }
.rp-of { font-size: 10px; font-weight: 600; color: #8592a5; margin-left: 1px; }
.rp-card-note { font-size: 8px; color: #9a6a12; font-weight: 600; margin-top: 4px; }

.rp-chip {
  display: inline-block; font-size: 8px; font-weight: 800; letter-spacing: 0.09em;
  text-transform: uppercase; padding: 2.5px 7px; border-radius: 20px;
  background: #e6eaf1; color: #3a475e;
}
.rp-chip.t-first-team { background: #f6e7b5; color: #6b520c; }
.rp-chip.t-bench { background: #dceaf6; color: #1e4b6b; }
.rp-chip.t-reserves { background: #fbe7cd; color: #8a5312; }
.rp-chip.t-training-ground { background: #f7dcda; color: #8d2b23; }
.rp-chip.t-none { background: #eceff3; color: #8792a3; }

/* ── stat strip ───────────────────────────────────────────────────────── */
.rp-stats { display: flex; gap: 26px; margin-top: 14px; padding-top: 11px;
            border-top: 1px solid #e6eaf1; flex-wrap: wrap; }
.rp-stats div { display: flex; align-items: baseline; gap: 5px; }
.rp-stats b { font-size: 16px; color: ${NAVY}; font-variant-numeric: tabular-nums; }
.rp-stats span { font-size: 9.5px; color: #667287; }

/* ── weeks ────────────────────────────────────────────────────────────── */
.rp-week { margin-bottom: 14px; }
.rp-week[data-break="1"] { break-before: page; page-break-before: always; }
.rp-wk-h {
  display: flex; align-items: center; gap: 9px; font-size: 11.5px; color: #ffffff;
  background: ${NAVY}; padding: 6px 11px; border-radius: 3px; margin-bottom: 7px;
  break-after: avoid; page-break-after: avoid;
}
.rp-wk-lab { flex: 1; }
.rp-wk-tot { font-size: 14px; font-weight: 800; font-variant-numeric: tabular-nums; }
.rp-wk-h .rp-of { color: #9fb2cd; }

/* ── a day ────────────────────────────────────────────────────────────── */
/* Nothing splits mid-row: a day is atomic on paper, always. */
.rp-day {
  break-inside: avoid; page-break-inside: avoid;
  border: 1px solid #e4e9f0; border-radius: 3px; padding: 7px 10px 8px; margin-bottom: 5px;
}
.rp-day-wknd { background: #fafbfd; }
.rp-day-void { display: flex; align-items: baseline; gap: 10px; background: #f7f8fa;
               border-style: dashed; padding: 6px 10px; }
.rp-day-h { display: flex; align-items: baseline; gap: 8px; margin-bottom: 5px; }
.rp-day-n { font-weight: 800; font-size: 11px; color: ${NAVY}; min-width: 50px; }
.rp-void-note { font-size: 9.5px; font-style: italic; color: #8a94a3; }
.rp-day-pts { margin-left: auto; font-size: 13px; font-weight: 800; color: ${NAVY};
              font-variant-numeric: tabular-nums; }
.rp-tag {
  font-size: 7.5px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase;
  color: #6b7688; background: #eef1f5; padding: 2px 6px; border-radius: 20px;
}
.rp-tag-gold { color: #6b520c; background: #f6e7b5; }
.rp-tag-warn { color: #8a5312; background: #fbe7cd; }

.rp-grid { display: flex; gap: 12px; align-items: flex-start; }
.rp-col { flex: 1 1 0; min-width: 0; }
.rp-col-h {
  font-size: 7.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
  color: #8b95a6; border-bottom: 1px solid #eef1f5; padding-bottom: 2px; margin-bottom: 3px;
}
.rp-col li { display: flex; align-items: baseline; gap: 5px; font-size: 9px; line-height: 1.5; }
.mk { width: 8px; flex: none; font-weight: 700; }
li.ok .mk { color: #1a7f45; }
li.no .mk { color: #b3261e; }
li.no .nm { color: #7b8494; }
/* Wraps rather than truncates. An ellipsis is fine on a dashboard where the
   full label is a hover away; on paper it is information destroyed. */
.nm { flex: 1; min-width: 0; }
.tm { flex: none; font-variant-numeric: tabular-nums; }
li.ok .tm { color: #1a7f45; font-weight: 700; }
li.no .tm { color: #c3c9d3; }

.rp-aside {
  margin-top: 5px; padding-top: 4px; border-top: 1px dotted #e0e5ed;
  font-size: 8.5px; font-style: italic; color: #7b8494;
}

/* ── legend + footer ──────────────────────────────────────────────────── */
.rp-legend { break-inside: avoid; border-top: 2px solid ${NAVY}; padding-top: 10px; margin-top: 6px; }
.rp-legend p { font-size: 9px; color: #4a5568; margin-bottom: 4px !important; }
.rp-legend b.ok { color: #1a7f45; }
.rp-legend b.no { color: #b3261e; margin-left: 4px; }

/* Fixed elements repeat on every printed page, which is how the footer reaches
   all of them without a per-page template Chrome does not support.

   bottom:0 and not a negative offset: anything placed outside the page box is
   clipped away entirely, which is how the first attempt printed no footer at
   all. It sits at the foot of the content box instead, opaque, so a page that
   happens to fill completely puts the footer over its own last rule rather than
   letting the two interleave. */
.rp-foot { display: none; }
@media print {
  .rp-foot {
    display: flex; justify-content: space-between; align-items: center;
    position: fixed; left: 0; right: 0; bottom: 0;
    background: #ffffff;
    font-size: 7.5px; letter-spacing: 0.05em; color: #8a94a3;
    border-top: 1px solid #e0e5ed; padding: 4px 0 2px;
  }
  /* Reserves the strip the footer occupies so flowed content stops above it. */
  .rp-legend { margin-bottom: 12mm; }
}

.rp-empty { padding: 60px 30px; text-align: center; }
.rp-empty h1 { font-size: 22px; color: ${NAVY}; margin-bottom: 10px; }
.rp-empty p { font-size: 12px; color: #667287; }
`;
