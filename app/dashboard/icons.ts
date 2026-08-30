/**
 * Habit icons.
 *
 * Presentation, not configuration: Notion has no icon property, and an emoji is
 * not something the gates or scoring know about. A habit added in Notion
 * without an entry here simply gets the default tick.
 *
 * Extracted from app/page.tsx verbatim so the board and the V2 rows cannot
 * drift onto two different emoji for the same habit.
 */
export const HABIT_ICONS: Record<string, string> = {
  feet_floor: "🌅", fajr: "🕌", bed_dressed: "🛏️", movement: "⚽",
  breakfast: "🍳", quran: "📖", goals: "✍️", homeschool_session: "📚",
  readtheory: "📘", khan: "📐", journal: "📓", btn_cornell: "📰",
  all_namaz: "🕌", room_tidy: "🧹", shower: "🚿", teeth: "🪥",
  reading: "🌙", soccer_training: "⚽",
};

export const DEFAULT_ICON = "✅";
