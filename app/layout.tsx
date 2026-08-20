import type { Metadata, Viewport } from "next";
import "./globals.css";
import TopNav from "./components/TopNav";

export const metadata: Metadata = {
  title: "Ansar · Daily Habits Tracker",
  description: "Track your daily habits and earn rewards",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/ansar-favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

// viewportFit:"cover" lets the board paint under the iPhone home indicator;
// the 640px block in BOARD_CSS pads the toast back out with the safe-area env.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// The reset, the --bg-base/--bg-card/--cyan tokens and the shared TopNav chrome
// all moved to app/globals.css. They used to live in an inline <style> string
// here, which is how #00d9ff drifted in with nothing to grep against.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
