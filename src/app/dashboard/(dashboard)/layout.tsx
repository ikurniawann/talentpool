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
      user={{ full_name: user.full_name, role: user.role, email: user.email }}
      navItems={
        user.role === "super_admin"
          ? [
              { href: "/dashboard", label: "Beranda", icon: "home" },
              {
                href: "/dashboard/hris",
                label: "HRIS Modules",
                icon: "users",
                children: [
                  { href: "/dashboard/hris/candidates", label: "Kandidat", icon: "user-plus" },
                  { href: "/dashboard/hris/talent-pool", label: "Talent Pool", icon: "star" },
                  { href: "/dashboard/hris/job-portal", label: "Job Portal", icon: "briefcase" },
                  { href: "/dashboard/hris/analytics", label: "Analytics", icon: "chart" },
                  { href: "/dashboard/hris/employees", label: "Karyawan", icon: "users" },
                  { href: "/dashboard/hris/payroll", label: "Penggajian", icon: "dollar-sign" },
                  { href: "/dashboard/hris/kpi-templates", label: "KPI Templates", icon: "clipboard" },
                  { href: "/dashboard/hris/logbook", label: "Logbook", icon: "clipboard" },
                  { href: "/dashboard/hris/logbook-list", label: "Logbook List", icon: "clipboard" },
                  { href: "/dashboard/hris/performance", label: "Performance Review", icon: "chart" },
                ],
              },
              {
                href: "/dashboard/purchasing",
                label: "Procurement",
                icon: "shopping",
                children: [
                  { href: "/dashboard/purchasing", label: "Dashboard", icon: "home" },
                  { href: "/dashboard/purchasing/main", label: "Master Data", icon: "database" },
                  { href: "/dashboard/purchasing/pr", label: "Purchase Request", icon: "clipboard" },
                  { href: "/dashboard/purchasing/po", label: "Purchase Order", icon: "clipboard-document-check" },
                  { href: "/dashboard/purchasing/grn", label: "Penerimaan", icon: "arrow-down-on-square" },
                  { href: "/dashboard/purchasing/products", label: "Produk", icon: "cube" },
                  { href: "/dashboard/purchasing/raw-materials", label: "Bahan Baku", icon: "circle-stack" },
                  { href: "/dashboard/purchasing/suppliers", label: "Supplier", icon: "users" },
                  { href: "/dashboard/purchasing/reports", label: "Laporan", icon: "chart" },
                ],
              },
              {
                href: "/dashboard/pos",
                label: "POS",
                icon: "shopping",
                children: [
                  { href: "/dashboard/pos", label: "POS Dashboard", icon: "home" },
                  { href: "/dashboard/pos/cashier-new", label: "Cashier", icon: "shopping" },
                  { href: "/dashboard/pos/orders", label: "Orders", icon: "clipboard" },
                  { href: "/dashboard/pos/products", label: "Products", icon: "cube" },
                  { href: "/dashboard/pos/reservation", label: "Reservation", icon: "calendar" },
                ],
              },
              {
                href: "/dashboard/crm",
                label: "CRM",
                icon: "star",
                children: [
                  { href: "/dashboard/crm", label: "Membership", icon: "users" },
                  { href: "/dashboard/crm/members", label: "Members", icon: "users" },
                  { href: "/dashboard/crm/rewards", label: "Rewards", icon: "star" },
                ],
              },
              {
                href: "/dashboard/master",
                label: "Master Data",
                icon: "database",
                children: [
                  { href: "/dashboard/master/departments", label: "Departemen", icon: "building" },
                  { href: "/dashboard/master/positions", label: "Jabatan", icon: "briefcase" },
                  { href: "/dashboard/master/employment-statuses", label: "Status Kepegawaian", icon: "identification" },
                ],
              },
              { href: "/dashboard/settings", label: "Pengaturan", icon: "settings" },
            ]
          : user.role === "hrd"
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
                  { href: "/dashboard/hris/job-portal", label: "Job Portal", icon: "briefcase" },
                  { href: "/dashboard/hris/analytics", label: "Analytics", icon: "chart" },
                  { href: "/dashboard/hris/attendance", label: "Absensi", icon: "calendar" },
                  { href: "/dashboard/hris/leaves", label: "Cuti & Izin", icon: "file-text" },
                  {
                    href: "/dashboard/hris/employees",
                    label: "Karyawan",
                    icon: "users",
                    children: [
                      { href: "/dashboard/hris/employees", label: "Semua Karyawan", icon: "users" },
                      { href: "/dashboard/hris/schedules", label: "Schedules", icon: "calendar" },
                      { href: "/dashboard/hris/sections", label: "Sections", icon: "building" },
                    ],
                  },
                  { href: "/dashboard/hris/org-chart", label: "Struktur Org", icon: "sitemap" },
                  { href: "/dashboard/hris/reports", label: "Laporan HRIS", icon: "reports" },
                  { href: "/dashboard/hris/payroll", label: "Penggajian", icon: "dollar-sign" },
                  { href: "/dashboard/hris/salary", label: "Salary", icon: "money" },
                  { href: "/dashboard/hris/logbook", label: "Logbook", icon: "clipboard" },
                  { href: "/dashboard/hris/logbook-list", label: "Logbook List", icon: "clipboard" },
                ],
              },
              {
                href: "/dashboard/hris/kpi-templates",
                label: "KPI & Performance",
                icon: "star",
                children: [
                  { href: "/dashboard/hris/kpi-templates", label: "KPI Templates", icon: "clipboard" },
                  { href: "/dashboard/hris/kpi-templates/new", label: "Buat Template", icon: "plus" },
                  { href: "/dashboard/hris/logbook", label: "Logbook", icon: "clipboard" },
                  { href: "/dashboard/hris/logbook-list", label: "Logbook List", icon: "clipboard" },
                  { href: "/dashboard/hris/performance", label: "Performance Review", icon: "chart" },
                  { href: "/dashboard/hris/performance/new", label: "Review Baru", icon: "plus" },
                ],
              },
              {
                href: "/dashboard/master",
                label: "Master Data",
                icon: "database",
                children: [
                  { href: "/dashboard/master/departments", label: "Departemen", icon: "building" },
                  { href: "/dashboard/master/positions", label: "Jabatan", icon: "briefcase" },
                  { href: "/dashboard/master/employment-statuses", label: "Status Kepegawaian", icon: "identification" },
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
                    { href: "/dashboard/hris/job-portal", label: "Job Portal", icon: "briefcase" },
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
                      { href: "/dashboard/purchasing/main", label: "Master Data", icon: "database" },
                      { href: "/dashboard/purchasing/units", label: "Satuan", icon: "cube" },
                      { href: "/dashboard/purchasing/raw-materials", label: "Bahan Baku", icon: "circle-stack" },
                      { href: "/dashboard/purchasing/products", label: "Produk", icon: "cube" },
                      { href: "/dashboard/purchasing/suppliers", label: "Supplier", icon: "users" },
                      { href: "/dashboard/purchasing/price-list", label: "Daftar Harga", icon: "document-text" },
                      { href: "/dashboard/purchasing/po", label: "Purchase Order", icon: "clipboard-document-check" },
                      { href: "/dashboard/purchasing/grn", label: "Penerimaan", icon: "arrow-down-on-square" },
                      { href: "/dashboard/purchasing/delivery", label: "Pengiriman", icon: "truck" },
                    ],
                  },
                  {
                    href: "/dashboard/purchasing/reports",
                    label: "Laporan",
                    icon: "chart",
                    children: [
                      { href: "/dashboard/purchasing/reports/inventory-valuation", label: "Valuasi Inventory", icon: "chart-bar" },
                      { href: "/dashboard/purchasing/reports/po-summary", label: "Ringkasan PO", icon: "document-text" },
                      { href: "/dashboard/purchasing/reports/po-detail", label: "Detail PO", icon: "document-magnifying-glass" },
                      { href: "/dashboard/purchasing/reports/supplier-performance", label: "Performa Supplier", icon: "chart-pie" },
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
