import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TEAM = 86;
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
    const matches = await fetch(`${API}/teams/${TEAM}/matches?limit=100`, { headers, cache: "no-store" });
    if (!matches.ok) throw new Error();
    const data = (await matches.json()) as { matches?: any[] };
    const comps = [
      ...new Map((data.matches ?? []).map((m) => [m.competition?.code || m.competition?.id, m.competition])).values(),
    ].filter(Boolean);

    const tables = await Promise.all(
      comps.map(async (c: any) => {
        const base = { name: c.name, code: c.code, emblem: c.emblem ?? null, season: null as string | null };
        try {
          const r = await fetch(`${API}/competitions/${c.code || c.id}/standings`, { headers, cache: "no-store" });
          if (!r.ok) return { ...base, table: null };
          const d = (await r.json()) as any;
          const table = (d.standings ?? []).find((s: any) => s.type === "TOTAL")?.table ?? d.standings?.[0]?.table ?? null;
          return {
            ...base,
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

    return NextResponse.json(
      { available: true, tables, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300" } },
    );
  } catch {
    return NextResponse.json({ available: false, message: "Competition tables are temporarily unavailable." });
  }
}
