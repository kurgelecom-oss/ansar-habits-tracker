#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Backfill week_results from the completion history.

   WHAT IT SEEDS. Nothing hardcoded. It asks the deployed /api/golden-boot to
   finalise every CLOSED week it can find in habit_completions, and that routine
   recomputes each week from the real scoring.ts + days.ts. The weeks this
   produces are a consequence of the data, not a list in this file — if a week's
   total looks wrong, the bug is in the scoring, not here.

   WHY IT DRIVES A ROUTE INSTEAD OF WRITING DIRECTLY. week_results is
   service-role-write-only (db/week_results.sql), and that key lives in the
   Netlify environment. A script that wrote directly would need the key on a
   laptop. This one holds only the parent PIN and lets the deploy do the writing,
   so the key never leaves the environment that owns it.

   IDEMPOTENT. The route upserts on week_start and leaves existing weeks alone,
   so a second run reports finalized: 0 and awards: 0. That is the contract, and
   --verify-idempotent asserts it by running twice and failing if the second run
   changes anything.

   Usage:
     node scripts/backfill-week-results.mjs --dry-run
     node scripts/backfill-week-results.mjs
     node scripts/backfill-week-results.mjs --verify-idempotent

   PIN:  --pin <value>, or GOLDEN_BOOT_PIN / PARENT_OVERRIDE_PIN in the env.
         Never printed, never written to disk, including on failure.
   Base: --base <url>, or GOLDEN_BOOT_BASE. Defaults to production.
   ══════════════════════════════════════════════════════════════════════════ */

const args = process.argv.slice(2);
const has = f => args.includes(f);
const valueOf = f => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};

const DRY = has("--dry-run");
const VERIFY_IDEMPOTENT = has("--verify-idempotent");
const BASE = (valueOf("--base") || process.env.GOLDEN_BOOT_BASE ||
  "https://ansar-habits-tracker.netlify.app").replace(/\/$/, "");
const PIN = valueOf("--pin") || process.env.GOLDEN_BOOT_PIN || process.env.PARENT_OVERRIDE_PIN || "";

if (!PIN) {
  console.error("No PIN. Pass --pin <value> or set GOLDEN_BOOT_PIN / PARENT_OVERRIDE_PIN.");
  console.error("(--dry-run needs one too: the plan is computed server-side.)");
  process.exit(2);
}

async function getState() {
  const res = await fetch(`${BASE}/api/golden-boot`, { headers: { "Cache-Control": "no-cache" } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    throw new Error(`GET ${res.status}: ${json.message || "unavailable"} ` +
      `— has db/week_results.sql been run in the Supabase SQL editor?`);
  }
  return json;
}

async function finalize(dryRun) {
  const res = await fetch(`${BASE}/api/golden-boot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: PIN, dryRun }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    // The PIN is never echoed, including here.
    throw new Error(`POST ${res.status}: ${json.reason || "failed"} — ${json.message || ""}`);
  }
  return json;
}

const COLS = ["week_start", "total_points", "tier", "perfect_week", "partial"];
const table = (rows, cols = COLS) => {
  if (!rows || rows.length === 0) return "  (none)";
  const w = cols.map(c => Math.max(c.length, ...rows.map(r => String(r[c] ?? "").length)));
  const line = vals => "  " + vals.map((v, i) => String(v).padEnd(w[i])).join("  ");
  return [
    line(cols),
    "  " + w.map(n => "-".repeat(n)).join("  "),
    ...rows.map(r => line(cols.map(c => r[c] ?? ""))),
  ].join("\n");
};

console.log(`base: ${BASE}${DRY ? "   (DRY RUN — nothing will be written)" : ""}\n`);

const before = await getState();
console.log(`server date: ${before.serverDate} (${before.weekday}, ${before.timeZone})`);
console.log(`write configured on this deploy: ${before.writeConfigured}`);
console.log(`\n── week_results BEFORE (${before.weeks.length} rows) ──`);
console.log(table(before.weeks));
console.log(`\nstreak before: ${before.streak} · awards before: ${before.awards.length}`);

const report = await finalize(DRY);

console.log(`\n── finalise report${DRY ? " (dry run)" : ""} ──`);
console.log(`  finalized: ${report.finalized.length}`);
console.log(table(report.finalized));
console.log(`  skipped (already on record): ${report.skippedExisting.join(", ") || "(none)"}`);
console.log(`  skipped (week still open, Friday not passed): ${report.skippedInProgress.join(", ") || "(none)"}`);
console.log(`  awards inserted: ${report.awardsInserted.join(", ") || "(none)"}`);
console.log(`  streak after: ${report.streak}`);

if (DRY) {
  console.log("\nDRY RUN — nothing written. Re-run without --dry-run to apply.");
  process.exit(0);
}

const after = await getState();
console.log(`\n── week_results AFTER (${after.weeks.length} rows) ──`);
console.log(table(after.weeks));
console.log(`\nstreak: ${after.streak} · progress ${after.progress}/${after.target} · ` +
  `awards: ${after.awards.join(", ") || "(none)"}`);

if (VERIFY_IDEMPOTENT) {
  console.log("\n── second run (idempotency) ──");
  const again = await finalize(false);
  const clean = again.finalized.length === 0 && again.awardsInserted.length === 0;
  console.log(`  finalized: ${again.finalized.length} · awards inserted: ${again.awardsInserted.length}`);
  console.log(clean ? "  OK — second run changed nothing." : "  FAIL — second run was not a no-op.");
  process.exit(clean ? 0 : 1);
}

process.exit(0);
