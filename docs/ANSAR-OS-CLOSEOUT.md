# ANSAR OS — Close-out, 28 July 2026

> **Why this is a file and not a Notion page.** The three targets named for this
> write-up — the WHATS NEXT master tracker (`3865429a…`), the ANSAR OS Build
> Pipeline (`3945429a…`) and the ANSAR OS Decision Log — are **not shared with
> the "LIARE Dashboard" integration**. All four Notion endpoints (`/pages`,
> `/databases`, `/data_sources`, `/blocks`) return 404 for both IDs, and a
> workspace-wide search for "ANSAR OS", "WHATS NEXT" and "Build Pipeline"
> surfaces only the four ANSAR OS data sources. A 404 means not shared, not
> missing. Share those three pages with LIARE Dashboard (bot
> `3295429a-fa90-818c-96ad-0027f049f6e1`) and this text can be posted verbatim.

---

## How Nihal restores a missed habit

If Ansar genuinely did something and the board says he didn't — he was sick, you
were travelling, the power was out, or he simply forgot to tap it before the
window closed — you can restore it yourself. You do not need Taylan and you do
not need to touch a database.

**Find the habit on the board.** A habit he can still do right now is in full
colour. A habit that has gone past its time is greyed out and says **Missed**. A
habit that is not available yet is greyed out and tells you when it opens, like
"Opens 6:30am". Those greyed-out ones are the ones you can restore.

**Press and hold it for two seconds.** Not a tap — a tap on a greyed-out habit
does nothing at all, deliberately, because tapping is the first thing a child
tries. Put the mouse pointer on the habit, hold the button down, and keep
holding. A gold bar fills across the habit from left to right while you hold. If
you let go early, the bar disappears and nothing happens. When the bar finishes
filling, a window opens.

**The window tells you what you are overriding.** It shows the habit's name and
the exact reason the board refused it — for example "Missed — the window closed
at 1:30pm". Read it before you continue, so you know what you are changing.

**Type the four-digit PIN.** It only accepts numbers. Taylan has it; it is not
written down anywhere in the app, the website or Notion.

**Add a reason if you want to.** There is a box that says "Sick, travelling,
power out…". It is optional — you can leave it empty and it will still work. It
is worth filling in, because the reason is kept permanently and it is the only
record of *why* a habit was restored rather than earned.

**Press Unlock.** The window closes, the habit turns to done, and his points go
up straight away.

**What you will see afterwards.** The restored habit shows a small gold
**⟲ OVERRIDE** tag next to it, and hovering over it says "Parent override". That
tag is deliberate. A restored habit must never look identical to one he actually
earned, or the board stops telling the truth about his week.

**If you get the PIN wrong.** It says "Incorrect PIN.", clears the box, and lets
you try again. After five wrong attempts in a row the override locks for fifteen
minutes and shows a countdown. Refreshing the page or opening a new tab does not
clear it — the lock is held on the server, not in the browser, precisely so it
cannot be got around by a ten-year-old with a refresh button.

**To back out at any point:** press Cancel, press Escape, or click the dark area
outside the window. Nothing is recorded unless you press Unlock.

---

## What shipped

**Server-authoritative, time-gated habit ticks — SHIPPED and production-verified.**
Ticks are no longer written by the browser. Every completion now goes through
`/api/tick`, which decides on the server, against the server's own clock, and
writes with a privileged key the browser never sees. Four gates are enforced
there, in this order:

- **WINDOW** — a tick outside a habit's `[Window Start, Window End]` is refused;
  "not_open" before it, "closed" after it. The submitted date is validated
  against the server's own Australia/Sydney date rather than trusted, which is
  what makes end-of-day batching impossible.
- **DWELL** — a tick fewer than *Dwell Seconds* after the previous tick in the
  same block is refused as "too_fast". Seven morning habits at 90 seconds each
  cannot be cleared in under nine minutes.
- **ORDER** — within a block, the habit at position N is refused until N−1 is
  recorded ("out_of_order").
- **CASCADE** — the Homeschool block refuses everything until Morning Habits is
  100% complete, and the Stretch Wallet stays shut until Morning Habits *and*
  Homeschool are both complete ("locked").

The board's button states — LOCKED, LIVE, MISSED, DONE — are **cosmetic**. They
render what the server already decided. Changing the clock on the machine
changes nothing, because no decision on the page is made from the device's time.

**RLS hardened — anon holds SELECT only.** This is the one that mattered most.
Before it, the browser key could write completions directly and every gate above
was decorative. That was measured, not assumed: on 28 July an anon-key
`POST /rest/v1/habit_completions` returned **HTTP 201** and a `DELETE` returned
**HTTP 200**. After hardening, the same three calls return **HTTP 401 /
`42501 permission denied`**, and a real existing row survives a deletion attempt
untouched.

