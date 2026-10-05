"use client";
import { useSyncExternalStore } from "react";

/* ════════════════════════════════════════════════════════════════════════════
   THE THREE LOOKS (tk, 5 Oct 2026).

   A look changes three things together: the colours, the lettering and the
   words. It does not change layout, rules or data.

     matchday   night stadium, condensed scoreboard lettering, coach's voice
     bernabeu   white kit, royal navy and gold, formal lettering, calm voice
     notebook   warm paper, book lettering, Ansar's own voice

   Colours and lettering are CSS: globals.css redefines the tokens under
   html[data-look="…"]. The words are here. The choice is kept on the device
   (localStorage), so the iPad and a parent's phone can differ.

   Server messages (why a tick was refused, when a window opens) are NOT
   reworded per look. They come from the gate, and one wording there is what
   keeps the board and the server telling the same story.
   ══════════════════════════════════════════════════════════════════════════ */
export const LOOKS = ["matchday", "bernabeu", "notebook"] as const;
export type Look = typeof LOOKS[number];
export const LOOK_NAMES: Record<Look, string> = { matchday: "Matchday", bernabeu: "Bernabéu", notebook: "Notebook" };
export const DEFAULT_LOOK: Look = "matchday";
export const LOOK_STORE = "ansar-look-v1";
const EVENT = "ansar-look";

type Copy = {
  clubName: string; clubLine: string;
  next: string; openSchool: string; openFootball: string;
  loading: string; weekFailed: string;
  /** Football's planned load, e.g. (8.9, 12). */
  load: (hours: string, cap: number) => string;
};

export const COPY: Record<Look, Copy> = {
  matchday: {
    clubName: "Ansar FC", clubLine: "Win the morning. Win the day.",
    next: "Up next", openSchool: "Go to School", openFootball: "Go to Football",
    loading: "Loading…", weekFailed: "Can't load the week.",
    load: (h, cap) => `${h} of ${cap} hrs planned`,
  },
  bernabeu: {
    clubName: "Ansar Football Club", clubLine: "Hasta el final.",
    next: "Next", openSchool: "View the school day", openFootball: "View today's football",
    loading: "Loading…", weekFailed: "The week could not be loaded.",
    load: (h, cap) => `${h} of ${cap} hours planned this week`,
  },
  notebook: {
    clubName: "Ansar's day", clubLine: "Small things, done properly, every day.",
    next: "Do this next", openSchool: "Open my school day", openFootball: "Open my football",
    loading: "Loading…", weekFailed: "I couldn't load my week.",
    load: (h, cap) => `${h} of my ${cap} hours planned`,
  },
};

const isLook = (v: unknown): v is Look => LOOKS.includes(v as Look);

function read(): Look {
  const v = document.documentElement.dataset.look;
  return isLook(v) ? v : DEFAULT_LOOK;
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export function setLook(look: Look) {
  document.documentElement.dataset.look = look;
  try { localStorage.setItem(LOOK_STORE, look); } catch { /* private mode */ }
  window.dispatchEvent(new Event(EVENT));
}

/** The look in use. The server render is always the default; the device's
 *  choice is applied before paint by the script in layout.tsx. */
export function useLook(): Look {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_LOOK);
}
export function useCopy(): Copy {
  return COPY[useLook()];
}
