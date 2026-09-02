import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getJournalEvidence, __resetJournalEvidenceCache } from "./tally";

/* ════════════════════════════════════════════════════════════════════════════
   The journal evidence reader.

   These tests are what stands between "the journal row is gated on real
   evidence" and "the journal row is gated on a shape assumption about someone
   else's API". Every fixture below is the SHAPE THE LIVE FORM ACTUALLY
   RETURNS — question ids RYRxBl / PYldYx / EDLkD2 / OYLaBK, answers as arrays
   for choice questions and bare strings for text — sampled from form ODKlVa on
   2026-09-02, not invented.
   ══════════════════════════════════════════════════════════════════════════ */

const QUESTIONS = [
  { id: "PYldYx", type: "DROPDOWN", title: "Student" },
  { id: "RYRxBl", type: "MULTIPLE_CHOICE", title: "What are you logging?" },
  { id: "EDLkD2", type: "INPUT_DATE", title: "Date of work" },
  { id: "OYLaBK", type: "TEXTAREA", title: "Journal entry" },
];

type Answers = Record<string, unknown>;

/** One submission, in the API's own shape. `at` is UTC, as Tally reports it. */
function submission(at: string, answers: Answers, isCompleted = true) {
  return {
    id: "test",
    formId: "ODKlVa",
    isCompleted,
    submittedAt: at,
    responses: Object.entries(answers).map(([questionId, answer]) => ({
      id: `r-${questionId}`, questionId, answer,
    })),
  };
}

/** A well-formed journal entry from Ansar. Overridable field by field. */
const journal = (at: string, over: Answers = {}) => submission(at, {
  PYldYx: ["Ansar"],
  RYRxBl: ["Daily Journal"],
  EDLkD2: "2026-09-01",
  OYLaBK: "Today I woke up early and got straight into my habits.",
  ...over,
});

