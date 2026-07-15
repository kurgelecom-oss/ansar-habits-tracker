import { NextResponse } from "next/server";

// Cached for 5 minutes server-side (same model as family-dashboard /api/habits).
// The NOTION_TOKEN stays on the server — only the mapped JSON reaches the browser.
export const dynamic = "force-static";
export const revalidate = 300;

const NOTION_TOKEN = process.env.NOTION_TOKEN;
// Data source ("🎯 ANSAR OS — Stretch Items (App Source)"). Query-only endpoint:
// GET /v1/databases/{id} 404s for a data_source id, only the query POST works.
const NOTION_STRETCH_DS_ID = "11bea89f-f327-4cf7-9a13-dafc9211d86d";

interface StretchItem {
  id: string;               // Notion "Item ID" — permanent, Supabase keys off this
  name: string;
  category: string;
  points: number;           // 1 point = 10 min screen time (edit in Notion to retune)
  whatCountsAsDone: string;
}

async function fetchStretchItems(): Promise<StretchItem[]> {
  if (!NOTION_TOKEN) {
    throw new Error("Missing Notion credentials");
  }

  const response = await fetch(`https://api.notion.com/v1/data_sources/${NOTION_STRETCH_DS_ID}/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": "2025-09-03",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filter: { property: "Active", checkbox: { equals: true } },
    }),
  });

  if (!response.ok) {
    throw new Error(`Notion API error: ${response.statusText}`);
  }

  const data = await response.json();

  return data.results
    .map((page: any) => {
      const props = page.properties;
      return {
        id: props["Item ID"]?.rich_text?.[0]?.plain_text || "",
        name: props.Name?.title?.[0]?.plain_text || "Untitled",
        category: props.Category?.select?.name || "",
        points: props.Points?.number ?? 0,
        whatCountsAsDone: props["What counts as done"]?.rich_text?.[0]?.plain_text || "",
      };
    })
    // Drop rows without a stable Item ID — the ledger keys off it.
    .filter((item: StretchItem) => item.id);
}

export async function GET() {
  try {
    const items = await fetchStretchItems();
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching stretch items:", error);
    // Empty array with 200 so the wallet degrades gracefully instead of erroring.
    return NextResponse.json([]);
  }
}
