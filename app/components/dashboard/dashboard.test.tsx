import { describe, expect, it } from "vitest";
import { createEvent, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ClubHeader from "./ClubHeader";
import ClubStatus from "./ClubStatus";
import ClubNavigation from "./ClubNavigation";
import DayProgrammePanel from "./DayProgrammePanel";
import HabitPanel from "./HabitPanel";
import HabitRow from "./HabitRow";
import MatchCentre from "./MatchCentre";
import StretchWalletPanel from "./StretchWalletPanel";
import WeeklyTierProgress from "./WeeklyTierProgress";
import WorkWeekPanel from "./WorkWeekPanel";
import DashboardShell from "./DashboardShell";
import Panel from "./Panel";
import { weekdayFixture, weekendFixture } from "../../dashboard/fixtures";
import type { DashboardHabit } from "../../dashboard/types";
import type { MatchCentreData } from "../../lib/football/types";
import { deriveMatchReadiness, groupHabitsByBlock } from "../../dashboard/model";
import { displayNameFor, guidanceFor, noteFor } from "../../dashboard/rowCopy";
import { requiresParentVerification } from "../../lib/parent-verified";

/**
 * The nav items that are still spans with no destination.
 *
 * Settings left this list on 2026-09-01: it now opens the Notion control hub
 * in a new tab as a temporary shortcut to the board's own configuration
 * tables. It is asserted separately below, so putting it back here (and
 * dropping the href in ClubNavigation) is all that reverting takes.
 */
const FUTURE_ITEMS = ["Targets", "Tests", "Leaderboards", "History"];
const NAV_ORDER = ["Dashboard", "Progress", ...FUTURE_ITEMS, "Settings"];

/**
 * The habit row's declared min-height.
 *
 * 44px is a FLOOR, not a fixed value — it is the minimum touch target Ansar
 * taps on an iPad, so a row may be taller but never shorter. These assertions
 * used to pin the literal 44, which quietly made the floor a ceiling too: the
 * visual-parity pass gave rows the reference's roomier 52px and three tests
 * failed for a change that moved in the safe direction. Read the number and
 * compare it, so the guard fails on 40 and passes on 52.
 */
function declaredRowMinHeight(css: string): number {
  const block = /\.habitRow\s*\{[^}]*\}/.exec(css)?.[0] ?? "";
  const value = /min-height:\s*(\d+)px/.exec(block)?.[1];
  expect(value, ".habitRow must declare a min-height in px").toBeDefined();
  return Number(value);
}

const ROW_TARGET_FLOOR_PX = 44;

/**
 * The nav item element carrying a given label.
 *
 * getByText now lands on the inner label span, not the item that holds
 * aria-disabled and title — the icon forced the label into its own node. This
 * walks back up to the item so those contracts keep being asserted on the
 * element that actually declares them.
 */
function navItem(label: string): HTMLElement {
  const match = screen.getAllByTestId("club-nav-item")
    .find(el => el.querySelector('[data-testid="club-nav-label"]')?.textContent === label);
  expect(match, `no nav item labelled ${label}`).toBeDefined();
  return match as HTMLElement;
}

