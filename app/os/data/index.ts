import type { OsZoneId, ZoneOS } from "./types";
import scholar from "./scholar";
import languages from "./languages";
import quran from "./quran";
import digital from "./digital";
import outdoors from "./outdoors";
import combat from "./combat";
import chess from "./chess";

export const ZONE_OS: Record<OsZoneId, ZoneOS> = { scholar, languages, quran, digital, outdoors, combat, chess };

export function getZone(id: string): ZoneOS | null {
  return Object.prototype.hasOwnProperty.call(ZONE_OS, id) ? ZONE_OS[id as OsZoneId] : null;
}
