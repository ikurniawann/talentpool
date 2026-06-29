import { requireRole } from "@/lib/auth/require-user";
import { BusinessConfigurationPage } from "@/features/configuration/business";

export default async function BusinessSettingsPage() {
  await requireRole(["super_admin", "admin"]);
  return <BusinessConfigurationPage />;
}
