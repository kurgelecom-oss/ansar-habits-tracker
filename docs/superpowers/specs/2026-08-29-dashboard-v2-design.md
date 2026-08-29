# ANSAR FC Dashboard V2 — Design and Implementation Contract

**Date:** 29 August 2026  
**Status:** Ready for stakeholder review  
**Repository:** `kurgelecom-oss/ansar-habits-tracker`  
**Implementation owner:** Claude Code Terminal  
**Architecture, review and release authority:** Codex + Taylan  
**Primary viewport:** 1440 × 820 desktop  

## 1. Product principle

> The system should feel like a football game, but behave like a trustworthy learning platform.

Dashboard V2 is a visual and information-architecture overhaul of the existing Ansar habit tracker. It must preserve the current server-authoritative learning system while raising the interface to the quality of a polished football-club product.

The generated ANSAR FC concept is the visual-quality reference, not a factual content reference. The production dashboard, current source code, Notion configuration, Supabase records and Tally submissions remain the sources of truth.

## 2. Immediate objectives

Dashboard V2 has two approved priorities:

1. Rebuild the dashboard's look, hierarchy and interaction quality.
2. Add real Real Madrid fixture, score and table data through a read-only server integration.

The wider portal navigation may be represented visually, but only Dashboard is implemented in this initiative. Habits, Quests, Team, Table, History and Settings are separate future products with separate design contracts.

## 3. Non-goals

This initiative must not:

- change scoring arithmetic;
- change habit windows, order, dwell or cascade rules;
- change Stretch Wallet earning or redemption rules;
- change Golden Boot rules;
- change the parent PIN or override process;
- change Notion data-source identifiers or schemas;
- change existing Supabase tables, policies or RLS;
- replace Tally form `ODKlVa`;
- turn football information into a fabricated learning score;
- implement the future navigation spaces;
- deploy directly to production without a reviewed Deploy Preview;
- redesign the system as a general social network, game or entertainment feed.

## 4. Existing behaviour is protected

The following modules and routes are protected contracts. Refactoring their internals or changing their response semantics is outside Dashboard V2 unless a separately approved defect requires it:

- `app/api/tick/route.ts`
- `app/api/habits/route.ts`
- `app/api/settings/route.ts`
- `app/api/stretch/route.ts`
- `app/api/stretch-items/route.ts`
- `app/api/golden-boot/route.ts`
- `app/lib/gating.ts`
- `app/lib/scoring.ts`
- `app/lib/streak.ts`
- `app/lib/goldenBoot.ts`
- `app/lib/notion.ts`
- `app/lib/supabase.ts`
- `app/lib/supabase-admin.ts`
- `app/lib/time.ts`
- `app/lib/pin-lockout.ts`
- all files under `db/`

The existing server remains authoritative for:

- Sydney date and time;
- LIVE, LOCKED, MISSED and DONE states;
- completion writes;
- habit ordering;
- dwell enforcement;
- cascade enforcement;
- parent override authorization;
- override auditing;
- weekly scoring;
- reward unlocking and spending.

The browser is a renderer and request client. Dashboard V2 must not recreate these decisions client-side.

## 5. Truth model

The UI must clearly distinguish four types of truth:

1. **Learning truth:** server-accepted habits and Tally evidence.
2. **Administrative truth:** visible parent overrides and audit history.
3. **Progress presentation:** points, tiers, readiness and streaks calculated from approved records.
4. **Football truth:** factual third-party fixture, score and table data.

One category must never masquerade as another. In particular:

- Ansar's work must never alter a real football score.
- A football result must never award learning completion automatically.
- A parent override must never look identical to an earned completion.
- A self-certified journal tick must not be described as Tally-verified.
- Stale football data must be labelled stale.

## 6. Information architecture

