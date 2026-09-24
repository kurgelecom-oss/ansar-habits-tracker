import { DrillLibrary } from "../components/features";
import { PageHero } from "../components/ui";

export default function DrillsPage() {
  return (
    <>
      <PageHero kicker="🎯 The drill library" title="Drills that build a player" lead="16 drills for the Skill Acquisition years (9–13): ball mastery, first touch, weak foot, 1v1, passing, finishing and scanning. Tap any drill for the full coaching card and Bronze / Silver / Gold targets. The pitch shows the movement — gold is you." />
      <DrillLibrary />
    </>
  );
}
