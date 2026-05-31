import { requireRole } from "@/lib/supabase/auth";
import UserManagementClient from "./user-management-client";

export default async function UserManagementPage() {
  await requireRole(["super_admin"]);
  return <UserManagementClient />;
}