The primary desktop composition is:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Club identity | Dashboard Habits Quests Team Table History Settings  │
├────────────────────────────────────────────────────────────────────────┤
│                         REAL MADRID MATCH CENTRE                       │
│ Real Madrid | factual fixture state / score | opponent | competition │
│                         Match Readiness                               │
├──────────────────┬──────────────────┬──────────────────┬────────────────┤
│ Morning Habits   │ Homeschool       │ Work + Week      │ Stretch Wallet │
│ real habits      │ journal          │ Log Work         │ balance        │
│ real gates       │ school session   │ weekly form      │ stretch items  │
│ overrides        │ evidence state   │ tier/Golden Boot │ redemption     │
└──────────────────┴──────────────────┴──────────────────┴────────────────┘
```

The page must remain usable at the established 1440 × 820 target without requiring routine vertical scrolling. Content density may adapt by day; information must not simply be shrunk until illegible.

## 7. Top navigation contract

### 7.1 Visible items

- Dashboard — active and functional.
- Habits — future space.
- Quests — future space.
- Team — future space.
- Table — future space; use `Table`, not `Leaderboards`.
- History — future space.
- Settings — future parent-controlled space.

### 7.2 Initial behaviour

Only Dashboard may navigate to implemented content. Future items must use one approved treatment consistently:

- disabled with a quiet `Coming later` tooltip; or
- visually absent until their individual phase begins.

They must not link to blank pages or misleading placeholders.

### 7.3 Header status

The right side contains:

- authoritative Sydney server time when available;
- compact connection state;
- optional current points/streak summary only if it does not duplicate the scoreboard excessively.

No invented currency, diamonds, levels or slogans may be introduced.

## 8. Match Centre contract

### 8.1 Purpose

The Match Centre provides factual Real Madrid context and motivation. It is not the learning scoreboard.

### 8.2 Required states

**UPCOMING**

- teams and crests;
- competition;
- Sydney kickoff date and time;
- countdown;
- venue when available.

**LIVE**

- factual live score;
- match minute/status;
- competition;
- last-updated time.

**FINISHED**

- factual final score;
- full-time status;
- competition;
- relative played date.

**POSTPONED/CANCELLED**

- explicit provider status;
- no score invention;
- no misleading countdown.

**UNAVAILABLE**

- calm unavailable message;
- last successful update when a cache exists;
- no broken layout;
- no impact on learning functionality.

### 8.3 Match selection

The displayed match follows this order:

1. an active live Real Madrid match;
2. a recently finished match within the configured result-display window;
3. the next scheduled match;
4. unavailable state.

The finished-result window defaults to 24 hours and must be a server constant, not a Notion field in this phase.

### 8.4 Match Readiness

`Match Readiness` is visually related but semantically separate. It summarizes existing learning state:

- Morning Habits completion;
- Homeschool completion;
- journal state;
- work-submission count/evidence state;
- applicable conditional habits.

Readiness must be labelled and must never occupy the score position between two real teams.

### 8.5 Unlock policy

Before core learning checkpoints:

- opponent, competition and kickoff remain visible;
- live score, detailed table and entertainment-heavy football content remain locked;
- the lock explains the next genuine requirement.

Full Match Centre content unlocks after:

- Morning Habits are complete;
- Homeschool is complete;
- the journal is verified by the approved evidence rule.

Weekend access continues to respect the existing Qur'an minimum. Exact journal verification automation is a future functional phase; Dashboard V2 must not falsely label current journal ticks as verified.

## 9. Football provider architecture

### 9.1 Initial provider

Use football-data.org for the first integration because its current free plan includes Primera División coverage and supports matches, team matches and standings.

### 9.2 Provider isolation

All provider-specific code sits behind a project-owned interface:

```ts
interface FootballProvider {
  getTeamMatchCentre(teamKey: string): Promise<MatchCentreData>;
  getCompetitionTable(competitionKey: string): Promise<TableRow[]>;
}
```

The dashboard consumes only the internal `MatchCentreData` contract.

Recommended file boundary:

```text
app/api/football/real-madrid/route.ts
app/lib/football/types.ts
app/lib/football/provider.ts
app/lib/football/football-data.ts
app/lib/football/normalize.ts
```

### 9.3 Security

- Provider API tokens are server-only.
- The key name must not start with `NEXT_PUBLIC_`.
- The key must never enter response bodies, logs, client bundles or error messages.
- The browser calls only the project's API route.
- A missing key returns a deliberate unavailable response, not a stack trace.

### 9.4 Resilience

- Scheduled fixture data is cached for hours.
- Live data uses a short refresh only while the provider reports a live state.
- Completed data is cached more aggressively.
- Rate-limit responses do not cascade into page failure.
- The route returns `updatedAt` and `stale`.
- Last-known-good data may be shown only when visibly labelled stale.
- Football provider errors never block habit ticking, Tally, rewards or overrides.

### 9.5 No persistence migration in V2

Version one must use server/CDN caching and requires no new Supabase table. Persistent football caching may be proposed later if operational evidence justifies it.

## 10. Four-panel visual contract

### 10.1 Shared panel anatomy

Every panel uses:

- a thin semantic accent line;
- title, supporting subtitle and compact summary;
- consistent internal padding;
- consistent row height;
- one dominant action at most;
- readable disabled states;
- no unnecessary nested card borders;
- no layout shift after data loads.

### 10.2 Morning Habits

The real configured habits remain in Notion order.

Each row contains:

- icon;
- habit name;
- concise state or timing message;
- point indicator when meaningful;
- circular state control;
- visible gold override marker when applicable.

State design:

- LIVE: high contrast, actionable, neutral border.
- DONE: clear positive control, subdued row, readable title.
- LOCKED: muted but legible; opening time or gate reason visible.
- MISSED: restrained red; no alarm-wall treatment.
- OVERRIDE: done state plus unmistakable gold audit marker.

The morning feasibility warning is a compact banner, not a competing full card.

### 10.3 Homeschool

Required ordering:

1. Daily learning journal entry written.
2. Homeschool session completed.
3. Evidence summary when available.

The journal row must be visible when applicable and must never disappear because its point value is zero. A prerequisite can be visually quieter than a scored habit, but not hidden.

Current completion may be shown as `Recorded`; only a confirmed matching Tally journal record may be labelled `Verified`.

### 10.4 Work + Week

Contains:

- prominent `Log Work` action using existing Tally modal;
- today's Tally submission count when safely available;
- latest subject/entry summary when available;
- current weekly points and tier;
- compact tier-progress track;
- Golden Boot progress;
- optional Mon–Fri form strip.

The four existing tier boxes should become one current-tier summary plus a compact threshold scale.

### 10.5 Stretch Wallet

Contains:

- banked-minute balance;
- one lock/unlock explanation;
- current stretch items;
- earned state;
- weekend redemption state;
- daily cap and bonus;
- bottom conversion action.

Purple is reserved for wallet value and reward actions. Disabled text must still meet contrast requirements.

## 11. Visual design system

### 11.1 Visual direction

The target is premium broadcast-football software, not a children's sticker chart and not a betting product.

Required qualities:

- strong hierarchy;
- spacious composition;
- crisp typography;
- dark stadium atmosphere;
- restrained motion;
- high-quality club identity;
- clear operational states;
- consistent geometry;
- factual, calm language.

### 11.2 Core palette

- base: `#0f1419`;
- primary card: `#16192d`;
- secondary card/row: `#1f2438`;
- Real Madrid navy: `#0d2350`;
- gold: `#D4AF37`;
- bright gold: `#E7C55B`;
- canonical cyan: existing `var(--cyan)`;
- success: existing green token;
- warning: orange;
- failure/missed: red;
- wallet: purple.

