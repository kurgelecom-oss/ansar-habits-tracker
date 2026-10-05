import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API = "https://api.football-data.org/v4";

const side = (t: any) => ({ id: t?.id ?? null, name: t?.shortName || t?.name || "TBC", crest: t?.crest || null });

// One competition's season: every match (results and fixtures) and the scorers list.
// Fetched per competition, on demand, so the page stays inside the provider's 10 calls a minute.
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[A-Z0-9]{2,5}$/.test(code)) return NextResponse.json({ available: false }, { status: 400 });

  const token = process.env.FOOTBALL_DATA_API_TOKEN;
  if (!token) return NextResponse.json({ available: false });

  const headers = { "X-Auth-Token": token };
  const get = async (path: string) => {
    try {
      const r = await fetch(`${API}/competitions/${code}/${path}`, { headers, cache: "no-store" });
      return r.ok ? ((await r.json()) as any) : null;
    } catch {
      return null;
    }
  };

  const [m, s] = await Promise.all([get("matches"), get("scorers?limit=100")]);
  if (!m && !s) return NextResponse.json({ available: false });

  return NextResponse.json(
    {
      available: true,
      matches:
        m?.matches?.map((x: any) => ({
          id: x.id,
          utcDate: x.utcDate,
          status: x.status,
          home: side(x.homeTeam),
          away: side(x.awayTeam),
          homeScore: x.score?.fullTime?.home ?? null,
          awayScore: x.score?.fullTime?.away ?? null,
        })) ?? null,
      scorers:
        s?.scorers?.map((x: any) => ({
          player: x.player?.name,
          team: x.team?.shortName || x.team?.name,
          crest: x.team?.crest || null,
          goals: x.goals ?? 0,
          penalties: x.penalties ?? 0,
        })) ?? null,
    },
    // Half an answer (one call refused) is served but not cached, so the next visit fills it in.
    { headers: { "Cache-Control": m && s ? "public, s-maxage=300, stale-while-revalidate=300" : "no-store" } },
  );
}
