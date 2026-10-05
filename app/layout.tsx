import type { Metadata, Viewport } from "next";
import "./globals.css";

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

// The reset and the palette tokens live in app/globals.css.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // data-look is rewritten by the inline script before React hydrates, so
    // the attribute legitimately differs from the server's.
    <html lang="en" data-look="matchday" suppressHydrationWarning>
      <head>
        {/* The three looks' lettering. One request; each face falls back to a
            system face in globals.css if it never arrives. */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600;700&family=Bodoni+Moda:opsz,wght@6..96,600;6..96,700&family=Instrument+Sans:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,500;6..72,600&family=Public+Sans:wght@400;500;600;700&display=swap"
        />
        {/* Before paint, so a device set to a light look never flashes dark. */}
        <script dangerouslySetInnerHTML={{ __html: `try{var l=localStorage.getItem("ansar-look-v1");if(l==="bernabeu"||l==="notebook"||l==="matchday")document.documentElement.dataset.look=l}catch(e){}` }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
