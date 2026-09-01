import { describe, expect, it } from "vitest";
import { evidenceRefusal, evidenceWarnings, requiresEvidence, EVIDENCE_REQUIRED_IDS } from "./evidence-gate";
import type { JournalEvidence } from "./tally";

/** An evidence answer. Every field defaulted to the reachable, negative case. */
const ev = (over: Partial<JournalEvidence> = {}): JournalEvidence => ({
  configured: true, found: false, submittedAt: null, error: null, ...over,
});

describe("requiresEvidence", () => {
  it("covers the journal and nothing else today", () => {
    expect(requiresEvidence("journal")).toBe(true);
    expect(EVIDENCE_REQUIRED_IDS).toEqual(["journal"]);
  });

  /**
   * The blast radius check. This gate can lock a row on the word of a third
   * party's API, so every habit it does NOT cover is a habit an outage cannot
   * reach — and that list must not grow by accident.
   */
  it.each(["quran", "teeth", "reading", "room_tidy", "btn_cornell", "homeschool_session"])(
    "leaves %s alone", id => {
      expect(requiresEvidence(id)).toBe(false);
      expect(evidenceRefusal(id, ev({ found: false }))).toBeNull();
    });
});

describe("evidenceRefusal", () => {
  it("allows the journal when Tally reports a matching submission", () => {
    expect(evidenceRefusal("journal", ev({ found: true }))).toBeNull();
  });

  it("refuses the journal when a reachable Tally reports none", () => {
    const refusal = evidenceRefusal("journal", ev({ found: false }));
    expect(refusal?.reason).toBe("evidence_required");
    // Named for the button that fixes it, not for the internal fact.
    expect(refusal?.message).toBe("Write your journal in Log Work first");
  });

  /* ── The fail-open rule. The single most important pair of tests here. ──── */

  /**
   * An outage must not cost a perfect day. At 21:15 on a night the journal WAS
   * written, a Tally that cannot be reached has to leave the row tappable —
   * `found: false` alongside a non-null `error` means "I could not look", never
   * "there is nothing there".
   */
  it("stays silent when Tally could not be reached", () => {
    expect(evidenceRefusal("journal", ev({ found: false, error: "Tally ODKlVa: 500 Server Error" })))
      .toBeNull();
  });

  it("stays silent when no API key is configured for the deploy", () => {
    expect(evidenceRefusal("journal", ev({
      configured: false, found: false, error: "TALLY_API_KEY is not set for this deploy",
    }))).toBeNull();
  });

  /**
   * And the inverse, which is what stops fail-open from swallowing the gate
   * entirely: a clean answer of "no journal today" still refuses. If this ever
   * returned null the feature would be decorative.
   */
  it("refuses on a clean negative, error being null is the whole difference", () => {
    expect(evidenceRefusal("journal", ev({ found: false, error: null }))).not.toBeNull();
    expect(evidenceRefusal("journal", ev({ found: false, error: "anything at all" }))).toBeNull();
  });
});

describe("evidenceWarnings", () => {
  it("says nothing on a day that schedules no evidence-gated habit", () => {
    expect(evidenceWarnings(["quran", "teeth"], ev({ configured: false }))).toEqual([]);
  });

  it("says nothing when the gate is doing its job", () => {
    expect(evidenceWarnings(["journal"], ev({ found: true }))).toEqual([]);
    expect(evidenceWarnings(["journal"], ev({ found: false }))).toEqual([]);
  });

  /**
   * A gate that quietly stops gating is the failure windowWarnings() exists to
   * prevent, and this is the same failure. Both silent branches announce
   * themselves so nobody discovers the change by noticing the row went tappable.
   */
  it("announces a missing key", () => {
    const [warning] = evidenceWarnings(["journal"], ev({ configured: false }));
    expect(warning).toContain("TALLY_API_KEY");
    expect(warning).toContain("OFF");
  });

  it("announces an unreachable Tally, and quotes why", () => {
    const [warning] = evidenceWarnings(["journal"], ev({ error: "Tally ODKlVa: 401 Unauthorized" }));
    expect(warning).toContain("401 Unauthorized");
    expect(warning).toContain("OFF");
  });
});
