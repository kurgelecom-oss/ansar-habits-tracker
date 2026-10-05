import { notFound } from "next/navigation";
import { getZone } from "../data";
import { sectionsFor } from "../components/sections";
import ZoneToday from "../components/ZoneToday";

export default async function ZoneHome({ params }: { params: Promise<{ zone: string }> }) {
  const os = getZone((await params).zone);
  if (!os) notFound();
  return <ZoneToday os={os} sections={sectionsFor(os)} />;
}
