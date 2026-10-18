"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import StoryFeature from "../../components/story/StoryFeature";
import type { PublicStory, StorySession } from "../../lib/story";

/**
 * Parent preview of the Monday feature with the approval sample. Nothing is
 * saved and nothing is emailed: the check shows the email it WOULD send.
 * `?fast=1` skips the minimum reading time so a parent can try the check.
 */
export default function StoryPreview() {
  const [story, setStory] = useState<PublicStory | null>(null);
  const openedAt = useRef(new Date().toISOString());
  const attempts = useRef<StorySession["attempts"]>([]);
  useEffect(() => {
    const fast = new URLSearchParams(location.search).has("fast");
    fetch("/api/story/preview").then(r => r.json()).then(d => setStory(fast ? { ...d.story, minReadSeconds: 0 } : d.story));
  }, []);
  const progress = useCallback(() => {}, []);
  const submit = useCallback(async (answers: Record<string, number>, reflection: string, activeSeconds: number, scroll: number) => {
    if (reflection.trim().split(/\s+/).length < 8) return { ok: false, message: "Write at least one full sentence in your own words." };
    const r = await fetch("/api/story/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers, reflection, activeSeconds, scroll, openedAt: openedAt.current, previous: attempts.current }) }).then(x => x.json());
    attempts.current = r.attempts;
    return r;
  }, []);
  if (!story) return null;
  return (
    <StoryFeature
      story={story}
      initial={{ activeSeconds: 0, maxScroll: 0, attempts: [] }}
      onProgress={progress}
      onSubmit={submit}
      onDone={() => location.reload()}
      banner="PARENT PREVIEW · sample only · nothing is saved or emailed"
    />
  );
}
