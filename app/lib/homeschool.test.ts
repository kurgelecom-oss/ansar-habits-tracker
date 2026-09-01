import { describe, expect, it } from "vitest";
import {
  buildDayLabel, daysSince, guideLines, mapProgramme, subjectId, SCHOOL_DAYS,
} from "./homeschool";

/* ════════════════════════════════════════════════════════════════════════════
   These replaced the week-page parser's tests on 2 Sept 2026.

   The old suite pinned regexes against prose — day headings, bold labels,
   colons, one level of callout nesting. All of that is gone: the board reads
   the 📆 Daily Programme table now, so the thing worth pinning is the MAPPING.
   A renamed column does not throw. It returns undefined, and undefined renders
   as an empty row on Ansar's board with no error anywhere, which is precisely
   the failure the table was meant to end.
   ══════════════════════════════════════════════════════════════════════════ */

const text = (s: string) => ({ rich_text: [{ plain_text: s }] });
const title = (s: string) => ({ title: [{ plain_text: s }] });

/** A programme row shaped the way the Notion query returns one. */
function row(over: Record<string, any> = {}) {
  return {
    id: "row-1",
    properties: {
      Name: title("Wed — Block 1 — Maths"),
      Label: text("Block 1 — Maths"),
      Duration: text("45 min"),
      Task: text("Khan Academy — next lesson."),
      "Day Topic": text("Military forts: defence and design"),
      Note: text(""),
      Week: text("Phase 1 — Week 8 (31 Aug–4 Sept)"),
      Date: { date: { start: "2026-09-02" } },
      Guide: { relation: [{ id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }] },
      ...over,
    },
  };
}

const GUIDES = new Map([["aaaaaaaabbbbccccddddeeeeeeeeeeee", ["Engine: Khan.", "Tracking: mastery %."]]]);

describe("mapProgramme", () => {
  it("maps a row onto the shape the sheet renders", () => {
    const { subjects } = mapProgramme([row()], GUIDES);
    expect(subjects).toHaveLength(1);
    expect(subjects[0]).toMatchObject({
      name: "Block 1 — Maths",
      duration: "45 min",
      detail: "Khan Academy — next lesson.",
      guide: ["Engine: Khan.", "Tracking: mastery %."],
    });
  });

  it("lifts the day's topic, note, week and date off the rows", () => {
    const { topic, week, isoDate } = mapProgramme([row()], GUIDES);
    expect(topic).toBe("Military forts: defence and design");
    expect(week).toBe("Phase 1 — Week 8 (31 Aug–4 Sept)");
    expect(isoDate).toBe("2026-09-02");
  });

  /**
   * Monday's Block 4 is "Technologies + Languages" — two learning areas, two
   * guides. Concatenating rather than picking the first is what stops half the
   * explainer silently going missing.
   */
  it("concatenates every related guide, in relation order", () => {
    const guides = new Map([
      ["11111111111111111111111111111111", ["Scratch and Code.org."]],
      ["22222222222222222222222222222222", ["Duolingo Turkish."]],
    ]);
    const { subjects } = mapProgramme([row({
      Guide: { relation: [{ id: "11111111-1111-1111-1111-111111111111" }, { id: "22222222-2222-2222-2222-222222222222" }] },
    })], guides);
    expect(subjects[0].guide).toEqual(["Scratch and Code.org.", "Duolingo Turkish."]);
  });

  it("falls back to the row title when Label is blank", () => {
    const { subjects } = mapProgramme([row({ Label: text("") })], GUIDES);
    expect(subjects[0].name).toBe("Wed — Block 1 — Maths");
  });

  /** A half-typed row is a blank line on a child's board. Drop it. */
  it("drops a row with no label at all", () => {
    const { subjects } = mapProgramme([row({ Label: text(""), Name: title("") })], GUIDES);
    expect(subjects).toHaveLength(0);
  });

  it("renders a missing duration as null, not an empty string", () => {
    const { subjects } = mapProgramme([row({ Duration: text("") })], GUIDES);
    expect(subjects[0].duration).toBeNull();
  });

  it("survives a relation pointing at a guide that no longer exists", () => {
    const { subjects } = mapProgramme([row()], new Map());
    expect(subjects[0].guide).toEqual([]);
    expect(subjects[0].detail).toBe("Khan Academy — next lesson.");
  });

  it("keeps ids unique across two blocks sharing a label", () => {
    const { subjects } = mapProgramme([row(), row()], GUIDES);
    expect(subjects[0].id).not.toBe(subjects[1].id);
  });
});

describe("buildDayLabel", () => {
  it("rebuilds the heading the week page used to spell out", () => {
    expect(buildDayLabel("Monday", "2026-08-31", "Hagia Sophia: the greatest building", ""))
      .toBe('Monday 31 August — "Hagia Sophia: the greatest building"');
  });

  it("brackets the day's note when there is one", () => {
    expect(buildDayLabel("Wednesday", "2026-09-02", "Military forts", "soccer training tonight"))
      .toBe('Wednesday 2 September — "Military forts" (soccer training tonight)');
  });

  it("degrades to the bare weekday when the date and topic are missing", () => {
    expect(buildDayLabel("Friday", null, "", "")).toBe("Friday");
  });

  /** A cell someone typed into by hand must not produce "Invalid Date". */
  it("ignores a date that is not a date", () => {
    expect(buildDayLabel("Friday", "next week", "Flex", "")).toBe('Friday — "Flex"');
  });
});

describe("daysSince", () => {
  it("counts whole days from a row's date to today", () => {
    expect(daysSince("2026-08-31", "2026-09-02")).toBe(2);
  });

  it("is negative for a week loaded ahead of time", () => {
    expect(daysSince("2026-09-07", "2026-09-02")).toBe(-5);
  });

  it("returns null when there is no date to compare", () => {
    expect(daysSince(null, "2026-09-02")).toBeNull();
  });
});

describe("guideLines", () => {
  it("splits a guide cell into one bullet per line", () => {
    expect(guideLines("Engine: Khan.\nTracking: mastery %.")).toEqual([
      "Engine: Khan.", "Tracking: mastery %.",
    ]);
  });

  /** A trailing newline in Notion must not render as an empty bullet. */
  it("drops blank lines", () => {
    expect(guideLines("One.\n\n  \nTwo.\n")).toEqual(["One.", "Two."]);
  });
});

describe("subjectId", () => {
  it("slugs a label and pins its position", () => {
    expect(subjectId("Block 1 — Maths", 0)).toBe("block-1-maths-0");
  });

  it("never returns a bare index for an unslugabble label", () => {
    expect(subjectId("—", 2)).toBe("subject-2");
  });
});

describe("SCHOOL_DAYS", () => {
  /** Friday is flex, and still a school day. The weekend is not. */
  it("runs Monday to Friday", () => {
    expect(SCHOOL_DAYS).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  });
});
