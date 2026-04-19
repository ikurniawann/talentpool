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
            : user.role === "purchasing_manager" || user.role === "purchasing_staff"
              ? [
                  { href: "/dashboard", label: "Beranda", icon: "home" },
                  { href: "/dashboard/purchasing", label: "Purchasing", icon: "shopping" },
                  { href: "/dashboard/purchasing/pr", label: "Purchase Request", icon: "pr" },
                  { href: "/dashboard/purchasing/po", label: "Purchase Order", icon: "po" },
                  { href: "/dashboard/purchasing/reports", label: "Laporan", icon: "reports" },
                  { href: "/dashboard/analytics", label: "Analytics", icon: "chart" },
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