Tokens must live in CSS rather than being repeatedly redeclared inline.

### 11.3 Typography

- Use a highly legible sans-serif family already supportable without fragile runtime dependencies.
- Minimum operational text size: 11px at the target viewport.
- Habit titles: 13–15px.
- Panel titles: 15–18px.
- Scoreboard figures: 28–40px depending on state.
- No decorative serif is required for functional UI.

### 11.4 Motion

Allowed:

- short state transitions;
- restrained completion feedback;
- match-status pulse for live state;
- existing long-press override indicator;
- panel/content fades that do not delay interaction.

Disallowed:

- casino-like celebrations;
- confetti for ordinary ticks;
- looping background animation;
- motion that disguises loading;
- animations that ignore `prefers-reduced-motion`.

### 11.5 Football identity

- Use accurate team crests returned or licensed through the provider where permitted.
- Preserve the existing Real Madrid asset as fallback.
- Never invent opposing crests or team names.
- Do not introduce betting odds, predictions or gambling language.

## 12. Responsive behaviour

### 12.1 Desktop

- 1440 × 820 is the primary acceptance viewport.
- Core dashboard should fit without routine vertical scrolling.
- Match Centre spans all columns.
- Four panels remain aligned and visually balanced.

### 12.2 Intermediate widths

- Four columns may become two-by-two.
- Match Centre remains full width.
- Navigation may collapse non-active future items.
- Functional content must not be horizontally clipped.

