#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Data migration: put Morning Habits and Afternoon/Evening back on the weekend.

   WHY THIS EXISTS. scripts/set-habit-days.mjs gave every Active habit Days =
   Mon–Fri, which took the whole routine off Saturday and Sunday. That was right
   for Homeschool and wrong for everything else: a bed still gets made and Namaz
   is still prayed on a Saturday. This script restores the seven-day blocks and
   leaves the weekday-only ones exactly where they are.

   It is a separate file rather than an edit to set-habit-days.mjs. That script
   is the record of how the data came to be Mon–Fri, and its guard is
   `days.length === 0`, so it is a no-op now and could not widen a populated Days
   even if it were re-run.

   WHAT MOVES, AND WHAT DOES NOT:

     Morning Habits       → Mon,Tue,Wed,Thu,Fri,Sat,Sun     (7 habits)
     Afternoon/Evening    → Mon,Tue,Wed,Thu,Fri,Sat,Sun     (6 habits)
     Homeschool           → UNTOUCHED. homeschool_session stays Mon–Fri; there
                            is no school on a Saturday, and gateWallet() reads
                            that empty block as vacuously satisfied so it does
                            not lock the weekend wallet.
     Conditional          → UNTOUCHED. soccer_training stays Mon,Wed — the two
                            days SOCCER_DAYS in lib/scoring.ts will actually pay
                            for it.
     Inactive rows        → UNTOUCHED. readtheory / khan / journal are Active =
                            false and getHabits() filters them out, so their Days
                            value is unreachable. Rewriting them would be noise
                            in the Notion page history — and their Days is EMPTY,
                            which lib/days.ts reads as "every day", so anyone
                            reactivating one must set Days deliberately.

   Selection is BY BLOCK, not by a hardcoded list of habit ids. A habit added to
   the Morning block in Notion tomorrow gets the same treatment without this file
   changing; a list of ids would silently miss it.

   IDEMPOTENT. A row already carrying all seven days is reported "skip" and not
   written. Re-running changes nothing, so it is safe to run again to verify.

   Usage:  node scripts/set-weekend-days.mjs [--dry-run]
   Reads NOTION_TOKEN from .env.local (same file `next dev` uses).
   ══════════════════════════════════════════════════════════════════════════ */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HABITS_DS = "470a7eba-f14b-42c5-92fb-79a006720240"; // ANSAR OS — Habit Blocks
const NOTION_VERSION = "2025-09-03";

/* Notion stores the three-letter form, and lib/days.ts compares against
   weekday.slice(0, 3). Order matches the Notion multi-select option order so a
   re-read reads back in a stable sequence. */
const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* The live Notion "Block" select option names, verified against the data source.
   These are the same strings NOTION_BLOCK_MAP in lib/gating.ts keys off; if an
   option is ever renamed in Notion, both have to change. */
const SEVEN_DAY_BLOCKS = ["Morning Habits", "Afternoon/Evening"];

const DRY = process.argv.includes("--dry-run");

/* .env.local is not loaded for a bare `node` process the way it is for Next, so
   parse it here rather than requiring the caller to export anything. */
function loadToken() {
  if (process.env.NOTION_TOKEN) return process.env.NOTION_TOKEN;
  const raw = readFileSync(resolve(ROOT, ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = /^\s*NOTION_TOKEN\s*=\s*(.*)\s*$/.exec(line);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  throw new Error("NOTION_TOKEN not found in env or .env.local");
}

const TOKEN = loadToken();
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Notion-Version": NOTION_VERSION,
  "Content-Type": "application/json",
};

async function queryHabits() {
  const res = await fetch(`https://api.notion.com/v1/data_sources/${HABITS_DS}/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({ sorts: [{ property: "Order", direction: "ascending" }], page_size: 100 }),
  });
  if (!res.ok) throw new Error(`query: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return json.results.map(page => {
    const p = page.properties;
    const rich = n => (p?.[n]?.rich_text?.[0]?.plain_text ?? "");
    return {
      pageId: page.id,
      order: p?.Order?.number ?? 0,
      name: p?.Name?.title?.[0]?.plain_text ?? "Untitled",
      habitId: rich("Habit ID"),
      active: p?.Active?.checkbox === true,
      block: p?.Block?.select?.name ?? "",
      days: (p?.Days?.multi_select ?? []).map(o => o.name),
    };
  });
}

async function setDays(pageId, days) {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ properties: { Days: { multi_select: days.map(name => ({ name })) } } }),
  });
  if (!res.ok) throw new Error(`patch ${pageId}: ${res.status} ${res.statusText} ${await res.text()}`);
}

