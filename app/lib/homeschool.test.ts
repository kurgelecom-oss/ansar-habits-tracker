import { describe, it, expect } from "vitest";
import {
  parseSubject, subjectsForDay, pageIdFromUrl,
  parseGuides, guideKeysFor, attachGuides,
} from "./homeschool";

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
      guide: [],
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


/* The Subject Guides section is what stops a one-line day task ("Khan Academy —
   next lesson") from filling a full-screen sheet with six words. It is read
   from the SAME week page, so the context can never drift out of step with the
   task it sits under. */

const h3 = (text: string) => ({
  type: "heading_3", heading_3: { rich_text: [{ plain_text: text }] },
});
const bullet = (text: string) => ({
  type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ plain_text: text }] },
});
const h2 = (text: string) => ({
  type: "heading_2", heading_2: { rich_text: [{ plain_text: text }] },
});

describe("parseGuides", () => {
  const page = [
    h2('Monday 31 August — "Hagia Sophia"'),
    bullet("**Block 1 — Maths (45 min):** Khan Academy — next lesson."),
    h2("📚 Subject Guides"),
    h3("Maths"),
    bullet("**Engine:** Khan Academy mastery path."),
    bullet("**Tracking:** Khan's own mastery % is the tracker."),
    h3("HASS — interest-led topic menu"),
    bullet("Ottoman Empire — deep dive, running now."),
    h3("English"),
    bullet("**Grammar:** Tuesday and Thursday only, before the writing task."),
    bullet("**Rule:** every written piece saved to OneDrive → English."),
    h2("📊 Progress Tracking"),
    h3("Daily"),
    bullet("Should not be collected — this is a different section."),
  ];

  it("collects each guide's bullets under its heading", () => {
    const guides = parseGuides(page);
    expect(guides["maths"]).toEqual([
      "Engine: Khan Academy mastery path.",
      "Tracking: Khan's own mastery % is the tracker.",
    ]);
  });

  it("drops OneDrive lines, which are retired", () => {
    expect(parseGuides(page)["english"]).toEqual([
      "Grammar: Tuesday and Thursday only, before the writing task.",
    ]);
  });

  it("stops at the next section, so Progress Tracking never leaks in", () => {
    expect(parseGuides(page)["daily"]).toBeUndefined();
  });

  it("does not collect the day cards above it", () => {
    expect(Object.keys(parseGuides(page)))
      .toEqual(["maths", "hass — interest-led topic menu", "hass", "english"]);
  });

  it("registers the short head of a subtitled heading, so HASS still matches", () => {
    const guides = parseGuides(page);
    expect(guides["hass"]).toEqual(["Ottoman Empire — deep dive, running now."]);
    expect(guides["hass"]).toBe(guides["hass — interest-led topic menu"]);
  });
});

describe("guideKeysFor", () => {
  it("takes the subject off a block label", () => {
    expect(guideKeysFor("Block 3 — HASS")).toEqual(["hass"]);
  });
  it("splits a combined Block 4 into both of its learning areas", () => {
    expect(guideKeysFor("Block 4 — Technologies + Languages"))
      .toEqual(["technologies", "languages"]);
  });
  it("maps Grammar to English, where the week page documents its rule", () => {
    expect(guideKeysFor("Grammar")).toEqual(["english"]);
  });
  it("strips a duration the label kept", () => {
    expect(guideKeysFor("Block 1 — Maths (45 min)")).toEqual(["maths"]);
  });
});

describe("attachGuides", () => {
  const guides = {
    maths: ["Engine: Khan Academy mastery path."],
    technologies: ["Scratch — Block 4 Mondays."],
    languages: ["Duolingo — Turkish only."],
  };
  const subject = (name: string) =>
    ({ id: "x", name, duration: null, detail: "d", guide: [] });

  it("attaches a single guide unlabelled", () => {
    expect(attachGuides([subject("Block 1 — Maths")], guides)[0].guide)
      .toEqual(["Engine: Khan Academy mastery path."]);
  });

  it("labels each guide when a block carries two", () => {
    expect(attachGuides([subject("Block 4 — Technologies + Languages")], guides)[0].guide)
      .toEqual([
        "Technologies — Scratch — Block 4 Mondays.",
        "Languages — Duolingo — Turkish only.",
      ]);
  });

  it("leaves a block with no matching guide untouched", () => {
    expect(attachGuides([subject("Block 4 — Skills mix")], guides)[0].guide).toEqual([]);
  });
});
