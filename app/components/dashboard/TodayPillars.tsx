"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { footballPillar, schoolPillar, type PillarSummary, type SchoolWeek } from "../../dashboard/pillars";
import { WEEKLY_CAP_HOURS, planFor, weeklyLoadMinutes } from "../../pathway/data/week";
import { todayMelbourne, usePathwayStore } from "../../pathway/components/usePathwayStore";
import Panel from "./Panel";
import styles from "./dashboard.module.css";

/**
 * TODAY'S TWO PILLARS — School and Football, drawn by the same card at the
 * same size. Neither academy is the other's sidebar; the habits sit beneath
 * them as scaffolding.
 *
 * READ-ONLY SUMMARIES. Nothing here ticks, gates or scores. A school block is
 * ticked on /school and a session on /pathway — each card links there. Like
 * the lessons list this replaces, the cards fetch their own data so an outage
 * in either source cannot delay the habit tick path.
 */
const WEEKDAY_FMT = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", weekday: "long" });

export function PillarCard(
  { title, icon, accent, href, linkLabel, summary, status, footnote = null }: {
    title: string; icon: string; accent: string; href: string; linkLabel: string;
    /** Null while loading or when the source is unavailable; `status` says which. */
    summary: PillarSummary | null; status?: string; footnote?: string | null;
  },
) {
  const counted = summary !== null && summary.total > 0;
  return (
    <Panel
      title={title}
      icon={icon}
      accent={accent}
      subtitle={summary?.subtitle}
      progress={counted ? { done: summary.done, total: summary.total } : null}
      summary={counted ? (
        <>
          <span className={styles.panelCount}>{summary.done}/{summary.total}</span>
          <span className={styles.panelPoints}>done</span>
        </>
      ) : undefined}
      footer={
        <span className={styles.pillarFoot}>
          {footnote ? <span>{footnote}</span> : <span />}
          <Link href={href} className={styles.pillarLink}>{linkLabel} →</Link>
        </span>
      }
    >
      {summary === null ? <p className={styles.pillarNote}>{status}</p> : (
        <>
          {summary.rows.length > 0 ? (
            <ol className={styles.pillarRows}>
              {summary.rows.map((row, i) => (
                <li key={row.id} className={styles.pillarRow} data-testid="pillar-row">
                  <div className={styles.pillarRowHead}>
                    <span className={styles.pillarRowTitle}>{row.title}</span>
                    {i === 0 ? <span className={styles.pillarNext}>next</span> : null}
                    {row.meta ? <span className={styles.pillarMeta}>{row.meta}</span> : null}
                  </div>
                  {row.detail ? <p className={styles.pillarDetail}>{row.detail}</p> : null}
                </li>
              ))}
            </ol>
          ) : null}
          {summary.note ? <p className={styles.pillarNote}>{summary.note}</p> : null}
        </>
      )}
    </Panel>
  );
}

function SchoolPillar() {
  const [week, setWeek] = useState<SchoolWeek | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/school-week", { cache: "no-store" })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { if (live) setWeek(d as SchoolWeek); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);
  return (
    <PillarCard
      title="School" icon="🎓" accent="var(--cyan)" href="/school" linkLabel="Open School"
      summary={week && Array.isArray(week.days) ? schoolPillar(week) : null}
      status={failed ? "The week could not be loaded." : "Loading…"}
    />
  );
}

function FootballPillar() {
  const [today] = useState(todayMelbourne);
  // Resolved after mount: the weekday depends on the clock, and reading it
  // during the server render would desync hydration.
  const [weekday, setWeekday] = useState<string | null>(null);
  const { state } = usePathwayStore(today);
  useEffect(() => { setWeekday(WEEKDAY_FMT.format(new Date())); }, []);
  const ready = weekday !== null && state.storage !== "loading";
  return (
    <PillarCard
      title="Football" icon="⚽" accent="var(--ansar-success)" href="/pathway" linkLabel="Open Football"
      summary={ready ? footballPillar(planFor(weekday), state.done) : null}
      status="Loading…"
      // The PLANNED week, from the fixed programme — not hours carried. Said
      // in the label so the number is not read as a record.
      footnote={`${(weeklyLoadMinutes() / 60).toFixed(1)} of ${WEEKLY_CAP_HOURS} hrs planned this week`}
    />
  );
}

export default function TodayPillars() {
  return (
    <div className={styles.pillars} data-testid="today-pillars">
      <SchoolPillar />
      <FootballPillar />
    </div>
  );
}
