import { notFound } from "next/navigation";
import { getZone } from "../../data";
import { ZoneHero, ZoneLibrary } from "../../components/ui";

export default async function LibraryPage({ params }: { params: Promise<{ zone: string }> }) {
  const os = getZone((await params).zone);
  if (!os) notFound();
  return (
    <>
      <ZoneHero mark={os.icon} kicker={`${os.library.icon} ${os.library.label.toUpperCase()}`} title={os.library.title} lead={os.library.lead} />
      <ZoneLibrary library={os.library} />
    </>
  );
}
