import { NextResponse } from "next/server";
import { createFootballDataProvider } from "../../../lib/football/football-data";
import type { MatchCentreData } from "../../../lib/football/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REAL_MADRID_TEAM_ID = 86;

function cacheControl(data: MatchCentreData): string {
  if (!data.available) return "no-store";
  if (data.phase === "LIVE") return "public, s-maxage=30, stale-while-revalidate=30";
  if (data.phase === "FINISHED") return "public, s-maxage=300, stale-while-revalidate=300";
  return "public, s-maxage=3600, stale-while-revalidate=3600";
}

export async function GET() {
  const data = await createFootballDataProvider().getTeamMatchCentre(REAL_MADRID_TEAM_ID);
  return NextResponse.json(data, {
    status: 200,
    headers: { "Cache-Control": cacheControl(data) },
  });
}
