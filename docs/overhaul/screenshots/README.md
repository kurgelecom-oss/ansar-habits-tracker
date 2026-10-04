# Baseline screenshots

Captured 4 Oct 2026 from the LIVE site (ansar-habits-tracker.netlify.app), at
the three widths the guardrails require: phone 390, tablet 834, desktop 1440.
Full-page, CSS pixels.

These are the baseline for phases 1-6. Capture the same set after each phase
and diff them — that is how you catch what you did not mean to change.

## Honest note on what "before" means here

Phase 0 shipped before these were taken, so this is not a true pre-Phase-0
before. Phase 0's own verification was 402 passing tests plus live checks of
each fix, not images. Two Phase 0 fixes are visible in these shots and were
confirmed from them:

- `phone-390--home.png` — the badge reads "No school programme on the weekend."
  (captured on a Sunday). It used to read "No week loaded".
- `phone-390--progress.png` — Evidence review shows its empty state. It used to
  open on a hand-transcribed report from 31 August, presented as current.

## Already visible, for later phases

- Phone overflow: the nav clips ("Targ..."), the week pills clip ("We..."), and
  the hero line bleeds past both edges. Phase 4 names this.
- /tests logs a 401 on load when the device is not unlocked. Expected, not a bug.

## How to re-capture

Playwright MCP, full page, scale css, same three widths, same three routes
(/, /progress, /tests), same filenames.
