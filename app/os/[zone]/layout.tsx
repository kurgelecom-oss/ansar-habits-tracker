import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { notFound } from "next/navigation";
import ClubNavigation from "../../components/dashboard/ClubNavigation";
import { ZONE_OS, getZone } from "../data";
import { sectionsFor } from "../components/sections";
import { ZoneNav } from "../components/ui";
import styles from "../../pathway/pathway.module.css";

type Props = { children: ReactNode; params: Promise<{ zone: string }> };

export function generateStaticParams() {
  return Object.keys(ZONE_OS).map(zone => ({ zone }));
}

export async function generateMetadata({ params }: { params: Promise<{ zone: string }> }): Promise<Metadata> {
  const os = getZone((await params).zone);
  return { title: os ? `${os.name} · ANSAR OS` : "ANSAR OS" };
}

/* Every zone OS wears the Football Pathway's night-pitch shell, re-lit in its own colour. */
export default async function ZoneLayout({ children, params }: Props) {
  const os = getZone((await params).zone);
  if (!os) notFound();
  const accent = {
    "--pw-lime": os.accent, "--pw-lime-soft": os.accentSoft, "--accent": os.accent,
    // The page background's stripes, tinted from grass to this zone's colour.
    "--pw-grass": `color-mix(in srgb, ${os.accent} 10%, #0b1020)`, "--pw-grass-2": `color-mix(in srgb, ${os.accent} 14%, #0b1020)`,
  } as CSSProperties;
  return (
    <main className={styles.shell} style={accent} aria-label={`ANSAR OS ${os.name}`}>
      <ClubNavigation activeLabel="Targets" />
      <ZoneNav sections={sectionsFor(os)} name={os.name} />
      <div className={styles.content}>{children}</div>
    </main>
  );
}
