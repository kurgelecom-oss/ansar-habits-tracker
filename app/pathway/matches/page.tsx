import MatchCentre from "../components/MatchCentre";
import { PageHero } from "../components/ui";

export default function MatchesPage() {
  return (
    <>
      <PageHero kicker="🏟️ Match Centre" title="The season, live" lead="His fixtures, kick-offs, grounds and results straight from Football Victoria, the team's record and form, and his own match stats — minutes, goals, assists and one lesson from every game." />
      <MatchCentre />
    </>
  );
}
