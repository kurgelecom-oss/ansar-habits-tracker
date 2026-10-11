"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import AssessmentLockCard from "./dashboard/AssessmentLockCard";
import { usePaperLock } from "./dashboard/usePaperLock";

/**
 * Site-wide half of the paper lock. On every page except Today (which shows
 * the lock beside the Morning Habits) and Tests (where the paper is done),
 * a due paper covers the whole page.
 */
export default function PaperLockGate() {
  const path = usePathname() ?? "/";
  const open = path === "/" || path.startsWith("/tests");
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
