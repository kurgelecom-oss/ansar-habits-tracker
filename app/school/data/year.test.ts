import { describe, expect, it } from "vitest";
import { TERM, WEEKS, areaOfLabel, proofState, weekNumberOf, TERM_TARGETS, WEEKLY_PROOF, YEAR6_GOALS } from "./year";

describe("school year", () => {
  it("is an eleven-week term, one entry per week, seven days apart", () => {
    expect(TERM.weeks).toBe(11);
    expect(WEEKS).toHaveLength(TERM.weeks);
    WEEKS.forEach((w, i) => expect(weekNumberOf(w.start)).toBe(i + 1));
    expect(weekNumberOf(TERM.end)).toBe(11);
    expect(weekNumberOf("2026-10-04")).toBeNull();
    expect(weekNumberOf("2026-12-19")).toBeNull();
  });
  it("maps every board label to the area its weekly proof counts towards", () => {
    expect(areaOfLabel("Block 5 — Turkish")).toBe("Turkish");
    expect(areaOfLabel("Block 4 — Technologies")).toBe("Technologies");
    expect(areaOfLabel("Block 4 — Technologies + Languages")).toBe("Turkish");
    expect(areaOfLabel("Grammar")).toBe("English");
    expect(areaOfLabel("Block 4 — The Arts")).toBe("The Arts");
    expect(areaOfLabel("Block 4 — Skills mix")).toBeNull();
    expect(areaOfLabel("Teach-back")).toBeNull();
  });
  it("calls a week's proof done only when every block is ticked", () => {
    expect(proofState(4, 4, 2, 2)).toBe("done");
    expect(proofState(4, 2, 2, 2)).toBe("partial");
    expect(proofState(4, 0, 2, 2)).toBe("due");
    expect(proofState(4, 0, 2, 3)).toBe("missed");
    expect(proofState(4, 0, 3, 2)).toBe("upcoming");
    expect(proofState(0, 0, 2, 2)).toBe("none");
    expect(proofState(4, 0, 1, 3)).toBe("none");   // Week 1 predates the tracking
  });
  it("never says Christmas", () => {
    const text = JSON.stringify({ TERM, WEEKS, TERM_TARGETS, WEEKLY_PROOF, YEAR6_GOALS });
    expect(text).not.toMatch(/christmas|xmas/i);
  });
});
