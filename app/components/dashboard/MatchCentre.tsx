import type { MatchCentreData, MatchCentreAvailable, MatchTeam } from "../../lib/football/types";
import styles from "./dashboard.module.css";

/**
 * The Match Centre — Real Madrid's REAL current fixture, from football-data.org.
 *
 * There is no dummy fixture here any more. Everything on this bar comes from
 * `/api/football/real-madrid`. When the provider has nothing to say (no token,
 * upstream down, no match in the window) the bar keeps its geometry and says so
 * plainly rather than inventing a score, an opponent, or a kickoff.
 *
 * Match Readiness deliberately lives in Work + Week, not here: the owner's
 * reference has an uninterrupted fixture bar, and learning data beside the away
 * crest made the score read off-centre even when the flex maths was exact.
 */

const REAL_MADRID_TEAM_ID = 86;
const REAL_MADRID_LOCAL_CREST = "/real-madrid.png";

/* Hard-coded rather than taken from Intl: CLDR flips en-GB/en-AU between "Sep"
   and "Sept" across ICU versions, so the same build would render differently on
   this machine and on Netlify. The month name is ours; only the timezone
   conversion is Intl's. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SYDNEY_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Australia/Sydney",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hour12: false,
});

/** "2026-09-02T19:00:00Z" → "Thu 3 Sep · 5:00am" in the owner's timezone. */
export function formatSydneyKickoff(iso: string): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "Kickoff time unavailable";

  const parts = Object.fromEntries(
    SYDNEY_PARTS.formatToParts(new Date(parsed))
      .filter(part => part.type !== "literal")
      .map(part => [part.type, Number(part.value)]),
  ) as Record<string, number>;

  // Rebuild as UTC purely to read the weekday off the Sydney-local calendar date.
  const local = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const hour24 = parts.hour % 24;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const period = hour24 < 12 ? "am" : "pm";
  const minute = String(parts.minute).padStart(2, "0");

  return `${WEEKDAYS[local.getUTCDay()]} ${parts.day} ${MONTHS[parts.month - 1]} · ${hour12}:${minute}${period}`;
}

function crestFor(team: MatchTeam): string | null {
  // Our local Real Madrid art wins outright, not just as a fallback. The
  // provider serves 86.png at 200x200 colormapped; ours is a 431x600 RGBA
  // original, and at an 88px box drawn on a retina screen that difference is
  // the exact softness the owner rejected once already. Same club, better
  // pixels, no accuracy risk.
  if (team.id === REAL_MADRID_TEAM_ID) return REAL_MADRID_LOCAL_CREST;
  return team.crest;
}

function monogram(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map(word => word[0].toUpperCase()).join("");
}

function TeamSide({ team, side, competition }: {
  team: MatchTeam; side: "home" | "away"; competition: string;
}) {
  const crest = crestFor(team);
  const badge = crest
    ? <img className={styles.matchCrest} src={crest} alt={team.name} />
    : <span className={styles.matchMonogram} aria-hidden="true">{monogram(team.name)}</span>;

  const text = (
    <div className={styles.matchTeamText}>
      <p className={styles.matchTeamName}>{team.name.toUpperCase()}</p>
      <p className={styles.matchTeamMeta}>{competition}</p>
    </div>
  );

  return (
    <div className={`${styles.matchTeam} ${side === "home" ? styles.matchTeamHome : styles.matchTeamAway}`}>
      {side === "home" ? badge : text}
      {side === "home" ? text : badge}
    </div>
  );
}

const PHASE_STATUS = { LIVE: "Live", FINISHED: "Full Time", SCHEDULED: "" } as const;
const PHASE_REGION = { LIVE: "Live fixture", FINISHED: "Finished fixture", SCHEDULED: "Upcoming fixture" } as const;

function regionLabel(match: MatchCentreAvailable): string {
  const { home, away, phase } = match;
  if (phase === "SCHEDULED") {
    return `${PHASE_REGION[phase]} — ${home.name} vs ${away.name}, ${formatSydneyKickoff(match.startTime)}`;
  }
  return `${PHASE_REGION[phase]} — ${home.name} ${home.score ?? 0}, ${away.name} ${away.score ?? 0}`;
}

export default function MatchCentre({ data }: { data: MatchCentreData }) {
  if (!data.available) {
    return (
      <section className={styles.matchCentre} aria-label="Match centre — no fixture available">
        <p className={styles.matchUnavailable}>{data.message}</p>
      </section>
    );
  }

  const showScore = data.phase !== "SCHEDULED"
    && data.home.score !== null && data.away.score !== null;

  return (
    <section className={styles.matchCentre} aria-label={regionLabel(data)}>
      <div className={styles.matchFixture} data-testid="match-fixture">
        <TeamSide team={data.home} side="home" competition={data.competition} />

        <div className={styles.matchScore}>
          {showScore ? (
            <p className={styles.matchScoreLine} data-testid="match-score">
              <span className={styles.matchGoals}>{data.home.score}</span>
              {" "}
              <span className={styles.matchScoreDash}>-</span>
              {" "}
              <span className={styles.matchGoals}>{data.away.score}</span>
            </p>
          ) : (
            <p className={styles.matchKickoff}>{formatSydneyKickoff(data.startTime)}</p>
          )}
          {PHASE_STATUS[data.phase] && (
            <p className={styles.matchStatus}>{PHASE_STATUS[data.phase]}</p>
          )}
        </div>

        <TeamSide team={data.away} side="away" competition={data.competition} />
      </div>
    </section>
  );
}
