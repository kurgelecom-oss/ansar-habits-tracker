import { describe, it, expect } from "vitest";
import { parseSubject, subjectsForDay, pageIdFromUrl } from "./homeschool";

/* The parser is the whole risk surface of the school programme: a week page is
   rewritten by hand every Friday, and a heading or bullet that drifts out of
   shape must fail loudly (nothing rendered for that day) rather than quietly
   promoting a note to a subject. These cases are taken from the live Week 8
   page, including its callout-wrapped Monday. */

const heading = (text: string) => ({
  type: "heading_2", heading_2: { rich_text: [{ plain_text: text }] },
});
const todo = (text: string) => ({
  type: "to_do", to_do: { rich_text: [{ plain_text: text }] },
});

describe("pageIdFromUrl", () => {
  it("takes the 32-hex id off a Notion page URL", () => {
    expect(pageIdFromUrl("https://app.notion.com/p/3cd5429afa9081538562f2a672eee2c6"))
      .toBe("3cd5429afa9081538562f2a672eee2c6");
  });
  it("takes it off a dashed URL with a query string", () => {
    expect(pageIdFromUrl("https://www.notion.so/Week-8-3cd5429a-fa90-8153-8562-f2a672eee2c6?pvs=4"))
      .toBe("3cd5429afa9081538562f2a672eee2c6");
  });
  it("returns null for a link that is not a Notion page", () => {
    expect(pageIdFromUrl("https://example.com/week")).toBeNull();
  });
});

describe("parseSubject", () => {
  it("splits the bold label from the explainer and lifts the duration out", () => {
    const s = parseSubject("**Block 1 — Maths (45 min):** Khan Academy — next lesson.", 0);
    expect(s).toEqual({
      id: "block-1-maths-0",
      name: "Block 1 — Maths",
      duration: "45 min",
      detail: "Khan Academy — next lesson.",
    });
  });

  it("keeps a label that carries no duration", () => {
    expect(parseSubject("**Grammar:** One Khan lesson.", 1)?.duration).toBeNull();
  });

  it("drops a bullet with no colon — that is a note, not a block", () => {
    expect(parseSubject("Times are a guide, not a cage", 0)).toBeNull();
  });

  it("drops a sentence that merely contains a colon", () => {
    const long = "The rule he has to hold to every single morning without fail is this: no screens.";
    expect(parseSubject(long, 0)).toBeNull();
  });

  it("drops the retired OneDrive save step wherever it survives on a page", () => {
    expect(parseSubject("**Save:** Essay → *HASS*. Reading essay → *English*.", 4)).toBeNull();
    expect(parseSubject("**Block 5 — Filing:** Put it in OneDrive.", 5)).toBeNull();
  });
});

describe("subjectsForDay", () => {
  const page = [
    heading("⏱️ The daily skeleton"),
    todo("**Ignored — before any day:** should not appear"),
    heading('Monday 31 August — "Hagia Sophia: the greatest building"'),
    todo("**Block 1 — Maths (45 min):** Khan Academy — next lesson."),
    todo("**Block 2 — English (45 min):** ReadTheory 2 passages."),
    todo("**Save:** Essay → HASS."),
    heading('Tuesday 1 September — "Water systems"'),
    todo("**Block 1 — Maths (45 min):** Khan Academy — next lesson."),
    heading("📚 Subject Guides"),
    todo("**Maths engine:** Khan Academy mastery path."),
  ];

  it("returns only the asked-for day, in page order", () => {
    const { dayLabel, subjects } = subjectsForDay(page, "Monday");
    expect(dayLabel).toBe('Monday 31 August — "Hagia Sophia: the greatest building"');
    expect(subjects.map(s => s.name)).toEqual(["Block 1 — Maths", "Block 2 — English"]);
  });

  it("stops at the next day's heading", () => {
    expect(subjectsForDay(page, "Tuesday").subjects).toHaveLength(1);
  });

  it("stops at a non-day heading, so Subject Guides never leaks into a day", () => {
    const names = subjectsForDay(page, "Tuesday").subjects.map(s => s.name);
    expect(names).not.toContain("Maths engine");
  });

  it("returns nothing for a day the page does not carry", () => {
    expect(subjectsForDay(page, "Thursday").subjects).toEqual([]);
  });
});
