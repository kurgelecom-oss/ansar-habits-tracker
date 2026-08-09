import type { Metadata } from "next";
import "./globals.css";
import TopNav from "./components/TopNav";

export const metadata: Metadata = {
  title: "Ansar · Daily Habits Tracker",
  description: "Track your daily habits and earn rewards",
  icons: {
    icon: [{ url: "/ansar-favicon.svg", type: "image/svg+xml" }],
  },
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
