/* ════════════════════════════════════════════════════════════════════════════
   The Notion data sources this app reads. ONE place, on purpose.

   These three ids used to be copied across lib/notion.ts and lib/homeschool.ts,
   and the human-facing URLs for the same three tables were hard-coded a third
   time in page.tsx and ClubNavigation.tsx. Seven pointers, four files, no way
   to tell from any one of them whether the others agreed.

   A data source id is NOT the database's page id — a database and its data
   source carry different ids under Notion-Version 2025-09-03. The ids below are
   the collection:// ones the query API takes. They survive the table being
   MOVED in Notion, which is why the 2 Sept 2026 reorganisation into the Control
   Room needed no deploy. They do NOT survive a table being deleted and rebuilt.

   Everything else that points at Notion — which week is live, where the Control
   Room is, where the archive is — is a URL in the App Settings row instead, so
   it can be repointed without touching code at all. See AppSettings.links.
   ══════════════════════════════════════════════════════════════════════════ */

/** 📋 ANSAR OS — Habit Blocks. Which habits exist, their windows and points. */
export const HABITS_DS = "470a7eba-f14b-42c5-92fb-79a006720240";

/** ⚙️ ANSAR OS — App Settings. One row: the master switches and every link. */
export const SETTINGS_DS = "0415a499-d4ee-49e8-baf6-a3f38ec27235";

/** 🎯 ANSAR OS — Stretch Items. The screen-time earners in the wallet. */
export const STRETCH_DS = "11bea89f-f327-4cf7-9a13-dafc9211d86d";

/**
 * The Control Room, used only when App Settings is unreachable.
 *
 * A fallback rather than the source of truth: the live value is the "Control
 * Room" URL on the App Settings row, so moving the page is a paste in Notion.
 */
export const CONTROL_ROOM_FALLBACK_URL =
  "https://www.notion.so/3ce5429afa9081399f1be4e43b977758";

/**
 * 📆 ANSAR OS — Daily Programme. One row per subject, per day.
 *
 * Added 2 Sept 2026, replacing the week-page parser. The board reads THIS, not
 * the homeschool week page — that page is the human report now, and is reached
 * only through the "Active Week Page" link.
 */
export const PROGRAMME_DS = "e483c22e-5b63-4ea6-888c-ade5935c174b";

/** 📚 ANSAR OS — Subject Guides. The standing explainers a programme row relates to. */
export const GUIDES_DS = "ad64d084-f771-401e-bcd8-1480a6d004f4";
