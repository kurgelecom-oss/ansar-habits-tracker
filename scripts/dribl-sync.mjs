#!/usr/bin/env node
/* Pulls Ansar's season from Football Victoria's Dribl Match Centre into
   app/pathway/data/fixtures.json (fixtures, kick-off times, grounds, scores).

   Dribl has no public API and sits behind Cloudflare, so a plain server fetch is
   refused (403). A real headless browser loads the public Match Centre page and
   then asks the same JSON API the page itself uses — the data anyone can see at
   fv.dribl.com/fixtures. Runs nightly in GitHub Actions; needs `playwright`.

   Config: app/pathway/data/team.json → { tenant, club, teams: [{ name, label }] }
   (exact team names; the older single `team` substring filter still works).
   Also pulls the league table (ladder) for each followed team.
   The current season is picked automatically, so a new season is picked up the
   night its fixtures are published. */

import { readFile, writeFile } from "node:fs/promises";

const CONFIG = new URL("../app/pathway/data/team.json", import.meta.url);
const OUT = new URL("../app/pathway/data/fixtures.json", import.meta.url);
const cfg = JSON.parse(await readFile(CONFIG, "utf8"));

if (!cfg.club?.trim()) {
  console.log("team.json has no club yet — nothing to sync.");
  process.exit(0);
}

const { chromium } = await import("playwright");
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36" });
  await page.goto(`https://${cfg.tenant}.dribl.com/fixtures/`, { waitUntil: "networkidle", timeout: 90_000 });

  const result = await page.evaluate(async ({ tenantSlug, clubName, teamFilter, exactTeams }) => {
    const base = "https://mc-api.dribl.com/api";
    const j = async url => { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); };
    const tenant = (await j(`${base}/tenants?mc_link=${tenantSlug}.dribl.com&slug=${tenantSlug}`)).data.id;
    const seasons = (await j(`${base}/list/seasons?disable_paging=true&tenant=${tenant}`)).data;
    const season = seasons.find(s => s.is_current) ?? seasons[0];
    const clubs = (await j(`${base}/list/clubs?disable_paging=true&tenant=${tenant}`)).data;
    const want = clubName.trim().toLowerCase();
    const club = clubs.find(c => c.attributes.name.toLowerCase() === want) ?? clubs.find(c => c.attributes.name.toLowerCase().includes(want));
    if (!club) return { error: `No club matching "${clubName}" on ${tenantSlug}.dribl.com`, season: season?.name ?? null };

    const rows = [];
    let cursor = "";
    for (let pageNo = 0; pageNo < 40; pageNo++) {
      const body = await j(`${base}/fixtures?date_range=all&season=${season.id}&club=${club.id}&tenant=${tenant}&timezone=Australia%2FMelbourne${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
      rows.push(...body.data);
      cursor = body.meta?.next_cursor;
      if (!cursor) break;
    }
    const clubLower = club.attributes.name.toLowerCase();
    const ours = name => (name ?? "").toLowerCase().includes(clubLower);
    const teams = [...new Set(rows.flatMap(r => [r.attributes.home_team_name, r.attributes.away_team_name]).filter(n => ours(n)).map(n => n.trim()))].sort();
    const filter = (teamFilter ?? "").trim().toLowerCase();
    const exact = new Set((exactTeams ?? []).map(n => n.trim()));
    const sideOf = a => (ours(a.home_team_name) ? a.home_team_name : a.away_team_name ?? "").trim();
    const mine = rows.filter(r => {
      const side = sideOf(r.attributes);
      if (exact.size) return exact.has(side);
      return !filter || side.toLowerCase().includes(filter);
    });

    // League tables for every league our followed teams play in (pre-season friendlies have none).
    const ladders = [];
    const pairs = [...new Map(mine.map(r => [`${r.attributes.competition_name}|${r.attributes.league_name}`, { comp: r.attributes.competition_name, league: r.attributes.league_name, team: sideOf(r.attributes) }])).values()]
      .filter(x => !/pre-season/i.test(x.comp ?? ""));
    const comps = (await j(`${base}/list/competitions?disable_paging=true&tenant=${tenant}&season=${season.id}`)).data;
    for (const pair of pairs) {
      try {
        const comp = comps.find(c => c.name === pair.comp);
        if (!comp) continue;
        const leagues = (await j(`${base}/list/leagues?disable_paging=true&tenant=${tenant}&competition=${comp.id}`)).data;
        const league = leagues.find(l => l.name === pair.league);
        if (!league || league.ladder_access !== "public") continue;
        const body = await j(`${base}/ladders?date_range=default&season=${season.id}&competition=${comp.id}&league=${league.id}&ladder_type=regular&tenant=${tenant}&require_pools=true`);
        ladders.push({ team: pair.team, competition: pair.comp, league: pair.league, rows: body.data.map(e => { const a = e.attributes; return {
          position: a.position, team: (a.team_name ?? "").trim(), logo: a.club_logo, played: a.played, won: a.won, drawn: a.drawn, lost: a.lost,
          gf: a.goals_for, ga: a.goals_against, gd: a.goal_difference, points: a.points, us: (a.team_name ?? "").trim() === pair.team,
        }; }).sort((x, y) => x.position - y.position) });
      } catch (e) { /* a missing ladder never blocks the fixtures */ }
    }
    return { season: season.name, club: club.attributes.name, clubLogo: club.attributes.image ?? null, teams, ladders, fixtures: mine.map(r => {
      const a = r.attributes;
      return {
        id: r.hash_id, team: sideOf(a), date: a.date, round: a.full_round ?? a.round, competition: a.competition_name, league: a.league_name,
        home: (a.home_team_name ?? "").trim(), away: (a.away_team_name ?? "").trim(), homeLogo: a.home_logo, awayLogo: a.away_logo,
        isHome: ours(a.home_team_name), bye: !!a.bye_flag || /\bBYE\b/i.test(`${a.home_team_name} ${a.away_team_name}`),
        ground: a.ground_name, field: a.field_name, address: a.ground_address, lat: a.ground_latitude, lng: a.ground_longitude,
        status: a.status, homeScore: a.home_score, awayScore: a.away_score,
      };
    }) };
  }, { tenantSlug: cfg.tenant, clubName: cfg.club, teamFilter: cfg.team, exactTeams: (cfg.teams ?? []).map(t => t.name) });

  if (result.error) throw new Error(result.error);
  result.fixtures.sort((x, y) => x.date.localeCompare(y.date));
  const out = { configured: true, club: result.club, clubLogo: result.clubLogo, team: cfg.team || null, followed: cfg.teams ?? [], season: result.season, syncedAt: new Date().toISOString(), teams: result.teams, ladders: result.ladders, fixtures: result.fixtures, source: `https://${cfg.tenant}.dribl.com/fixtures/` };
  await writeFile(OUT, JSON.stringify(out, null, 1) + "\n");
  console.log(`${result.club} · season ${result.season} · ${result.fixtures.length} fixtures · ${result.ladders.length} ladders · ${result.teams.length} club teams`);
} finally {
  await browser.close();
}
