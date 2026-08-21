import { NextResponse } from "next/server";
import { getStretchItems } from "../../lib/notion";

// Cached for 5 minutes server-side (same model as family-dashboard /api/habits).
// The NOTION_TOKEN stays on the server — only the mapped JSON reaches the browser.
// The fetch itself lives in lib/notion.ts (getStretchItems) so /api/stretch can
// count the SAME roster for the weekend all-items bonus.
export const dynamic = "force-static";
export const revalidate = 300;

export async function GET() {
  try {
    const items = await getStretchItems();
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching stretch items:", error);
    // Empty array with 200 so the wallet degrades gracefully instead of erroring.
    return NextResponse.json([]);
  }
}
