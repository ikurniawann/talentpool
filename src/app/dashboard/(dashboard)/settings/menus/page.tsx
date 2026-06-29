import { requireRole } from "@/lib/auth/require-user";
import { MenusConfigurationPage } from "@/features/configuration/menus";

export default async function MenuConfigurationPage() {
  await requireRole(["super_admin", "admin"]);
  return <MenusConfigurationPage />;
}
