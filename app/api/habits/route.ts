import { NextResponse } from "next/server";
import { getHabits } from "../../lib/notion";

/* ════════════════════════════════════════════════════════════════════════════
   /api/habits — the live habit list, from Notion.

   Mirrors family-dashboard/app/api/habits/route.ts: NOTION_TOKEN stays on the
   server, only the mapped JSON reaches the browser, cached five minutes.

   The caching differs in mechanism for one deliberate reason. The sibling uses
   `dynamic = "force-static"` + `revalidate = 300`, which is Next's own cache and
   cannot be bypassed per-request. This route needs a bypass: /api/tick's
   diagnostic must be able to read a window that was edited in Notion seconds
   ago in order to prove a gate. So the five minutes live in an explicit
   in-process memo in lib/notion.ts, and `?fresh=1` skips it. Same 5-minute
   staleness for the board, with a door for verification.
   ══════════════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  try {
    const habits = await getHabits(fresh);
    return NextResponse.json(habits, {
      // s-maxage lets the CDN hold the same five minutes the memo does, so a
      // cold lambda does not re-query Notion on every board load.
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Error fetching habits:", error);
    // Empty array with 200 so the board degrades gracefully instead of erroring.
    // The board treats an empty list as "cannot gate" and shows nothing tappable
    // rather than falling back to an ungated hardcoded list.
    return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });
  }
}
