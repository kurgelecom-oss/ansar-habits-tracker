import { describe, expect, it } from "vitest";
import {
  blockRolls, completedIds, countTone, daysBehind, fraction, habitRoll,
  type MobileHabit,
} from "./model";

/* The phone sheet's picking rules. Pure, so these are the whole contract:
   anything /m decides for itself is decided here and nowhere else. */

const h = (over: Partial<MobileHabit> & { id: string }): MobileHabit => ({
  name: over.id, block: "homeschool", order: 1, window: null,
  state: "LIVE", label: "Tap", ...over,
});

describe("habitRoll", () => {
  it("counts today and reports the percentage done", () => {
    const roll = habitRoll([
      h({ id: "a", state: "DONE", order: 1 }),
      h({ id: "b", state: "DONE", order: 2 }),
      h({ id: "c", state: "LIVE", order: 3 }),
    ]);
    expect(roll.done).toBe(2);
    expect(roll.total).toBe(3);
    expect(roll.percent).toBe(67);
  });

  it("offers the first LIVE habit by order as the next thing to do", () => {
    const roll = habitRoll([
      h({ id: "late", state: "LIVE", order: 9 }),
      h({ id: "early", state: "LIVE", order: 2 }),
      h({ id: "done", state: "DONE", order: 1 }),
    ]);
    expect(roll.next?.id).toBe("early");
    expect(roll.tone).toBe("live");
  });

  /* Between windows nothing is LIVE. The phone still has to say something
     useful, and "Opens 8:30am" is the server's own label on the next LOCKED
     row — going blank would read as a finished day. */
  it("falls back to the first LOCKED habit when nothing is open yet", () => {
    const roll = habitRoll([
      h({ id: "later", state: "LOCKED", order: 7, label: "Opens 1:30pm" }),
      h({ id: "soon", state: "LOCKED", order: 3, label: "Opens 8:30am" }),
    ]);
    expect(roll.next?.id).toBe("soon");
    expect(roll.tone).toBe("wait");
  });

  it("has nothing next once every habit is done", () => {
    const roll = habitRoll([h({ id: "a", state: "DONE" }), h({ id: "b", state: "DONE" })]);
    expect(roll.next).toBeNull();
    expect(roll.tone).toBe("done");
    expect(roll.percent).toBe(100);
  });

  it("reads as missed when the day is over and rows were not ticked", () => {
    const roll = habitRoll([
      h({ id: "a", state: "DONE", order: 1 }),
      h({ id: "b", state: "MISSED", order: 2 }),
      h({ id: "c", state: "MISSED", order: 3 }),
    ]);
    expect(roll.missed.map(m => m.id)).toEqual(["b", "c"]);
    expect(roll.tone).toBe("missed");
    // MISSED is not offered as "next": nothing can be done about it here.
    expect(roll.next).toBeNull();
  });

  /* Sunday, and a Notion outage, both arrive as an empty list. Neither may
     render as 100% — a blank roster is "off", never "done". */
  it("treats an empty day as off, not complete", () => {
    const roll = habitRoll([]);
    expect(roll.percent).toBe(0);
    expect(roll.tone).toBe("off");
    expect(roll.next).toBeNull();
  });
});

describe("countTone", () => {
  it("never reads an empty list as finished", () => {
    expect(countTone(0, 0)).toBe("off");
  });
  it("separates untouched, part-done and finished", () => {
    expect(countTone(0, 4)).toBe("wait");
    expect(countTone(2, 4)).toBe("live");
    expect(countTone(4, 4)).toBe("done");
  });
});

describe("blockRolls", () => {
  const habits = [
    h({ id: "m1", block: "pre_homeschool", state: "DONE" }),
    h({ id: "m2", block: "pre_homeschool", state: "MISSED" }),
    h({ id: "s1", block: "homeschool", state: "DONE" }),
    h({ id: "t1", block: "conditional", state: "LIVE" }),
  ];

  it("keeps the order it is given and drops blocks with no rows today", () => {
    const rolls = blockRolls(habits, ["pre_homeschool", "homeschool", "saturday_push", "conditional"]);
    expect(rolls.map(r => r.block)).toEqual(["pre_homeschool", "homeschool", "conditional"]);
  });

  it("lets a missed row outrank a part-done count", () => {
    const [morning, school] = blockRolls(habits, ["pre_homeschool", "homeschool"]);
    expect(morning).toMatchObject({ done: 1, total: 2, missed: 1, tone: "missed" });
    expect(school).toMatchObject({ done: 1, total: 1, tone: "done" });
  });
});

describe("completedIds", () => {
  it("takes the ticks from the gate's own DONE states", () => {
    const ids = completedIds([
      h({ id: "a", state: "DONE" }),
      h({ id: "b", state: "MISSED" }),
      h({ id: "c", state: "DONE" }),
    ]);
    expect([...ids].sort()).toEqual(["a", "c"]);
  });
});

describe("fraction", () => {
  it("prints a dash rather than a zero when a source has not answered", () => {
    expect(fraction(null, null)).toBe("—");
    expect(fraction(1, 4)).toBe("1/4");
    expect(fraction(0, 4)).toBe("0/4");
  });
});

describe("daysBehind", () => {
  it("counts whole days between the snapshot and today", () => {
    expect(daysBehind("2026-10-15T11:00:00.000Z", "2026-10-17")).toBe(2);
    expect(daysBehind("2026-10-17T02:00:00.000Z", "2026-10-17")).toBe(0);
  });
  it("says nothing when the snapshot never said", () => {
    expect(daysBehind(null, "2026-10-17")).toBeNull();
    expect(daysBehind(undefined, "2026-10-17")).toBeNull();
    expect(daysBehind("not-a-date", "2026-10-17")).toBeNull();
  });
  it("never reports a snapshot from the future as negative", () => {
    expect(daysBehind("2026-10-20T00:00:00.000Z", "2026-10-17")).toBe(0);
  });
});
