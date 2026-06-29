import ArkivOsDesktop from "@/components/arkiv/arkiv-os-desktop";
import { createServerPgClient } from "@/lib/pg/create-client";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const db = await createServerPgClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <ArkivOsDesktop />;
}
