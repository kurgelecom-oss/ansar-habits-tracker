"use client";

/* ════════════════════════════════════════════════════════════════════════════
   The only client code in the export. Everything else is server-rendered.

   WHY window.print() AND NOT A GENERATED FILE. The PDF used to come from
   headless Chrome driven by a script on a Mac. Netlify's Lambda has no browser
   and shipping one costs tens of megabytes of bundle, so the report is HTML
   with print CSS and the BROWSER makes the PDF. That is also the better
   artefact: real vector text, selectable and searchable, at the viewer's own
   paper size.
   ══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";

export default function PrintControls({ autoPrint }: { autoPrint: boolean }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!autoPrint) { setReady(true); return; }

    // The crest is a real image and the print dialog does not wait for it. Fire
    // after load rather than on mount, or the first page goes to paper with a
    // hole where the badge should be.
    let done = false;
    let armed = 0;
    const go = () => {
      if (done) return;
      done = true;
      setReady(true);
      window.print();
    };

    if (document.readyState === "complete") {
      armed = window.setTimeout(go, 300);
    } else {
      const onLoad = () => { armed = window.setTimeout(go, 300); };
      window.addEventListener("load", onLoad, { once: true });
      // A stalled image must not hold the dialog forever.
      armed = window.setTimeout(go, 4000);
      return () => { window.removeEventListener("load", onLoad); window.clearTimeout(armed); };
    }
    return () => window.clearTimeout(armed);
  }, [autoPrint]);

  return (
    <div className="screen-only rp-bar">
      <button type="button" onClick={() => window.print()} className="rp-btn">
        Print / Save as PDF
      </button>
      <span className="rp-hint">
        {ready || !autoPrint
          ? "Choose “Save as PDF” as the destination."
          : "Preparing the print dialog…"}
      </span>
    </div>
  );
}
