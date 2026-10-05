import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// The leagues the Season Centre offers, in the order the page lists them. Fixed rather than
// discovered from Real Madrid's fixtures: the list no longer costs a provider call, and it
// carries leagues Madrid does not play in. Names are the fallback when a table fails to load.
const LEAGUES = [
  { code: "PD", name: "Primera Division" },
  { code: "CL", name: "UEFA Champions League" },
  { code: "PL", name: "Premier League" },
  { code: "SA", name: "Serie A" },
];
const API = "https://api.football-data.org/v4";

// "2026-27" for a season that crosses the new year, "2026" for one that does not.
function seasonLabel(season?: { startDate?: string; endDate?: string }): string | null {
  const start = Number(season?.startDate?.slice(0, 4));
  const end = Number(season?.endDate?.slice(0, 4));
  if (!start) return null;
  return end > start ? `${start}-${String(end).slice(2)}` : String(start);
}

export async function GET() {
  const token = process.env.FOOTBALL_DATA_API_TOKEN;
  if (!token) return NextResponse.json({ available: false, message: "Football data is not configured." });

  try {
    const headers = { "X-Auth-Token": token };
    const tables = await Promise.all(
      LEAGUES.map(async (c) => {
        const base = { name: c.name, code: c.code, emblem: null as string | null, season: null as string | null };
        try {
          const r = await fetch(`${API}/competitions/${c.code}/standings`, { headers, cache: "no-store" });
          if (!r.ok) return { ...base, table: null };
          const d = (await r.json()) as any;
          const table = (d.standings ?? []).find((s: any) => s.type === "TOTAL")?.table ?? d.standings?.[0]?.table ?? null;
          return {
            ...base,
            name: d.competition?.name || c.name,
            emblem: d.competition?.emblem ?? null,
            season: seasonLabel(d.season),
            table:
              table?.map((x: any) => ({
                position: x.position,
                teamId: x.team.id,
                team: x.team.shortName || x.team.name,
                crest: x.team.crest || null,
                points: x.points,
                played: x.playedGames,
                won: x.won,
                draw: x.draw,
                lost: x.lost,
                goalsFor: x.goalsFor,
                goalsAgainst: x.goalsAgainst,
                goalDifference: x.goalDifference,
              })) ?? null,
          };
        } catch {
          return { ...base, table: null };
        }
      }),
    );

    if (tables.every((t) => !t.table)) throw new Error();
    // A table the provider refused (usually its per-minute quota) must not be cached as "no table".
    const complete = tables.every((t) => t.table);
    return NextResponse.json(
      { available: true, tables, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": complete ? "public, s-maxage=300, stale-while-revalidate=300" : "no-store" } },
    );
  } catch {
    return NextResponse.json({ available: false, message: "Competition tables are temporarily unavailable." });
  }
}
