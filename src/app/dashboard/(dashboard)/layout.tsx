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
              {
                href: "/dashboard/hris",
                label: "HRIS Modules",
                icon: "users",
                children: [
                  { href: "/dashboard/hris/candidates", label: "Kandidat", icon: "user-plus" },
                  { href: "/dashboard/hris/pipeline", label: "Pipeline", icon: "clipboard" },
                  { href: "/dashboard/hris/talent-pool", label: "Talent Pool", icon: "star" },
                  { href: "/dashboard/hris/schedules", label: "Schedules", icon: "calendar" },
                  { href: "/dashboard/hris/sections", label: "Sections", icon: "briefcase" },
                  { href: "/dashboard/hris/analytics", label: "Analytics", icon: "chart" },
                  { href: "/dashboard/hris/attendance", label: "Absensi", icon: "calendar" },
                  { href: "/dashboard/hris/leaves", label: "Cuti & Izin", icon: "file-text" },
                  { href: "/dashboard/hris/employees", label: "Direktori Karyawan", icon: "users" },
                  { href: "/dashboard/hris/org-chart", label: "Struktur Org", icon: "sitemap" },
                  { href: "/dashboard/hris/reports", label: "Laporan HRIS", icon: "reports" },
                  { href: "/dashboard/hris/payroll", label: "Penggajian", icon: "dollar-sign" },
                ],
              },
              { href: "/dashboard/settings", label: "Pengaturan", icon: "settings" },
            ]
          : user.role === "hiring_manager"
            ? [
                { href: "/dashboard", label: "Beranda", icon: "home" },
                {
                  href: "/dashboard/hris",
                  label: "HRIS Modules",
                  icon: "users",
                  children: [
                    { href: "/dashboard/hris/candidates", label: "Kandidat", icon: "user-plus" },
                    { href: "/dashboard/hris/pipeline", label: "Pipeline", icon: "clipboard" },
                    { href: "/dashboard/hris/analytics", label: "Analytics", icon: "chart" },
                  ],
                },
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
                      { href: "/dashboard/purchasing/main", label: "Master Data" },
                      { href: "/dashboard/purchasing/units", label: "Satuan" },
                      { href: "/dashboard/purchasing/raw-materials", label: "Bahan Baku" },
                      { href: "/dashboard/purchasing/products", label: "Produk" },
                      { href: "/dashboard/purchasing/suppliers", label: "Supplier" },
                      { href: "/dashboard/purchasing/price-list", label: "Daftar Harga" },
                      { href: "/dashboard/purchasing/po", label: "Purchase Order" },
                      { href: "/dashboard/purchasing/grn", label: "Penerimaan" },
                      { href: "/dashboard/purchasing/delivery", label: "Pengiriman" },
                    ],
                  },
                  {
                    href: "/dashboard/purchasing/reports",
                    label: "Laporan",
                    icon: "chart",
                    children: [
                      { href: "/dashboard/purchasing/reports/inventory-valuation", label: "Valuasi Inventory" },
                      { href: "/dashboard/purchasing/reports/po-summary", label: "Ringkasan PO" },
                      { href: "/dashboard/purchasing/reports/po-detail", label: "Detail PO" },
                      { href: "/dashboard/purchasing/reports/supplier-performance", label: "Performa Supplier" },
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
