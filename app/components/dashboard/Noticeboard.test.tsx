import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Noticeboard from "./Noticeboard";

// Saturday 10 October 2026, midday in Sydney: exactly two notices.
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-10T01:00:00Z")); });
afterEach(() => { vi.useRealTimers(); });

describe("Noticeboard", () => {
  it("shows one notice at a time, turns every eight seconds and steps on a tap", () => {
    render(<Noticeboard />);
    const board = screen.getByTestId("noticeboard");
    expect(board).toHaveTextContent("Mum · Saturday Push: verify the three tiles with the PIN.");
    act(() => { vi.advanceTimersByTime(8000); });
    expect(board).toHaveTextContent("Ansar · PS5 comes after the Push, if school was finished on 4 days.");
    fireEvent.click(screen.getByRole("button", { name: "Next notice" }));
    expect(board).toHaveTextContent("Mum · Saturday Push");
    fireEvent.click(screen.getByRole("button", { name: "Previous notice" }));
    expect(board).toHaveTextContent("Ansar · PS5");
  });

  it("holds still while it is pressed or hovered", () => {
    render(<Noticeboard />);
    const board = screen.getByTestId("noticeboard");
    fireEvent.pointerEnter(board);
    act(() => { vi.advanceTimersByTime(30000); });
    expect(board).toHaveTextContent("Mum · Saturday Push");
    fireEvent.pointerLeave(board);
    act(() => { vi.advanceTimersByTime(8000); });
    expect(board).toHaveTextContent("Ansar · PS5");
  });
});
