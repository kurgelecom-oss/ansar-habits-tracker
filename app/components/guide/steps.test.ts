import { describe, expect, it } from "vitest";
import { GUIDES, guideFor } from "./steps";

describe("guide steps", () => {
  it("treats a trailing slash as the same screen", () => {
    expect(guideFor("/school/")).toBe(GUIDES["/school"]);
    expect(guideFor("/")).toBe(GUIDES["/"]);
  });

  it("has nothing for no router and for an unknown screen", () => {
    expect(guideFor(null)).toEqual([]);
    expect(guideFor("/export")).toEqual([]);
  });

  it("answers all five questions on every step of every screen", () => {
    for (const [route, steps] of Object.entries(GUIDES)) {
      expect(steps.length, route).toBeGreaterThan(0);
      for (const s of steps) {
        expect(s.title.trim(), route).not.toBe("");
        for (const field of [s.target, s.what, s.tracked, s.measured, s.controlled, s.leadsTo]) {
          expect(field.trim().length, `${route} · ${s.title}`).toBeGreaterThan(5);
        }
      }
    }
  });

  /** These numbers are quoted from the rule files. If a rule moves, this fails
   *  until the guide's sentence moves with it. */
  it("quotes the scoring rules as they stand", async () => {
    const { WEEKLY_MAX, THRESHOLDS } = await import("../../lib/scoring");
    const { WEEKEND_UNLOCK_MIN_POINTS } = await import("../../lib/weekend");
    const { STREAK_QUALIFY_MIN } = await import("../../lib/streak");
    const today = GUIDES["/"].map(s => Object.values(s).join(" ")).join(" ");
    expect(today).toContain(`out of ${WEEKLY_MAX}`);
    for (const t of THRESHOLDS.filter(t => t.min > 0)) expect(today).toContain(String(t.min));
    expect(today).toContain(`Bench (${WEEKEND_UNLOCK_MIN_POINTS} points)`);
    expect(today).toContain(`at least ${STREAK_QUALIFY_MIN} habits`);
  });
});
