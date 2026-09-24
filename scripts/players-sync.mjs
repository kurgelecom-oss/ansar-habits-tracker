#!/usr/bin/env node
/* Refreshes app/pathway/data/players.json from Wikipedia for every player in
   player-pool.json: the lead paragraph, the "early life" story, and a photo.
   Runs in GitHub Actions (.github/workflows/pathway-sync.yml) on Mondays.
   Wikipedia throttles full-text requests, so this goes slowly (one player every
   few seconds, with backoff) and KEEPS the previous entry for any player it
   cannot fetch — a bad night never empties the page. No dependencies. */

import { readFile, writeFile } from "node:fs/promises";

const POOL = new URL("../app/pathway/data/player-pool.json", import.meta.url);
const OUT = new URL("../app/pathway/data/players.json", import.meta.url);
const UA = "ANSAR-FC-Pathway/1.1 (https://ansar-habits-tracker.netlify.app; family learning app)";
const GAP_MS = Number(process.env.GAP_MS ?? 4000);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* A 12-year-old reads this. Paragraphs touching these are dropped, not edited. */
const UNSAFE = /\b(sexual|rape|abus|assault|arrest|prison|jail|convict|murder|drug|cocaine|gambl|affair|scandal|domestic violence|allegation)/i;
const EARLY = /early (life|years|career)|youth|childhood|upbringing/i;

async function get(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA } });
    if (r.status === 429 || r.status >= 500) { await sleep(GAP_MS * (i + 2) * 2); continue; }
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.json();
  }
  throw new Error(`gave up after ${tries} tries: ${url}`);
}

function clean(text) {
  return text.replace(/\s*\([^()]*(pronounced|listen|born)[^()]*\)/gi, "").replace(/\[\d+\]/g, "").replace(/\s+/g, " ").trim();
}

function paragraphs(block, maxChars) {
  const out = [];
  let used = 0;
  for (const raw of block.split(/\n+/)) {
    const p = clean(raw);
    if (p.length < 60 || UNSAFE.test(p)) continue;
    if (used + p.length > maxChars && out.length) break;
    out.push(p.length > maxChars ? p.slice(0, maxChars).replace(/\s+\S*$/, "") + "…" : p);
    used += p.length;
  }
  return out;
}

/** Split a wiki-format plain extract into {heading, body} sections. */
function sections(extract) {
  const parts = extract.split(/\n(={2,4}) (.+?) \1\n/);
  const out = [{ heading: "_lead", body: parts[0] }];
  for (let i = 1; i < parts.length; i += 3) out.push({ heading: parts[i + 1], body: parts[i + 2] ?? "" });
  return out;
}

async function fetchPlayer(p) {
  const q = new URLSearchParams({ action: "query", prop: "extracts|pageimages|info", explaintext: "1", exsectionformat: "wiki", redirects: "1", titles: p.title, format: "json", pithumbsize: "480", inprop: "url", formatversion: "2" });
  const data = await get(`https://en.wikipedia.org/w/api.php?${q}`);
  const page = data.query?.pages?.[0];
  if (!page || page.missing || !page.extract) throw new Error(`no page for ${p.title}`);
  const secs = sections(page.extract);
  const lead = paragraphs(secs[0].body, 700);
  const earlySec = secs.find(s => EARLY.test(s.heading) && paragraphs(s.body, 900).length);
  const clubSec = secs.find(s => /club career/i.test(s.heading));
  const early = earlySec ? paragraphs(earlySec.body, 1100) : clubSec ? paragraphs(clubSec.body, 700) : [];
  return {
    id: p.id, name: p.name, flag: p.flag, pos: p.pos, ...(p.she ? { she: true } : {}),
    lead, early, earlyHeading: earlySec?.heading ?? (clubSec ? "Starting out" : null),
    image: page.thumbnail?.source ?? null,
    source: page.fullurl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title)}`,
    fetchedAt: new Date().toISOString().slice(0, 10),
  };
}

const pool = JSON.parse(await readFile(POOL, "utf8"));
let previous = {};
try { previous = Object.fromEntries(JSON.parse(await readFile(OUT, "utf8")).players.map(x => [x.id, x])); } catch { /* first run */ }

const players = [];
let fresh = 0, kept = 0, failed = 0;
for (const p of pool) {
  try { players.push(await fetchPlayer(p)); fresh++; console.log(`ok   ${p.name}`); }
  catch (e) {
    if (previous[p.id]) { players.push(previous[p.id]); kept++; console.log(`kept ${p.name}: ${e.message}`); }
    else { failed++; console.log(`FAIL ${p.name}: ${e.message}`); }
  }
  await sleep(GAP_MS);
}
if (players.length < pool.length * 0.8) { console.error(`Only ${players.length}/${pool.length} players — not writing.`); process.exit(1); }
await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), source: "Wikipedia (CC BY-SA 4.0)", players }, null, 1) + "\n");
console.log(`players.json: ${fresh} fresh, ${kept} kept, ${failed} missing`);
