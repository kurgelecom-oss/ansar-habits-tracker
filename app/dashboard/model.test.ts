import { describe, expect, it } from "vitest";
import { groupHabitsByBlock, getTier, deriveMatchReadiness, journalEvidenceState } from "./model";
import type { DashboardHabit } from "./types";

/**
 * Minimal habit builder. Every field the display model reads has a default, so
 * each test names only the fields it is actually about.
 */
function habit(overrides: Partial<DashboardHabit> & Pick<DashboardHabit, "id">): DashboardHabit {
  return {
    name: overrides.id,
    block: "pre_homeschool",
    order: 1,
    points: 0,
    pointType: "block",
    state: "LIVE",
    label: "",
    message: null,
    reason: null,
    window: null,
    dwellSeconds: null,
    overridden: false,
    ...overrides,
  };
}

describe("groupHabitsByBlock", () => {
  it("keeps zero-point journal first", () => {
    const grouped = groupHabitsByBlock([
      habit({ id: "homeschool_session", block: "homeschool", order: 8, points: 5 }),
      habit({ id: "journal", block: "homeschool", order: 7.5, points: 0, pointType: "prerequisite" }),
    ]);
    expect(grouped.homeschool.map(h => h.id)).toEqual(["journal", "homeschool_session"]);
  });

  /**
   * Contract amendment 8027d53: Today's Programme carries homeschool,
   * afternoon_evening and conditional. Nothing configured may be dropped, so
   * every block key exists on the result even when a day has none of them.
   */
  it("returns every block key so no configured habit can be silently dropped", () => {
    const grouped = groupHabitsByBlock([]);
    expect(Object.keys(grouped).sort()).toEqual([
      "afternoon_evening", "conditional", "homeschool", "pre_homeschool",
    ]);
    expect(grouped.conditional).toEqual([]);
  });

  it("routes each real block to its own group in Notion order", () => {
    const grouped = groupHabitsByBlock([
      habit({ id: "soccer_training", block: "conditional", order: 18 }),
      habit({ id: "reading", block: "afternoon_evening", order: 17 }),
      habit({ id: "btn_cornell", block: "afternoon_evening", order: 12 }),
      habit({ id: "quran", block: "pre_homeschool", order: 2 }),
      habit({ id: "bed_dressed", block: "pre_homeschool", order: 1 }),
    ]);
    expect(grouped.pre_homeschool.map(h => h.id)).toEqual(["bed_dressed", "quran"]);
    expect(grouped.afternoon_evening.map(h => h.id)).toEqual(["btn_cornell", "reading"]);
    expect(grouped.conditional.map(h => h.id)).toEqual(["soccer_training"]);
    expect(grouped.homeschool).toEqual([]);
  });

  it("does not mutate the caller's array", () => {
    const input = [
      habit({ id: "homeschool_session", block: "homeschool", order: 8 }),
      habit({ id: "journal", block: "homeschool", order: 7.5 }),
    ];
    groupHabitsByBlock(input);
    expect(input.map(h => h.id)).toEqual(["homeschool_session", "journal"]);
  });

  it("keeps an unknown block instead of discarding its habits", () => {
    const grouped = groupHabitsByBlock([habit({ id: "mystery", block: "not_a_block", order: 99 })]);
    expect(grouped.not_a_block.map(h => h.id)).toEqual(["mystery"]);
  });
});

describe("getTier", () => {
  it.each([[42, "First Team"], [34, "Bench"], [26, "Reserves"], [0, "Training Ground"]])(
    "maps %i to %s", (points, label) => expect(getTier(points).label).toContain(label)
  );

  /** Boundaries are scoring truth, not presentation. They come from lib/scoring.ts. */
  it.each([
    [55, "First Team"], [41, "Bench"], [33, "Reserves"], [25, "Training Ground"],
  ])("maps boundary-adjacent %i to %s", (points, label) => {
    expect(getTier(points).label).toContain(label);
  });

  it("floors a negative total at Training Ground rather than returning undefined", () => {
    expect(getTier(-1).label).toContain("Training Ground");
  });

  it("exposes all four thresholds in descending order for the compact scale", () => {
    expect(getTier(0).thresholds.map(t => t.min)).toEqual([42, 34, 26, 0]);
  });
});