### 12.3 Mobile

- Panels stack in operational order: Match Centre, Morning, Homeschool, Work, Wallet.
- Navigation becomes a compact menu.
- Habit controls retain comfortable touch targets.
- Parent override remains intentionally undiscoverable to casual taps.
- Football content must not push today's required work below excessive decorative content.

## 13. Accessibility and trust

- Every status must have text in addition to color.
- Interactive controls require keyboard focus states.
- Disabled controls must expose a reason.
- Live football updates use a non-disruptive live region.
- Server and device time remain clearly distinguishable where both appear.
- Loading skeletons must not resemble completed content.
- Error states must state whether learning actions remain safe.
- Completion, override and verification labels must use distinct language.

## 14. Component boundary

`app/page.tsx` should become an orchestrator rather than the entire UI implementation.

Recommended components:

```text
app/components/dashboard/DashboardShell.tsx
app/components/dashboard/ClubNavigation.tsx
app/components/dashboard/ClubHeader.tsx
app/components/dashboard/MatchCentre.tsx
app/components/dashboard/MatchReadiness.tsx
app/components/dashboard/DashboardGrid.tsx
app/components/dashboard/HabitPanel.tsx
app/components/dashboard/HabitRow.tsx
app/components/dashboard/HomeschoolPanel.tsx
app/components/dashboard/WorkWeekPanel.tsx
app/components/dashboard/WeeklyTierProgress.tsx
app/components/dashboard/StretchWalletPanel.tsx
app/components/dashboard/ParentOverrideDialog.tsx
app/components/dashboard/StatusToast.tsx
```

Component extraction must be behaviour-preserving. Large visual extractions and football integration must not occur in the same commit.

## 15. Delivery sequence

### Phase 0 — Baseline and invariants

- Record production deploy and Git commit.
- Capture current API response shapes.
- Capture screenshots for major day/state combinations.
- Run current build and scoring-sync checks.
- Verify anonymous Supabase writes remain blocked.
- Record environment-variable names without printing values.
- Establish rollback instructions.

### Phase 1 — Visual specification and fixtures

- Produce 1440 × 820 weekday and weekend mockups using real content.
- Define loading, unavailable, missed, override and narrow-screen variants.
- Create deterministic UI fixture data for visual development.
- Obtain Taylan's visual approval before implementation continues.

### Phase 2 — Behaviour-preserving extraction

- Extract existing UI into components.
- Keep route calls and write handlers unchanged.
- Commit in small, reviewable units.
- Verify no behavioural regression after each extraction.

### Phase 3 — Dashboard V2 preview

