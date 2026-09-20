import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PracticePage from "./page";
import type { Attempt, Paper, Workspace } from "../../lib/assessments/types";

vi.mock("../../components/dashboard/ClubNavigation", () => ({ default: () => <nav>Club navigation</nav> }));

const paper: Paper = { id: "practice-paper", kind: "exam", month: "2026-09", due_date: "2026-09-20", opens_on: "2026-09-20", subject: "Sample science", title: "Practice exam", status: "published", duration_minutes: 10, questions: [{ id: "q1", type: "written", prompt: "Explain the sample.", sourceIds: [] }], lessons: [], coverage_note: "Fictional practice material." };
const attempt: Attempt = { id: "practice-attempt", paper_id: paper.id, status: "in_progress", answers: {}, started_at: "2026-09-20T00:00:00Z", expires_at: "2026-09-20T00:10:00Z", submitted_at: null, result: null, parent_review: null, correction: null, correction_at: null, revision: 0, paper_snapshot: paper };
const workspace = (attempts: Attempt[] = []): Workspace => ({ month: "2026-09", today: "2026-09-20", serverNow: "2026-09-20T00:00:30Z", papers: [paper], attempts, sourceStatus: "Practice samples only.", integrations: { notion: true, email: true, pending: 0 } });
const response = (data: unknown, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => data });

describe("parent practice room", () => {
  const fetchMock = vi.fn();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });

  it("uses only the practice session and workspace endpoints and identifies the isolated room", async () => {
    let unlocked = false;
    fetchMock.mockImplementation((url: string) => url.endsWith("/session") ? (unlocked = true, response({ ok: true })) : unlocked ? response(workspace()) : response({ message: "Unauthorized" }, 401));
    render(<PracticePage />);
    await screen.findByRole("heading", { name: "Parent, unlock practice." });
    fireEvent.change(screen.getByLabelText("Parent PIN"), { target: { value: "4821" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock practice room" }));
    await screen.findByText("PARENT PRACTICE · DOES NOT AFFECT THE LEARNING RECORD");
    expect(screen.getByRole("link", { name: "Back to live assessments" })).toHaveAttribute("href", "/tests");
    expect(fetchMock.mock.calls.map(call => String(call[0]))).toEqual(expect.arrayContaining([expect.stringContaining("/api/assessments/practice?month="), "/api/assessments/practice/session"]));
    expect(fetchMock.mock.calls.every(call => String(call[0]).startsWith("/api/assessments/practice"))).toBe(true);
  });

  it("creates repeatable samples and expires an in-progress exam through practice actions", async () => {
    const actions: Record<string, unknown>[] = [];
    fetchMock.mockImplementation((_url: string, options?: RequestInit) => {
      if (!options?.body) return response(workspace([attempt]));
      const body = JSON.parse(String(options.body)); actions.push(body);
      if (body.action === "expire") return response({ attempt: { ...attempt, status: "submitted", submitted_at: "2026-09-20T00:01:00Z" } });
      return response({ paper });
    });
    render(<PracticePage />);
    await screen.findByRole("button", { name: "Create fresh 10-minute exam" });
    fireEvent.click(screen.getByRole("button", { name: "Create fresh 10-minute exam" }));
    await waitFor(() => expect(actions).toContainEqual({ action: "create", kind: "exam" }));
    fireEvent.click(screen.getByRole("button", { name: "Create fresh 4-prompt review" }));
    await waitFor(() => expect(actions).toContainEqual({ action: "create", kind: "review" }));
    fireEvent.click(screen.getByRole("button", { name: "Expire practice timer now" }));
    await screen.findByText("Submitted · awaiting Nihal");
    expect(actions).toContainEqual({ action: "expire", attemptId: attempt.id });
  });

  it("keeps report output private until the parent deliberately sends the labelled practice report", async () => {
    const submitted = { ...attempt, status: "submitted" as const, submitted_at: "2026-09-20T00:01:00Z" };
    const actions: Record<string, unknown>[] = [];
    fetchMock.mockImplementation((_url: string, options?: RequestInit) => {
      if (!options?.body) return response(workspace([submitted]));
      const body = JSON.parse(String(options.body)); actions.push(body);
      if (body.action === "report-preview") return response({ report: { subject: "PARENT PRACTICE · Sample report", text: "Private preview text", report: { label: "PARENT PRACTICE" } } });
      return response({ message: "Labelled practice report sent." });
    });
    render(<PracticePage />);
    fireEvent.click(await screen.findByRole("button", { name: "Preview practice report" }));
    await screen.findByText("Private preview text");
    expect(actions).toEqual([{ action: "report-preview", attemptId: attempt.id }]);
    fireEvent.click(screen.getByRole("button", { name: "Send labelled practice report" }));
    await screen.findByText("Labelled practice report sent.");
    expect(actions[1]).toEqual({ action: "send-report", attemptId: attempt.id });
  });
});
