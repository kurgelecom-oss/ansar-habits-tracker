# Dashboard V2 Visual-Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the verified Dashboard V2 visually match the approved ANSAR FC concept while preserving all real behavior and the 1440 × 820 fit contract.

**Architecture:** Presentation-only changes extend the extracted dashboard components and CSS. The existing page remains the data/controller owner; protected APIs and libraries do not change.

**Tech Stack:** Next.js 15, React 18, CSS Modules, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-29-dashboard-v2-visual-parity-design.md`

## Global Constraints

- No protected API, library, database or Netlify changes.
- No invented football result, learning completion, currency or evidence.
- Habit rows stay at least 44px and every weekday habit fits at 1440 × 820.
- Draft Deploy Preview only; no production merge or publish.

---

### Task 1: Lock the visual-parity contracts

**Files:**
- Modify: `app/components/dashboard/dashboard.test.tsx`

- [x] Add failing tests for the visible ANSAR FC wordmark in club navigation,
  journal and Homeschool semantic classes, dashboard-only shared-nav removal,
  masthead structure and 44px row preservation.
- [x] Run `npm test -- app/components/dashboard/dashboard.test.tsx` and confirm
  failures are caused by missing parity behavior.

### Task 2: Build the stadium chrome

**Files:**
- Modify: `app/components/dashboard/ClubNavigation.tsx`
- Modify: `app/components/dashboard/ClubHeader.tsx`
- Modify: `app/components/dashboard/dashboard.module.css`
- Modify: `app/globals.css`
- Modify: `app/page.tsx`

- [x] Restore the visible ANSAR FC club mark and elevate navigation finish.
- [x] Turn ClubHeader into the stadium masthead while keeping truthful status
  in the navigation/status region.
- [x] Hide shared `.topnav` only when the ANSAR FC dashboard main is present.
- [x] Reallocate the recovered 40px without violating the weekday fold.
- [x] Run component tests, TypeScript and build.

### Task 3: Raise panel and learning hierarchy

**Files:**
- Modify: `app/components/dashboard/HabitRow.tsx`
- Modify: `app/components/dashboard/HomeschoolSection.tsx`
- Modify: `app/components/dashboard/Panel.tsx`
- Modify: `app/components/dashboard/dashboard.module.css`

- [x] Add stable habit identity hooks to rows.
- [x] Give Journal a gold prerequisite treatment and Homeschool session a cyan
  anchor treatment without changing their state, points or events.
- [x] Increase panel depth, title hierarchy and tactical-divider finish using
  existing tokens only.
- [x] Keep all tests green and add no internal scrolling.

### Task 4: Preview comparison and proof

**Files:**
- Create: `docs/verification/dashboard-v2-visual-parity.md`
  (a new file rather than a modification: the `55bc199` report stays intact as
  the record of what was verified then, and this pass gets its own proof.)

- [x] Run all tests, TypeScript, build and scoring sync.
- [x] Confirm protected diff is empty.
- [x] Push the preview branch and wait for Deploy Preview commit identity.
- [x] Capture 1440 × 820 weekday simulation and 390 × 844 mobile.
- [x] Compare side-by-side with the supplied reference: navigation, masthead,
  Match Centre, panel depth, Journal prominence and Homeschool prominence.
- [x] Stop on any clipping, hidden habit or invented factual content.

---

## Outcome

Delivered across `d4fb4e1` and `3cc73aa`. Proof:
`docs/verification/dashboard-v2-visual-parity.md`.

Measured at 1440 x 820 on the deploy preview with the weekday roster: 15 rows,
all >= 44px, none below the fold, zero clipped elements, 123px clear under the
panel grid. The board costs the page exactly what it did at `55bc199` — the
masthead and the restored Match Centre are funded by the shared nav this route
no longer draws.

Two gaps were found during the Task 4 comparison and fixed rather than filed:
the masthead scrim was too light for the status row to sit on, and the Match
Centre was still compressed to a 56px strip against a height shortage that no
longer existed.

Still open: a real weekday has never been observed (the roster above is
simulated on a real render), and the offline-recovery defect from `55bc199` is
untouched because it is app logic, not presentation.
