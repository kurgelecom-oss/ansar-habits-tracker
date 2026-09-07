import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WeekBadge from "./WeekBadge";

/**
 * The badge is a mirror of /api/homeschool and nothing else. These tests feed
 * it the three shapes that route produces and check each one is named for
 * what it is — the whole point of the badge is that a parent can tell a loaded
 * week from a stale one from an empty table without opening Notion.
 */
function stub(body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => body })));
}

afterEach(() => vi.unstubAllGlobals());

describe("WeekBadge", () => {
  it("shows the week label from Daily Programme and links to the week page", async () => {
    stub({ weekTitle: "Phase 1 — Week 9 (7–11 Sept)", weekUrl: "https://notion.so/wk9", stale: false, subjects: [{}] });
    render(<WeekBadge />);
    const badge = await screen.findByTestId("week-badge");
    expect(badge).toHaveTextContent("Phase 1 — Week 9 (7–11 Sept)");
    expect(badge).toHaveAttribute("data-state", "current");
    expect(badge).toHaveAttribute("href", "https://notion.so/wk9");
  });

  it("says so when the rows are stale", async () => {
    stub({ weekTitle: "Phase 1 — Week 8 (31 Aug–4 Sept)", weekUrl: null, stale: true, subjects: [{}] });
    render(<WeekBadge />);
    const badge = await screen.findByTestId("week-badge");
    expect(badge).toHaveTextContent("Old week · Phase 1 — Week 8 (31 Aug–4 Sept)");
    expect(badge).toHaveAttribute("data-state", "stale");
    expect(badge.tagName).toBe("SPAN");
  });

  it("says no week is loaded when the table has nothing for today", async () => {
    stub({ weekTitle: "", weekUrl: null, stale: false, subjects: [] });
    render(<WeekBadge />);
    const badge = await screen.findByTestId("week-badge");
    expect(badge).toHaveTextContent("No week loaded");
    expect(badge).toHaveAttribute("data-state", "none");
  });

  it("renders nothing when the route cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    const { container } = render(<WeekBadge />);
    await new Promise(r => setTimeout(r, 0));
    expect(container).toBeEmptyDOMElement();
  });
});
