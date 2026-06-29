import { requireRole } from "@/lib/auth/require-user";
import { DesignSystemShowcase } from "@/features/design-system/components/design-system-showcase";

export default async function DesignSystemPage() {
  await requireRole(["super_admin", "admin"]);
  return <DesignSystemShowcase />;
}
