import { requireUser } from "@/lib/supabase/auth";
import SidebarClient from "@/components/sidebar-client";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <SidebarClient
      user={{ full_name: user.full_name, role: user.role }}
      navItems={
        user.role === "hrd"
          ? [
              { href: "/dashboard", label: "Beranda", icon: "home" },
              { href: "/dashboard/candidates", label: "Kandidat", icon: "users" },
              { href: "/dashboard/pipeline", label: "Pipeline", icon: "clipboard" },
              { href: "/dashboard/talent-pool", label: "Talent Pool", icon: "star" },
              { href: "/dashboard/staff", label: "Staff", icon: "briefcase" },
              { href: "/dashboard/analytics", label: "Analytics", icon: "chart" },
              { href: "/dashboard/settings", label: "Pengaturan", icon: "settings" },
            ]
          : user.role === "hiring_manager"
            ? [
                { href: "/dashboard", label: "Beranda", icon: "home" },
                { href: "/dashboard/candidates", label: "Kandidat", icon: "users" },
                { href: "/dashboard/pipeline", label: "Pipeline", icon: "clipboard" },
                { href: "/dashboard/analytics", label: "Analytics", icon: "chart" },
              ]
            : user.role === "purchasing_manager" ||
              user.role === "purchasing_staff" ||
              user.role === "purchasing_admin" ||
              user.role === "warehouse_staff" ||
              user.role === "qc_staff"
              ? [
                  { href: "/dashboard/purchasing", label: "Dashboard", icon: "home" },
                  {
                    href: "/dashboard/purchasing",
                    label: "Purchasing",
                    icon: "shopping",
                    children: [
                      { href: "/dashboard/purchasing/main", label: "Main Menu" },
                      { href: "/dashboard/purchasing/suppliers", label: "Supplier" },
                      { href: "/dashboard/purchasing/raw-materials", label: "Bahan Baku" },
                      { href: "/dashboard/purchasing/po", label: "Purchase Order" },
                      { href: "/dashboard/purchasing/grn", label: "Penerimaan" },
                      { href: "/dashboard/inventory", label: "Inventory" },
                      { href: "/dashboard/inventory/low-stock", label: "Low Stock" },
                    ],
                  },
                ]
              : [
                  { href: "/dashboard", label: "Beranda", icon: "home" },
                  { href: "/dashboard/analytics", label: "Analytics", icon: "chart" },
                ]
      }
    >
      {children}
    </SidebarClient>
  );
}