- Apply the approved visual system.
- Keep V2 behind a preview path or deploy-only flag.
- Compare V1 and V2 against identical fixtures.
- Do not cut production over.

### Phase 4 — Football provider

- Add server-only provider adapter.
- Add normalized route contract.
- Add caching, rate-limit and stale handling.
- Verify Sydney time conversion.
- Verify no key reaches the client.

### Phase 5 — Match Centre and readiness

- Render factual match states.
- Render separately labelled Match Readiness.
- Apply unlock presentation without altering protected learning gates.
- Verify football failure isolation.

### Phase 6 — Verification and controlled release

- Complete automated checks.
- Complete visual comparison.
- Complete buyer-style child and parent walkthroughs.
- Verify all integrations on Deploy Preview.
- Obtain production approval.
- Deploy with immediate rollback available.

## 16. Git and collaboration protocol

Claude Code Terminal is the only implementation writer for application code during each assigned work unit.

Codex:

- owns the contract and acceptance criteria;
- issues bounded work orders;
- reviews commits and diffs;
- independently tests preview behaviour;
- validates security and integrations;
- reports pass, fail or required remediation.

Claude:

- creates the implementation branch;
- implements one phase at a time;
- does not reinterpret protected contracts;
- commits atomically;
- reports changed files, tests and deviations;
- stops when a requirement conflicts with existing architecture.

Neither agent may make concurrent overlapping edits. Every phase follows:

1. approved work order;
2. Claude implementation;
3. atomic commit;
4. Codex independent review;
5. remediation if required;
6. preview verification;
7. approval for the next phase.

## 17. Required test matrix

### Learning states

- LIVE habit;
- DONE habit;
- LOCKED habit;
- MISSED habit;
- parent override;
- incorrect PIN;
- override lockout;
- too-fast rejection;
- out-of-order rejection;
- cascade rejection;
- Notion unavailable;
- Supabase unavailable;
- Tally modal submission;
- Tally embed unavailable;
- wallet locked/unlocked;
- weekend redemption;
- Golden Boot progress.

### Football states

- upcoming;
- live;
- half-time;
- finished;
- postponed;
- cancelled;
- no scheduled match;
- rate limited;
- invalid provider response;
- provider unavailable;
- stale cached response;
- daylight-saving boundary.

### Viewports

- 1440 × 820;
- 1920 × 1080;
- intermediate two-column layout;
- representative mobile portrait.

## 18. Release blockers

Any of the following blocks production:

- changed scoring result for the same completion data;
- changed gate result for the same time and habit data;
- anonymous Supabase write becomes possible;
- service-role or provider key appears in a client bundle or response;
- override loses its audit marker;
- Tally modal no longer submits;
- football outage breaks learning controls;
- real and gamified scores are visually ambiguous;
- journal is labelled verified without matching evidence;
- target desktop layout requires routine scrolling;
- locked or disabled text is unreadable;
- unapproved Supabase, Notion or Netlify mutation;
- no tested rollback path;
- visual output materially misses the approved quality reference.

## 19. Definition of done

Dashboard V2 is complete only when:

- it meets the approved 1440 × 820 visual contract;
- all real habits and current operational context are represented accurately;
- protected API and data contracts remain intact;
- Real Madrid data is factual, server-fetched and failure-isolated;
- Match Readiness is distinct from the real match score;
- existing Tally, Notion, Supabase, Netlify and override flows pass verification;
- desktop and mobile walkthroughs pass;
- a reviewed Netlify Deploy Preview passes the full test matrix;
- Taylan approves the visual result;
- Codex issues a production-readiness pass;
- the previous production deploy can be restored immediately.

## 20. Required approval before implementation

Approval of this document authorizes planning and bounded implementation work orders. It does not authorize an uncontrolled rewrite, database migration or immediate production deployment.

The first implementation work order after approval is **Phase 0 — Baseline and invariants**. Application code changes begin only after the baseline evidence is complete.
