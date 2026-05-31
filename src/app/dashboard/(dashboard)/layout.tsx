import { requireUser } from "@/lib/supabase/auth";
import SidebarClient from "@/components/sidebar-client";

const financeNavItems = [
  { href: "/dashboard/finance/cash-received", label: "Cash Received", icon: "money" },
  { href: "/dashboard/finance/receipt", label: "Receipt", icon: "document-text" },
  { href: "/dashboard/finance/cash-payment", label: "Cash Payment", icon: "money" },
  { href: "/dashboard/finance/intercash", label: "Intercash", icon: "paper-airplane" },
  { href: "/dashboard/finance/petty-cash-request", label: "Petty Cash Request", icon: "clipboard" },
  { href: "/dashboard/finance/petty-cash-fulfillment", label: "Petty Cash Fulfillment", icon: "check-circle" },
  { href: "/dashboard/finance/member-balance", label: "Member Balance", icon: "users" },
  { href: "/dashboard/finance/member-deposit", label: "Member Deposit", icon: "money" },
  { href: "/dashboard/finance/member-withdrawal", label: "Member Withdrawal", icon: "money" },
  { href: "/dashboard/finance/supplier-payable", label: "Supplier Payable", icon: "clipboard-document-check" },
  { href: "/dashboard/finance/supplier-settlement", label: "Supplier Settlement", icon: "check-circle" },
  { href: "/dashboard/finance/supplier-advance", label: "Supplier Advance", icon: "paper-airplane" },
  { href: "/dashboard/finance/customer-settlement", label: "Customer Settlement", icon: "check-circle" },
  { href: "/dashboard/finance/account-mapping", label: "Account Mapping", icon: "database" },
  { href: "/dashboard/finance/customer-receivable", label: "Customer Receivable", icon: "clipboard" },
  { href: "/dashboard/finance/customer-advance", label: "Customer Advance", icon: "paper-airplane" },
  { href: "/dashboard/finance/pos-settlement", label: "POS Settlement", icon: "shopping" },
  { href: "/dashboard/finance/tenant-reconciliation", label: "Tenant Reconciliation", icon: "building" },
  { href: "/dashboard/finance/employee-advance-payment", label: "Employee Advance Payment", icon: "users" },
  { href: "/dashboard/finance/employee-reimbursement", label: "Employee Reimbursement", icon: "document-text" },
  { href: "/dashboard/finance/disbursement", label: "Disbursement", icon: "paper-airplane" },
];

const accountingNavItems = [
  { href: "/dashboard/accounting/release-payment", label: "Release Payment", icon: "check-circle" },
  { href: "/dashboard/accounting/bank-reconcile", label: "Bank Reconcile", icon: "database" },
  { href: "/dashboard/accounting/cash-count", label: "Cash Count", icon: "money" },
  { href: "/dashboard/accounting/gl-reconciliation", label: "GL Reconciliation", icon: "chart" },
  { href: "/dashboard/accounting/general-journal", label: "General Journal", icon: "document-text" },
  { href: "/dashboard/accounting/general-ledger", label: "General Ledger", icon: "reports" },
  { href: "/dashboard/accounting/memorial-journal", label: "Memorial Journal", icon: "clipboard" },
  { href: "/dashboard/accounting/close-period-stock", label: "Close Period Stock", icon: "circle-stack" },
  { href: "/dashboard/accounting/close-period", label: "Close Period", icon: "calendar" },
];

const financeMenu = {
  href: "/dashboard/finance",
  label: "Finance",
  icon: "money",
  children: financeNavItems,
};

