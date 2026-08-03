#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   One-off data migration: give every Active habit an explicit "Days" value.

   WHY THIS EXISTS. Notion's "Days" multi-select was empty on every row except
   soccer_training, and habitsForDay() reads empty as "every day". That put the
   whole weekday routine — morning block, homeschool session, afternoon/evening
   block — on the board on Saturday and Sunday, where none of it applies. The
   fix is data, not code: weekday habits say Mon–Fri, and the existing Days
   mechanism does the rest.

   IDEMPOTENT. A row that already has Days set is left alone and reported as
   "skip". Re-running changes nothing, so it is safe to run again to verify.

   Inactive rows are untouched: getHabits() filters on Active, so their Days
   value is unreachable either way, and rewriting them would be noise in the
   Notion page history.

   Usage:  node scripts/set-habit-days.mjs [--dry-run]
   Reads NOTION_TOKEN from .env.local (same file `next dev` uses).
   ══════════════════════════════════════════════════════════════════════════ */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HABITS_DS = "470a7eba-f14b-42c5-92fb-79a006720240"; // ANSAR OS — Habit Blocks
const NOTION_VERSION = "2025-09-03";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
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

const before = await queryHabits();
const targets = before.filter(h => h.active && h.days.length === 0);

console.log(`${before.length} rows · ${before.filter(h => h.active).length} active · ${targets.length} to update${DRY ? " (DRY RUN)" : ""}\n`);

for (const h of before.filter(h => h.active)) {
  if (h.days.length > 0) {
    console.log(`  skip   ${h.habitId.padEnd(20)} already has Days = ${h.days.join(",")}`);
    continue;
  }
  if (DRY) {
    console.log(`  would  ${h.habitId.padEnd(20)} → ${WEEKDAYS.join(",")}`);
    continue;
  }
  await setDays(h.pageId, WEEKDAYS);
  console.log(`  set    ${h.habitId.padEnd(20)} → ${WEEKDAYS.join(",")}`);
}

/* Read back from Notion rather than trusting the PATCH responses — the whole
   point of this script is that the stored value is what the board will read. */
console.log("\n── re-read from Notion ──────────────────────────────────────────");
const after = await queryHabits();
for (const h of after) {
  const flag = h.active ? "ACTIVE" : "  off ";
  console.log(`${String(h.order).padStart(3)} | ${flag} | ${h.habitId.padEnd(20)} | ${h.name.slice(0, 36).padEnd(36)} | ${h.days.join(",") || "(empty)"}`);
}

const stillEmpty = after.filter(h => h.active && h.days.length === 0);
console.log(stillEmpty.length === 0
  ? "\nOK — every Active habit now has an explicit Days value."
  : `\nFAIL — ${stillEmpty.length} Active habit(s) still have Days empty: ${stillEmpty.map(h => h.habitId).join(", ")}`);
process.exit(stillEmpty.length === 0 ? 0 : 1);