/* Set equality, not string equality: Notion returns multi-select options in the
   order they were written, so a row already holding all seven days in a
   different order must still count as done or every run would rewrite it. */
const hasAllDays = days =>
  ALL_DAYS.length === days.length && ALL_DAYS.every(d => days.includes(d));

const isTarget = h => h.active && SEVEN_DAY_BLOCKS.includes(h.block);

const before = await queryHabits();
const targets = before.filter(isTarget);
const pending = targets.filter(h => !hasAllDays(h.days));

console.log(
  `${before.length} rows · ${before.filter(h => h.active).length} active · ` +
  `${targets.length} in seven-day blocks · ${pending.length} to update${DRY ? " (DRY RUN)" : ""}\n`,
);

for (const h of before) {
  const why = !h.active
    ? "inactive"
    : !SEVEN_DAY_BLOCKS.includes(h.block)
      ? `${h.block} stays ${h.days.join(",") || "(empty)"}`
      : null;

  if (why !== null) {
    console.log(`  leave  ${h.habitId.padEnd(20)} ${why}`);
    continue;
  }
  if (hasAllDays(h.days)) {
    console.log(`  skip   ${h.habitId.padEnd(20)} already Mon–Sun`);
    continue;
  }
  if (DRY) {
    console.log(`  would  ${h.habitId.padEnd(20)} ${h.days.join(",") || "(empty)"} → ${ALL_DAYS.join(",")}`);
    continue;
  }
  await setDays(h.pageId, ALL_DAYS);
  console.log(`  set    ${h.habitId.padEnd(20)} ${h.days.join(",") || "(empty)"} → ${ALL_DAYS.join(",")}`);
}

/* Read back from Notion rather than trusting the PATCH responses — the whole
   point of this script is that the STORED value is what the board will read. */
console.log("\n── re-read from Notion ──────────────────────────────────────────────────");
console.log(`${"Ord".padStart(3)} | Active | ${"Habit ID".padEnd(20)} | ${"Block".padEnd(18)} | Days`);
const after = await queryHabits();
for (const h of after) {
  console.log(
    `${String(h.order).padStart(3)} | ${(h.active ? "ACTIVE" : " off  ")} | ` +
    `${h.habitId.padEnd(20)} | ${h.block.padEnd(18)} | ${h.days.join(",") || "(empty)"}`,
  );
}

/* Assertions, not eyeballing. Each one is a way this migration could go wrong. */
const problems = [];

for (const h of after.filter(isTarget)) {
  if (!hasAllDays(h.days)) problems.push(`${h.habitId}: expected Mon–Sun, got ${h.days.join(",") || "(empty)"}`);
}
const school = after.find(h => h.habitId === "homeschool_session");
if (!school) problems.push("homeschool_session is missing from the data source");
else if (school.days.join(",") !== "Mon,Tue,Wed,Thu,Fri") {
  problems.push(`homeschool_session must stay Mon–Fri, found ${school.days.join(",") || "(empty)"}`);
}
const soccer = after.find(h => h.habitId === "soccer_training");
if (!soccer) problems.push("soccer_training is missing from the data source");
else if (soccer.days.join(",") !== "Mon,Wed") {
  problems.push(`soccer_training must stay Mon,Wed, found ${soccer.days.join(",") || "(empty)"}`);
}
for (const id of ["readtheory", "khan", "journal"]) {
  const h = after.find(x => x.habitId === id);
  if (h && h.active) problems.push(`${id} should still be inactive`);
}

console.log();
if (problems.length === 0) {
  const n = after.filter(isTarget).length;
  console.log(`OK — ${n} habits on Mon–Sun, homeschool_session Mon–Fri, soccer_training Mon,Wed.`);
} else if (DRY) {
  // A dry run wrote nothing, so the assertions are reading the OLD data and are
  // supposed to fail. Reporting that as FAIL/exit 1 would train the reader to
  // ignore a real failure. What matters on a dry run is the plan above.
  console.log(`DRY RUN — nothing written. ${problems.length} row(s) still to change; the "would" lines above are the plan.`);
} else {
  console.log(`FAIL — ${problems.length} problem(s):`);
  for (const p of problems) console.log(`  · ${p}`);
}
process.exit(problems.length === 0 || DRY ? 0 : 1);