describe("deriveMatchReadiness", () => {
  it("does not model readiness as a football score", () => {
    const result = deriveMatchReadiness({
      morningDone: 7, morningTotal: 7, homeschoolDone: true,
      journalState: "RECORDED", workSubmissionCount: 4,
    });
    expect(result.label).toBe("Match Readiness");
    expect(result.percent).toBe(90);
    expect(result).not.toHaveProperty("homeScore");
    expect(result).not.toHaveProperty("awayScore");
  });

  it("reaches 100 only when the journal is verified", () => {
    const base = {
      morningDone: 7, morningTotal: 7, homeschoolDone: true, workSubmissionCount: 1,
    };
    expect(deriveMatchReadiness({ ...base, journalState: "VERIFIED" }).percent).toBe(100);
    expect(deriveMatchReadiness({ ...base, journalState: "RECORDED" }).percent).toBe(90);
  });

  it("treats a missing journal as zero credit", () => {
    expect(deriveMatchReadiness({
      morningDone: 0, morningTotal: 7, homeschoolDone: false,
      journalState: "MISSING", workSubmissionCount: 0,
    }).percent).toBe(0);
  });

  /** Weekend: no homeschool block, so the journal is NOT_REQUIRED and credits full. */
  it("gives full journal credit when the journal is not required", () => {
    expect(deriveMatchReadiness({
      morningDone: 7, morningTotal: 7, homeschoolDone: false,
      journalState: "NOT_REQUIRED", workSubmissionCount: 0,
    }).percent).toBe(60);
  });

  it("does not divide by zero when no morning habits are configured", () => {
    expect(deriveMatchReadiness({
      morningDone: 0, morningTotal: 0, homeschoolDone: false,
      journalState: "MISSING", workSubmissionCount: 0,
    }).percent).toBe(40);
  });

  it("caps work credit at one submission", () => {
    const of = (workSubmissionCount: number) => deriveMatchReadiness({
      morningDone: 0, morningTotal: 7, homeschoolDone: false,
      journalState: "MISSING", workSubmissionCount,
    }).percent;
    expect(of(1)).toBe(10);
    expect(of(9)).toBe(10);
  });

  it("passes the journal state through for truthful labelling", () => {
    expect(deriveMatchReadiness({
      morningDone: 0, morningTotal: 7, homeschoolDone: false,
      journalState: "OVERRIDE", workSubmissionCount: 0,
    }).journalState).toBe("OVERRIDE");
  });
});

describe("journalEvidenceState", () => {
  const journal = (over: Partial<DashboardHabit> = {}) =>
    habit({ id: "journal", block: "homeschool", order: 7.5, pointType: "prerequisite", ...over });

  it("reports NOT_REQUIRED when the day schedules no journal", () => {
    expect(journalEvidenceState(undefined)).toBe("NOT_REQUIRED");
  });

  /**
   * The whole point of this function. A self-certified tick is RECORDED, never
   * VERIFIED — nothing in this plan matches a Tally journal entry, so claiming
   * verification would be a lie the spec explicitly forbids.
   */
  it("calls a completed journal RECORDED, never VERIFIED", () => {
    expect(journalEvidenceState(journal({ state: "DONE" }))).toBe("RECORDED");
  });

  it("distinguishes a parent override from an earned entry", () => {
    expect(journalEvidenceState(journal({ state: "DONE", overridden: true }))).toBe("OVERRIDE");
  });

  it.each(["LIVE", "LOCKED", "MISSED"] as const)("reports MISSING while %s", state => {
    expect(journalEvidenceState(journal({ state }))).toBe("MISSING");
  });

  it("never returns VERIFIED for any state this plan can produce", () => {
    const states = ["DONE", "LIVE", "LOCKED", "MISSED"] as const;
    for (const state of states) {
      for (const overridden of [true, false]) {
        expect(journalEvidenceState(journal({ state, overridden }))).not.toBe("VERIFIED");
      }
    }
  });
});