**Parent override — live end to end, UI and API.** Long-press to reach it, PIN
held only in the Netlify environment, every use written to `override_log` with
the server's timestamp and the reason, and a brute-force lockout after five
failures. Restored habits render visibly distinct from earned ones.

**Timezone fixed properly.** Everything now uses `Intl.DateTimeFormat` with
`timeZone: "Australia/Sydney"`, which knows the daylight-saving rules.
`getAestHour()`'s hardcoded `UTC+10` has been replaced in **both**
family-dashboard copies (`app/components/Header.tsx`, `app/week/page.tsx`) and is
on `main`. That offset was wrong for roughly half the year — Sydney runs UTC+11
during AEDT — so the TV panel flipped to night an hour early every summer from
October.

> **The `+10:00` string-append fix remains PERMANENTLY BANNED.** It was tried,
> it caused a ten-hour shift because it was applied to a value that was already
> UTC, and it was reverted. Never append an offset to a timestamp. Use an IANA
> zone.

**`addDays()` UTC date-key bug fixed.** It used to build local noon and read the
result back through `toISOString()`, which drifts by a day depending on where the
process runs. It is now pure UTC-anchored calendar arithmetic.

**Habit list ported off the hardcode.** The board reads `/api/habits` live;
**Notion is now canonical for habit structure on this surface.** `POINTS_ACTIVE`
also reads from Notion now — the "Soft-launch · points preview" chip had been
wrong since 14 July, because Notion said points were active and the code held a
hardcoded `false` that needed a deploy to change.

**Notion Points corrected to match what `scoring.ts` actually pays:** `goals` 0,
`homeschool_session` 5, and `readtheory` / `khan` / `journal` 0 **and inactive**.
**Homeschool is ONE habit.** Before this the board promised "+1 pt" for habits
that award nothing — a broken promise is worse than no number.

**`app/globals.css` created.** This repo had no stylesheet at all, which is
exactly how `#00d9ff` drifted in unnoticed and stayed. The canonical tokens now
live in one greppable place: `--bg-base #1e2140`, `--bg-card #252a4a`,
`--cyan #00d4ff`.

**The Ansar Dashboard is viewed on a MAC, not an iPad.** Every reference should
say so. The board is built and measured for 1440×820 and up; iPad viewport sizes
are no longer a target and should not be optimised for.

---

## Learnings worth keeping

**Netlify withholds secret-marked env values from Deploy Previews.** The variable
*names* are visible to the function; the *values* arrive as empty strings. This
cost most of a session: `SUPABASE_SERVICE_ROLE_KEY` and `PARENT_OVERRIDE_PIN`
both read as "present but falsy", which looks identical to a typo. Once a
variable is marked secret **the tick cannot be undone** — set the per-context
value instead. And test the *value*, never the key's existence: a name check
reports "configured" while every write still fails.

**Notion "Active" drifts from what the code actually scores, and CODE WINS.**
`readtheory`, `khan` and `journal` were still ticked Active in Notion long after
`scoring.ts` retired them. Porting the board off the hardcode faithfully
resurrected all three onto the board, changing the Perfect Day denominator and
the cascade. Where Notion and code disagree about whether something is retired,
**ask — do not restore on judgement.** That was a wrong call in this session and
it took a correction to undo.

**The 5-minute Notion memo is per-Lambda-instance.** After a Notion edit,
different endpoints can disagree for up to five minutes — `/api/tick` returning
the new list while `/api/habits` still returns the old one, because they were
served by different warm instances. Never diagnose from a single call inside that
window.

**A working API path with no UI is not a shipped feature.** The parent override
was PIN-verified, audited and completely unreachable from the board for the
entire build. Clicking a MISSED habit did nothing. It was only "done" in the
sense that the endpoint answered.

**On 28 July at 21:11 the entire evening block was ticked in 12 seconds**, 41
minutes after its window closed, straight through the pre-gate code with the anon
key. Those five rows were left in place deliberately — the rules were not live
yet, and rewriting history to make the new system look good would be the same
dishonesty the gates exist to prevent.

---

## The standing pattern, honestly

This was **another infrastructure session**. The habit tracker is materially
better — it is now genuinely hard to cheat, the clock is correct, and the control
layer is in Notion where it can be changed without a deploy. None of that sells
anything.

**Real product test #1 through the ECOM Launchpad remains 0 of 3.** It is the
next session's only task.
