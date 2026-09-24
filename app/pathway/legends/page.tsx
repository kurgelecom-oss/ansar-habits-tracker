import { LegendGrid } from "../components/features";
import { PageHero } from "../components/ui";
import styles from "../pathway.module.css";

export default function LegendsPage() {
  return (
    <>
      <PageHero kicker="🌟 Legends" title="Nobody started as a legend" lead="Seven true stories. Rejected, too small, poor, sick, homesick, refugees. Tap a player to read what was hard, what he did about it, and a challenge for your week." />
      <LegendGrid />
      <p className={styles.footerNote}>Stories drawn from the players&apos; own interviews and club histories.</p>
    </>
  );
}
