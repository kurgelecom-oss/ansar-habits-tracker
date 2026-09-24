import { redirect } from "next/navigation";

/* Legends became Players of the Week (weekly rotation). Old links land there. */
export default function LegendsPage() {
  redirect("/pathway/players");
}
