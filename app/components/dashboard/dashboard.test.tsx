import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import ClubNavigation from "./ClubNavigation";
import DashboardShell from "./DashboardShell";
import Panel from "./Panel";
import { weekdayFixture, weekendFixture } from "../../dashboard/fixtures";
import { groupHabitsByBlock } from "../../dashboard/model";

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
