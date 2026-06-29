import { requireUser } from "@/lib/auth/require-user";
import { getModuleMenus } from "@/lib/iam/get-user-menus";
import { PosLayout } from "@/features/pos/layout";

export default async function PosDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const items = await getModuleMenus(user.id, user.role, "/dashboard/pos");

  return <PosLayout items={items}>{children}</PosLayout>;
}