const accountingMenu = {
  href: "/dashboard/accounting",
  label: "Accounting",
  icon: "reports",
  children: accountingNavItems,
};

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
                label: "Purchasing",
                icon: "shopping",
                children: [
                  { href: "/dashboard/purchasing/pr", label: "PR", icon: "clipboard" },
                  { href: "/dashboard/purchasing/po", label: "PO", icon: "clipboard-document-check" },
                  {
                    href: "/dashboard/purchasing/grn",
                    label: "Receiving / GRN",
                    icon: "arrow-down-on-square",
                    children: [
                      { href: "/dashboard/purchasing/grn", label: "GRN", icon: "arrow-down-on-square" },
                      { href: "/dashboard/purchasing/qc", label: "QC Receiving", icon: "check-circle" },
                      { href: "/dashboard/purchasing/returns", label: "Returns", icon: "truck" },
                    ],
                  },
                  {
                    href: "/dashboard/purchasing/suppliers",
                    label: "Vendor Dashboard & Evaluation",
                    icon: "users",
                    children: [
                      { href: "/dashboard/purchasing/suppliers", label: "Vendor Dashboard", icon: "users" },
                      { href: "/dashboard/purchasing/reports/supplier-performance", label: "Vendor Evaluation", icon: "chart" },
                    ],
                  },
                ],
              },
              {
                href: "/dashboard/inventory",
                label: "Inventory",
                icon: "database",
                children: [
                  { href: "/dashboard/inventory", label: "Dashboard Inventory", icon: "home" },
                  { href: "/dashboard/inventory/stock", label: "Inventory Stock", icon: "circle-stack" },
                  { href: "/dashboard/inventory/transfers", label: "Transfer Out / In", icon: "paper-airplane" },
                  { href: "/dashboard/purchasing/production", label: "Production / WIP", icon: "cube" },
                  { href: "/dashboard/inventory/scrap", label: "Scrap Item", icon: "truck" },
                  { href: "/dashboard/inventory/adjustment", label: "Inventory Adjustment", icon: "clipboard-document-check" },
                ],
              },
              financeMenu,
              accountingMenu,
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
              {
                href: "/dashboard/settings",
                label: "Pengaturan",
                icon: "settings",
                children: [
                  { href: "/dashboard/settings", label: "General Settings", icon: "settings" },
                  { href: "/dashboard/settings/users", label: "User Management", icon: "users" },
                ],
              },
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
                  {
                    href: "/dashboard/purchasing",
                    label: "Purchasing",
                    icon: "shopping",
                    children: [
                      { href: "/dashboard/purchasing/pr", label: "PR", icon: "clipboard" },
                      { href: "/dashboard/purchasing/po", label: "PO", icon: "clipboard-document-check" },
                      {
                        href: "/dashboard/purchasing/grn",
                        label: "Receiving / GRN",
                        icon: "arrow-down-on-square",
                        children: [
                          { href: "/dashboard/purchasing/grn", label: "GRN", icon: "arrow-down-on-square" },
                          { href: "/dashboard/purchasing/qc", label: "QC Receiving", icon: "check-circle" },
                          { href: "/dashboard/purchasing/returns", label: "Returns", icon: "truck" },
                        ],
                      },
                      {
                        href: "/dashboard/purchasing/suppliers",
                        label: "Vendor Dashboard & Evaluation",
                        icon: "users",
                        children: [
                          { href: "/dashboard/purchasing/suppliers", label: "Vendor Dashboard", icon: "users" },
                          { href: "/dashboard/purchasing/reports/supplier-performance", label: "Vendor Evaluation", icon: "chart" },
                        ],
                      },
                    ],
                  },
                  {
                    href: "/dashboard/inventory",
                    label: "Inventory",
                    icon: "database",
                    children: [
                      { href: "/dashboard/inventory", label: "Dashboard Inventory", icon: "home" },
                      { href: "/dashboard/inventory/stock", label: "Inventory Stock", icon: "circle-stack" },
                      { href: "/dashboard/inventory/transfers", label: "Transfer Out / In", icon: "paper-airplane" },
                      { href: "/dashboard/purchasing/production", label: "Production / WIP", icon: "cube" },
                      { href: "/dashboard/inventory/scrap", label: "Scrap Item", icon: "truck" },
                      { href: "/dashboard/inventory/adjustment", label: "Inventory Adjustment", icon: "clipboard-document-check" },
                    ],
                  },
                  financeMenu,
                  accountingMenu,
                ]
              : user.role === "finance_staff"
                ? [
                    { href: "/dashboard", label: "Beranda", icon: "home" },
                    financeMenu,
                    accountingMenu,
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
