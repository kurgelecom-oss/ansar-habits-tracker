import { notFound } from "next/navigation";
import { getZone } from "../../data";
import { HeroGrid, ZoneHero } from "../../components/ui";

export default async function HeroesPage({ params }: { params: Promise<{ zone: string }> }) {
  const os = getZone((await params).zone);
  if (!os) notFound();
  return (
    <>
      <ZoneHero mark={os.icon} kicker="🌍 Heroes" title={os.heroes.title} lead={os.heroes.lead} />
      <HeroGrid people={os.heroes.people} />
    </>
  );
}
