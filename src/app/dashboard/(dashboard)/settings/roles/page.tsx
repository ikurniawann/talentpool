import { requireRole } from "@/lib/auth/require-user";
import { RolesConfigurationPage } from "@/features/configuration/roles";

export default async function RolePermissionPage() {
  await requireRole(["super_admin", "admin"]);
  return <RolesConfigurationPage />;
}
