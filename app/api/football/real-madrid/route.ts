import { NextResponse } from "next/server";
import { createFootballDataProvider } from "../../../lib/football/football-data";
import { matchCacheControl } from "../../../lib/football/normalize";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REAL_MADRID_TEAM_ID = 86;

export async function GET() {
  const data = await createFootballDataProvider().getTeamMatchCentre(REAL_MADRID_TEAM_ID);
  return NextResponse.json(data, {
    status: 200,
    headers: { "Cache-Control": matchCacheControl(data) },
  });
}
