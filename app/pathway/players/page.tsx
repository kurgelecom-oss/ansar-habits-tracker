import { LegendGrid } from "../components/features";
import PlayersOfWeek from "../components/PlayersOfWeek";
import { PageHero } from "../components/ui";
import styles from "../pathway.module.css";

export default function PlayersPage() {
  return (
    <>
      <PageHero kicker="🌍 Players of the Week" title="Six of the world's best, every week" lead="Every Monday, six new players from around the world — men and women, veterans and teenagers, from Norway to Australia. Tap one to read how he or she started, and steal one thing for your own game." />
      <PlayersOfWeek />
      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>Classic comeback stories</h2><span className={styles.muted}>Always here</span></div>
        <LegendGrid />
      </section>
    </>
  );
}