function respondWith(submissions: unknown[], questions: unknown[] = QUESTIONS) {
  const fetchMock = vi.fn(async () => ({
    ok: true, status: 200, statusText: "OK",
    json: async () => ({ page: 1, limit: 50, hasMore: false, questions, submissions }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  __resetJournalEvidenceCache();
  process.env.TALLY_API_KEY = "test-key";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TALLY_API_KEY;
});

describe("getJournalEvidence — configuration", () => {
  /**
   * No key is NOT the same answer as no journal, and the shape says so: gate 6
   * reads `configured` and stays silent, rather than locking the row on a
   * deploy that was never given the credential.
   */
  it("reports itself unconfigured rather than reporting no journal", async () => {
    delete process.env.TALLY_API_KEY;
    const fetchMock = respondWith([journal("2026-09-01T11:42:34.000Z")]);

    const evidence = await getJournalEvidence("2026-09-01");

    expect(evidence.configured).toBe(false);
    expect(evidence.error).toMatch(/TALLY_API_KEY/);
    // And it does not spend a request finding that out.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the key as a bearer token and asks only for completed submissions", async () => {
    const fetchMock = respondWith([]);

    await getJournalEvidence("2026-09-01");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("https://api.tally.so/forms/ODKlVa/submissions");
    expect(url).toContain("filter=completed");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
  });
});

describe("getJournalEvidence — what counts as the journal", () => {
  it("finds a Daily Journal entry filed for the day", async () => {
    respondWith([journal("2026-09-01T11:42:34.000Z", { EDLkD2: "2026-09-01" })]);

    const evidence = await getJournalEvidence("2026-09-01");

    expect(evidence.found).toBe(true);
    expect(evidence.error).toBeNull();
    expect(evidence.submittedAt).toBe("2026-09-01T11:42:34.000Z");
  });

  /**
   * The discriminator this whole feature turns on. The same form takes work
   * submissions and daily goals, and both are filed constantly — several a day.
   * If either one counted, the journal row would unlock on a maths screenshot
   * and the gate would be worth nothing.
   */
  it("does not accept a work submission as a journal", async () => {
    respondWith([submission("2026-09-01T01:44:52.000Z", {
      PYldYx: ["Ansar"],
      RYRxBl: ["Work submission"],
      EDLkD2: "2026-09-01",
      brOa4o: "dividing big numbers using long division",
    })]);

    expect((await getJournalEvidence("2026-09-01")).found).toBe(false);
  });

  it("does not accept daily goals as a journal", async () => {
    respondWith([submission("2026-09-01T21:35:02.000Z", {
      PYldYx: ["Ansar"],
      RYRxBl: ["Daily Goals"],
      EDLkD2: "2026-09-01",
      "5vvORM": "I need to understand the Quran",
    })]);

    expect((await getJournalEvidence("2026-09-01")).found).toBe(false);
  });

  /** The form is shared with Ayah. Her journal must not unlock Ansar's row. */
  it("does not accept the other student's journal", async () => {
    respondWith([journal("2026-09-01T11:42:34.000Z", { PYldYx: ["Ayah"] })]);

    expect((await getJournalEvidence("2026-09-01")).found).toBe(false);
  });

  /**
   * Choosing "Daily Journal" from a dropdown is not writing one. Tally marks
   * the textarea required, so this only ever catches a submission that reached
   * us some other way — but "some other way" is exactly what a gate is for.
   */
  it("does not accept a journal with an empty entry", async () => {
    respondWith([journal("2026-09-01T11:42:34.000Z", { OYLaBK: "" })]);

    expect((await getJournalEvidence("2026-09-01")).found).toBe(false);
  });

  it("does not accept a partial submission", async () => {
    respondWith([submission("2026-09-01T11:42:34.000Z", {
      PYldYx: ["Ansar"], RYRxBl: ["Daily Journal"],
      EDLkD2: "2026-09-01", OYLaBK: "half a thought",
    }, false)]);

    expect((await getJournalEvidence("2026-09-01")).found).toBe(false);
  });

  it("does not accept yesterday's journal for today", async () => {
    respondWith([journal("2026-08-31T11:42:34.000Z", { EDLkD2: "2026-08-31" })]);

    expect((await getJournalEvidence("2026-09-01")).found).toBe(false);
  });
});

describe("getJournalEvidence — which day a journal belongs to", () => {
  /**
   * THE RULE, in one line: the date he puts on the form is the day it counts
   * for. It beats the landing time even when the two are days apart, because it
   * is the only field that says anything about the day the work happened.
   */
  it("counts a journal for its Date of work, not the day it was filed", async () => {
    // 10:00 UTC on the 31st is 20:00 Sydney on the 31st — filed for the 1st.
    respondWith([journal("2026-08-31T10:00:00.000Z", { EDLkD2: "2026-09-01" })]);

    expect((await getJournalEvidence("2026-09-01")).found).toBe(true);
    expect((await getJournalEvidence("2026-08-31")).found).toBe(false);
  });

  /**
   * THE DOUBLE-CREDIT THIS RULE EXISTS TO PREVENT — and the exact case tk asked
   * about. Under the old "Date of work OR landing date" match, a journal written
   * at 07:39 Thursday and honestly dated Wednesday satisfied BOTH days: Wednesday
   * by its date field, Thursday by when it landed. Harmless while only one day
   * was ever evaluated; two ticks for one piece of writing the moment
   * /api/journal-sync grew its grace window.
   */
  it("never lets one submission count for two days", async () => {
    // 21:39Z on the 1st is 07:39 Sydney on the 2nd. Dated the 1st.
    respondWith([journal("2026-09-01T21:39:10.000Z", { EDLkD2: "2026-09-01" })]);

    expect((await getJournalEvidence("2026-09-01")).found).toBe(true);
    expect((await getJournalEvidence("2026-09-02")).found).toBe(false);
  });

  /**
   * The landing date is a FALLBACK, not a second chance at a different day. It
   * is read in Sydney, never UTC and never the machine's zone: 2026-09-01T21:39Z
   * is still the 1st in London and already the 2nd in Sydney, and Sydney is the
   * only reading that agrees with the clock every gate in this app uses.
   */
  it("falls back to the Sydney landing date when Date of work is absent", async () => {
    respondWith([journal("2026-09-01T21:39:10.000Z", { EDLkD2: "" })]);

    expect((await getJournalEvidence("2026-09-02")).found).toBe(true);
    expect((await getJournalEvidence("2026-09-01")).found).toBe(false);
  });

  it("ignores a Date of work that is not a date", async () => {
    respondWith([journal("2026-09-01T21:39:10.000Z", { EDLkD2: "sometime last week" })]);

    // Unparseable, so the landing date decides: 07:39 Sydney on the 2nd.
    expect((await getJournalEvidence("2026-09-02")).found).toBe(true);
  });

  /**
   * Two journals filed for one day: the earlier one earned it. The recorded
   * time must not drift later because he reopened the form to add a line.
   */
  it("keeps the earlier submission when a day has two journals", async () => {
    respondWith([
      journal("2026-09-01T12:00:00.000Z", { EDLkD2: "2026-09-01", OYLaBK: "second thoughts" }),
      journal("2026-09-01T09:00:00.000Z", { EDLkD2: "2026-09-01", OYLaBK: "the first one" }),
    ]);

    expect((await getJournalEvidence("2026-09-01")).submittedAt).toBe("2026-09-01T09:00:00.000Z");
  });
});

describe("getJournalEvidence — answer encodings", () => {
  /**
   * Tally returns choice answers as display text through the wrapper this was
   * written against, but as option UUIDs in other contexts. Both are written
   * down in tally.ts, because guessing one is how the gate reads "no journal
   * today" forever on the day the encoding changes.
   */
  it("matches option UUIDs as readily as display text", async () => {
    respondWith([journal("2026-09-01T11:42:34.000Z", {
      PYldYx: ["8e79ee9c-96b6-45d0-a880-c5018e4ea9b9"],
      RYRxBl: ["0a8f0715-5675-4dfa-b32a-f66d64796a42"],
    })]);

    expect((await getJournalEvidence("2026-09-01")).found).toBe(true);
  });

  it("matches a bare string answer as well as a one-element array", async () => {
    respondWith([journal("2026-09-01T11:42:34.000Z", {
      PYldYx: "Ansar", RYRxBl: "Daily Journal",
    })]);

    expect((await getJournalEvidence("2026-09-01")).found).toBe(true);
  });

  it("is not case-sensitive about the option text", async () => {
    respondWith([journal("2026-09-01T11:42:34.000Z", {
      PYldYx: ["ANSAR"], RYRxBl: ["  daily journal  "],
    })]);

    expect((await getJournalEvidence("2026-09-01")).found).toBe(true);
  });

  /**
   * If Tally ever reissues the short question ids, the question TEXT is what
   * survives. A reader that only knew the ids would quietly stop finding the
   * journal — a silent false negative, which on this gate means a locked row on
   * a night the journal was written.
   */
  it("falls back to matching questions by title when the ids change", async () => {
    respondWith(
      [submission("2026-09-01T11:42:34.000Z", {
        NEWstu: ["Ansar"], NEWkind: ["Daily Journal"],
        NEWdate: "2026-09-01", NEWtext: "I wrote this one.",
      })],
      [
        { id: "NEWstu", title: "Student" },
        { id: "NEWkind", title: "What are you logging?" },
        { id: "NEWdate", title: "Date of work" },
        { id: "NEWtext", title: "Journal entry" },
      ],
    );

    expect((await getJournalEvidence("2026-09-01")).found).toBe(true);
  });

  it("picks the journal out of a day's worth of other submissions", async () => {
    respondWith([
      submission("2026-09-01T05:32:06.000Z", { PYldYx: ["Ansar"], RYRxBl: ["Work submission"], EDLkD2: "2026-09-01" }),
      submission("2026-09-01T01:44:52.000Z", { PYldYx: ["Ansar"], RYRxBl: ["Work submission"], EDLkD2: "2026-09-01" }),
      journal("2026-09-01T11:42:34.000Z", { EDLkD2: "2026-09-01" }),
      submission("2026-09-01T21:35:02.000Z", { PYldYx: ["Ansar"], RYRxBl: ["Daily Goals"], EDLkD2: "2026-09-01" }),
    ]);

    const evidence = await getJournalEvidence("2026-09-01");

    expect(evidence.found).toBe(true);
    expect(evidence.submittedAt).toBe("2026-09-01T11:42:34.000Z");
  });
});

describe("getJournalEvidence — when it cannot answer", () => {
  /**
   * THE DISTINCTION THE WHOLE GATE RESTS ON. "Tally said no journal" is a
   * refusal a child can fix by writing one. "Tally could not be reached" is
   * not — and gate 6 reads `error` before it reads `found` precisely so an
   * outage at 21:15 cannot cost a perfect day.
   */
  it("reports an HTTP failure as an error, not as an absent journal", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false, status: 401, statusText: "Unauthorized", json: async () => ({}),
    })));

    const evidence = await getJournalEvidence("2026-09-01");

    expect(evidence.configured).toBe(true);
    expect(evidence.found).toBe(false);
    expect(evidence.error).toContain("401");
  });

  it("reports a network failure as an error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("fetch failed"); }));

    const evidence = await getJournalEvidence("2026-09-01");

    expect(evidence.error).toBe("fetch failed");
    expect(evidence.found).toBe(false);
  });

  /** The key must never travel back out in a message that gets logged. */
  it("never puts the API key in the error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false, status: 403, statusText: "Forbidden", json: async () => ({}),
    })));

    expect((await getJournalEvidence("2026-09-01")).error).not.toContain("test-key");
  });

  it("survives a response with nothing recognisable in it", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true, status: 200, statusText: "OK", json: async () => ({ unexpected: true }),
    })));

    const evidence = await getJournalEvidence("2026-09-01");

    expect(evidence.found).toBe(false);
    expect(evidence.error).toBeNull();   // Tally answered; it simply had nothing
  });
});

