import { NextResponse } from "next/server";
import { createFootballDataProvider } from "../../../../lib/football/football-data";
import { matchCacheControl } from "../../../../lib/football/normalize";
import { MATCH_BAR_LEAGUES, type MatchBarLeague } from "../../../../lib/football/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REAL_MADRID_TEAM_ID = 86;

/** The match the bar shows when its league switch is set to `code`. */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!MATCH_BAR_LEAGUES.some(league => league.code === code)) {
    return NextResponse.json({ available: false }, { status: 400 });
  }
  const data = await createFootballDataProvider().getLeagueMatchCentre(code as MatchBarLeague, REAL_MADRID_TEAM_ID);
  return NextResponse.json(data, {
    status: 200,
    headers: { "Cache-Control": matchCacheControl(data) },
  });
}
