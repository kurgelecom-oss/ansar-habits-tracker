import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EvidenceReviewPanel from "./EvidenceReviewPanel";

describe("EvidenceReviewPanel", () => {
  it("keeps the imported report separate from unverified weeks and lets a parent filter to gaps", () => {
    const { rerender } = render(<EvidenceReviewPanel selectedWeek="2026-08-31" />);
    expect(screen.getByText("Green — half-certified")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Only gaps" }));
    expect(screen.getByText("Science")).toBeInTheDocument();
    expect(screen.queryByText("English")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Science" }));
    expect(screen.getByText(/third week without a Science log/i)).toBeInTheDocument();
    rerender(<EvidenceReviewPanel selectedWeek="2026-09-07" />);
    expect(screen.getByText(/No verified evidence review has been imported/i)).toBeInTheDocument();
  });
});
