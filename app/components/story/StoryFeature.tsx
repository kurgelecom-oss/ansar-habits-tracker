"use client";
import { useEffect, useRef, useState } from "react";
import type { PublicStory } from "../../lib/story";
import s from "./story.module.css";

export type SubmitResult = { ok: boolean; passed?: boolean; score?: number; total?: number; wrong?: string[]; reread?: string[]; message?: string; email?: { subject: string; text: string } };
type Props = {
  story: PublicStory;
  initial: { activeSeconds: number; maxScroll: number; attempts: { score: number; total: number }[] };
  onProgress: (activeSeconds: number, scroll: number) => void;
  onSubmit: (answers: Record<string, number>, reflection: string, activeSeconds: number, scroll: number) => Promise<SubmitResult>;
  onDone: () => void;
  banner?: string;
};

const IDLE_MS = 30_000;

/**
 * The Monday feature, laid out like a magazine advertorial: masthead, hero
 * image, headline and deck, the three lenses as evidence boxes, the story with
 * a pull quote, the lesson, then the check. The check stays shut until he has
 * scrolled to the end and spent the minimum active time on it.
 */
export default function StoryFeature({ story, initial, onProgress, onSubmit, onDone, banner }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(initial.activeSeconds);
  const [scroll, setScroll] = useState(initial.maxScroll);
  const lastInput = useRef(Date.now());
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [reflection, setReflection] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const live = useRef({ active, scroll });
  live.current = { active, scroll };

  // Active time: visible AND touched in the last 30 s.
  useEffect(() => {
    const bump = () => { lastInput.current = Date.now(); };
    const el = scroller.current;
    const events = ["scroll", "mousemove", "keydown", "touchstart", "pointerdown"];
    events.forEach(e => (e === "scroll" ? el : window)?.addEventListener(e, bump, { passive: true }));
    const tick = setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - lastInput.current < IDLE_MS) setActive(a => a + 1);
    }, 1000);
    const save = setInterval(() => onProgress(live.current.active, live.current.scroll), 15_000);
    const hide = () => { if (document.visibilityState === "hidden") onProgress(live.current.active, live.current.scroll); };
    document.addEventListener("visibilitychange", hide);
    return () => {
      events.forEach(e => (e === "scroll" ? el : window)?.removeEventListener(e, bump));
      clearInterval(tick); clearInterval(save); document.removeEventListener("visibilitychange", hide);
    };
  }, [onProgress]);

  // Scroll depth through the article (the check itself does not count).
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => {
      const stop = (end.current?.offsetTop ?? el.scrollHeight) - el.clientHeight;
      setScroll(sc => Math.max(sc, stop <= 0 ? 100 : Math.min(100, (el.scrollTop / stop) * 100)));
    };
    el.addEventListener("scroll", measure, { passive: true });
    measure();
    return () => el.removeEventListener("scroll", measure);
  }, []);

  const remaining = Math.max(0, story.minReadSeconds - active);
  const unlocked = remaining === 0 && scroll >= 95;
  const answered = story.questions.every(q => answers[q.id] !== undefined);
  const words = reflection.trim().split(/\s+/).filter(Boolean).length;

  async function submit() {
    setBusy(true);
    try {
      const r = await onSubmit(answers, reflection, active, scroll);
      setResult(r);
      if (r.ok && !r.passed) setAnswers(a => Object.fromEntries(Object.entries(a).filter(([id]) => !r.wrong?.includes(id))));
    } finally { setBusy(false); }
  }

  const mins = Math.max(1, Math.round(story.words / 200));
  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-labelledby="story-headline">
      <div className={s.scroller} ref={scroller}>
        <div className={s.progress} aria-hidden="true"><span style={{ width: `${scroll}%` }} /></div>
        <article className={s.sheet}>
          {banner && <p className={s.banner}>{banner}</p>}
          <header className={s.masthead}>
            <span className={s.brand}>Kawthar Weekly</span>
            <span className={s.flag}>Monday read · do this to open your board</span>
          </header>

          <figure className={s.hero}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={story.image.src} alt={story.image.alt} />
            <figcaption>{story.image.credit}</figcaption>
          </figure>

          <p className={s.kicker}>{story.kicker}</p>
          <h1 id="story-headline" className={s.headline}>{story.headline}</h1>
          <p className={s.deck}>{story.deck}</p>
          <p className={s.byline}>{mins} min read · Qur&apos;an → the Prophet ﷺ → the scholars → the story</p>

          <section className={s.lenses} aria-label="The evidence">
            {story.lenses.map(l => (
              <div key={l.title} className={s.lens}>
                <h2>{l.title}</h2>
                <p>{l.body}</p>
              </div>
            ))}
          </section>

          <section className={s.story} aria-label="The story">
            <p className={s.storyLabel}>4 · The story</p>
            <h2 className={s.storyTitle}>{story.story.title}</h2>
            {story.story.paragraphs.map((p, i) => (
              <div key={i}>
                <p className={i === 0 ? s.dropcap : undefined}>{p}</p>
                {i === 5 && <blockquote className={s.pull}>{story.story.pull}</blockquote>}
              </div>
            ))}
          </section>

          <aside className={s.lesson}><strong>The lesson.</strong> {story.lesson}</aside>
          <div ref={end} />

          <section className={s.check} aria-label="The check">
            <h2 className={s.checkTitle}>Your questions</h2>
            {result?.passed ? (
              <div className={s.passed}>
                <p className={s.passedBig}>{result.score}/{result.total}. Done.</p>
                <p>Well done. Your board is open again. Dad gets your result.</p>
                {result.email && <pre className={s.emailPreview}>{`Subject: ${result.email.subject}\n\n${result.email.text}`}</pre>}
                <button className={s.cta} onClick={onDone}>Back to the board</button>
              </div>
            ) : !unlocked ? (
              <p className={s.lockedNote}>
                {scroll < 95 ? "Read to the end first. Then the questions open." : `Keep reading. The questions open in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}.`}
              </p>
            ) : (
              <>
                {result && !result.passed && result.ok && (
                  <p className={s.retry}>{result.score}/{result.total}. You need {Math.ceil(0.8 * (result.total ?? 0))}. Go back and read: {result.reread?.join(", ")}. The ones you got wrong are cleared. Try them again.</p>
                )}
                {result && !result.ok && <p className={s.retry}>{result.message}</p>}
                {story.questions.map((q, i) => (
                  <fieldset key={q.id} className={s.q}>
                    <legend>{i + 1}. {q.prompt}</legend>
                    {q.options.map((o, j) => (
                      <label key={j} className={answers[q.id] === j ? s.optOn : s.opt}>
                        <input type="radio" name={q.id} checked={answers[q.id] === j} onChange={() => setAnswers(a => ({ ...a, [q.id]: j }))} />
                        {o}
                      </label>
                    ))}
                  </fieldset>
                ))}
                <label className={s.reflect}>
                  <span>{story.reflection}</span>
                  <textarea rows={3} value={reflection} onChange={e => setReflection(e.target.value)} />
                  <small>{words < 8 ? `Write ${8 - words} more words` : "Good."}</small>
                </label>
                <button className={s.cta} disabled={!answered || words < 8 || busy} onClick={submit}>{busy ? "Marking…" : "Hand it in"}</button>
              </>
            )}
          </section>
        </article>
      </div>
      {!result?.passed && (
        <div className={s.sticky}>
          <span>{unlocked ? "Questions are open" : scroll < 95 ? `${Math.round(scroll)}% read` : `Questions open in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}</span>
          <button className={s.stickyCta} onClick={() => end.current?.scrollIntoView({ behavior: "smooth" })} disabled={!unlocked}>Go to the questions →</button>
        </div>
      )}
    </div>
  );
}
