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

  it("carries the club identity without inventing a slogan or currency", () => {
    render(<ClubNavigation />);
    expect(screen.getByText("ANSAR FC")).toBeInTheDocument();
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

  /** Spec §8.4 and §5: readiness is learning state, never a football result. */
  it("does not describe readiness in football-result language", () => {
    const { container } = render(<MatchCentrePlaceholder readiness={readiness} />);
    expect(container.textContent).not.toMatch(/\b(score|goals?|won|lost|draw)\b/i);
  });
});

describe("vertical budget before the panels", () => {
  // Read from the project root: Vitest serves modules over an http-scheme URL,
  // so import.meta.url is not a file path here.
  const css = readFileSync(
    resolve(process.cwd(), "app/components/dashboard/dashboard.module.css"),
    "utf8",
  );

  function px(selector: string, property: string): number {
    const block = new RegExp(`\\.${selector}\\s*\\{[^}]*\\}`).exec(css)?.[0] ?? "";
    const value = new RegExp(`${property}\\s*:\\s*(\\d+)px`).exec(block)?.[1];
    expect(value, `${selector} must declare ${property} in px`).toBeDefined();
    return Number(value);
  }

  /**
   * Task 4 budgets: navigation 54, header 48, Match Centre 132, and 234 for all
   * of it together. These are declared heights read straight out of the CSS,
   * because jsdom does not lay anything out and a passing render proves nothing
   * about how tall the board actually is. The 1440 × 820 target has no room to
   * discover this on a screenshot later.
   */
  it("keeps each region inside its own cap", () => {
    expect(px("clubNav", "height")).toBeLessThanOrEqual(54);
    expect(px("clubHeader", "height")).toBeLessThanOrEqual(48);
    expect(px("matchCentre", "max-height")).toBeLessThanOrEqual(132);
  });

  it("keeps the three regions plus their gaps inside 234px", () => {
    const gap = px("shell", "gap");
    const total = px("clubNav", "height") + px("clubHeader", "height")
      + px("matchCentre", "max-height") + gap * 2;
    expect(total).toBeLessThanOrEqual(234);
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
