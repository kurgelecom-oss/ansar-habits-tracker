# ANSAR FC Dashboard V2 Visual Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Replace the monolithic dashboard presentation with the approved premium four-panel ANSAR FC interface while preserving every current learning, reward, audit, and integration behaviour.

**Architecture:** Keep \`app/page.tsx\` as the state/side-effect orchestrator and move presentation into focused components with explicit props. Put dashboard styles in a CSS module, lock display logic with deterministic tests, and release only through a Netlify Deploy Preview. Real Madrid provider work is intentionally excluded until this visual preview passes.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript 5.8, CSS Modules, Supabase client, Notion-backed routes, Tally embed, Vitest, React Testing Library, jsdom.

**Spec:** \`docs/superpowers/specs/2026-08-29-dashboard-v2-design.md\`

## Global Constraints

- Primary acceptance viewport: exactly 1440 × 820; routine vertical scrolling blocks release.
- Presentation may change; existing route, scoring, gating, wallet, Golden Boot, Tally, override, and time semantics may not.
- Do not modify \`app/api/**\`, protected \`app/lib/**\`, \`db/**\`, or \`netlify.toml\`.
- Do not change Notion IDs, Tally form \`ODKlVa\`, Supabase tables/RLS, Netlify values, habit rules, or reward rules.
- Parent overrides remain visibly different from earned completions.
- Journal remains visible when applicable and is labelled \`Recorded\`, never \`Verified\`, until matching evidence exists.
- Use \`Table\`, not \`Leaderboards\`. Only Dashboard is active; future links are disabled with \`Coming later\`.
- Real football is outside this plan. The preview Match Centre must not invent a team, score, competition, or kickoff.
- Preserve reduced-motion, keyboard focus, textual states, readable disabled states, and current URLs/contracts.
- Completion of this plan does not authorize production.

---

## File Map

**Create**

- \`app/dashboard/types.ts\` — extracted client-facing display types.
- \`app/dashboard/model.ts\` and \`model.test.ts\` — pure grouping/tier/readiness selectors.
- \`app/dashboard/fixtures.ts\` — deterministic weekday/weekend visual data.
- \`app/components/dashboard/DashboardShell.tsx\`
- \`app/components/dashboard/ClubNavigation.tsx\`
- \`app/components/dashboard/ClubHeader.tsx\`
- \`app/components/dashboard/MatchCentrePlaceholder.tsx\`
- \`app/components/dashboard/Panel.tsx\`
- \`app/components/dashboard/HabitRow.tsx\`
- \`app/components/dashboard/HabitPanel.tsx\`
- \`app/components/dashboard/DayProgrammePanel.tsx\`
- \`app/components/dashboard/HomeschoolSection.tsx\`
- \`app/components/dashboard/WeeklyTierProgress.tsx\`
- \`app/components/dashboard/WorkWeekPanel.tsx\`
- \`app/components/dashboard/StretchWalletPanel.tsx\`
- \`app/components/dashboard/dashboard.module.css\`
- \`app/components/dashboard/dashboard.test.tsx\`
- \`vitest.config.ts\`, \`vitest.setup.ts\`
- \`docs/verification/dashboard-v2-baseline.md\`
- \`docs/verification/dashboard-v2-preview.md\`

**Modify**

- \`app/page.tsx\` — retain data/actions; replace inline presentation with components.
- \`app/globals.css\` — add canonical V2 tokens without removing shared TopNav rules.
- \`package.json\`, \`package-lock.json\` — testing tools and scripts.

**Never modify in this plan**

- \`app/api/**\`
- \`app/lib/gating.ts\`, \`scoring.ts\`, \`streak.ts\`, \`goldenBoot.ts\`, \`notion.ts\`, \`supabase.ts\`, \`supabase-admin.ts\`, \`time.ts\`, \`pin-lockout.ts\`
- \`db/**\`
- \`netlify.toml\`

---

### Task 1: Capture the production baseline

**Files:**
- Create: \`docs/verification/dashboard-v2-baseline.md\`

**Interfaces:**
- Consumes: current production, Git SHA, route shapes, protected-contract list.
- Produces: rollback and comparison evidence for all later tasks.

- [ ] **Step 1: Create the feature branch before implementation**

\`\`\`bash
git switch -c feat/dashboard-v2-visual
git status --short
\`\`\`

Expected: branch is \`feat/dashboard-v2-visual\`; only approved docs are present.

- [ ] **Step 2: Record repository and Netlify identity**

\`\`\`bash
git rev-parse HEAD
netlify api getSite --data '{"site_id":"edf30cde-2303-4297-846a-e15682c4f011"}' \
  | jq '{id,name,deploy_id,url,repo:.build_settings.repo_path,branch:.build_settings.repo_branch}'
\`\`\`

Expected: site \`ansar-habits-tracker\`, repository \`kurgelecom-oss/ansar-habits-tracker\`, production branch \`main\`.

- [ ] **Step 3: Record route shapes without sensitive values**

\`\`\`bash
for route in habits settings stretch-items stretch golden-boot tick; do
  curl -fsSL "https://ansar-habits-tracker.netlify.app/api/$route" \
    | jq 'if type == "object" then keys else {type:type,length:length} end'
done
\`\`\`

Do not save raw PIN, override reasons, keys, tokens, or environment values.

- [ ] **Step 4: Run the pre-change checks**

\`\`\`bash
npm install
npm run build
bash scripts/check-scoring-sync.sh
\`\`\`

Expected: build and sync pass. Record any pre-existing failure before continuing.

- [ ] **Step 5: Write the baseline**

Use these exact headings:

\`\`\`markdown
# Dashboard V2 Baseline
## Production identity
## Protected routes and response shapes
## Protected files
## Build and scoring-sync results
## Required visual states
## Rollback procedure
## Known pre-existing issues
\`\`\`

Required visual states: weekday morning, homeschool, evening, Saturday, Sunday, LIVE, DONE, LOCKED, MISSED, OVERRIDE, offline, Notion unavailable, and Tally unavailable.

- [ ] **Step 6: Commit**

\`\`\`bash
git add docs/verification/dashboard-v2-baseline.md
git commit -m "docs: capture Dashboard V2 production baseline"
\`\`\`

---

### Task 2: Add tests and lock the display model

**Files:**
- Modify: \`package.json\`, \`package-lock.json\`, \`app/page.tsx\` imports only.
- Create: \`vitest.config.ts\`, \`vitest.setup.ts\`
- Create: \`app/dashboard/types.ts\`, \`model.ts\`, \`model.test.ts\`

**Interfaces:**
- Produces: \`DashboardHabit\`, \`DashboardWallet\`, \`DashboardGate\`, \`Tier\`, \`JournalEvidenceState\`, \`groupHabitsByBlock()\`, \`getTier()\`, \`deriveMatchReadiness()\`.

- [ ] **Step 1: Install development-only tests**

\`\`\`bash
npm install --save-dev vitest@^3.2.4 jsdom@^26.1.0 \
  @testing-library/react@^16.3.0 @testing-library/jest-dom@^6.6.3
\`\`\`

Add scripts:

\`\`\`json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest run app/components/dashboard/dashboard.test.tsx"
\`\`\`

- [ ] **Step 2: Configure Vitest**

\`vitest.config.ts\`:

\`\`\`ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "jsdom", setupFiles: ["./vitest.setup.ts"], include: ["app/**/*.test.ts", "app/**/*.test.tsx"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
\`\`\`

\`vitest.setup.ts\` imports \`@testing-library/jest-dom/vitest\` and defines a no-op \`window.matchMedia\`.

- [ ] **Step 3: Write failing selector tests**

\`\`\`ts
it("keeps zero-point journal first", () => {
  const grouped = groupHabitsByBlock([
    habit({ id: "homeschool_session", block: "homeschool", order: 8, points: 5 }),
    habit({ id: "journal", block: "homeschool", order: 7.5, points: 0, pointType: "prerequisite" }),
  ]);
  expect(grouped.homeschool.map(h => h.id)).toEqual(["journal", "homeschool_session"]);
});

it.each([[42, "First Team"], [34, "Bench"], [26, "Reserves"], [0, "Training Ground"]])(
  "maps %i to %s", (points, label) => expect(getTier(points).label).toContain(label)
);

it("does not model readiness as a football score", () => {
  const result = deriveMatchReadiness({
    morningDone: 7, morningTotal: 7, homeschoolDone: true,
    journalState: "RECORDED", workSubmissionCount: 4,
  });
  expect(result.label).toBe("Match Readiness");
  expect(result.percent).toBe(90);
  expect(result).not.toHaveProperty("homeScore");
});
\`\`\`

- [ ] **Step 4: Prove the tests fail**

\`\`\`bash
npm test -- app/dashboard/model.test.ts
\`\`\`

Expected: FAIL because model/types do not exist.

- [ ] **Step 5: Implement exact evidence and readiness contracts**

\`\`\`ts
export type JournalEvidenceState =
  | "NOT_REQUIRED" | "MISSING" | "RECORDED" | "VERIFIED" | "OVERRIDE";

export function deriveMatchReadiness(input: ReadinessInput): MatchReadiness {
  const morning = input.morningTotal > 0 ? input.morningDone / input.morningTotal : 1;
  const journal = input.journalState === "VERIFIED" ? 1
    : input.journalState === "RECORDED" || input.journalState === "OVERRIDE" ? 0.5
    : input.journalState === "NOT_REQUIRED" ? 1 : 0;
  return {
    label: "Match Readiness",
    percent: Math.round(morning * 40 + Number(input.homeschoolDone) * 30
      + journal * 20 + Math.min(input.workSubmissionCount, 1) * 10),
    journalState: input.journalState,
  };
}
\`\`\`

This is display-only and must never be imported by scoring, gates, or rewards.

- [ ] **Step 6: Verify and commit**

\`\`\`bash
npm test -- app/dashboard/model.test.ts
npm run build
git add package.json package-lock.json vitest.config.ts vitest.setup.ts app/dashboard app/page.tsx
git commit -m "test: lock Dashboard V2 display contracts"
\`\`\`

---

### Task 3: Build the visual foundation and fixtures

**Files:**
- Modify: \`app/globals.css\`
- Create: \`app/dashboard/fixtures.ts\`
- Create: \`DashboardShell.tsx\`, \`Panel.tsx\`, \`ClubNavigation.tsx\`, \`dashboard.module.css\`, \`dashboard.test.tsx\`

**Interfaces:**
- Produces: shared shell/panel/navigation and \`weekdayFixture\`/\`weekendFixture\`.

- [ ] **Step 1: Write failing navigation tests**

\`\`\`tsx
render(<ClubNavigation />);
expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
for (const label of ["Habits", "Quests", "Team", "Table", "History", "Settings"]) {
  expect(screen.getByText(label)).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByText(label)).toHaveAttribute("title", "Coming later");
}
\`\`\`

- [ ] **Step 2: Prove failure**

\`\`\`bash
npm test -- app/components/dashboard/dashboard.test.tsx
\`\`\`

- [ ] **Step 3: Add canonical tokens**

Add without removing existing tokens:

\`\`\`css
--ansar-base:#0f1419; --ansar-card:#16192d; --ansar-row:#1f2438;
--ansar-border:#2d3543; --ansar-muted:#757f8f; --ansar-navy:#0d2350;
--ansar-gold:#d4af37; --ansar-gold-bright:#e7c55b;
--ansar-success:#00ff88; --ansar-warning:#ffa500; --ansar-danger:#ff4444;
--ansar-wallet:#a78bfa; --ansar-radius-panel:14px; --ansar-radius-row:10px;
--ansar-gap:12px;
\`\`\`

- [ ] **Step 4: Implement structural components**

\`DashboardShell\` renders:

\`\`\`tsx
<main className={styles.shell} aria-label="ANSAR FC Dashboard">
  <ClubNavigation />
  {children}
</main>
\`\`\`

Only Dashboard is an anchor. Future items are \`span aria-disabled="true" title="Coming later"\`.

\`PanelProps\` is exactly:

\`\`\`ts
type PanelProps = {
  id?: string; title: string; subtitle?: string; accent: string;
  summary?: React.ReactNode; className?: string; children: React.ReactNode;
};
\`\`\`

- [ ] **Step 5: Add fixtures and responsive grid**

Weekday includes all real habit names/states: journal before homeschool session,
then all Afternoon / Evening habits, then applicable Conditional habits. Weekend
omits only Homeschool; Afternoon / Evening remains and Conditional remains when
applicable. No fixture performs network calls.

\`\`\`css
.grid { display:grid; grid-template-columns:1fr 1fr .84fr .96fr; gap:var(--ansar-gap); }
@media (max-width:1439px) { .grid { grid-template-columns:1fr 1fr; } }
@media (max-width:820px) { .grid { grid-template-columns:1fr; } }
@media (prefers-reduced-motion:reduce) {
  .shell *, .shell *::before, .shell *::after {
    animation-duration:.01ms !important; transition-duration:.01ms !important;
  }
}
\`\`\`

- [ ] **Step 6: Verify and commit**

\`\`\`bash
npm test
npm run build
git add app/globals.css app/dashboard/fixtures.ts app/components/dashboard
git commit -m "feat: add Dashboard V2 visual foundation"
\`\`\`

---

### Task 4: Add club header and truthful Match Centre frame

**Files:**
- Create: \`ClubHeader.tsx\`, \`MatchCentrePlaceholder.tsx\`
- Modify: \`dashboard.module.css\`, \`dashboard.test.tsx\`

**Interfaces:**
- Consumes: server/device times, online, pointsActive, \`MatchReadiness\`.
- Produces: final header and pre-provider Match Centre frame.

- [ ] **Step 1: Add failing truth tests**

\`\`\`tsx
expect(screen.getByText("Ansar · ANSAR FC")).toBeInTheDocument();
expect(screen.getByText(/Sydney/)).toHaveAttribute("title", "Server clock — every gate uses this");
expect(screen.getByText("Fixture data not connected yet")).toBeInTheDocument();
expect(screen.queryByText(/\d+\s*[–-]\s*\d+/)).not.toBeInTheDocument();
expect(screen.getByText("Match Readiness")).toBeInTheDocument();
\`\`\`

- [ ] **Step 2: Prove failure, then implement**

\`\`\`bash
npm test -- app/components/dashboard/dashboard.test.tsx
\`\`\`

\`ClubHeader\` preserves server/device clock distinction and dot plus Live/Offline text.

\`MatchCentrePlaceholder\` renders exactly:

\`\`\`text
REAL MADRID MATCH CENTRE
Fixture data not connected yet
Real data will appear here after the football provider is approved.
\`\`\`

Use existing \`/real-madrid.png\`; render no opponent, score, competition, or countdown.

- [ ] **Step 3: Enforce vertical budgets**

- Club navigation: maximum 54px.
- Club header: maximum 48px.
- Match Centre: maximum 132px.
- Total before panels: maximum 234px.

- [ ] **Step 4: Verify and commit**

\`\`\`bash
npm test
npm run build
git add app/components/dashboard
git commit -m "feat: add ANSAR FC header and Match Centre frame"
\`\`\`

---

### Task 5: Extract and redesign habit presentation

**Files:**
- Create: \`HabitRow.tsx\`, \`HabitPanel.tsx\`
- Modify: \`dashboard.module.css\`, \`dashboard.test.tsx\`, \`app/page.tsx\`

**Interfaces:**
- Consumes: \`DashboardHabit\`, accent, saving/override/hold state, \`onTick\`, \`onHoldStart\`, \`onHoldCancel\`.
- Produces: one rendering for LIVE, DONE, LOCKED, MISSED, and OVERRIDE.

- [ ] **Step 1: Write failing state/event tests**

Assert actionable LIVE, textual lock reason, Missed text, Parent override marker, click forwarding, and pointer hold forwarding.

\`\`\`tsx
expect(screen.getByRole("button", { name: "Live habit" })).toBeEnabled();
expect(screen.getByRole("button", { name: "Locked habit" })).toHaveAttribute("aria-disabled", "true");
expect(screen.getByText("Opens 1:30pm")).toBeVisible();
expect(screen.getByText("Missed")).toBeVisible();
expect(screen.getByText("Parent override")).toBeVisible();
\`\`\`

- [ ] **Step 2: Prove failure**

\`\`\`bash
npm test -- app/components/dashboard/dashboard.test.tsx
\`\`\`

- [ ] **Step 3: Implement \`HabitRow\` preserving exact event semantics**

\`\`\`tsx
onClick={() => onTick(habit.id, habit.name)}
onPointerDown={() => onHoldStart(habit)}
onPointerUp={onHoldCancel}
onPointerLeave={onHoldCancel}
onPointerCancel={onHoldCancel}
onContextMenu={(event) => event.preventDefault()}
\`\`\`

Do not HTML-disable LOCKED/MISSED because parent long-hold must remain reachable. Use \`aria-disabled={!isLive}\`; the existing click/server path remains authoritative.

- [ ] **Step 4: Implement reusable rows and replace only Morning presentation**

Pass existing \`tick\`, \`beginHold\`, \`cancelHold\`, \`saving\`, \`holdId\`, \`overriddenIds\`, \`morningFeasibility\`, and scores. Do not alter them.
Task 6 reuses the same row primitive for Afternoon / Evening and Conditional habits
inside Today's Programme; do not move those habits into the Morning panel.

- [ ] **Step 5: Verify protected diff and commit**

\`\`\`bash
npm test
npm run build
git diff -- app/api app/lib db netlify.toml
git add app/components/dashboard app/page.tsx
git commit -m "refactor: move habits into Dashboard V2 rows"
\`\`\`

Expected: protected diff empty.

---

### Task 6: Build the complete journal-first Today's Programme

**Files:**
- Create: \`DayProgrammePanel.tsx\`, \`HomeschoolSection.tsx\`
- Modify: \`dashboard.module.css\`, \`dashboard.test.tsx\`, \`app/page.tsx\`

**Interfaces:**
- Consumes: ordered Homeschool, Afternoon / Evening and Conditional habits with standard tick/hold props.
- Produces: one compact second-column programme with truthful journal evidence language and complete habit coverage.

- [ ] **Step 1: Write failing ordering tests**

\`\`\`tsx
const items = screen.getAllByTestId("homeschool-item");
expect(items[0]).toHaveTextContent("Daily learning journal entry written");
expect(items[1]).toHaveTextContent("Homeschool session completed");
expect(screen.getByText("Recorded")).toBeInTheDocument();
expect(screen.queryByText("Verified")).not.toBeInTheDocument();
for (const id of ["btn_cornell", "shower", "all_namaz", "room_tidy", "teeth", "reading", "soccer_training"]) {
  expect(screen.getByTestId(`programme-${id}`)).toBeInTheDocument();
}
\`\`\`

Also assert the weekday subsection order is Homeschool, Afternoon / Evening,
Conditional. On weekend fixtures assert only Homeschool is absent while the other
applicable subsections and habits remain.

- [ ] **Step 2: Prove failure, implement, and replace inline school presentation**

Render one outer \`Panel\` titled \`Today's Programme\`. Within it, render compact
rows separated by subsection dividers: Homeschool first, Afternoon / Evening
second, Conditional third. Sort within each subsection by \`order\`. DONE journal
copy is \`Recorded\`; overridden journal is \`Parent override\`. Do not create
verified logic. Do not use nested full-size cards.

\`\`\`bash
npm test -- app/components/dashboard/dashboard.test.tsx
npm run build
\`\`\`

- [ ] **Step 3: Commit**

\`\`\`bash
git add app/components/dashboard/DayProgrammePanel.tsx \
  app/components/dashboard/HomeschoolSection.tsx \
  app/components/dashboard/dashboard.module.css \
  app/components/dashboard/dashboard.test.tsx app/page.tsx
git commit -m "feat: add complete journal-first daily programme"
\`\`\`

---

### Task 7: Build compact Work + Week

**Files:**
- Create: \`WeeklyTierProgress.tsx\`, \`WorkWeekPanel.tsx\`
- Modify: \`dashboard.module.css\`, \`dashboard.test.tsx\`, \`app/page.tsx\`

**Interfaces:**
- Consumes: week score/max, tier, Golden Boot state, \`onOpenLogWork\`.
- Produces: Tally trigger, current-tier summary, compact thresholds, Golden Boot progress.

- [ ] **Step 1: Write failing tests**

\`\`\`tsx
expect(screen.getByRole("button", { name: "Log Work" })).toBeEnabled();
expect(screen.getByText("46 / 55")).toBeVisible();
expect(screen.getByText(/First Team/)).toBeVisible();
expect(screen.getByText("Golden Boot 3 / 4")).toBeVisible();
expect(screen.getAllByTestId("tier-threshold")).toHaveLength(4);
\`\`\`

Click Log Work and assert one \`onOpenLogWork()\`.

- [ ] **Step 2: Implement without moving Tally logic**

The component only triggers the existing modal. Keep origin allow-list, form URL, embed loading, submission message, and reset logic in \`app/page.tsx\` unchanged.

- [ ] **Step 3: Verify and commit**

\`\`\`bash
npm test
npm run build
git add app/components/dashboard app/page.tsx
git commit -m "feat: add compact work and weekly form panel"
\`\`\`

---

### Task 8: Extract wallet and compose the full preview

**Files:**
- Create: \`StretchWalletPanel.tsx\`
- Modify: \`DashboardShell.tsx\`, \`dashboard.module.css\`, \`dashboard.test.tsx\`, \`app/page.tsx\`

**Interfaces:**
- Consumes: current wallet, stretch items, pending/earned state, \`onEarn\`, \`onSpend\`.
- Produces: full four-panel Dashboard V2.

- [ ] **Step 1: Write failing wallet tests**

Cover locked copy, disabled conversion, balance, weekend bonus, earn callback, and spend callback.

\`\`\`tsx
expect(screen.getByText("Locked — Qur'an recitation first")).toBeVisible();
expect(screen.getByRole("button", { name: /Convert 10 min/ })).toBeDisabled();
expect(screen.getByText("30 min")).toBeVisible();
expect(screen.getByText(/Weekend bonus/)).toBeVisible();
\`\`\`

- [ ] **Step 2: Implement a render-only wallet**

Render supplied server values verbatim. Do not calculate lock, redemption, cap, bonus, or earned IDs in the component.

- [ ] **Step 3: Compose the page**

\`\`\`tsx
<DashboardShell>
  <ClubHeader {...headerProps} />
  <MatchCentrePlaceholder readiness={readiness} />
  <div className={styles.grid}>
    <HabitPanel {...morningProps} />
    <DayProgrammePanel {...programmeProps} />
    <WorkWeekPanel {...workProps} />
    <StretchWalletPanel {...walletProps} />
  </div>
  {existingToastsDialogsAndTallyModal}
</DashboardShell>
\`\`\`

On weekends, omit only the Homeschool subsection. Continue rendering the Today's
Programme panel with Afternoon / Evening and any applicable Conditional habits.

- [ ] **Step 4: Remove only obsolete inline presentation**

Remove extracted helpers and inline CSS. Preserve long-hold, toasts, override dialog, and Tally modal selectors/behaviour until tests prove the replacement.

- [ ] **Step 5: Run the full safety suite and commit**

\`\`\`bash
npm test
npm run build
bash scripts/check-scoring-sync.sh
git diff -- app/api app/lib db netlify.toml
git add app/components/dashboard app/page.tsx
git commit -m "feat: compose complete Dashboard V2 preview"
\`\`\`

Expected: protected diff empty.

---

### Task 9: Deploy Preview proof gauntlet

**Files:**
- Modify: \`docs/verification/dashboard-v2-baseline.md\`
- Create: \`docs/verification/dashboard-v2-preview.md\`
- Modify application files only for verified defects, one commit per defect.

**Interfaces:**
- Consumes: feature branch, baseline, Netlify preview.
- Produces: signed pass/fail evidence; no production authorization.

- [ ] **Step 1: Push branch and obtain Deploy Preview**

\`\`\`bash
git push -u origin feat/dashboard-v2-visual
\`\`\`

- [ ] **Step 2: Verify preview route health**

\`\`\`bash
for path in / /api/tick /api/habits /api/settings /api/stretch /api/stretch-items /api/golden-boot; do
  curl -fsSL -o /dev/null -w "%{http_code} $path\n" "$PREVIEW_URL$path"
done
\`\`\`

Expected: HTTP 200 for every GET.

- [ ] **Step 3: Capture and review viewports**

Capture 1440×820, 1920×1080, 1024×900, and 390×844. At 1440×820 require: no routine scroll, no clipping, journal visible on weekday, readable disabled states, truthful Match Centre placeholder, balanced four-panel grid.

- [ ] **Step 4: Complete safe behaviour walkthrough**

- Open/close Log Work and verify Tally load without submitting a duplicate.
- Verify LIVE habit uses existing route.
- Long-hold locked/missed habit, confirm Parent Override opens, then cancel without PIN.
- Confirm wallet copy matches server.
- Toggle offline/online and verify recovery.
- Confirm server clock remains authoritative.

- [ ] **Step 5: Probe anonymous-write denial without creating data**

Only after explicit owner approval, use the preview's public Supabase URL and anon
key to attempt an insert that duplicates a known existing completion key. Expected:
RLS denial (HTTP 401/403 with a policy error). The duplicate key makes the probe
non-creating even if policy regresses; any conflict response instead of RLS denial
is a security failure requiring investigation. Never use a novel row or service key.

- [ ] **Step 6: Scan client bundle**

\`\`\`bash
rg -n "SUPABASE_SERVICE_ROLE_KEY|PARENT_OVERRIDE_PIN|NOTION_TOKEN|FOOTBALL_DATA" .next/static
\`\`\`

Expected: no matches.

- [ ] **Step 6: Write report**

Use exact headings:

\`\`\`markdown
# Dashboard V2 Deploy Preview Verification
## Preview identity
## Automated checks
## Protected-contract diff
## 1440 × 820 visual review
## Responsive review
## Tally verification
## Parent override verification
## Wallet verification
## Accessibility review
## Security review
## Defects and remediation commits
## Production recommendation
\`\`\`

Recommendation must be exactly \`BLOCK\`, \`READY FOR OWNER REVIEW\`, or \`READY FOR CONTROLLED RELEASE\`.

- [ ] **Step 7: Commit evidence and stop**

\`\`\`bash
git add docs/verification/dashboard-v2-baseline.md docs/verification/dashboard-v2-preview.md
git commit -m "docs: verify Dashboard V2 deploy preview"
\`\`\`

Provide preview URL, screenshots, commits, results, defects, and rollback ID. Do not merge or deploy production.

---

## Self-Review Result

- Scope contains only visual overhaul and behaviour-preserving extraction; football provider is a separate future plan.
- Every visual/spec requirement maps to a task.
- Types and prop contracts originate in Task 2 and are used consistently later.
- No task changes protected API, gate, scoring, database, Notion, Supabase, Tally, or Netlify configuration.
- Work begins on \`feat/dashboard-v2-visual\`, ends at Deploy Preview, and explicitly stops before production.
- Completeness scan passed: every action and neighbouring interface is explicit.