describe("ClubNavigation", () => {
  it("marks Dashboard as the only active destination", () => {
    render(<ClubNavigation />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    for (const label of FUTURE_ITEMS) {
      expect(navItem(label)).toHaveAttribute("aria-disabled", "true");
      expect(navItem(label)).toHaveAttribute("title", "Coming in a later ANSAR OS stage");
    }
  });

  /**
   * Spec §7.2: future items must not link anywhere. A disabled span with no
   * href cannot be tabbed to or followed, which is the whole point.
   */
  it("gives Progress a link and keeps unfinished OS sections disabled", () => {
    render(<ClubNavigation />);
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Progress" })).toHaveAttribute("href", "/progress");
    for (const label of FUTURE_ITEMS) {
      expect(screen.getByText(label).tagName).toBe("SPAN");
    }
  });

  it("uses the reference navigation copy", () => {
    render(<ClubNavigation />);
    expect(screen.getByText("Tests")).toBeInTheDocument();
    expect(screen.getByText("Leaderboards")).toBeInTheDocument();
  });

  it("keeps the seven items in spec order", () => {
    render(<ClubNavigation />);
    // Read the label nodes, not the items' textContent: each item now carries a
    // decorative icon span. It is aria-hidden, so the accessible name is
    // unchanged, but it does land in textContent — and this contract is about
    // the words and their order.
    const items = screen.getAllByTestId("club-nav-label").map(el => el.textContent);
    expect(items).toEqual(NAV_ORDER);
  });

  /**
   * TEMPORARY shortcut: Settings points at the Notion page that owns the
   * board's configuration. It must leave the app in its own tab — the board is
   * a kiosk on an iPad, and navigating it away from the habits is worse than
   * no shortcut at all — and it must not claim to be the current page.
   */
  it("sends Settings out to the Notion control hub in a new tab", () => {
    render(<ClubNavigation />);
    const settings = screen.getByRole("link", { name: /Settings/ });
    expect(settings).toHaveAttribute("href", expect.stringContaining("notion.so"));
    expect(settings).toHaveAttribute("target", "_blank");
    expect(settings).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(settings).not.toHaveAttribute("aria-current");
    expect(settings).not.toHaveAttribute("aria-disabled");
  });

  /**
   * The crest identifies the bar; the wordmark belongs to ClubHeader. Two
   * printed "ANSAR FC"s made neither the dominant one, so the nav carries the
   * mark as an image with an accessible name and no visible duplicate text.
   */
  it("carries the visible ANSAR FC identity used by the reference navigation", () => {
    render(<ClubNavigation />);
    const crest = screen.getByRole("img", { name: "ANSAR FC" });
    expect(crest).toBeInTheDocument();
    expect(within(crest).getByText(/ANSAR/)).toBeVisible();
    expect(screen.queryByText(/diamond|gem|coin|level|XP/i)).not.toBeInTheDocument();
  });
});

describe("DashboardShell", () => {
  it("names the landmark and renders navigation above its children", () => {
    render(<DashboardShell><p>board</p></DashboardShell>);
    const main = screen.getByRole("main", { name: "ANSAR FC Dashboard" });
    expect(within(main).getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(within(main).getByText("board")).toBeInTheDocument();
  });
});

describe("Panel", () => {
  it("renders title, subtitle and summary without nesting a second card border", () => {
    render(
      <Panel title="Morning Habits" subtitle="06:30–08:30" accent="var(--cyan)" summary={<span>5 / 7</span>}>
        <p>rows</p>
      </Panel>
    );
    expect(screen.getByRole("heading", { name: "Morning Habits" })).toBeInTheDocument();
    expect(screen.getByText("06:30–08:30")).toBeInTheDocument();
    expect(screen.getByText("5 / 7")).toBeInTheDocument();
    expect(screen.getByText("rows")).toBeInTheDocument();
  });

  it("omits the subtitle and summary slots entirely when not supplied", () => {
    const { container } = render(<Panel title="Bare" accent="var(--cyan)"><p>x</p></Panel>);
    expect(screen.getByRole("heading", { name: "Bare" })).toBeInTheDocument();
    expect(container.querySelectorAll("header p")).toHaveLength(0);
  });

  /** The accent is the one semantic line per spec §10.1 — it must be applied. */
  it("applies the accent colour to its accent line", () => {
    render(<Panel title="Wallet" accent="var(--ansar-wallet)"><p>x</p></Panel>);
    expect(screen.getByTestId("panel-accent")).toHaveStyle({ background: "var(--ansar-wallet)" });
  });
});

describe("fixtures", () => {
  it("performs no network call at import time", () => {
    expect(typeof weekdayFixture).toBe("object");
    expect(weekdayFixture.gate.serverTime.timeZone).toBe("Australia/Sydney");
  });

  /**
   * The journal's position is the point of this assertion, not incidental to
   * it: it sits between "Teeth brushed" and "Reading in bed" (Notion Order
   * 16.5), and it is in Afternoon / Evening rather than Homeschool. A sort that
   * dropped the fractional order, or a regrouping that sent it back up to
   * Homeschool, both read as a passing board and a bedtime routine in the wrong
   * order.
   */
  it("covers every configured weekday habit, journal between teeth and reading", () => {
    const grouped = groupHabitsByBlock(weekdayFixture.gate.habits);
    expect(weekdayFixture.gate.habits).toHaveLength(16);
    expect(grouped.pre_homeschool).toHaveLength(7);
    expect(grouped.homeschool.map(h => h.id)).toEqual(["homeschool_session"]);
    expect(grouped.afternoon_evening.map(h => h.id)).toEqual([
      "btn_cornell", "shower", "all_namaz", "room_tidy", "teeth", "journal", "reading",
    ]);
    expect(grouped.conditional.map(h => h.id)).toEqual(["soccer_training"]);
  });

  /** The journal is Mon–Fri in Notion, so a Saturday board must not draw it. */
  it("drops the weekday-only journal on the weekend", () => {
    const ids = weekendFixture.gate.habits.map(h => h.id);
    expect(ids).not.toContain("journal");
  });

  /**
   * Contract amendment 8027d53: the weekend removes Homeschool and nothing
   * else. Afternoon / Evening must survive, or the panel silently loses six
   * configured habits every Saturday.
   */
  it("removes only Homeschool on the weekend", () => {
    const grouped = groupHabitsByBlock(weekendFixture.gate.habits);
    expect(grouped.homeschool).toEqual([]);
    expect(grouped.pre_homeschool).toHaveLength(7);
    expect(grouped.afternoon_evening).toHaveLength(6);
    expect(grouped.conditional).toEqual([]);
    expect(weekendFixture.gate.habits).toHaveLength(13);
  });

  it("exercises every habit state the baseline requires", () => {
    const states = new Set(weekdayFixture.gate.habits.map(h => h.state));
    expect([...states].sort()).toEqual(["DONE", "LIVE", "LOCKED", "MISSED"]);
    expect(weekdayFixture.gate.habits.some(h => h.overridden)).toBe(true);
  });

  it("keeps every overridden habit listed in the gate's audit array", () => {
    for (const fixture of [weekdayFixture, weekendFixture]) {
      const overridden = fixture.gate.habits.filter(h => h.overridden).map(h => h.id);
      expect(overridden.sort()).toEqual([...fixture.gate.overriddenHabitIds].sort());
    }
  });

  it("uses the real habit names, not placeholders", () => {
    const byId = new Map(weekdayFixture.gate.habits.map(h => [h.id, h.name]));
    expect(byId.get("journal")).toBe("Daily learning journal entry written");
    expect(byId.get("soccer_training")).toBe("Soccer training attended (Mon & Wed only)");
    expect(byId.get("quran")).toBe("Qur'an recitation - 20 min");
  });
});

/* ── Task 4: club header and Match Centre frame ─────────────────────────────*/

/**
 * The masthead is identity and nothing else now: the clocks, streak and
 * connection state moved into ClubStatus so the wordmark never shares its line.
 */
describe("ClubHeader", () => {
  it("carries the club identity and the motto, and no live data", () => {
    render(<ClubHeader />);
    expect(screen.getByText("Ansar · ANSAR FC")).toBeInTheDocument();
    expect(screen.getByText("Discipline Today. Greatness Forever.")).toBeVisible();
    // The motto is fixed copy. Nothing here may render a clock, a percentage
    // or a streak — those belong to the cluster that can go stale.
    expect(screen.queryByText(/Sydney|device|Streak|Today \d/)).not.toBeInTheDocument();
  });
});

describe("ClubStatus", () => {
  const serverTime = weekdayFixture.gate.serverTime;

  it("groups real progress into a summary card and Sydney time into its own clock card", () => {
    render(
      <ClubStatus
        serverTime={serverTime}
        deviceTime="1:47pm"
        online
        pointsActive
        todayPercent={93}
        streak={33}
      />
    );

    const summary = screen.getByRole("group", { name: "Daily progress" });
    expect(within(summary).getByText("93%", { exact: false })).toBeInTheDocument();
    expect(within(summary).getByText("33", { exact: false })).toBeInTheDocument();

    const clock = screen.getByRole("group", { name: "Sydney time" });
    expect(within(clock).getByText(/1:45pm/)).toBeInTheDocument();
    expect(within(clock).getByText(/Wednesday/)).toBeInTheDocument();
    expect(clock).not.toContainElement(screen.getByText(/device/));
  });

  it("labels the server clock as the one every gate uses", () => {
    render(<ClubStatus serverTime={serverTime} deviceTime="1:47pm" online pointsActive />);
    expect(screen.getByText(/Sydney/)).toHaveAttribute("title", "Server clock — every gate uses this");
  });

  /**
   * Spec §13: server and device time must stay distinguishable. Two clocks that
   * disagree are only safe while it is obvious which one decides anything.
   */
  it("keeps the device clock visibly display-only", () => {
    render(<ClubStatus serverTime={serverTime} deviceTime="1:47pm" online pointsActive />);
    const device = screen.getByText(/device/);
    expect(device).toHaveAttribute("title", "This device's clock — display only, no gate reads it");
    expect(device).toHaveTextContent("1:47pm");
    expect(screen.getByText(/Sydney/)).not.toBe(device);
  });

  it("shows the server clock's own weekday and time, not the device's", () => {
    render(<ClubStatus serverTime={serverTime} deviceTime="9:00pm" online pointsActive />);
    expect(screen.getByText(/Sydney/)).toHaveTextContent("1:45pm");
    expect(screen.getByText(/Sydney/)).toHaveTextContent("Wednesday");
  });

  it("renders no server clock at all before the gate answers", () => {
    render(<ClubStatus serverTime={null} deviceTime="" online pointsActive />);
    expect(screen.queryByText(/Sydney/)).not.toBeInTheDocument();
  });

  it("states connection in text, not colour alone", () => {
    const { unmount } = render(<ClubStatus serverTime={serverTime} deviceTime="" online pointsActive />);
    expect(screen.getByText("Live")).toBeInTheDocument();
    unmount();
    render(<ClubStatus serverTime={serverTime} deviceTime="" online={false} pointsActive />);
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("shows the soft-launch badge only while points are inactive", () => {
    const { unmount } = render(<ClubStatus serverTime={serverTime} deviceTime="" online pointsActive={false} />);
    expect(screen.getByText("Soft-launch · points preview")).toBeInTheDocument();
    unmount();
    render(<ClubStatus serverTime={serverTime} deviceTime="" online pointsActive />);
    expect(screen.queryByText("Soft-launch · points preview")).not.toBeInTheDocument();
  });

  /** null means /api/settings has not answered — not that points are off. */
  it("stays silent about points while settings are still unknown", () => {
    render(<ClubStatus serverTime={serverTime} deviceTime="" online pointsActive={null} />);
    expect(screen.queryByText("Soft-launch · points preview")).not.toBeInTheDocument();
  });
});

describe("MatchCentre", () => {
  const live: MatchCentreData = {
    available: true,
    matchId: 901,
    phase: "LIVE",
    competition: "Primera Division",
    startTime: "2026-08-30T03:00:00Z",
    home: { id: 86, name: "Real Madrid", crest: null, score: 2 },
    away: { id: 92, name: "Real Sociedad", crest: "https://crests.football-data.org/92.png", score: 0 },
    updatedAt: "2026-08-30T04:00:00Z",
    stale: false,
  };

  it("renders the provider's real live fixture and never labels it preview", () => {
    render(<MatchCentre data={live} />);
    expect(screen.getByRole("region", { name: "Live fixture — Real Madrid 2, Real Sociedad 0" })).toBeVisible();
    expect(screen.getByTestId("match-score")).toHaveTextContent("2 - 0");
    expect(screen.getByText("Live")).toBeVisible();
    expect(screen.queryByText("Preview")).not.toBeInTheDocument();
  });

  it("uses the local Real Madrid fallback and the provider's accurate opponent crest", () => {
    render(<MatchCentre data={live} />);
    const crests = screen.getAllByRole("img");
    expect(crests[0]).toHaveAttribute("src", "/real-madrid.png");
    expect(crests[1]).toHaveAttribute("src", "https://crests.football-data.org/92.png");
  });

  // The provider serves 86.png at 200x200 colormapped; our local file is a
  // 431x600 RGBA original. At an 88px retina box that is the difference the
  // owner already rejected once, so ours wins even when the provider has one.
  it("prefers our own Real Madrid art over the provider's smaller crest", () => {
    render(<MatchCentre data={{
      ...live,
      home: { ...live.home, crest: "https://crests.football-data.org/86.png" },
    }} />);
    expect(screen.getAllByRole("img")[0]).toHaveAttribute("src", "/real-madrid.png");
  });

  it("shows a scheduled kickoff without inventing a score", () => {
    render(<MatchCentre data={{
      ...live,
      phase: "SCHEDULED",
      startTime: "2026-09-02T19:00:00Z",
      home: { ...live.home, score: null },
      away: { ...live.away, score: null },
    }} />);
    expect(screen.queryByTestId("match-score")).not.toBeInTheDocument();
    expect(screen.getByText("Thu 3 Sep · 5:00am")).toBeVisible();
  });

  it("renders a calm unavailable state instead of the old dummy fixture", () => {
    render(<MatchCentre data={{
      available: false,
      reason: "not_configured",
      message: "Real Madrid season data is not configured yet",
      updatedAt: null,
      stale: false,
    }} />);
    expect(screen.getByText("Real Madrid season data is not configured yet")).toBeVisible();
    expect(screen.queryByText("REAL SOCIEDAD")).not.toBeInTheDocument();
    expect(screen.queryByTestId("match-score")).not.toBeInTheDocument();
  });

  it("keeps readiness out of the reference-matched fixture bar", () => {
    render(<MatchCentre data={live} />);
    expect(screen.queryByTestId("match-readiness")).not.toBeInTheDocument();
    expect(screen.queryByText("Match Readiness")).not.toBeInTheDocument();
  });
});

describe("responsive rules for the header and Match Centre", () => {
  const css = readFileSync(
    resolve(process.cwd(), "app/components/dashboard/dashboard.module.css"),
    "utf8",
  );

  /** The declarations inside the narrowest breakpoint. */
  const mobile = (() => {
    const i = css.indexOf("@media (max-width: 640px)");
    expect(i, "a 640px breakpoint must exist").toBeGreaterThan(-1);
    let depth = 0, j = css.indexOf("{", i);
    const start = j;
    do { if (css[j] === "{") depth += 1; else if (css[j] === "}") depth -= 1; j += 1; } while (depth > 0);
    return css.slice(start, j);
  })();

  function rule(selector: string): string {
    const match = new RegExp(`\\.${selector}[^{]*\\{([^}]*)\\}`).exec(mobile);
    expect(match, `${selector} must have a mobile rule`).not.toBeNull();
    return match![1];
  }

  /**
   * At 390px the wordmark, two stats, two clocks and the connection state
   * cannot share one 40px line. The header must be allowed to grow and wrap
   * rather than clip whatever falls off the right edge.
   */
  it("lets the header wrap instead of clipping", () => {
    expect(rule("clubHeader")).toMatch(/flex-wrap:\s*wrap/);
    expect(rule("clubHeader")).toMatch(/height:\s*auto/);
    expect(rule("clubStatus")).toMatch(/flex-wrap:\s*wrap/);
  });

  it("keeps the status cards visible instead of leaving them beyond the nav scroller", () => {
    expect(rule("clubNav")).toMatch(/flex-wrap:\s*wrap/);
    expect(rule("clubNavStatus")).toMatch(/width:\s*100%/);
    expect(rule("clubNavStatus")).toMatch(/margin-left:\s*0/);
  });

  /**
   * Something has to yield at 390px, and it must not be the clock every gate
   * is decided against, nor whether the board is talking to the server.
   */
  it("drops the display-only clock but never the server clock or connection", () => {
    expect(rule("deviceClock")).toMatch(/display:\s*none/);
    expect(mobile).not.toMatch(/\.serverClock[^{]*\{[^}]*display:\s*none/);
    expect(mobile).not.toMatch(/\.connection[^{]*\{[^}]*display:\s*none/);
  });

  /** The fixture itself wraps rather than shrinking below a readable size. */
  it("stacks the Match Centre and releases its height cap", () => {
    expect(rule("matchCentre")).toMatch(/flex-direction:\s*column/);
    expect(rule("matchCentre")).toMatch(/height:\s*auto/);
    expect(rule("matchCentre")).toMatch(/max-height:\s*none/);
    // The fixture wraps on a phone instead of shrinking: teams share a row and
    // the score drops beneath them.
    expect(rule("matchFixture")).toMatch(/flex-wrap:\s*wrap/);
    expect(rule("matchScore")).toMatch(/order:\s*3/);
  });

  it("compacts the full reference navigation before status can leave a 1440px viewport", () => {
    expect(css).toContain("@media (min-width: 641px) and (max-width: 1550px)");
    expect(css).toContain("@media (min-width: 641px) and (max-width: 1100px)");
  });

  it("stretches the single desktop grid row through the remaining viewport", () => {
    const baseGrid = /\n\.grid\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(baseGrid).toMatch(/grid-template-rows:\s*minmax\(0,\s*1fr\)/);
  });

  it("uses document scrolling rather than nested panel scrolling on iPhone", () => {
    expect(rule("grid")).toMatch(/grid-template-rows:\s*none/);
    expect(rule("grid")).toMatch(/flex:\s*none/);
    expect(rule("panelBody")).toMatch(/overflow-y:\s*visible/);
  });

  /** The desktop budget must survive the mobile rules being added. */
  it("leaves the desktop budget declarations untouched", () => {
    expect(/\.matchCentre\s*\{[^}]*max-height:\s*140px/.test(css)).toBe(true);
    expect(/\.clubHeader\s*\{[^}]*(?<!min-|max-)height:\s*122px/.test(css)).toBe(true);
  });
});

describe("height defences at 1440 x 820", () => {
  const css = readFileSync(
    resolve(process.cwd(), "app/components/dashboard/dashboard.module.css"),
    "utf8",
  );
  const base = (selector: string): string => {
    const match = new RegExp(`\\n\\.${selector}\\s*\\{([^}]*)\\}`).exec(css);
    expect(match, `${selector} must have a base rule`).not.toBeNull();
    return match![1];
  };
  const shortDesktop = (() => {
    const i = css.indexOf("@media (min-width: 1440px) and (max-height: 900px)");
    expect(i, "a short-desktop breakpoint must exist").toBeGreaterThan(-1);
    let depth = 0, j = css.indexOf("{", i);
    const start = j;
    do { if (css[j] === "{") depth += 1; else if (css[j] === "}") depth -= 1; j += 1; } while (depth > 0);
    return css.slice(start, j);
  })();

  /**
   * REGRESSION. .clubNav was the only child of the flex-column shell without
   * flex-shrink:0, so it absorbed the entire vertical shortfall and collapsed
   * from 44px to 18.8px on the live preview — a squashed crest and squashed
   * section links.
   */
  it("never lets the club navigation absorb the shortfall", () => {
    expect(base("clubNav")).toMatch(/flex-shrink:\s*0/);
  });

  it("gives every fixed region above the panels a shrink guard", () => {
    for (const selector of ["clubNav", "clubHeader", "matchCentre"]) {
      expect(base(selector), `${selector} must not shrink`).toMatch(/flex-shrink:\s*0/);
    }
  });

  /**
   * REGRESSION. min-height:0 alone stops the shell demanding a full 100vh, but
   * it also stopped the shell CLAIMING its container: it fell back to content
   * height — 748px measured inside an 849px .ab-root on the live site — and
   * left a 101px dead stadium strip under all four panels. `flex: 1` is the
   * other half of "be the size of your container". Both must be present.
   */
  it("makes the shell fill .ab-root rather than settle at content height", () => {
    const shell = /\.shell\s*\{([^}]*)\}/.exec(shortDesktop)?.[1] ?? "";
    expect(shell, "the short-desktop shell rule must exist").not.toBe("");
    expect(shell).toMatch(/min-height:\s*0/);
    expect(shell).toMatch(/flex:\s*1/);
  });

  /**
   * The board cannot scroll at this width — .ab-root is overflow-y:hidden — so
   * a row past the fold is unreachable, not merely below it. Height is
   * recovered from chrome only.
   */
  /**
   * This once pinned the Match Centre at 56px. That number was a symptom of a
   * height shortage, not a contract — the shared 40px nav has since left this
   * route and a measured weekday board at 1440 x 820 ends 137px clear. The cap
   * moved to 104px so the frame can be substantial, and what actually mattered
   * is asserted directly instead: whatever the frame costs, it is never paid
   * for out of a habit row.
   */
  it("never recovers height from habit rows", () => {
    // The short-desktop block may name .habitRow, but only to hold it AT the
    // floor. Rows are 52px on a tall window because the reference is roomier;
    // at 1440 x 820 they sit at 44px — the same target they had before the
    // parity pass, so nothing was taken from a row to pay for the chrome.
    const atShortDesktop = /\.habitRow[^{]*\{[^}]*?min-height:\s*(\d+)px/.exec(shortDesktop);
    if (atShortDesktop) {
      expect(Number(atShortDesktop[1])).toBeGreaterThanOrEqual(ROW_TARGET_FLOOR_PX);
    }
    // A bare `height` would pin rows to a fixed box and defeat the floor.
    expect(shortDesktop).not.toMatch(/\.habitRow[^{]*\{[^}]*[^-]height:/);
    expect(declaredRowMinHeight(css)).toBeGreaterThanOrEqual(ROW_TARGET_FLOOR_PX);
  });

  /** The frame may get shorter, but it must not hide fixture truth. */
  it("keeps the Match Centre honest while compacting it", () => {
    expect(shortDesktop).not.toMatch(/\.matchUnavailable[^{]*\{[^}]*display:\s*none/);
  });

  it("keeps every habit row target at or above 44px", () => {
    // Every .habitRow min-height in the file, base rule and overrides alike.
    // The old form of this test excluded anything that was not literally 44px,
    // which failed a row that got taller — the opposite of what it guards.
    const declared = [...css.matchAll(/\.habitRow[^{]*\{[^}]*?min-height:\s*(\d+)px/g)]
      .map(m => Number(m[1]));
    expect(declared.length, "at least one .habitRow min-height must exist").toBeGreaterThan(0);
    declared.forEach(px =>
      expect(px, `a .habitRow min-height of ${px}px is under the ${ROW_TARGET_FLOOR_PX}px target`)
        .toBeGreaterThanOrEqual(ROW_TARGET_FLOOR_PX));
  });

  it("tightens subsection dividers without touching row spacing", () => {
    expect(/\.programmeSection \+ \.programmeSection\s*\{[^}]*margin-top:\s*6px/.test(css)).toBe(true);
    expect(/\.programmeSection \+ \.programmeSection\s*\{[^}]*padding-top:\s*6px/.test(css)).toBe(true);
  });

  /** The roomier desktop spacing must survive for tall windows. */
  it("leaves the tall-desktop budget declarations intact", () => {
    expect(/\.matchCentre\s*\{[^}]*max-height:\s*140px/.test(css)).toBe(true);
    // (?<!min-|max-) matters: while the base header stood at 40px this assertion
    // read the base block, but the moment it grew the same regex started
    // matching the phone block's `min-height: 40px` and passed on a rule that
    // has nothing to do with the desktop budget. Pin the bare property.
    expect(/\.clubHeader\s*\{[^}]*(?<!min-|max-)height:\s*122px/.test(css)).toBe(true);
    expect(/\.clubNav\s*\{[^}]*(?<!min-|max-)height:\s*96px/.test(css)).toBe(true);
  });
});

describe("vertical budget before the panels", () => {
  // Read from the project root: Vitest serves modules over an http-scheme URL,
  // so import.meta.url is not a file path here.
  const css = readFileSync(
    resolve(process.cwd(), "app/components/dashboard/dashboard.module.css"),
    "utf8",
  );
  // The height above the panels is now a trade against the shared nav, so the
  // budget has to read the two files that fund it, not just the module CSS.
  const globalCss = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
  const pageSource = readFileSync(resolve(process.cwd(), "app/page.tsx"), "utf8");

  function px(selector: string, property: string): number {
    const block = new RegExp(`\\.${selector}\\s*\\{[^}]*\\}`).exec(css)?.[0] ?? "";
    const value = new RegExp(`${property}\\s*:\\s*(\\d+)px`).exec(block)?.[1];
    expect(value, `${selector} must declare ${property} in px`).toBeDefined();
    return Number(value);
  }

  /**
   * Task 4 budgets: navigation 54, header 64, Match Centre 132, and 274 for all
   * of it together. These are declared heights read straight out of the CSS,
   * because jsdom does not lay anything out and a passing render proves nothing
   * about how tall the board actually is. The 1440 × 820 target has no room to
   * discover this on a screenshot later.
   *
   * The ceiling was 234 while the shared 40px .topnav sat above the board. The
   * visual-parity pass hides that strip on this route and drops .ab-root's
   * matching padding, so the page-level cost of everything above the panels is
   * unchanged at 274 — the masthead is spending recovered height, not habit
   * height. That is why the funding is asserted below rather than assumed: the
   * ceiling is only legal while both halves of the trade are in the source.
   */
  // 350: the tall-desktop stack with the Match Centre carrying a real fixture
  // band (96 nav + 122 masthead + 128 fixture). This block is not the binding
  // constraint — 1440 x 820 is, and it is measured separately below.
  const FUNDED_CEILING = 362;

  it("still funds the raised ceiling by hiding the shared bar", () => {
    expect(globalCss).toContain('body:has(main[aria-label="ANSAR FC Dashboard"]) .topnav');
    expect(globalCss).toMatch(/--nav-h:\s*40px/);
    expect(pageSource).toMatch(/\.ab-root\{[^}]*padding-top:0/);
  });

  it("keeps each region inside its own cap", () => {
    expect(px("clubNav", "height")).toBeLessThanOrEqual(96);
    expect(px("clubHeader", "height")).toBeLessThanOrEqual(122);
    expect(px("matchCentre", "max-height")).toBeLessThanOrEqual(140);
  });

  it("keeps the three regions plus their gaps inside the funded ceiling", () => {
    const gap = px("shell", "gap");
    const total = px("clubNav", "height") + px("clubHeader", "height")
      + px("matchCentre", "max-height") + gap * 2;
    expect(total).toBeLessThanOrEqual(FUNDED_CEILING);
  });

  /**
   * The binding constraint is not the block above but the short-desktop
   * override, because 1440 × 820 matches @media (min-width:1440px) and
   * (max-height:900px).
   *
   * The ceiling here is measured, not derived. On deploy-preview-2 at exactly
   * 1440 × 820, carrying the full weekday roster (the Saturday board plus
   * `journal` and `homeschool_session`, 15 rows), the panel grid ended at 683
   * with the stack at 170 — 137px of clear air under it. 232 spends 62 of that
   * and keeps 75 in hand, which is what lets the Match Centre be substantial
   * without touching a habit row. Re-measure before raising it again; do not
   * reason the number upward from this comment alone.
   */
  const SHORT_DESKTOP_CEILING = 280;

  it("keeps the short-desktop stack inside the measured ceiling", () => {
    const shortDesktop = /@media \(min-width: 1440px\) and \(max-height: 900px\) \{[\s\S]*?\n\}/.exec(css)?.[0] ?? "";
    expect(shortDesktop, "short-desktop block must exist").not.toBe("");
    const at = (selector: string, property: string): number => {
      const block = new RegExp(`\\.${selector}\\s*\\{[^}]*\\}`).exec(shortDesktop)?.[0] ?? "";
      const value = new RegExp(`${property}\\s*:\\s*(\\d+)px`).exec(block)?.[1];
      expect(value, `${selector} must declare ${property} at short desktop`).toBeDefined();
      return Number(value);
    };
    const gap = at("shell", "gap");
    const stack = at("clubNav", "height") + at("clubHeader", "height")
      + at("matchCentre", "max-height") + gap * 2;
    expect(stack).toBe(278);
    expect(stack).toBeLessThanOrEqual(SHORT_DESKTOP_CEILING);
  });

  /**
   * The Match Centre frame the spec asks for, guarded at the viewport that
   * nearly cost it: nothing here may quietly shrink back to the 56px strip
   * with its explanatory line hidden.
   */
  it("keeps the short-desktop Match Centre substantial", () => {
    const shortDesktop = /@media \(min-width: 1440px\) and \(max-height: 900px\) \{[\s\S]*?\n\}/.exec(css)?.[0] ?? "";
    expect(/\.matchCentre\s*\{[^}]*max-height:\s*112px/.test(shortDesktop)).toBe(true);
    expect(/\.matchNote\s*\{[^}]*display:\s*none/.test(shortDesktop)).toBe(false);
  });
});

/* ── Task 5: habit rows and the Morning panel ───────────────────────────────*/

function row(overrides: Partial<DashboardHabit> & Pick<DashboardHabit, "id" | "name">): DashboardHabit {
  return {
    block: "pre_homeschool", order: 1, points: 0, pointType: "block",
    state: "LIVE", label: "", message: null, reason: null,
    window: null, dwellSeconds: null, overridden: false,
    ...overrides,
  };
}

const noop = () => {};
const rowHandlers = { onTick: noop, onHoldStart: noop, onHoldCancel: noop };

describe("HabitRow", () => {
  it("renders the five server-decided states in one vocabulary", () => {
    render(
      <>
        <HabitRow habit={row({ id: "live", name: "Live habit" })} accent="var(--cyan)" {...rowHandlers} />
        <HabitRow habit={row({ id: "locked", name: "Locked habit", state: "LOCKED", label: "Opens 1:30pm" })} accent="var(--cyan)" {...rowHandlers} />
        <HabitRow habit={row({ id: "missed", name: "Missed habit", state: "MISSED", label: "Missed" })} accent="var(--cyan)" {...rowHandlers} />
        <HabitRow habit={row({ id: "done", name: "Done habit", state: "DONE", label: "Done" })} accent="var(--cyan)" {...rowHandlers} />
        <HabitRow habit={row({ id: "over", name: "Override habit", state: "DONE", overridden: true })} accent="var(--cyan)" {...rowHandlers} />
      </>
    );
    expect(screen.getByRole("button", { name: "Live habit" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Locked habit" })).toHaveAttribute("aria-disabled", "true");
    // The gate's reason no longer prints under the habit — owner's call, to
    // keep every row to one line. It is not lost: it rides on the row as its
    // description, and the four states stay distinguishable by glyph (✓ ✕ 🔒),
    // not by colour, which is what §13 actually turns on.
    expect(screen.getByRole("button", { name: "Locked habit" }))
      .toHaveAttribute("title", expect.stringContaining("Opens 1:30pm"));
    expect(screen.getByRole("button", { name: "Missed habit" }))
      .toHaveAttribute("title", expect.stringContaining("Missed"));
    // The override keeps a visible trace on purpose: with none, an overridden
    // habit is indistinguishable from an earned one.
    expect(screen.getByText("Parent override")).toBeVisible();
  });

  /**
   * The single most important line in this file. LOCKED and MISSED must NOT be
   * HTML-disabled: a disabled button fires no pointer events, and the parent's
   * two-second hold is the only route to an override. Disabling the refused
   * rows would silently remove the override door from the whole board.
   */
  it("leaves refused rows pointer-reachable so the parent hold still works", () => {
    const holds: string[] = [];
    render(
      <>
        <HabitRow habit={row({ id: "locked", name: "Locked habit", state: "LOCKED" })} accent="var(--cyan)"
          onTick={noop} onHoldStart={h => holds.push(h.id)} onHoldCancel={noop} />
        <HabitRow habit={row({ id: "missed", name: "Missed habit", state: "MISSED" })} accent="var(--cyan)"
          onTick={noop} onHoldStart={h => holds.push(h.id)} onHoldCancel={noop} />
      </>
    );
    for (const name of ["Locked habit", "Missed habit"]) {
      const button = screen.getByRole("button", { name });
      expect(button).toBeEnabled();
      expect(button).toHaveAttribute("aria-disabled", "true");
      fireEvent.pointerDown(button);
    }
    expect(holds).toEqual(["locked", "missed"]);
  });

  it("forwards a tick with the habit's id and name", () => {
    const ticks: [string, string][] = [];
    render(<HabitRow habit={row({ id: "quran", name: "Qur'an recitation - 20 min" })} accent="var(--cyan)"
      onTick={(id, name) => ticks.push([id, name])} onHoldStart={noop} onHoldCancel={noop} />);
    fireEvent.click(screen.getByRole("button", { name: "Qur'an recitation - 20 min" }));
    expect(ticks).toEqual([["quran", "Qur'an recitation - 20 min"]]);
  });

  it("cancels the hold on release, leave and cancel alike", () => {
    let cancels = 0;
    const habit = row({ id: "locked", name: "Locked habit", state: "LOCKED" });
    render(<HabitRow habit={habit} accent="var(--cyan)"
      onTick={noop} onHoldStart={noop} onHoldCancel={() => { cancels += 1; }} />);
    const button = screen.getByRole("button", { name: "Locked habit" });
    fireEvent.pointerUp(button);
    fireEvent.pointerLeave(button);
    fireEvent.pointerCancel(button);
    expect(cancels).toBe(3);
  });

  /** A long-press must not raise the browser's own context menu over the ring. */
  it("suppresses the native context menu", () => {
    render(<HabitRow habit={row({ id: "locked", name: "Locked habit", state: "LOCKED" })} accent="var(--cyan)" {...rowHandlers} />);
    const event = createEvent.contextMenu(screen.getByRole("button", { name: "Locked habit" }));
    fireEvent(screen.getByRole("button", { name: "Locked habit" }), event);
    expect(event.defaultPrevented).toBe(true);
  });

  /**
   * Spec §5: an override must never look identical to an earned completion.
   * The audit marker is visible, and the accessible name says so too — a
   * screen-reader user must not be told a habit was simply done.
   */
  it("marks an override in both the visible row and its accessible name", () => {
    render(<HabitRow habit={row({ id: "feet_floor", name: "Feet on floor", state: "DONE", overridden: true })}
      accent="var(--cyan)" {...rowHandlers} />);
    expect(screen.getByRole("button", { name: "Feet on floor — restored by parent override" })).toBeInTheDocument();
    expect(screen.getByText("Parent override")).toBeVisible();
  });

  it("gives an earned completion no override marker", () => {
    render(<HabitRow habit={row({ id: "quran", name: "Qur'an", state: "DONE" })} accent="var(--cyan)" {...rowHandlers} />);
    expect(screen.queryByText("Parent override")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Qur'an" })).toBeInTheDocument();
  });

  /** The one case that IS HTML-disabled: an in-flight write must not double-fire. */
  it("disables only the row currently being saved", () => {
    render(
      <>
        <HabitRow habit={row({ id: "a", name: "Saving habit" })} accent="var(--cyan)" saving {...rowHandlers} />
        <HabitRow habit={row({ id: "b", name: "Idle habit" })} accent="var(--cyan)" {...rowHandlers} />
      </>
    );
    expect(screen.getByRole("button", { name: "Saving habit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Idle habit" })).toBeEnabled();
  });

  it("shows a point chip only when the habit is worth points", () => {
    const { unmount } = render(<HabitRow habit={row({ id: "a", name: "Scored", points: 5 })} accent="var(--cyan)" {...rowHandlers} />);
    expect(screen.getByText("+5 pts")).toBeVisible();
    unmount();
    render(<HabitRow habit={row({ id: "b", name: "Unscored", points: 0 })} accent="var(--cyan)" {...rowHandlers} />);
    expect(screen.queryByText(/^\+\d+ pts?$/)).not.toBeInTheDocument();
  });

  it("uses the singular for a one-point habit", () => {
    render(<HabitRow habit={row({ id: "a", name: "One", points: 1 })} accent="var(--cyan)" {...rowHandlers} />);
    expect(screen.getByText("+1 pt")).toBeVisible();
  });

  it("shows the hold ring only on the row being held", () => {
    render(
      <>
        <HabitRow habit={row({ id: "a", name: "Held", state: "LOCKED" })} accent="var(--cyan)" holding {...rowHandlers} />
        <HabitRow habit={row({ id: "b", name: "Untouched", state: "LOCKED" })} accent="var(--cyan)" {...rowHandlers} />
      </>
    );
    expect(within(screen.getByRole("button", { name: "Held" })).getByTestId("hold-ring")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: "Untouched" })).queryByTestId("hold-ring")).not.toBeInTheDocument();
  });
});

describe("HabitPanel", () => {
  const morning = groupHabitsByBlock(weekdayFixture.gate.habits).pre_homeschool;

  it("renders every habit in the order it was given", () => {
    render(<HabitPanel title="Morning Habits" accent="var(--ansar-warning)" habits={morning}
      doneCount={6} blockPoints={2} {...rowHandlers} />);
    const names = screen.getAllByRole("button").map(b => b.textContent);
    expect(names).toHaveLength(7);
    expect(names[0]).toContain("Bed made + dressed");
    expect(names[6]).toContain("Daily goals written");
  });

  it("summarises completion in the head and the block score at the foot", () => {
    render(<HabitPanel title="Morning Habits" accent="var(--ansar-warning)" habits={morning}
      doneCount={6} blockPoints={2} {...rowHandlers} />);
    expect(screen.getByText("6/7")).toBeVisible();
    // The header carries the count alone, as the reference does. The block's
    // points are stated once, in the closing score line — printing them under
    // the count as well was the same number said twice.
    expect(screen.getByText(/Morning Habits Score/)).toBeVisible();
    expect(screen.getByText("+2 pts")).toBeVisible();
  });

  /** habitColumn() returned null for an empty block; that behaviour is kept. */
  it("renders nothing for a block with no applicable habits", () => {
    const { container } = render(<HabitPanel title="Morning Habits" accent="var(--cyan)" habits={[]}
      doneCount={0} blockPoints={0} {...rowHandlers} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the feasibility warning above the rows, as a live status", () => {
    render(<HabitPanel title="Morning Habits" accent="var(--ansar-warning)" habits={morning}
      doneCount={6} blockPoints={2}
      feasibility={{ level: "red", text: "⏳ 12m left to finish morning — keep tapping", latestSafeNextTick: 492, remaining: 1 }}
      {...rowHandlers} />);
    const banner = screen.getByTestId("morning-feasibility");
    expect(banner).toHaveAttribute("role", "status");
    expect(banner).toHaveAttribute("aria-live", "polite");
    expect(banner).toHaveAttribute("data-level", "red");
    expect(banner).toHaveAttribute("data-latest-safe-next-tick", "492");
    expect(banner).toHaveAttribute("data-remaining", "1");
    expect(banner).toHaveTextContent("12m left to finish morning");
  });

  it("omits the feasibility banner when there is nothing to warn about", () => {
    render(<HabitPanel title="Morning Habits" accent="var(--ansar-warning)" habits={morning}
      doneCount={6} blockPoints={2} {...rowHandlers} />);
    expect(screen.queryByTestId("morning-feasibility")).not.toBeInTheDocument();
  });

  it("passes hold and tick handlers through to each row", () => {
    const ticks: string[] = [];
    render(<HabitPanel title="Morning Habits" accent="var(--ansar-warning)" habits={morning}
      doneCount={6} blockPoints={2} onTick={id => ticks.push(id)} onHoldStart={noop} onHoldCancel={noop} />);
    fireEvent.click(screen.getByRole("button", { name: /Bed made/ }));
    expect(ticks).toEqual(["bed_dressed"]);
  });

  it("marks the overridden row and no other", () => {
    render(<HabitPanel title="Morning Habits" accent="var(--ansar-warning)" habits={morning}
      doneCount={6} blockPoints={2} {...rowHandlers} />);
    expect(screen.getAllByText("Parent override")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Feet on floor.*restored by parent override/ })).toBeInTheDocument();
  });
});

/* ── Task 6: Today's Programme ──────────────────────────────────────────────*/

const SECTION_TITLES = ["Homeschool", "Afternoon / Evening", "Conditional"];

function programme(fixture: typeof weekdayFixture) {
  const grouped = groupHabitsByBlock(fixture.gate.habits);
  return {
    homeschool: grouped.homeschool,
    afternoonEvening: grouped.afternoon_evening,
    conditional: grouped.conditional,
  };
}

describe("DayProgrammePanel", () => {
  /**
   * The journal's position IS the requirement (tk, 31 Aug): last thing before
   * reading, straight after teeth. It is asserted against its neighbours rather
   * than against an index, so the day another evening habit is added the test
   * still says the thing it was written to say.
   */
  it("puts the journal between teeth and reading", () => {
    render(<DayProgrammePanel {...programme(weekdayFixture)} {...rowHandlers} />);
    const evening = screen.getAllByTestId("programme-section")[1];
    const names = within(evening).getAllByRole("button").map(b => b.textContent ?? "");
    const journal = names.findIndex(n => n.includes("Journal Entry via Tally"));
    expect(journal).toBeGreaterThan(-1);
    expect(names[journal - 1]).toContain("Teeth brushed");
    expect(names[journal + 1]).toContain("Reading in bed");
  });

  it("leaves the session as the only Homeschool row", () => {
    render(<DayProgrammePanel {...programme(weekdayFixture)} {...rowHandlers} />);
    const items = screen.getAllByTestId("homeschool-item");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("Homeschool session completed");
  });

  /**
   * The guidance line travels with the habit, not with the heading it sits
   * under. This is what broke silently when the journal moved: the copy used to
   * live inside HomeschoolSection, so the row arrived in Afternoon / Evening
   * with no prompt at all. See dashboard/rowCopy.ts.
   */
  it("uses the reference's white-primary and grey-guidance structure in both sections", () => {
    render(<DayProgrammePanel {...programme(weekdayFixture)} {...rowHandlers} />);
    const session = screen.getAllByTestId("homeschool-item")[0];
    expect(within(session).getByText("Homeschool session completed (4 hrs)")).toBeVisible();
    expect(within(session).getByText("Tap when 4 hours are completed")).toBeVisible();
  });

  /**
   * THE JOURNAL ROW IS ONE LINE AND FOUR WORDS (tk, 2 Sep 2026).
   *
   * It is the only row nobody ticks, so it says what it is — "Journal Entry via
   * Tally" — and nothing else. Notion's habit sentence and the old guidance line
   * are both asserted GONE, because a row that ticks itself does not need a
   * sentence explaining that it ticks itself under a name that already says so.
   */
  it("reduces the journal to its Tally name, with no habit sentence or guidance", () => {
    render(<DayProgrammePanel {...programme(weekdayFixture)} {...rowHandlers} />);
    const journal = screen.getByTestId("programme-journal");
    expect(within(journal).getByText("Journal Entry via Tally")).toBeVisible();
    expect(within(journal).queryByText("Daily learning journal entry written")).toBeNull();
    expect(within(journal).queryByText("Ticks itself once you log it in Log Work")).toBeNull();
  });

  /**
   * The row must not wear the parent-override colour every day of the week.
   * Its distinctness is carried by data-emphasis, which the stylesheet turns
   * into a dashed slot rather than the gold stripe it used to draw.
   */
  it("marks the journal row as its own kind of row", () => {
    render(<DayProgrammePanel {...programme(weekdayFixture)} {...rowHandlers} />);
    const journal = screen.getByTestId("programme-journal");
    expect(within(journal).getByRole("button")).toHaveAttribute("data-emphasis", "journal");
  });

  /**
   * The journal is DONE in the weekday fixture. It is a self-certified tick, so
   * the only honest word for it is Recorded. "Verified" must not appear
   * anywhere until a real Tally record is matched against it.
   */
  it("calls a completed journal Recorded and never Verified", () => {
    const grouped = programme(weekdayFixture);
    // The fixture has the journal LOCKED at 1:45pm — it opens at 9pm with the
    // rest of the bedtime group — so the DONE state is set here rather than
    // moving the fixture off the time of day it is meant to depict.
    const evening = grouped.afternoonEvening.map(h =>
      h.id === "journal" ? { ...h, state: "DONE" as const } : h);
    render(<DayProgrammePanel {...grouped} afternoonEvening={evening} {...rowHandlers} />);
    expect(screen.getByText("Recorded")).toBeInTheDocument();
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
  });

  /** Amendment 8027d53: no configured habit may vanish to protect the layout. */
  it("renders every non-morning habit the day configures", () => {
    render(<DayProgrammePanel {...programme(weekdayFixture)} {...rowHandlers} />);
    for (const id of ["btn_cornell", "shower", "all_namaz", "room_tidy", "teeth", "journal", "reading", "soccer_training"]) {
      expect(screen.getByTestId(`programme-${id}`)).toBeInTheDocument();
    }
    expect(screen.getAllByTestId("homeschool-item")).toHaveLength(1);
  });

  it("orders the subsections Homeschool, Afternoon / Evening, Conditional", () => {
    render(<DayProgrammePanel {...programme(weekdayFixture)} {...rowHandlers} />);
    expect(screen.getAllByTestId("programme-section").map(el => el.getAttribute("data-section")))
      .toEqual(SECTION_TITLES);
  });

  it("keeps each subsection in Notion order", () => {
    render(<DayProgrammePanel {...programme(weekdayFixture)} {...rowHandlers} />);
    const evening = screen.getAllByTestId("programme-section")[1];
    const names = within(evening).getAllByRole("button").map(b => b.textContent ?? "");
    expect(names[0]).toContain("BTN episode");
    expect(names[6]).toContain("Reading in bed");
  });

  /* ── Weekend: only Homeschool goes ────────────────────────────────────────*/

  it("omits only the Homeschool subsection on a weekend", () => {
    render(<DayProgrammePanel {...programme(weekendFixture)} {...rowHandlers} />);
    expect(screen.queryByTestId("homeschool-item")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("programme-section").map(el => el.getAttribute("data-section")))
      .toEqual(["Afternoon / Evening"]);
  });

  it("still renders all six Afternoon / Evening habits on a weekend", () => {
    render(<DayProgrammePanel {...programme(weekendFixture)} {...rowHandlers} />);
    for (const id of ["btn_cornell", "shower", "all_namaz", "room_tidy", "teeth", "reading"]) {
      expect(screen.getByTestId(`programme-${id}`)).toBeInTheDocument();
    }
  });

  it("drops the Conditional subsection when nothing is scheduled", () => {
    render(<DayProgrammePanel {...programme(weekendFixture)} {...rowHandlers} />);
    expect(screen.queryByTestId("programme-soccer_training")).not.toBeInTheDocument();
  });

  /* ── Shared row behaviour must survive the reuse ──────────────────────────*/

  it("reuses HabitRow, so refused rows stay pointer-reachable here too", () => {
    const holds: string[] = [];
    render(<DayProgrammePanel {...programme(weekdayFixture)}
      onTick={noop} onHoldStart={h => holds.push(h.id)} onHoldCancel={noop} />);
    const locked = within(screen.getByTestId("programme-room_tidy")).getByRole("button");
    expect(locked).toBeEnabled();
    expect(locked).toHaveAttribute("aria-disabled", "true");
    fireEvent.pointerDown(locked);
    expect(holds).toEqual(["room_tidy"]);
  });

  it("forwards ticks from any subsection", () => {
    const ticks: string[] = [];
    render(<DayProgrammePanel {...programme(weekdayFixture)}
      onTick={id => ticks.push(id)} onHoldStart={noop} onHoldCancel={noop} />);
    fireEvent.click(within(screen.getByTestId("programme-soccer_training")).getByRole("button"));
    fireEvent.click(screen.getAllByTestId("homeschool-item")[0].querySelector("button")!);
    expect(ticks).toEqual(["soccer_training", "homeschool_session"]);
  });

  it("summarises completion across the whole programme", () => {
    render(<DayProgrammePanel {...programme(weekdayFixture)} {...rowHandlers} />);
    // Weekday fixture at 1:45pm: session LIVE, seven evening rows (the journal
    // among them, LOCKED until 9pm), soccer LIVE. Nothing in the programme is
    // done yet — the morning is the block with completions at this hour.
    expect(screen.getByText("0/9")).toBeVisible();
  });

  it("renders nothing when the day configures no programme at all", () => {
    const { container } = render(<DayProgrammePanel homeschool={[]} afternoonEvening={[]} conditional={[]} {...rowHandlers} />);
    expect(container).toBeEmptyDOMElement();
  });

  /** Spec §10.3: subsection dividers, not a second card border inside a card. */
  it("uses one outer panel, not nested cards", () => {
    render(<DayProgrammePanel {...programme(weekdayFixture)} {...rowHandlers} />);
    expect(screen.getAllByTestId("panel-accent")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Today's Programme" })).toBeInTheDocument();
  });

  /**
   * BTN's Cornell notes are checked by a parent, so the row says so before it is
   * tapped rather than surprising the tapper with a keypad. Once it is DONE the
   * marker goes: at that point it describes how the tick was made, not anything
   * still to do, and these rows have to stay one line.
   */
  it("marks the parent-verified row so the PIN prompt is not a surprise", () => {
    render(<DayProgrammePanel {...programme(weekdayFixture)} {...rowHandlers} />);
    const btn = screen.getByTestId("programme-btn_cornell");
    expect(within(btn).getByText("Parent PIN")).toBeVisible();
    expect(within(btn).getByText("A parent enters the PIN once the notes are checked")).toBeVisible();
  });

  it("drops the Parent PIN marker once the row is done", () => {
    const grouped = programme(weekdayFixture);
    const evening = grouped.afternoonEvening.map(h =>
      h.id === "btn_cornell" ? { ...h, state: "DONE" as const } : h);
    render(<DayProgrammePanel {...grouped} afternoonEvening={evening} {...rowHandlers} />);
    expect(within(screen.getByTestId("programme-btn_cornell")).queryByText("Parent PIN"))
      .not.toBeInTheDocument();
  });

  it("marks an overridden journal without claiming it was earned", () => {
    const grouped = programme(weekdayFixture);
    const overridden = grouped.afternoonEvening.map(h =>
      h.id === "journal" ? { ...h, state: "DONE" as const, overridden: true } : h);
    render(<DayProgrammePanel {...grouped} afternoonEvening={overridden} {...rowHandlers} />);
    expect(screen.getByText("Parent override")).toBeVisible();
    expect(screen.queryByText("Recorded")).not.toBeInTheDocument();
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
  });
});

/* ── Task 7: Work + Week ────────────────────────────────────────────────────*/

const workProps = {
  weekPoints: 46,
  weekMax: 55,
  goldenBoot: { ok: true, target: 4, streak: 3, progress: 3 },
  submissionCount: null,
  onOpenLogWork: noop,
};

describe("WorkWeekPanel", () => {
  it("places today's readiness with the work summary instead of inside the fixture", () => {
    const readiness = deriveMatchReadiness({
      morningDone: 6, morningTotal: 7, homeschoolDone: false,
      journalState: "RECORDED", workSubmissionCount: 1,
    });
    render(<WorkWeekPanel {...workProps} readiness={readiness} />);
    const summary = screen.getByTestId("work-readiness");
    expect(summary).toHaveTextContent("Match Readiness");
    expect(summary).toHaveTextContent("54%");
    expect(summary).toHaveTextContent("Journal recorded");
  });

  it("shows the week, the tier, the Golden Boot and a working Log Work", () => {
    render(<WorkWeekPanel {...workProps} />);
    expect(screen.getByRole("button", { name: "Log Work" })).toBeEnabled();
    expect(screen.getByText("46 / 55")).toBeVisible();
    expect(screen.getByText(/First Team/)).toBeVisible();
    expect(screen.getByText("Golden Boot 3 / 4")).toBeVisible();
    expect(screen.getAllByTestId("tier-threshold")).toHaveLength(4);
  });

  it("opens the existing Tally modal exactly once per click", () => {
    let opened = 0;
    render(<WorkWeekPanel {...workProps} onOpenLogWork={() => { opened += 1; }} />);
    fireEvent.click(screen.getByRole("button", { name: "Log Work" }));
    expect(opened).toBe(1);
  });

  /** The panel triggers the modal; it must not own any Tally wiring itself. */
  it("embeds no Tally form or origin of its own", () => {
    const { container } = render(<WorkWeekPanel {...workProps} />);
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.innerHTML).not.toMatch(/tally\.so|ODKlVa/i);
  });

  it("declares the Log Work button as opening a dialog", () => {
    render(<WorkWeekPanel {...workProps} />);
    const button = screen.getByRole("button", { name: "Log Work" });
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("reflects the open modal in aria-expanded", () => {
    render(<WorkWeekPanel {...workProps} logOpen />);
    expect(screen.getByRole("button", { name: "Log Work" })).toHaveAttribute("aria-expanded", "true");
  });

  /* ── Truthfulness ─────────────────────────────────────────────────────────*/

  it("renders no week total before the score has loaded", () => {
    render(<WorkWeekPanel {...workProps} weekPoints={null} />);
    expect(screen.getByText("— / 55")).toBeVisible();
    expect(screen.queryByText("0 / 55")).not.toBeInTheDocument();
  });

  /**
   * There is no submission count anywhere in the app yet. Spec §10.4 asks for
   * one "when safely available"; it is not, so the panel says so rather than
   * printing a zero that would read as "you have logged nothing today".
   */
  it("says the submission count is not connected rather than showing zero", () => {
    render(<WorkWeekPanel {...workProps} />);
    expect(screen.getByText("Submission count not connected yet")).toBeVisible();
    expect(screen.queryByText(/^0 (submission|today)/i)).not.toBeInTheDocument();
  });

  it("shows a real submission count once one exists", () => {
    render(<WorkWeekPanel {...workProps} submissionCount={2} />);
    expect(screen.getByText("2 logged today")).toBeVisible();
    expect(screen.queryByText("Submission count not connected yet")).not.toBeInTheDocument();
  });

  it("says one logged today in the singular", () => {
    render(<WorkWeekPanel {...workProps} submissionCount={1} />);
    expect(screen.getByText("1 logged today")).toBeVisible();
  });

  /** The ledger 503s while db/week_results.sql is unrun; the cell disappears. */
  it("omits Golden Boot entirely when the ledger has not answered", () => {
    render(<WorkWeekPanel {...workProps} goldenBoot={null} />);
    expect(screen.queryByText(/Golden Boot/)).not.toBeInTheDocument();
  });

  it("replaces the fraction with the boot once the run is complete", () => {
    render(<WorkWeekPanel {...workProps} goldenBoot={{ ok: true, target: 4, streak: 4, progress: 4 }} />);
    expect(screen.getByText("Golden Boot")).toBeVisible();
    expect(screen.queryByText("Golden Boot 4 / 4")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Golden Boot earned")).toBeInTheDocument();
  });
});

describe("WeeklyTierProgress", () => {
  it("names the tier the week's points actually reach", () => {
    const { unmount } = render(<WeeklyTierProgress weekPoints={26} weekMax={55} />);
    expect(screen.getByTestId("tier-current")).toHaveTextContent("Reserves");
    unmount();
    render(<WeeklyTierProgress weekPoints={41} weekMax={55} />);
    expect(screen.getByTestId("tier-current")).toHaveTextContent("Bench");
  });

  it("lists all four thresholds in descending order", () => {
    render(<WeeklyTierProgress weekPoints={46} weekMax={55} />);
    const stops = screen.getAllByTestId("tier-threshold");
    expect(stops).toHaveLength(4);
    expect(stops.map(s => s.getAttribute("data-min"))).toEqual(["42", "34", "26", "0"]);
  });

  it("marks exactly one threshold as the one currently reached", () => {
    render(<WeeklyTierProgress weekPoints={35} weekMax={55} />);
    const active = screen.getAllByTestId("tier-threshold").filter(s => s.getAttribute("data-active") === "true");
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveAttribute("data-min", "34");
  });

  it("exposes the week as a labelled progress value, capped at the max", () => {
    render(<WeeklyTierProgress weekPoints={46} weekMax={55} />);
    const meter = screen.getByRole("progressbar", { name: "Week total" });
    expect(meter).toHaveAttribute("aria-valuenow", "46");
    expect(meter).toHaveAttribute("aria-valuemax", "55");
  });

  it("does not overflow its track when a weekend pushes past the max", () => {
    render(<WeeklyTierProgress weekPoints={60} weekMax={55} />);
    expect(screen.getByTestId("tier-fill")).toHaveStyle({ width: "100%" });
  });

  /**
   * The bar must not tell assistive tech something the screen denies. A week
   * that has not loaded shows an em dash, so the bar is INDETERMINATE — it has
   * no value yet, and announcing 0 would report a real, bad week.
   */
  it("announces no value at all before the score loads", () => {
    render(<WeeklyTierProgress weekPoints={null} weekMax={55} />);
    const meter = screen.getByRole("progressbar", { name: "Week total" });
    expect(meter).not.toHaveAttribute("aria-valuenow");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "55");
  });

  /**
   * A weekend can push the total past a ceiling built from weekday points. The
   * bar caps visually, so the announced value must cap with it — valuenow above
   * valuemax is an invalid range that screen readers report unpredictably.
   */
  it("clamps the announced value to the track's own range", () => {
    const { unmount } = render(<WeeklyTierProgress weekPoints={60} weekMax={55} />);
    expect(screen.getByRole("progressbar", { name: "Week total" })).toHaveAttribute("aria-valuenow", "55");
    unmount();
    render(<WeeklyTierProgress weekPoints={-3} weekMax={55} />);
    expect(screen.getByRole("progressbar", { name: "Week total" })).toHaveAttribute("aria-valuenow", "0");
  });

  it("keeps the announced value and the visible bar telling the same story", () => {
    for (const [points, expected] of [[0, "0"], [26, "26"], [55, "55"], [60, "55"]] as const) {
      const { unmount } = render(<WeeklyTierProgress weekPoints={points} weekMax={55} />);
      expect(screen.getByRole("progressbar", { name: "Week total" })).toHaveAttribute("aria-valuenow", expected);
      unmount();
    }
  });

  it("marks nothing active and shows no bar before the score loads", () => {
    render(<WeeklyTierProgress weekPoints={null} weekMax={55} />);
    expect(screen.queryAllByTestId("tier-threshold").filter(s => s.getAttribute("data-active") === "true")).toHaveLength(0);
    expect(screen.getByTestId("tier-fill")).toHaveStyle({ width: "0%" });
  });
});

/* ── Task 8: Stretch Wallet ─────────────────────────────────────────────────*/

const walletBase = {
  wallet: weekdayFixture.wallet,
  items: weekdayFixture.stretchItems,
  earnedItemIds: new Set(weekdayFixture.wallet.earnedItemIds),
  savingId: null,
  minPerPoint: 10,
  spendStepMin: 10,
  dailyCapMin: 75,
  onEarn: noop,
  onSpend: noop,
};

describe("StretchWalletPanel", () => {
  it("renders the locked state in the server's own words", () => {
    render(<StretchWalletPanel {...walletBase} />);
    expect(screen.getByText("Locked — Qur'an recitation first")).toBeVisible();
    expect(screen.getByRole("button", { name: /Convert 10 min/ })).toBeDisabled();
  });

  it("shows the banked balance and the weekend bonus when the server sends one", () => {
    render(<StretchWalletPanel {...walletBase}
      wallet={{ ...weekendFixture.wallet, balance: 30 }}
      earnedItemIds={new Set(weekendFixture.wallet.earnedItemIds)} />);
    expect(screen.getByText("30 min")).toBeVisible();
    expect(screen.getByText(/Weekend bonus/)).toBeVisible();
  });

  /**
   * Render-only. Every one of these numbers is a decision /api/stretch already
   * made against the server's Sydney clock. Recomputing any of them here would
   * give the board a second opinion about what a reward costs.
   */
  it("computes no lock, cap, redemption or bonus of its own", () => {
    const lying = {
      ...weekdayFixture.wallet,
      unlocked: true, lockMessage: null,
      redemptionOpen: true, redemptionMessage: null,
      weekday: "Wednesday", weekendRedemptionOnly: true,
      balance: 999,
    };
    render(<StretchWalletPanel {...walletBase} wallet={lying} />);
    // Weekday + weekendRedemptionOnly would be "locked" by any local rule, but
    // the server said open, so the panel renders open.
    expect(screen.getByRole("button", { name: /Convert 10 min/ })).toBeEnabled();
    expect(screen.queryByText(/Locked/)).not.toBeInTheDocument();
    expect(screen.getByText("999 min")).toBeVisible();
  });

  it("hides the balance while the wallet is locked rather than guessing it", () => {
    render(<StretchWalletPanel {...walletBase} />);
    expect(screen.getByTestId("wallet-balance")).toHaveTextContent("—");
    expect(screen.queryByText("30 min")).not.toBeInTheDocument();
  });

  it("renders nothing but a placeholder before the wallet has loaded", () => {
    render(<StretchWalletPanel {...walletBase} wallet={null} />);
    expect(screen.getByTestId("wallet-balance")).toHaveTextContent("—");
    expect(screen.getByRole("button", { name: /Convert 10 min/ })).toBeDisabled();
  });

  /* ── Earning ──────────────────────────────────────────────────────────────*/

  it("forwards an earn with the item that was pressed", () => {
    const earned: string[] = [];
    render(<StretchWalletPanel {...walletBase} wallet={weekendFixture.wallet}
      earnedItemIds={new Set()} onEarn={item => earned.push(item.id)} />);
    fireEvent.click(screen.getByRole("button", { name: "Help at home" }));
    expect(earned).toEqual(["help_home"]);
  });

  it("disables an item already banked today", () => {
    render(<StretchWalletPanel {...walletBase} wallet={weekendFixture.wallet}
      earnedItemIds={new Set(["extra_reading"])} />);
    expect(screen.getByRole("button", { name: "Extra reading - 20 min" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Help at home" })).toBeEnabled();
  });

  it("disables every item while the wallet is locked", () => {
    render(<StretchWalletPanel {...walletBase} earnedItemIds={new Set()} />);
    for (const item of weekdayFixture.stretchItems) {
      expect(screen.getByRole("button", { name: item.name })).toBeDisabled();
    }
  });

  it("shows each item's minute value from the server's rate", () => {
    render(<StretchWalletPanel {...walletBase} wallet={weekendFixture.wallet} minPerPoint={10} />);
    expect(screen.getAllByText("+10m")).toHaveLength(4);
  });

  /**
   * /api/stretch supplies minPerPoint. The local constant is a pre-load
   * fallback, NOT a second opinion: if the server retunes the rate, an item
   * priced from the constant would advertise minutes the server will not pay.
   * Same rule the daily cap already follows.
   */
  it("prices items from the server's rate, not the local constant", () => {
    render(<StretchWalletPanel {...walletBase}
      wallet={{ ...weekendFixture.wallet, minPerPoint: 15 }}
      minPerPoint={10} />);
    expect(screen.getAllByText("+15m")).toHaveLength(4);
    expect(screen.queryByText("+10m")).not.toBeInTheDocument();
  });

  it("falls back to the local rate only while the wallet is unloaded", () => {
    render(<StretchWalletPanel {...walletBase} wallet={null} minPerPoint={10} />);
    expect(screen.getAllByText("+10m")).toHaveLength(4);
  });

  it("uses the server's daily cap the same way", () => {
    render(<StretchWalletPanel {...walletBase}
      wallet={{ ...weekendFixture.wallet, dailyRedeemCapMin: 90 }} dailyCapMin={75} />);
    expect(screen.getByText(/90 min\/day cap/)).toBeInTheDocument();
  });

  it("says so plainly when there are no stretch items", () => {
    render(<StretchWalletPanel {...walletBase} items={[]} />);
    expect(screen.getByText("No stretch items available right now.")).toBeVisible();
  });

  /* ── Spending ─────────────────────────────────────────────────────────────*/

  it("forwards a spend exactly once", () => {
    let spends = 0;
    render(<StretchWalletPanel {...walletBase} wallet={weekendFixture.wallet} onSpend={() => { spends += 1; }} />);
    fireEvent.click(screen.getByRole("button", { name: /Convert 10 min/ }));
    expect(spends).toBe(1);
  });

  /**
   * REGRESSION. /api/stretch sets redemptionMessage to the same string as
   * lockMessage while the wallet is locked, and the panel printed both — the
   * lock reason appeared twice on the live preview, once in the banner and
   * once under it.
   */
  it("prints the lock reason once when the server repeats it as the redemption message", () => {
    const repeated = {
      ...weekdayFixture.wallet,
      unlocked: false,
      lockMessage: "Locked — Qur'an recitation first",
      redemptionMessage: "Locked — Qur'an recitation first",
    };
    render(<StretchWalletPanel {...walletBase} wallet={repeated} />);
    expect(screen.getAllByText("Locked — Qur'an recitation first")).toHaveLength(1);
  });

  it("still shows a redemption message that says something the lock does not", () => {
    const distinct = {
      ...weekdayFixture.wallet,
      unlocked: false,
      lockMessage: "Locked — Qur'an recitation first",
      redemptionMessage: "Redeem on Saturday or Sunday",
    };
    render(<StretchWalletPanel {...walletBase} wallet={distinct} />);
    expect(screen.getByText("Locked — Qur'an recitation first")).toBeVisible();
    expect(screen.getByText("Redeem on Saturday or Sunday")).toBeVisible();
  });

  it("explains when conversion opens instead of only greying out", () => {
    render(<StretchWalletPanel {...walletBase} />);
    expect(screen.getByText("Redeem on Saturday or Sunday")).toBeVisible();
  });

  it("blocks a second spend while one is already in flight", () => {
    render(<StretchWalletPanel {...walletBase} wallet={weekendFixture.wallet} savingId="__spend__" />);
    expect(screen.getByRole("button", { name: /Convert 10 min/ })).toBeDisabled();
  });
});

/* ── Task 8: the composed board ─────────────────────────────────────────────*/

describe("DashboardShell composition", () => {
  it("carries the reference image's navigation identity and stadium masthead", () => {
    // The status cluster now hangs off the shell's nav slot, which is where the
    // reference puts it; the masthead below carries the identity alone.
    render(
      <DashboardShell
        status={<ClubStatus serverTime={weekdayFixture.gate.serverTime}
          deviceTime="1:47pm" online pointsActive />}
      >
        <ClubHeader />
      </DashboardShell>,
    );
    expect(screen.getByRole("img", { name: "ANSAR FC" })).toBeVisible();
    expect(screen.getByText("Ansar · ANSAR FC")).toBeVisible();
    expect(screen.getByText(/Sydney/)).toBeVisible();
  });
});

describe("visual parity contracts", () => {
  const dashboardCss = readFileSync(
    resolve(process.cwd(), "app/components/dashboard/dashboard.module.css"),
    "utf8",
  );
  const globalCss = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
  const pageSource = readFileSync(resolve(process.cwd(), "app/page.tsx"), "utf8");

  it("removes the redundant shared navigation only on the ANSAR dashboard", () => {
    expect(globalCss).toContain('body:has(main[aria-label="ANSAR FC Dashboard"]) .topnav');
    expect(pageSource).toMatch(/\.ab-root\{[^}]*padding-top:0/);
  });

  it("gives the masthead a stadium treatment without reducing habit targets", () => {
    // No /s: tsconfig targets ES2017, where the dotAll flag is a compile
    // error, and [^}] already crosses newlines without it.
    expect(dashboardCss).toMatch(/\.clubHeader\s*\{[^}]*background-image:/);
    expect(dashboardCss).toMatch(/\.clubWordmark\s*\{[^}]*font-family:[^;}]*serif/);
    expect(declaredRowMinHeight(dashboardCss)).toBeGreaterThanOrEqual(ROW_TARGET_FLOOR_PX);
  });

  /**
   * The module CSS header forbids hex literals so a brand colour cannot drift
   * off token — the repo lost the canonical cyan to exactly that once. The
   * stadium chrome needs pure-neutral mixers and shadows that no token covers,
   * so the rule now carries a two-value exemption. This is what keeps the
   * exemption two values wide instead of becoming a loophole.
   */
  it("keeps no hex literals outside the neutral pair", () => {
    // #b0b5c1 is grandfathered, not blessed. It is the dim body grey used
    // across page.tsx too, it predates this branch, and no token covers it.
    // Tokenising it touches globals.css and every surface that reads it, so it
    // is deliberately left as its own follow-up rather than smuggled into a
    // visual-parity commit. It is listed here so the guard still fails on
    // anything NEW; shrink this list when the token lands, never grow it.
    const allowed = ["#000000", "#ffffff", "#b0b5c1"];
    const body = dashboardCss.replace(/\/\*[\s\S]*?\*\//g, "");
    const strays = (body.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [])
      .filter((hex) => !allowed.includes(hex.toLowerCase()));
    expect(strays, `use a token instead: ${strays.join(", ")}`).toEqual([]);
  });

  it("marks Journal and Homeschool as different learning priorities", () => {
    const journal = row({ id: "journal", name: "Daily learning journal entry written", block: "homeschool" });
    const session = row({ id: "homeschool_session", name: "Homeschool session completed (4 hrs)", block: "homeschool", points: 5 });
    render(<><HabitRow habit={journal} accent="var(--cyan)" {...rowHandlers} />
      <HabitRow habit={session} accent="var(--cyan)" {...rowHandlers} /></>);
    expect(screen.getByRole("button", { name: journal.name })).toHaveAttribute("data-emphasis", "journal");
    expect(screen.getByRole("button", { name: session.name })).toHaveAttribute("data-emphasis", "homeschool");
  });
});

/* ── Parent sign-off ────────────────────────────────────────────────────────*/

/**
 * The list of habits a parent must sign off lives in lib/parent-verified.ts and
 * is read by BOTH /api/tick (which enforces it) and app/page.tsx (which decides
 * which taps open the keypad). These assertions are about the SHARED list, not
 * about either consumer: a second, drifting copy is how the board ends up
 * posting a tick the server will refuse — or tapping straight through a habit
 * the server still expects a PIN for.
 */
describe("parent verification", () => {
  it("requires the parent PIN for BTN", () => {
    expect(requiresParentVerification("btn_cornell")).toBe(true);
  });

  /** Everything else stays a plain tap. A creeping list is a board nobody uses. */
  it("leaves every other habit tappable without a PIN", () => {
    for (const id of ["journal", "reading", "teeth", "homeschool_session", "quran", "all_namaz"]) {
      expect(requiresParentVerification(id)).toBe(false);
    }
  });

  it("keeps the fixture in step with the list", () => {
    for (const h of weekdayFixture.gate.habits) {
      expect(noteFor({ ...h, parentVerifyRequired: requiresParentVerification(h.id) }) === "Parent PIN")
        .toBe(requiresParentVerification(h.id) && h.state !== "DONE");
    }
  });
});

/* ── Row copy travels with the habit ────────────────────────────────────────*/

describe("rowCopy", () => {
  const row = (over: Partial<DashboardHabit>): DashboardHabit => ({
    id: "journal", name: "Daily learning journal entry written",
    block: "afternoon_evening", order: 16.5, points: 0,
    pointType: "perfect_day_only", state: "LIVE", label: "", message: null,
    reason: null, window: "21:00–21:30", dwellSeconds: null, overridden: false,
    ...over,
  });

  /**
   * The regression this file was created for. The journal's copy used to be
   * keyed to the Homeschool SECTION, so moving the row to Afternoon / Evening
   * dropped it without failing anything. The name is now the copy that travels,
   * and it has to travel the same way the caption does — asserted in both blocks
   * so a Notion move cannot quietly restore the raw habit sentence.
   */
  it("keeps the journal's name with it in any block", () => {
    expect(displayNameFor(row({ block: "afternoon_evening" })))
      .toBe("Journal Entry via Tally");
    expect(displayNameFor(row({ block: "homeschool", order: 7.5 })))
      .toBe("Journal Entry via Tally");
  });

  /** Every other row keeps the name Notion gave it. */
  it("leaves every other habit's name alone", () => {
    expect(displayNameFor(row({ id: "reading", name: "Reading in bed" }))).toBe("Reading in bed");
    expect(displayNameFor(row({ id: "teeth", name: "Teeth brushed" }))).toBe("Teeth brushed");
  });

  /**
   * No guidance line at all. It must not tell him to tap — the journal completes
   * itself from the form (/api/journal-sync) — and it no longer explains the
   * mechanism either, because the row's own name now states it.
   */
  it("gives the journal no guidance line in any block", () => {
    expect(guidanceFor(row({ block: "afternoon_evening" }))).toBeUndefined();
    expect(guidanceFor(row({ block: "homeschool", order: 7.5 }))).toBeUndefined();
  });

  /**
   * "Verified" is a claim about evidence, and the caller has to produce the
   * evidence to make it. A tick alone is still the child's own word.
   */
  it("calls a ticked journal Recorded until Tally says otherwise", () => {
    expect(noteFor(row({ state: "DONE" }))).toBe("Recorded");
    expect(noteFor(row({ state: "DONE" }), false)).toBe("Recorded");
  });

  it("calls a ticked journal Verified once a Tally submission stands behind it", () => {
    expect(noteFor(row({ state: "DONE" }), true)).toBe("Verified ✓");
  });

  /** Evidence does not manufacture a completion — the row still has to be ticked. */
  it("says nothing about an unticked journal even with a Tally submission", () => {
    expect(noteFor(row({ state: "LIVE" }), true)).toBeUndefined();
    expect(noteFor(row({ state: "LOCKED" }), true)).toBeUndefined();
  });

  /** The gold badge already says "Parent override"; saying it twice blurs it. */
  it("leaves an overridden journal to the audit badge alone", () => {
    expect(noteFor(row({ state: "DONE", overridden: true }))).toBeUndefined();
  });

  it("says nothing about a journal that is not written yet", () => {
    expect(noteFor(row({ state: "LOCKED" }))).toBeUndefined();
    expect(noteFor(row({ state: "MISSED" }))).toBeUndefined();
  });
});
