import { describe, expect, it } from "vitest";
import { createEvent, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ClubHeader from "./ClubHeader";
import ClubNavigation from "./ClubNavigation";
import DayProgrammePanel from "./DayProgrammePanel";
import HabitPanel from "./HabitPanel";
import HabitRow from "./HabitRow";
import MatchCentrePlaceholder from "./MatchCentrePlaceholder";
import StretchWalletPanel from "./StretchWalletPanel";
import WeeklyTierProgress from "./WeeklyTierProgress";
import WorkWeekPanel from "./WorkWeekPanel";
import DashboardShell from "./DashboardShell";
import Panel from "./Panel";
import { weekdayFixture, weekendFixture } from "../../dashboard/fixtures";
import type { DashboardHabit } from "../../dashboard/types";
import { deriveMatchReadiness, groupHabitsByBlock } from "../../dashboard/model";

const FUTURE_ITEMS = ["Habits", "Quests", "Team", "Table", "History", "Settings"];

describe("ClubNavigation", () => {
  it("marks Dashboard as the only active destination", () => {
    render(<ClubNavigation />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    for (const label of FUTURE_ITEMS) {
      expect(screen.getByText(label)).toHaveAttribute("aria-disabled", "true");
      expect(screen.getByText(label)).toHaveAttribute("title", "Coming later");
    }
  });

  /**
   * Spec §7.2: future items must not link anywhere. A disabled span with no
   * href cannot be tabbed to or followed, which is the whole point.
   */
  it("gives future items no link to follow", () => {
    render(<ClubNavigation />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    for (const label of FUTURE_ITEMS) {
      expect(screen.getByText(label).tagName).toBe("SPAN");
      expect(screen.getByText(label)).not.toHaveAttribute("href");
    }
  });

  /** Spec §7.1 is explicit: the word is Table, never Leaderboards. */
  it("uses Table, not Leaderboards", () => {
    render(<ClubNavigation />);
    expect(screen.getByText("Table")).toBeInTheDocument();
    expect(screen.queryByText(/Leaderboard/i)).not.toBeInTheDocument();
  });

  it("keeps the seven items in spec order", () => {
    render(<ClubNavigation />);
    const items = screen.getAllByTestId("club-nav-item").map(el => el.textContent);
    expect(items).toEqual(["Dashboard", ...FUTURE_ITEMS]);
  });

  /**
   * The crest identifies the bar; the wordmark belongs to ClubHeader. Two
   * printed "ANSAR FC"s made neither the dominant one, so the nav carries the
   * mark as an image with an accessible name and no visible duplicate text.
   */
  it("carries the visible ANSAR FC identity used by the reference navigation", () => {
    render(<ClubNavigation />);
    expect(screen.getByRole("img", { name: "ANSAR FC" })).toBeInTheDocument();
    expect(screen.getByText("ANSAR FC")).toBeVisible();
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

  it("covers every configured weekday habit, journal before the session", () => {
    const grouped = groupHabitsByBlock(weekdayFixture.gate.habits);
    expect(weekdayFixture.gate.habits).toHaveLength(16);
    expect(grouped.pre_homeschool).toHaveLength(7);
    expect(grouped.homeschool.map(h => h.id)).toEqual(["journal", "homeschool_session"]);
    expect(grouped.afternoon_evening.map(h => h.id)).toEqual([
      "btn_cornell", "shower", "all_namaz", "room_tidy", "teeth", "reading",
    ]);
    expect(grouped.conditional.map(h => h.id)).toEqual(["soccer_training"]);
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

describe("ClubHeader", () => {
  const serverTime = weekdayFixture.gate.serverTime;

  it("labels the server clock as the one every gate uses", () => {
    render(<ClubHeader serverTime={serverTime} deviceTime="1:47pm" online pointsActive />);
    expect(screen.getByText("Ansar · ANSAR FC")).toBeInTheDocument();
    expect(screen.getByText(/Sydney/)).toHaveAttribute("title", "Server clock — every gate uses this");
  });

  /**
   * Spec §13: server and device time must stay distinguishable. Two clocks that
   * disagree are only safe while it is obvious which one decides anything.
   */
  it("keeps the device clock visibly display-only", () => {
    render(<ClubHeader serverTime={serverTime} deviceTime="1:47pm" online pointsActive />);
    const device = screen.getByText(/device/);
    expect(device).toHaveAttribute("title", "This device's clock — display only, no gate reads it");
    expect(device).toHaveTextContent("1:47pm");
    expect(screen.getByText(/Sydney/)).not.toBe(device);
  });

  it("shows the server clock's own weekday and time, not the device's", () => {
    render(<ClubHeader serverTime={serverTime} deviceTime="9:00pm" online pointsActive />);
    expect(screen.getByText(/Sydney/)).toHaveTextContent("1:45pm");
    expect(screen.getByText(/Sydney/)).toHaveTextContent("Wednesday");
  });

  it("renders no server clock at all before the gate answers", () => {
    render(<ClubHeader serverTime={null} deviceTime="" online pointsActive />);
    expect(screen.queryByText(/Sydney/)).not.toBeInTheDocument();
    expect(screen.getByText("Ansar · ANSAR FC")).toBeInTheDocument();
  });

  it("states connection in text, not colour alone", () => {
    const { unmount } = render(<ClubHeader serverTime={serverTime} deviceTime="" online pointsActive />);
    expect(screen.getByText("Live")).toBeInTheDocument();
    unmount();
    render(<ClubHeader serverTime={serverTime} deviceTime="" online={false} pointsActive />);
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("shows the soft-launch badge only while points are inactive", () => {
    const { unmount } = render(<ClubHeader serverTime={serverTime} deviceTime="" online pointsActive={false} />);
    expect(screen.getByText("Soft-launch · points preview")).toBeInTheDocument();
    unmount();
    render(<ClubHeader serverTime={serverTime} deviceTime="" online pointsActive />);
    expect(screen.queryByText("Soft-launch · points preview")).not.toBeInTheDocument();
  });

  /** null means /api/settings has not answered — not that points are off. */
  it("stays silent about points while settings are still unknown", () => {
    render(<ClubHeader serverTime={serverTime} deviceTime="" online pointsActive={null} />);
    expect(screen.queryByText("Soft-launch · points preview")).not.toBeInTheDocument();
  });
});

describe("MatchCentrePlaceholder", () => {
  const readiness = deriveMatchReadiness({
    morningDone: 6, morningTotal: 7, homeschoolDone: false,
    journalState: "RECORDED", workSubmissionCount: 1,
  });

  it("says plainly that no fixture data is connected", () => {
    render(<MatchCentrePlaceholder readiness={readiness} />);
    expect(screen.getByText("REAL MADRID MATCH CENTRE")).toBeInTheDocument();
    expect(screen.getByText("Fixture data not connected yet")).toBeInTheDocument();
    expect(screen.getByText("Real data will appear here after the football provider is approved.")).toBeInTheDocument();
  });

  /**
   * The central prohibition of this task. Until a real provider is approved,
   * anything that reads as a scoreline is a fabricated football result.
   */
  it("invents no score", () => {
    render(<MatchCentrePlaceholder readiness={readiness} />);
    expect(screen.queryByText(/\d+\s*[–-]\s*\d+/)).not.toBeInTheDocument();
  });

  it("invents no opponent, competition, kickoff or countdown", () => {
    const { container } = render(<MatchCentrePlaceholder readiness={readiness} />);
    const text = container.textContent ?? "";
    for (const forbidden of [
      /\bvs\b/i, /Barcelona/i, /Atl[ée]tico/i, /La ?Liga/i, /Primera/i,
      /Champions League/i, /kick[- ]?off/i, /countdown/i, /full[- ]time/i,
      /half[- ]time/i, /Bernab/i,
    ]) {
      expect(text).not.toMatch(forbidden);
    }
  });

  it("shows only Real Madrid's own crest, labelled", () => {
    render(<MatchCentrePlaceholder readiness={readiness} />);
    const crests = screen.getAllByRole("img");
    expect(crests).toHaveLength(1);
    expect(crests[0]).toHaveAttribute("src", "/real-madrid.png");
    expect(crests[0]).toHaveAccessibleName("Real Madrid");
  });

  it("labels readiness and keeps it out of the score position", () => {
    render(<MatchCentrePlaceholder readiness={readiness} />);
    expect(screen.getByText("Match Readiness")).toBeInTheDocument();
    const region = screen.getByTestId("match-readiness");
    expect(region).toHaveTextContent("Match Readiness");
    expect(region).toHaveTextContent("54%");
    // The readiness figure must be inside its own labelled region, never in the
    // frame that will later hold a real scoreline.
    expect(screen.getByTestId("match-fixture")).not.toContainElement(region);
  });

  it("exposes readiness to assistive tech as a labelled progress value", () => {
    render(<MatchCentrePlaceholder readiness={readiness} />);
    const meter = screen.getByRole("progressbar", { name: "Match Readiness" });
    expect(meter).toHaveAttribute("aria-valuenow", "54");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
  });

  /**
   * The visible figure, the fill width and the announced value are one number.
   * If inconsistent data ever pushes it out of range, all three must move
   * together — a bar that draws 106% while announcing 106 against a max of 100
   * is wrong in two ways at once.
   */
  it("keeps figure, fill and announced value identical and in range when inputs disagree", () => {
    const overshoot = deriveMatchReadiness({
      morningDone: 8, morningTotal: 7, homeschoolDone: true,
      journalState: "VERIFIED", workSubmissionCount: 1,
    });
    render(<MatchCentrePlaceholder readiness={overshoot} />);
    expect(screen.getByTestId("match-readiness")).toHaveTextContent("100%");
    expect(screen.getByTestId("readiness-fill")).toHaveStyle({ width: "100%" });
    expect(screen.getByRole("progressbar", { name: "Match Readiness" }))
      .toHaveAttribute("aria-valuenow", "100");
  });

  it("draws and announces zero, not a negative bar, when a count arrives negative", () => {
    const undershoot = deriveMatchReadiness({
      morningDone: 0, morningTotal: 7, homeschoolDone: false,
      journalState: "MISSING", workSubmissionCount: -3,
    });
    render(<MatchCentrePlaceholder readiness={undershoot} />);
    expect(screen.getByTestId("match-readiness")).toHaveTextContent("0%");
    expect(screen.getByTestId("readiness-fill")).toHaveStyle({ width: "0%" });
    expect(screen.getByRole("progressbar", { name: "Match Readiness" }))
      .toHaveAttribute("aria-valuenow", "0");
  });

  /** Spec §8.4 and §5: readiness is learning state, never a football result. */
  it("does not describe readiness in football-result language", () => {
    const { container } = render(<MatchCentrePlaceholder readiness={readiness} />);
    expect(container.textContent).not.toMatch(/\b(score|goals?|won|lost|draw)\b/i);
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

  /**
   * Something has to yield at 390px, and it must not be the clock every gate
   * is decided against, nor whether the board is talking to the server.
   */
  it("drops the display-only clock but never the server clock or connection", () => {
    expect(rule("deviceClock")).toMatch(/display:\s*none/);
    expect(mobile).not.toMatch(/\.serverClock[^{]*\{[^}]*display:\s*none/);
    expect(mobile).not.toMatch(/\.connection[^{]*\{[^}]*display:\s*none/);
  });

  /** The fixture and the 168px readiness region cannot sit side by side. */
  it("stacks the Match Centre and releases its height cap", () => {
    expect(rule("matchCentre")).toMatch(/flex-direction:\s*column/);
    expect(rule("matchCentre")).toMatch(/max-height:\s*none/);
    expect(rule("matchReadiness")).toMatch(/min-width:\s*0/);
  });

  /** The desktop budget must survive the mobile rules being added. */
  it("leaves the desktop budget declarations untouched", () => {
    expect(/\.matchCentre\s*\{[^}]*max-height:\s*128px/.test(css)).toBe(true);
    expect(/\.clubHeader\s*\{[^}]*height:\s*40px/.test(css)).toBe(true);
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
   * The board cannot scroll at this width — .ab-root is overflow-y:hidden — so
   * a row past the fold is unreachable, not merely below it. Height is
   * recovered from chrome only.
   */
  it("recovers height from the placeholder Match Centre, not from habit rows", () => {
    expect(shortDesktop).toMatch(/\.matchCentre[^{]*\{[^}]*max-height:\s*56px/);
    expect(shortDesktop).not.toMatch(/\.habitRow[^{]*\{[^}]*min-height/);
  });

  /** The frame may get shorter, but it must not stop telling the truth. */
  it("keeps the Match Centre honest while compacting it", () => {
    expect(shortDesktop).not.toMatch(/\.matchUnavailable[^{]*\{[^}]*display:\s*none/);
    expect(shortDesktop).not.toMatch(/\.matchReadiness[^{]*\{[^}]*display:\s*none/);
    expect(shortDesktop).not.toMatch(/\.readinessValue[^{]*\{[^}]*display:\s*none/);
  });

  /**
   * .matchCentre is overflow:hidden, so anything taller than its cap is cut
   * silently. The readiness block is laid out two-up at this size for exactly
   * that reason; stacked, it overran the frame and clipped the journal note.
   */
  it("lays readiness out to fit the compacted frame rather than overflow it", () => {
    expect(shortDesktop).toMatch(/\.matchReadiness[^{]*\{[^}]*display:\s*grid/);
    expect(shortDesktop).toMatch(/\.readinessNote[^{]*\{[^}]*grid-column/);
  });

  it("keeps the habit row target at 44px everywhere", () => {
    expect(base("habitRow")).toMatch(/min-height:\s*44px/);
    expect(css).not.toMatch(/\.habitRow[^{]*\{[^}]*min-height:\s*(?!44px)\d+px/);
  });

  it("tightens subsection dividers without touching row spacing", () => {
    expect(/\.programmeSection \+ \.programmeSection\s*\{[^}]*margin-top:\s*6px/.test(css)).toBe(true);
    expect(/\.programmeSection \+ \.programmeSection\s*\{[^}]*padding-top:\s*6px/.test(css)).toBe(true);
  });

  /** The roomier desktop spacing must survive for tall windows. */
  it("leaves the tall-desktop budget declarations intact", () => {
    expect(/\.matchCentre\s*\{[^}]*max-height:\s*128px/.test(css)).toBe(true);
    // (?<!min-|max-) matters: while the base header stood at 40px this assertion
    // read the base block, but the moment it grew the same regex started
    // matching the phone block's `min-height: 40px` and passed on a rule that
    // has nothing to do with the desktop budget. Pin the bare property.
    expect(/\.clubHeader\s*\{[^}]*(?<!min-|max-)height:\s*64px/.test(css)).toBe(true);
    expect(/\.clubNav\s*\{[^}]*(?<!min-|max-)height:\s*44px/.test(css)).toBe(true);
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
  const RECOVERED_NAV_PX = 40;
  const FUNDED_CEILING = 234 + RECOVERED_NAV_PX;

  it("still funds the raised ceiling by hiding the shared bar", () => {
    expect(globalCss).toContain('body:has(main[aria-label="ANSAR FC Dashboard"]) .topnav');
    expect(globalCss).toMatch(/--nav-h:\s*40px/);
    expect(pageSource).toMatch(/\.ab-root\{[^}]*padding-top:0/);
  });

  it("keeps each region inside its own cap", () => {
    expect(px("clubNav", "height")).toBeLessThanOrEqual(54);
    expect(px("clubHeader", "height")).toBeLessThanOrEqual(64);
    expect(px("matchCentre", "max-height")).toBeLessThanOrEqual(132);
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
   * (max-height:900px). Measured there the stack is 40 + 62 + 56 + two 6px
   * gaps = 170, against 144 before the masthead grew — 26px spent out of the
   * 40px recovered, so the nine-row weekday programme ends up 14px better off.
   */
  it("keeps the short-desktop stack inside what the hidden bar paid for", () => {
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
    expect(stack).toBe(170);
    expect(stack).toBeLessThanOrEqual(144 + RECOVERED_NAV_PX);
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
    expect(screen.getByText("Opens 1:30pm")).toBeVisible();
    expect(screen.getByText("Missed")).toBeVisible();
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

  it("summarises completion and block points", () => {
    render(<HabitPanel title="Morning Habits" accent="var(--ansar-warning)" habits={morning}
      doneCount={6} blockPoints={2} {...rowHandlers} />);
    expect(screen.getByText("6/7")).toBeVisible();
    expect(screen.getByText("2 pts")).toBeVisible();
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
  it("puts the journal first and the session second", () => {
    render(<DayProgrammePanel {...programme(weekdayFixture)} {...rowHandlers} />);
    const items = screen.getAllByTestId("homeschool-item");
    expect(items[0]).toHaveTextContent("Daily learning journal entry written");
    expect(items[1]).toHaveTextContent("Homeschool session completed");
  });

  /**
   * The journal is DONE in the weekday fixture. It is a self-certified tick, so
   * the only honest word for it is Recorded. "Verified" must not appear
   * anywhere until a real Tally record is matched against it.
   */
  it("calls a completed journal Recorded and never Verified", () => {
    render(<DayProgrammePanel {...programme(weekdayFixture)} {...rowHandlers} />);
    expect(screen.getByText("Recorded")).toBeInTheDocument();
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
  });

  /** Amendment 8027d53: no configured habit may vanish to protect the layout. */
  it("renders every non-morning habit the day configures", () => {
    render(<DayProgrammePanel {...programme(weekdayFixture)} {...rowHandlers} />);
    for (const id of ["btn_cornell", "shower", "all_namaz", "room_tidy", "teeth", "reading", "soccer_training"]) {
      expect(screen.getByTestId(`programme-${id}`)).toBeInTheDocument();
    }
    expect(screen.getAllByTestId("homeschool-item")).toHaveLength(2);
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
    expect(names[5]).toContain("Reading in bed");
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
    fireEvent.click(screen.getAllByTestId("homeschool-item")[1].querySelector("button")!);
    expect(ticks).toEqual(["soccer_training", "homeschool_session"]);
  });

  it("summarises completion across the whole programme", () => {
    render(<DayProgrammePanel {...programme(weekdayFixture)} {...rowHandlers} />);
    // Weekday fixture: journal DONE, session LIVE, six evening rows, soccer LIVE.
    expect(screen.getByText("1/9")).toBeVisible();
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

  it("marks an overridden journal without claiming it was earned", () => {
    const grouped = programme(weekdayFixture);
    const overridden = grouped.homeschool.map(h =>
      h.id === "journal" ? { ...h, overridden: true } : h);
    render(<DayProgrammePanel {...grouped} homeschool={overridden} {...rowHandlers} />);
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
    render(<DashboardShell><ClubHeader serverTime={weekdayFixture.gate.serverTime}
      deviceTime="1:47pm" online pointsActive /></DashboardShell>);
    expect(screen.getAllByText(/ANSAR FC/)).toHaveLength(2);
    expect(screen.getByText("Ansar · ANSAR FC")).toBeVisible();
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
    expect(dashboardCss).toMatch(/\.habitRow\s*\{[^}]*min-height:\s*44px/);
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
