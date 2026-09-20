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

  it("selects a fresh sample returned for the current month and keeps originals", async () => {
    const actions: Record<string, unknown>[] = [];
    const fresh = { ...paper, id: "fresh-paper", title: "Fresh practice copy" };
    let papers = [paper];
    fetchMock.mockImplementation((_url: string, options?: RequestInit) => {
      if (!options?.body) return response({ ...workspace(), papers });
      const body = JSON.parse(String(options.body)); actions.push(body);
      papers = [paper, fresh]; return response({ paper: fresh });
    });
    render(<PracticePage />);
    await screen.findByRole("button", { name: "Create fresh 10-minute exam" });
    fireEvent.click(screen.getByRole("button", { name: "Create fresh 10-minute exam" }));
    await waitFor(() => expect(actions).toContainEqual({ action: "create", kind: "exam" }));
    expect(await screen.findByRole("heading", { name: fresh.subject })).toBeInTheDocument();
    expect(screen.getAllByText("Fresh practice copy")).toHaveLength(2);
    expect(screen.getAllByText("Practice exam").length).toBeGreaterThan(0);
  });

  it("moves to a fresh paper's month and disables creation while an attempt is in progress", async () => {
    const fresh = { ...paper, id: "october-paper", month: "2026-10", due_date: "2026-10-01", opens_on: "2026-10-01", title: "October practice copy" };
    let created = false;
    fetchMock.mockImplementation((url: string, options?: RequestInit) => {
      if (options?.body) { created = true; return response({ paper: fresh }); }
      return response(created && url.includes("month=2026-10") ? { ...workspace(), month: "2026-10", papers: [fresh] } : workspace());
    });
    const view = render(<PracticePage />);
    fireEvent.click(await screen.findByRole("button", { name: "Create fresh 10-minute exam" }));
    await screen.findByText("Practice · October 2026");
    expect(screen.getAllByText("October practice copy")).toHaveLength(2);
    view.unmount();

    fetchMock.mockImplementation(() => response(workspace([attempt])));
    render(<PracticePage />);
    expect(await screen.findByRole("button", { name: "Create fresh 10-minute exam" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Create fresh 4-prompt review" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Expire practice timer now" }));
  });

  it("uses practice-specific empty guidance and has no inert Parent tools toggle", async () => {
    fetchMock.mockImplementation(() => response({ ...workspace(), papers: [] }));
    render(<PracticePage />);
    await screen.findByText(/Create a fresh sample exam or review above/);
    expect(screen.queryByRole("button", { name: "Parent tools" })).not.toBeInTheDocument();
    expect(screen.queryByText(/refresh the curriculum/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/programme coverage/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Create a fresh sample above to add a practice paper/)).toBeInTheDocument();
  });

  it("keeps report output private until the parent deliberately sends the labelled practice report", async () => {
    const submitted = { ...attempt, status: "submitted" as const, submitted_at: "2026-09-20T00:01:00Z" };
    const actions: Record<string, unknown>[] = [];
    fetchMock.mockImplementation((_url: string, options?: RequestInit) => {
      if (!options?.body) return response(workspace([submitted]));
      const body = JSON.parse(String(options.body)); actions.push(body);
      if (body.action === "report-preview") return response({ report: { subject: "PARENT PRACTICE · Sample report", text: "Private preview text", report: "PARENT PRACTICE\nFull Notion report\nNext step: fictional rehearsal" } });
      return response({ message: "Labelled practice report sent." });
    });
    render(<PracticePage />);
    fireEvent.click(await screen.findByRole("button", { name: "Preview practice report" }));
    await screen.findByText("Private preview text");
    expect(screen.getByText("Short email preview")).toBeInTheDocument();
    expect(screen.getByText("Full Notion report preview")).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === "PRE" && element.textContent === "PARENT PRACTICE\nFull Notion report\nNext step: fictional rehearsal")).toBeInTheDocument();
    expect(actions).toEqual([{ action: "report-preview", attemptId: attempt.id }]);
    fireEvent.click(screen.getByRole("button", { name: "Send labelled practice report" }));
    await screen.findByText("Labelled practice report sent.");
    expect(actions[1]).toEqual({ action: "send-report", attemptId: attempt.id });
  });

  it("requires a fresh report preview after marking changes the attempt", async () => {
    const submitted = { ...attempt, status: "submitted" as const, submitted_at: "2026-09-20T00:01:00Z" };
    fetchMock.mockImplementation((_url: string, options?: RequestInit) => {
      if (!options?.body) return response(workspace([submitted]));
      const body = JSON.parse(String(options.body));
      if (body.action === "report-preview") return response({ report: { subject: "PARENT PRACTICE", text: "Old preview", report: { version: 0 } } });
      if (body.action === "review") return response({ attempt: { ...submitted, status: "reviewed", revision: 1, parent_review: { marks: body.marks, feedback: body.feedback, nextStep: body.nextStep, reviewer: "Nihal", reviewedAt: "2026-09-20T00:02:00Z" } } });
      return response({});
    });
    render(<PracticePage />);
    fireEvent.click(await screen.findByRole("button", { name: "Preview practice report" }));
    await screen.findByText("Old preview");
    fireEvent.click(screen.getByText("Nihal · review this work"));
    fireEvent.change(screen.getByRole("combobox", { name: /Mark:/ }), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Feedback"), { target: { value: "Practice feedback" } });
    fireEvent.change(screen.getByLabelText("Next learning step"), { target: { value: "Practice next step" } });
    fireEvent.change(screen.getByLabelText("Parent PIN"), { target: { value: "4821" } });
    fireEvent.click(screen.getByRole("button", { name: "Record review" }));
    await screen.findByRole("button", { name: "Preview practice report" });
    expect(screen.queryByText("Old preview")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send labelled practice report" })).not.toBeInTheDocument();
  });
});
