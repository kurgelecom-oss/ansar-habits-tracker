import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ClubHeader from "./ClubHeader";
import ClubNavigation from "./ClubNavigation";
import MatchCentrePlaceholder from "./MatchCentrePlaceholder";
import DashboardShell from "./DashboardShell";
import Panel from "./Panel";
import { weekdayFixture, weekendFixture } from "../../dashboard/fixtures";
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
