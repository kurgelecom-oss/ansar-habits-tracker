import { describe, expect, it } from "vitest";
import { mapProgramme } from "./homeschool";

/**
 * Phase 1 keeps a per-block record keyed on the Notion row id. The display id
 * cannot do that job: it is built from label + position, so it moves the
 * moment a day is reordered. These tests pin the difference, because a record
 * keyed on a moving id silently reattaches evidence to the wrong lesson.
 */
const row = (id: string, label: string, task = "do the thing") => ({
  id,
  properties: {
    Label: { rich_text: [{ plain_text: label }] },
    Task: { rich_text: [{ plain_text: task }] },
    "Day Topic": { rich_text: [{ plain_text: "Istanbul" }] },
    Date: { date: { start: "2026-10-05" } },
    Week: { rich_text: [{ plain_text: "Term 4 — Week 1" }] },
  },
});

describe("per-block record keys", () => {
  it("carries the Notion row id through, dashes stripped", () => {
    const { subjects } = mapProgramme(
      [row("3ef5429a-fa90-81cb-bf2c-f9deb4d5976c", "Block 1 — Maths")],
      new Map(),
    );
    expect(subjects[0].rowId).toBe("3ef5429afa9081cbbf2cf9deb4d5976c");
  });

  it("keeps the row id stable when the day is reordered, unlike the display id", () => {
    const maths = row("aaaa1111", "Block 1 — Maths");
    const english = row("bbbb2222", "Block 2 — English");

    const before = mapProgramme([maths, english], new Map()).subjects;
    const after = mapProgramme([english, maths], new Map()).subjects;

    const mathsBefore = before.find(s => s.name.includes("Maths"))!;
    const mathsAfter = after.find(s => s.name.includes("Maths"))!;

    // The thing we key the record on does not move.
    expect(mathsAfter.rowId).toBe(mathsBefore.rowId);
    // The display id does move — which is exactly why it is not the key.
    expect(mathsAfter.id).not.toBe(mathsBefore.id);
  });

  it("gives an empty row id rather than throwing when Notion sends no id", () => {
    const { subjects } = mapProgramme([{ ...row("x", "Block 1 — Maths"), id: undefined }], new Map());
    expect(subjects[0].rowId).toBe("");
  });
});
