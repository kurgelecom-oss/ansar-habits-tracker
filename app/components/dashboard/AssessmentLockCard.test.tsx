import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AssessmentLockCard from "./AssessmentLockCard";

const lock = { locked: true as const, due: [{ id: "review:2026-10-16:week", kind: "review", title: "Friday review · week ending 2026-10-16" }], message: "" };

describe("paper lock screen", () => {
  it("covers the page, names the paper, sends him to Tests and keeps mornings open", () => {
    render(<AssessmentLockCard lock={lock} onLifted={vi.fn()} fullScreen />);
    expect(screen.getByRole("dialog", { name: "A paper is due" })).toBeTruthy();
    expect(screen.getByText(lock.due[0].title)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Tests" }).getAttribute("href")).toBe("/tests");
    expect(screen.getByText(/Morning habits stay open/)).toBeTruthy();
  });
  it("always offers the parent PIN as a quiet fallback", () => {
    render(<AssessmentLockCard lock={lock} onLifted={vi.fn()} />);
    expect(screen.queryByLabelText("Parent PIN")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Parent" }));
    expect(screen.getByLabelText("Parent PIN")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Unlock for today" })).toBeTruthy();
  });
  it("renders nothing when nothing is due", () => {
    const { container } = render(<AssessmentLockCard lock={{ locked: false }} onLifted={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });
});
