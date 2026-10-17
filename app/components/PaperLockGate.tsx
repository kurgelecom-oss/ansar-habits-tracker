"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import AssessmentLockCard from "./dashboard/AssessmentLockCard";
import { usePaperLock } from "./dashboard/usePaperLock";

/**
 * Site-wide half of the paper lock. On every page except Today (which shows
 * the lock beside the Morning Habits), Tests (where the paper is done) and the
 * phone sheet at /m, a due paper covers the whole page.
 *
 * /m IS OPEN FOR THE SAME REASON TODAY IS, not as an exception to the lock.
 * The lock exists so Ansar cannot roam the app with a paper outstanding, and a
 * screen that only reads is not roaming: /m writes nothing, ticks nothing and
 * holds no PIN. It also draws the due paper itself, at the top, above
 * everything else — so covering it would replace a notice that names the paper
 * with a notice that names the paper, and lose the rest of the glance a parent
 * opened their phone for.
 */
export default function PaperLockGate() {
  const path = usePathname() ?? "/";
  const open = path === "/" || path.startsWith("/tests") || path === "/m" || path.startsWith("/m/");
  const { lock, reload } = usePaperLock();
  const covering = !open && !!lock?.locked;
  useEffect(() => {
    if (!covering) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = before; };
  }, [covering]);
  if (!covering) return null;
  return <AssessmentLockCard lock={lock} onLifted={reload} fullScreen />;
}