describe("getJournalEvidence — caching", () => {
  it("answers a repeat question without asking Tally again", async () => {
    const fetchMock = respondWith([journal("2026-09-01T11:42:34.000Z")]);

    await getJournalEvidence("2026-09-01");
    await getJournalEvidence("2026-09-01");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  /**
   * The bypass the tap depends on. /api/tick re-reads fresh before it refuses,
   * so a journal submitted seconds ago is never turned away for being newer
   * than the memo.
   */
  it("re-reads when asked for a fresh answer", async () => {
    const fetchMock = respondWith([journal("2026-09-01T11:42:34.000Z")]);

    await getJournalEvidence("2026-09-01");
    await getJournalEvidence("2026-09-01", true);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  /**
   * One read answers every day. The memo holds a map keyed by date rather than a
   * single day's verdict, so it cannot serve one day's answer for another — and
   * /api/journal-sync's two-day window costs one request, not two, with no
   * chance of the two disagreeing because a submission landed between them.
   */
  it("answers every day in the window from a single read", async () => {
    const fetchMock = respondWith([journal("2026-09-01T11:42:34.000Z", { EDLkD2: "2026-09-01" })]);

    expect((await getJournalEvidence("2026-09-01")).found).toBe(true);
    expect((await getJournalEvidence("2026-09-02")).found).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
