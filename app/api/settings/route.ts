import { NextResponse } from "next/server";
import { getSettings, SETTINGS_FALLBACK } from "../../lib/notion";

/* ════════════════════════════════════════════════════════════════════════════
   /api/settings — the ANSAR OS App Settings row, from Notion.

   Mirrors family-dashboard/app/api/settings/route.ts. NOTION_TOKEN stays on the
   server; the browser sees only the mapped booleans and numbers.

   This exists so `POINTS_ACTIVE` stops being a code constant. It was hardcoded
   `false` in app/page.tsx while Notion had said `Points Active = true` since
   14 Jul — the board carried a "Soft-launch · points preview" chip that had
   been wrong for two weeks, and correcting it needed a deploy. Now it is a
   checkbox.

   Caching matches lib/notion.ts's five-minute memo, with `?fresh=1` to skip it.
   ══════════════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  try {
    const settings = await getSettings(fresh);
    return NextResponse.json(settings, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    // Degrade to the seeded Notion defaults rather than erroring. Note the
    // fallback has pointsActive TRUE: if Notion is unreachable the safer
    // failure is to keep showing real points, not to silently demote the board
    // back to "preview" and make Ansar think a finished day did not count.
    return NextResponse.json(SETTINGS_FALLBACK, { headers: { "Cache-Control": "no-store" } });
  }
}
