import { NextResponse } from "next/server";
import { getSchoolDay } from "../../lib/homeschool";

/* ════════════════════════════════════════════════════════════════════════════
   /api/homeschool — today's school subjects, in the live week page's order.

   Same shape as /api/habits: NOTION_TOKEN stays on the server, only mapped JSON
   reaches the browser, five minutes of staleness, and `?fresh=1` skips the memo
   so a link pasted into App Settings seconds ago can be verified immediately
   rather than after a cache expiry.

   `?day=Thursday` renders another day of the same week. It is a read of the
   SAME page, not a different source — the day-view toggle can preview a day
   without the board inventing content for it.

   This route never 500s. lib/homeschool.ts already degrades to the last good
   card, and an empty card with a message is a readable board; a stack trace is
   not.
   ══════════════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const fresh = params.get("fresh") === "1";
  const asked = params.get("day");
  const day = asked && DAYS.includes(asked) ? asked : undefined;

  const value = await getSchoolDay(fresh, day);
  return NextResponse.json(value, {
    headers: value.stale || fresh
      ? { "Cache-Control": "no-store" }
      : { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
