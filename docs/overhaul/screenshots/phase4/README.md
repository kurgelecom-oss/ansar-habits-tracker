# Phase 4 screenshots

Captured 4 Oct 2026 (a Sunday) from the PR #23 deploy preview
(deploy-preview-23--ansar-habits-tracker.netlify.app), same nine shots as the
baseline: /, /progress and /tests at 390 / 834 / 1440. Full page, CSS pixels.

No horizontal scroll at any of the nine (document scrollWidth equals the
viewport's client width in every one). `/api/habits` returned 19 on the preview.

## What these do NOT show

It was a rest day, so on `/` the four habit panels are replaced by the rest-day
card. The weekday layout — two pillars above the habit panels — is not in this
set. Capture `/` again on a weekday before calling the gate closed.

## Fixed along the way, visible against the baseline

- Phone: nav no longer clips at "Targ…"; the motto no longer bleeds past both edges.
- Tablet: the week badge no longer sits on the wordmark; team names no longer
  run into the kickoff time.
