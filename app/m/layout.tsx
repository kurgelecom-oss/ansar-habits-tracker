import type { Metadata, Viewport } from "next";

/* ════════════════════════════════════════════════════════════════════════════
   The phone sheet's own head.

   /m is meant to be ADDED TO A HOME SCREEN and opened like an app, so it
   carries its own manifest: public/manifest-m.json differs from the board's
   only in `start_url`, which is "/m". Installing the board and installing the
   phone sheet therefore give two separate icons that each open the screen they
   were installed from, instead of one icon that always lands on the iPad board.

   `themeColor` here is the sheet's own panel colour, which is what iOS paints
   the status bar with in standalone mode. The board's root layout already sets
   the viewport (including viewportFit "cover"); this file restates it because a
   nested viewport export REPLACES the parent's rather than merging with it, and
   losing the cover fit would paint the sheet short of the home indicator.
   ══════════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "ANSAR OS · Mission Control",
  description: "The day at a glance: habits, school, football, the week.",
  manifest: "/manifest-m.json",
  appleWebApp: {
    capable: true,
    title: "ANSAR OS",
    // The sheet is dark in its default look, so a translucent bar lets the
    // page colour show through the status bar rather than banding it white.
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // A glance screen is not a document to pinch into, and locking the scale is
  // what stops a double-tap on a tile zooming the sheet instead of following
  // the link. Zoom itself is NOT disabled — maximumScale is left alone, so
  // pinch-to-zoom still works for anyone who needs it.
  viewportFit: "cover",
  themeColor: "#141b30",
};

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
