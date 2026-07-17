import type { Metadata } from "next";
import TopNav from "./components/TopNav";

export const metadata: Metadata = {
  title: "Ansar · Daily Habits Tracker",
  description: "Track your daily habits and earn rewards",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            height: 100%;
            font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }

          /* Height of the fixed TopNav. Layouts subtract this from the viewport. */
          :root { --nav-h: 40px; }

          /* ── TOP NAV ─────────────────────────────────────────────
             Colours are hardcoded rather than tokenised: this repo has no
             stylesheet or theme tokens. Chrome is ansar's own palette,
             lifted from page.tsx (card #16192d, border #2d3543, secondary
             #757f8f). The active cue is the canonical #00d4ff — NOT ansar's
             native #00d9ff, which is a near-identical but different cyan.
             The nav is one shared object and must read identically on all
             six surfaces, so this value tracks family-dashboard's --cyan. */
          .topnav {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: var(--nav-h);
            z-index: 900; /* above the page's sticky header (100) */
            display: flex;
            align-items: center;
            gap: 2px;
            padding: 0 10px;
            background: #16192d;
            border-bottom: 1px solid #2d3543;
            overflow-x: auto;
            scrollbar-width: none;
          }
          .topnav::-webkit-scrollbar { display: none; }

          .topnav-link {
            position: relative;
            flex-shrink: 0;
            padding: 0 10px;
            line-height: var(--nav-h);
            font-size: 12px;
            font-weight: 600;
            color: #757f8f;
            text-decoration: none;
            white-space: nowrap;
            transition: color 0.2s ease;
          }
          .topnav-link:hover { color: #ffffff; }
          .topnav-link.active { color: #00d4ff; }

          .topnav-link.active::after {
            content: "";
            position: absolute;
            left: 10px;
            right: 10px;
            bottom: 0;
            height: 2px;
            background: #00d4ff;
            border-radius: 1px 1px 0 0;
          }
        `}</style>
      </head>
      <body>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
