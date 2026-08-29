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

- [ ] Add failing tests for the visible ANSAR FC wordmark in club navigation,
  journal and Homeschool semantic classes, dashboard-only shared-nav removal,
  masthead structure and 44px row preservation.
- [ ] Run `npm test -- app/components/dashboard/dashboard.test.tsx` and confirm
  failures are caused by missing parity behavior.

### Task 2: Build the stadium chrome

**Files:**
- Modify: `app/components/dashboard/ClubNavigation.tsx`
- Modify: `app/components/dashboard/ClubHeader.tsx`
- Modify: `app/components/dashboard/dashboard.module.css`
- Modify: `app/globals.css`
- Modify: `app/page.tsx`

- [ ] Restore the visible ANSAR FC club mark and elevate navigation finish.
- [ ] Turn ClubHeader into the stadium masthead while keeping truthful status
  in the navigation/status region.
- [ ] Hide shared `.topnav` only when the ANSAR FC dashboard main is present.
- [ ] Reallocate the recovered 40px without violating the weekday fold.
- [ ] Run component tests, TypeScript and build.

### Task 3: Raise panel and learning hierarchy

**Files:**
- Modify: `app/components/dashboard/HabitRow.tsx`
- Modify: `app/components/dashboard/HomeschoolSection.tsx`
- Modify: `app/components/dashboard/Panel.tsx`
- Modify: `app/components/dashboard/dashboard.module.css`

- [ ] Add stable habit identity hooks to rows.
- [ ] Give Journal a gold prerequisite treatment and Homeschool session a cyan
  anchor treatment without changing their state, points or events.
- [ ] Increase panel depth, title hierarchy and tactical-divider finish using
  existing tokens only.
- [ ] Keep all tests green and add no internal scrolling.

### Task 4: Preview comparison and proof

**Files:**
- Modify: `docs/verification/dashboard-v2-preview.md`

- [ ] Run all tests, TypeScript, build and scoring sync.
- [ ] Confirm protected diff is empty.
- [ ] Push the preview branch and wait for Deploy Preview commit identity.
- [ ] Capture 1440 × 820 weekday simulation and 390 × 844 mobile.
- [ ] Compare side-by-side with the supplied reference: navigation, masthead,
  Match Centre, panel depth, Journal prominence and Homeschool prominence.
- [ ] Stop on any clipping, hidden habit or invented factual content.
