import { describe, expect, it } from "vitest";
import { isHistoricalBaseline } from "./assessment-status";

describe("historical assessment fairness", () => {
  it("uses Sydney's creation date across the UTC date boundary", () => {
    expect(isHistoricalBaseline({ created_at: "2026-09-18T14:30:00Z", due_date: "2026-09-18" })).toBe(true);
    expect(isHistoricalBaseline({ created_at: "2026-09-18T13:30:00Z", due_date: "2026-09-18" })).toBe(false);
  });
  it("preserves deadlines for work assigned on time or without a creation timestamp", () => {
    expect(isHistoricalBaseline({ created_at: "2026-09-17T00:00:00Z", due_date: "2026-09-18" })).toBe(false);
    expect(isHistoricalBaseline({ due_date: "2026-09-18" })).toBe(false);
    expect(isHistoricalBaseline({ created_at: "invalid", due_date: "2026-09-18" })).toBe(false);
  });
});
