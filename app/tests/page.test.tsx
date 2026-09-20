import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TestsPage from "./page";
import type { Attempt, Paper, Workspace } from "../lib/assessments/types";

vi.mock("../components/dashboard/ClubNavigation", () => ({ default: () => <nav>Club navigation</nav> }));
const paper: Paper = { id: "paper-1", kind: "review", month: "2026-09", due_date: "2026-09-18", opens_on: "2026-09-01", subject: "Science", title: "Forces in everyday life", status: "published", duration_minutes: null, questions: [{ id: "q1", type: "written", prompt: "Explain gravity with an example.", sourceIds: ["lesson-1"] }], lessons: [], coverage_note: "This week’s taught lessons only." };
const makeAttempt = (p = paper): Attempt => ({ id: "attempt-1", paper_id: p.id, status: "in_progress", answers: {}, started_at: "2026-09-20T00:00:00Z", expires_at: null, submitted_at: null, result: null, parent_review: null, correction: null, correction_at: null, revision: 0, paper_snapshot: p });
const workspace = (p = paper, attempts: Attempt[] = []): Workspace => ({ month: "2026-09", today: "2026-09-20", serverNow: new Date().toISOString(), papers: [p], attempts, sourceStatus: "Available programme rows synced.", integrations: { notion: true, email: false, pending: 0 } });
function response(data: unknown, status = 200) { return Promise.resolve({ ok: status < 400, status, json: async () => data }); }
const fetchMock = vi.fn();
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); const data = new Map<string, string>(); vi.stubGlobal("localStorage", { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key), clear: () => data.clear() }); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("assessment workspace", () => {
  it("unlocks a private device without persisting the parent PIN", async () => {
    let unlocked = false;
    fetchMock.mockImplementation((url: string, options?: RequestInit) => { if (url.endsWith("/session")) { expect(JSON.parse(String(options?.body))).toEqual({ pin: "4821" }); unlocked = true; return response({ ok: true }); } return unlocked ? response(workspace()) : response({ message: "Unauthorized" }, 401); });
    render(<TestsPage />);
    await screen.findByRole("heading", { name: "Parent, unlock this device." });
    fireEvent.change(screen.getByLabelText("Parent PIN"), { target: { value: "4821" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock assessment room" }));
    await screen.findByRole("button", { name: "Begin Friday recall" });
    expect(screen.queryByLabelText("Parent PIN")).not.toBeInTheDocument();
    expect(JSON.stringify(localStorage)).not.toContain("4821");
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("requires explicit timing acknowledgement and never starts a draft paper", async () => {
    const exam = { ...paper, kind: "exam" as const, duration_minutes: 25 };
    fetchMock.mockImplementation(() => response(workspace(exam)));
    const view = render(<TestsPage />);
    const start = await screen.findByRole("button", { name: "Start timed exam" });
    expect(start).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Starting begins the 25-minute timer/ }));
    expect(start).toBeEnabled();
    view.unmount();
    fetchMock.mockImplementation(() => response(workspace({ ...exam, status: "draft" })));
    render(<TestsPage />);
    await screen.findByText("This paper needs a parent to confirm the taught material before you begin.");
    expect(screen.queryByRole("button", { name: "Start timed exam" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Parent · approve this paper"));
    expect(screen.queryByRole("button", { name: "Approve and publish" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View parent answer-key preview" })).toBeInTheDocument();
  });

  it("requires a fresh parent PIN before showing the answer key and publishing", async () => {
    const draft: Paper = { ...paper, kind: "exam", status: "draft", duration_minutes: 25, questions: [{ id: "q1", type: "choice", prompt: "Which force pulls the ball down?", options: ["Gravity", "Friction"], sourceIds: ["lesson-1"] }] };
    const fullPaper = { ...draft, questions: [{ ...draft.questions[0], answer: 0, explanation: "Earth attracts the ball.", rubric: "Identify gravity." }] };
    const actions: Record<string, unknown>[] = [];
    let published = false;
    fetchMock.mockImplementation((_url: string, options?: RequestInit) => {
      if (!options?.body) return response(workspace({ ...draft, status: published ? "published" : "draft" }));
      const body = JSON.parse(String(options.body)); actions.push(body);
      expect(body.pin).toBe("4821");
      if (body.action === "preview") return response({ paper: fullPaper });
      published = true; return response({ paper: { ...draft, status: "published" } });
    });
    render(<TestsPage />);
    fireEvent.click(await screen.findByText("Parent · approve this paper"));
    expect(screen.queryByText("Earth attracts the ball.", { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Parent PIN"), { target: { value: "4821" } });
    fireEvent.click(screen.getByRole("button", { name: "View parent answer-key preview" }));
    await screen.findByText("Gravity — correct answer");
    expect(screen.getByText("Earth attracts the ball.", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Identify gravity.", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve and publish" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I checked the questions and marking guides/ }));
    fireEvent.change(screen.getByLabelText(/Time allowed/), { target: { value: "35" } });
    fireEvent.click(screen.getByRole("button", { name: "Approve and publish" }));
    await screen.findByRole("button", { name: "Start timed exam" });
    expect(actions).toEqual([{ action: "preview", paperId: draft.id, pin: "4821" }, { action: "publish", paperId: draft.id, pin: "4821", durationMinutes: 35, coverageConfirmed: true }]);
    expect(screen.queryByText("Gravity — correct answer")).not.toBeInTheDocument();
    expect(localStorage.getItem("ansar-assessment-draft:attempt-1")).toBeNull();
  });

  it("serializes autosave revisions then submits immutable answers and displays feedback", async () => {
    let attempt = makeAttempt();
    const mutations: Record<string, unknown>[] = [];
    fetchMock.mockImplementation((_url: string, options?: RequestInit) => {
      if (!options?.body) return response(workspace());
      const body = JSON.parse(String(options.body)); mutations.push(body);
      if (body.action === "start") return response({ attempt });
      if (body.action === "save") { expect(body.revision).toBe(attempt.revision); attempt = { ...attempt, answers: body.answers, revision: attempt.revision + 1 }; return response({ attempt }); }
      if (body.action === "submit") { expect(body.revision).toBe(1); attempt = { ...attempt, status: "submitted", answers: body.answers, paper_snapshot: { ...paper, questions: [{ ...paper.questions[0], rubric: "Explain attraction towards Earth." }] } }; return response({ attempt }); }
      return response({});
    });
    render(<TestsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Begin Friday recall" }));
    const answer = await screen.findByLabelText("Answer 1");
    fireEvent.change(answer, { target: { value: "Gravity pulls a dropped ball towards Earth." } });
    expect(localStorage.getItem("ansar-assessment-draft:attempt-1")).toContain("dropped ball");
    await waitFor(() => expect(mutations.filter(m => m.action === "save")).toHaveLength(1), { timeout: 1800 });
    await screen.findByText("All answers saved");
    fireEvent.click(screen.getByRole("checkbox", { name: /I’ve checked my work/ }));
    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
    await screen.findByText("Submitted · awaiting Nihal");
    expect(screen.queryByLabelText("Answer 1")).not.toBeInTheDocument();
    expect(screen.getByText("Gravity pulls a dropped ball towards Earth.")).toBeInTheDocument();
    expect(screen.getAllByText("Explain attraction towards Earth.", { exact: false })).toHaveLength(2);
    expect(localStorage.getItem("ansar-assessment-draft:attempt-1")).toBeNull();
  });

  it("waits for an outstanding save before sending the next revision", async () => {
    const attempt = makeAttempt();
    let finishFirst: ((value: unknown) => void) | undefined;
    const saves: Record<string, unknown>[] = [];
    fetchMock.mockImplementation((_url: string, options?: RequestInit) => {
      if (!options?.body) return response(workspace(paper, [attempt]));
      const body = JSON.parse(String(options.body)); saves.push(body);
      if (saves.length === 1) return new Promise(resolve => { finishFirst = resolve; });
      return response({ attempt: { ...attempt, answers: body.answers, revision: 2 } });
    });
    render(<TestsPage />);
    const answer = await screen.findByLabelText("Answer 1");
    fireEvent.change(answer, { target: { value: "First explanation" } });
    await waitFor(() => expect(saves).toHaveLength(1), { timeout: 1800 });
    fireEvent.change(answer, { target: { value: "Better explanation" } });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 800)); });
    expect(saves).toHaveLength(1);
    await act(async () => { finishFirst?.(await response({ attempt: { ...attempt, answers: { q1: "First explanation" }, revision: 1 } })); });
    await waitFor(() => expect(saves).toHaveLength(2));
    expect(saves[0].revision).toBe(0);
    expect(saves[1]).toMatchObject({ revision: 1, answers: { q1: "Better explanation" } });
    await screen.findByText("All answers saved");
  });

  it("recovers a draft only for an existing in-progress attempt and autosaves it", async () => {
    const attempt = makeAttempt();
    localStorage.setItem("ansar-assessment-draft:attempt-1", JSON.stringify({ revision: 0, answers: { q1: "Recovered explanation", invented: "discard" } }));
    fetchMock.mockImplementation((_url: string, options?: RequestInit) => { if (!options?.body) return response(workspace(paper, [attempt])); const body = JSON.parse(String(options.body)); expect(body.answers).toEqual({ q1: "Recovered explanation" }); return response({ attempt: { ...attempt, answers: body.answers, revision: 1 } }); });
    render(<TestsPage />);
    expect(await screen.findByLabelText("Answer 1")).toHaveValue("Recovered explanation");
    await screen.findByText("All answers saved", {}, { timeout: 1800 });
  });

  it("stops stale edits on a revision conflict and reloads the saved attempt", async () => {
    let reload = false;
    const attempt = makeAttempt();
    fetchMock.mockImplementation((_url: string, options?: RequestInit) => { if (!options?.body) return response(workspace(paper, [{ ...attempt, revision: reload ? 3 : 0, answers: reload ? { q1: "Another device’s answer" } : {} }])); reload = true; return response({ message: "Revision conflict" }, 409); });
    render(<TestsPage />);
    fireEvent.change(await screen.findByLabelText("Answer 1"), { target: { value: "Stale draft" } });
    const reloadButton = await screen.findByRole("button", { name: "Reload saved attempt" }, { timeout: 1800 });
    expect(screen.getByLabelText("Answer 1")).toBeDisabled();
    fireEvent.click(reloadButton);
    await waitFor(() => expect(screen.getByLabelText("Answer 1")).toHaveValue("Another device’s answer"));
    expect(screen.getByLabelText("Answer 1")).toBeEnabled();
  });

  it("automatically submits once the authoritative deadline has passed", async () => {
    const exam = { ...paper, kind: "exam" as const, duration_minutes: 25 };
    const attempt = { ...makeAttempt(exam), expires_at: new Date(Date.now() - 1000).toISOString(), answers: { q1: "Saved before expiry" } };
    fetchMock.mockImplementation((_url: string, options?: RequestInit) => { if (!options?.body) return response(workspace(exam, [attempt])); const body = JSON.parse(String(options.body)); expect(body.action).toBe("submit"); return response({ attempt: { ...attempt, status: "submitted" } }); });
    render(<TestsPage />);
    await screen.findByText("Submitted · awaiting Nihal");
    expect(fetchMock.mock.calls.filter(call => call[1]?.body)).toHaveLength(1);
    expect(screen.getByText("Saved before expiry")).toBeInTheDocument();
  });

  it("records a rubric mark, feedback and next step with a fresh parent PIN", async () => {
    const attempt = { ...makeAttempt(), status: "submitted" as const, answers: { q1: "My original answer" }, paper_snapshot: { ...paper, questions: [{ ...paper.questions[0], rubric: "Explain attraction." }] } };
    let sent: Record<string, unknown> = {};
    fetchMock.mockImplementation((_url: string, options?: RequestInit) => { if (!options?.body) return response(workspace(paper, [attempt])); sent = JSON.parse(String(options.body)); return response({ attempt: { ...attempt, status: "reviewed", parent_review: { marks: sent.marks, feedback: sent.feedback, nextStep: sent.nextStep, reviewer: "Nihal", reviewedAt: new Date().toISOString() } } }); });
    render(<TestsPage />);
    fireEvent.click(await screen.findByText("Nihal · review this work"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Feedback"), { target: { value: "Good example. Explain the force." } });
    fireEvent.change(screen.getByLabelText("Next learning step"), { target: { value: "Draw the force on the ball." } });
    fireEvent.change(screen.getByLabelText("Parent PIN"), { target: { value: "4821" } });
    fireEvent.click(screen.getByRole("button", { name: "Record review" }));
    await screen.findByText("Reviewed by Nihal");
    expect(sent).toMatchObject({ action: "review", attemptId: "attempt-1", pin: "4821", marks: { q1: 1 }, practicalConfirmed: false });
    expect(screen.getByText("My original answer")).toBeInTheDocument();
    expect(screen.getByText("Good example. Explain the force.")).toBeInTheDocument();
  });

  it("keeps original answers when a separate correction is saved", async () => {
    const attempt = { ...makeAttempt(), status: "reviewed" as const, answers: { q1: "Original reasoning" } };
    fetchMock.mockImplementation((_url: string, options?: RequestInit) => { if (!options?.body) return response(workspace(paper, [attempt])); const body = JSON.parse(String(options.body)); expect(body).toEqual({ action: "correction", attemptId: "attempt-1", text: "Now I understand attraction." }); return response({ attempt: { ...attempt, correction: body.text } }); });
    render(<TestsPage />);
    fireEvent.change(await screen.findByLabelText("What I understand now"), { target: { value: "Now I understand attraction." } });
    fireEvent.click(screen.getByRole("button", { name: "Save correction" }));
    await screen.findByText("Now I understand attraction.");
    expect(screen.getByText("Original reasoning")).toBeInTheDocument();
    expect(screen.queryByLabelText("What I understand now")).not.toBeInTheDocument();
  });
});
