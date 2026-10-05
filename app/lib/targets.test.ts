import { describe, expect, it } from "vitest";
import { zoneStates } from "./targets";

const empty = { habitDays: {}, blocks: [] };

describe("zoneStates", () => {
  it("an empty week starts nothing and invents nothing", () => {
    const s = zoneStates(empty);
    expect(s.scholar.status).toBe("not-started");
    expect(s.languages.note).toBe("Nothing planned this week");
    expect([s.outdoors, s.combat, s.chess].every(z => z.status === "untracked")).toBe(true);
  });

  it("school matches the weekend rule: 4 days is done, 3 is waiting", () => {
    expect(zoneStates({ ...empty, habitDays: { homeschool_session: 3 } }).scholar.status).toBe("waiting");
    expect(zoneStates({ ...empty, habitDays: { homeschool_session: 4 } }).scholar.status).toBe("done");
  });

  it("football needs both training days, Qur'an needs five", () => {
    const s = zoneStates({ ...empty, habitDays: { soccer_training: 2, quran: 4 } });
    expect(s.football.status).toBe("done");
    expect(s.quran).toMatchObject({ status: "waiting", note: "4/5 recitation days" });
  });

  it("languages and digital read the week's real school rows", () => {
    const s = zoneStates({ habitDays: {}, blocks: [
      { label: "Block 4 — Technologies + Languages", task: "Technology: Scratch. Turkish: greetings.", done: true },
      { label: "Block 4 — Skills mix", task: "Typing: Typing.com 15 min. Turkish numbers.", done: false },
      { label: "Block 1 — Maths", task: "Fractions", done: true },
    ] });
    expect(s.languages).toMatchObject({ status: "waiting", done: 1, target: 2 });
    expect(s.digital).toMatchObject({ status: "waiting", done: 1, target: 2 });
  });
});
