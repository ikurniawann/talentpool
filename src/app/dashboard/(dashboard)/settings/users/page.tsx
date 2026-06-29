import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-user";

export default async function UserManagementPage() {
  await requireRole(["super_admin", "admin", "hrd"]);
  redirect("/dashboard/employees");
}
