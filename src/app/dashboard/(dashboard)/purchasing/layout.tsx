"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Toaster } from "sonner";
import { UserCircle, LogOut } from "lucide-react";
import {
  BuildingOfficeIcon,
  CubeIcon,
  CubeTransparentIcon,
  ShoppingCartIcon,
  TruckIcon,
  BanknotesIcon,
  CheckBadgeIcon,
  ArrowUturnLeftIcon,
  ArchiveBoxIcon,
  ClipboardDocumentListIcon,
  DocumentChartBarIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ScaleIcon,
  TagIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

// Master Data Items
const MASTER_ITEMS = [
  { href: "/dashboard/purchasing/units", label: "Satuan", icon: ScaleIcon },
  { href: "/dashboard/purchasing/raw-materials", label: "Bahan Baku", icon: CubeIcon },
  { href: "/dashboard/purchasing/products", label: "Produk", icon: CubeTransparentIcon },
  { href: "/dashboard/purchasing/suppliers", label: "Supplier", icon: BuildingOfficeIcon },
  { href: "/dashboard/purchasing/price-list", label: "Daftar Harga", icon: TagIcon },
];

// Procurement Items
const PROCUREMENT_ITEMS = [
  { href: "/dashboard/purchasing/pr", label: "Purchase Request", icon: DocumentTextIcon },
  { href: "/dashboard/purchasing/po", label: "Purchase Order", icon: ShoppingCartIcon },
  { href: "/dashboard/purchasing/grn", label: "Barang Masuk", icon: TruckIcon },
  { href: "/dashboard/purchasing/vendor-payments", label: "Pembayaran Vendor", icon: BanknotesIcon },
  { href: "/dashboard/purchasing/production", label: "Produksi", icon: Cog6ToothIcon },
  { href: "/dashboard/purchasing/production/recipes", label: "Recipe/BOM", icon: CubeTransparentIcon },
  { href: "/dashboard/purchasing/qc", label: "QC", icon: CheckBadgeIcon },
  { href: "/dashboard/purchasing/returns", label: "Retur", icon: ArrowUturnLeftIcon },
];

// Approval Items
const APPROVAL_ITEMS = [
  { href: "/dashboard/purchasing/approval/pr", label: "Approval PR", icon: DocumentTextIcon },
  { href: "/dashboard/purchasing/approval/po", label: "Approval PO", icon: ShoppingCartIcon },
];

// Report Items
const REPORT_ITEMS = [
  { href: "/dashboard/purchasing/reports/stock-card", label: "Stock Card", icon: ClipboardDocumentListIcon },
  { href: "/dashboard/purchasing/reports/inventory-valuation", label: "Valuasi Inventori", icon: ArchiveBoxIcon },
  { href: "/dashboard/purchasing/reports/po-summary", label: "Ringkasan PO", icon: ShoppingCartIcon },
  { href: "/dashboard/purchasing/reports/po-detail", label: "Detail PO", icon: DocumentChartBarIcon },
  { href: "/dashboard/purchasing/reports/supplier-performance", label: "Performa Supplier", icon: BuildingOfficeIcon },
];

export default function PurchasingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [masterOpen, setMasterOpen] = useState(false);
  const [procurementOpen, setProcurementOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const masterRef = useRef<HTMLDivElement>(null);
  const procurementRef = useRef<HTMLDivElement>(null);
  const approvalRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const sb = createClient();
    await sb.auth.signOut();
    window.location.href = "/login";
  };

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (masterRef.current && !masterRef.current.contains(e.target as Node)) {
        setMasterOpen(false);
      }
      if (procurementRef.current && !procurementRef.current.contains(e.target as Node)) {
        setProcurementOpen(false);
      }
      if (approvalRef.current && !approvalRef.current.contains(e.target as Node)) {
        setApprovalOpen(false);
      }
      if (reportRef.current && !reportRef.current.contains(e.target as Node)) {
        setReportOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    document.body.classList.add("purchasing-ui");
    return () => document.body.classList.remove("purchasing-ui");
  }, []);

  const isInMasterSection =
    pathname === "/dashboard/purchasing/main" ||
    MASTER_ITEMS.some(item => pathname === item.href || pathname?.startsWith(`${item.href}/`));
  const isInProcurementSection =
    pathname === "/dashboard/purchasing/procurement" ||
    ["/dashboard/purchasing/pr", "/dashboard/purchasing/po", "/dashboard/purchasing/grn", "/dashboard/purchasing/vendor-payments", "/dashboard/purchasing/production", "/dashboard/purchasing/qc", "/dashboard/purchasing/returns"]
      .some((href) => pathname === href || pathname?.startsWith(`${href}/`));
  const isInApprovalSection = pathname?.startsWith("/dashboard/purchasing/approval");
  const isInReportSection = pathname?.startsWith("/dashboard/purchasing/reports");

  return (
    <div>
      {/* Single navigation bar with bell icon - ALL IN ONE ROW */}
      <div className="sticky top-0 z-40 w-full" style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px) saturate(1.8)", WebkitBackdropFilter: "blur(20px) saturate(1.8)", borderBottom: "1px solid rgba(209,213,219,0.35)" }}>
        <div className="flex h-14 items-center justify-between px-3 sm:px-4">
          {/* Left - Navigation tabs */}
          <div className="flex items-center gap-1 flex-1 overflow-x-visible scrollbar-hide">
            {/* Master Data — dropdown */}
            <div className="relative z-[9999]" ref={masterRef}>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMasterOpen((v) => !v);
                }}
                className={clsx(
                  "flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap",
                  isInMasterSection
                    ? "border-pink-600 text-pink-600"
                    : "border-transparent text-gray-900 hover:text-pink-600 hover:border-pink-400"
                )}
              >
                <CubeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Master Data</span>
                <span className="sm:hidden">Master</span>
                <ChevronDownIcon className={clsx("w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform", masterOpen && "rotate-180")} />
              </button>

              {masterOpen && (
                <div className="absolute left-0 top-full mt-2 rounded-xl shadow-xl z-[9999] py-1 min-w-48" style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px) saturate(1.8)", WebkitBackdropFilter: "blur(20px) saturate(1.8)", border: "1px solid rgba(209,213,219,0.35)" }}>
                  {MASTER_ITEMS.map((item) => (
                    <DropdownItem 
                      key={item.href} 
                      href={item.href} 
                      label={item.label} 
                      icon={item.icon}
                      onClick={() => setMasterOpen(false)} 
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Procurement — dropdown */}
            <div className="relative z-[9999]" ref={procurementRef}>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setProcurementOpen((v) => !v);
                }}
                className={clsx(
                  "flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap",
                  isInProcurementSection
                    ? "border-pink-600 text-pink-600"
                    : "border-transparent text-gray-900 hover:text-pink-600 hover:border-pink-400"
                )}
              >
                <ShoppingCartIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Procurement</span>
                <span className="sm:hidden">Proc</span>
                <ChevronDownIcon className={clsx("w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform", procurementOpen && "rotate-180")} />
              </button>

              {procurementOpen && (
                <div className="absolute left-0 top-full mt-2 rounded-xl shadow-xl z-[9999] py-1 min-w-52" style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px) saturate(1.8)", WebkitBackdropFilter: "blur(20px) saturate(1.8)", border: "1px solid rgba(209,213,219,0.35)" }}>
                  {PROCUREMENT_ITEMS.map((item) => (
                    <DropdownItem
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      onClick={() => setProcurementOpen(false)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Approval — dropdown */}
            <div className="relative z-[9999]" ref={approvalRef}>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setApprovalOpen((v) => !v);
                }}
                className={clsx(
                  "flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap",
                  isInApprovalSection
                    ? "border-pink-600 text-pink-600"
                    : "border-transparent text-gray-900 hover:text-pink-600 hover:border-pink-400"
                )}
              >
                <CheckBadgeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Approval</span>
                <span className="sm:hidden">Approve</span>
                <ChevronDownIcon className={clsx("w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform", approvalOpen && "rotate-180")} />
              </button>

              {approvalOpen && (
                <div className="absolute left-0 top-full mt-2 rounded-xl shadow-xl z-[9999] py-1 min-w-48" style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px) saturate(1.8)", WebkitBackdropFilter: "blur(20px) saturate(1.8)", border: "1px solid rgba(209,213,219,0.35)" }}>
                  {APPROVAL_ITEMS.map((item) => (
                    <DropdownItem
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      onClick={() => setApprovalOpen(false)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Laporan — dropdown */}
            <div className="relative z-[9999]" ref={reportRef}>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setReportOpen((v) => !v);
                }}
                className={clsx(
                  "flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap",
                  isInReportSection
                    ? "border-pink-600 text-pink-600"
                    : "border-transparent text-gray-900 hover:text-pink-600 hover:border-pink-400"
                )}
              >
                <DocumentChartBarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Laporan</span>
                <span className="sm:hidden">Lapor</span>
                <ChevronDownIcon className={clsx("w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform", reportOpen && "rotate-180")} />
              </button>

              {reportOpen && (
                <div className="absolute left-0 top-full mt-2 rounded-xl shadow-xl z-[9999] py-1 min-w-48" style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px) saturate(1.8)", WebkitBackdropFilter: "blur(20px) saturate(1.8)", border: "1px solid rgba(209,213,219,0.35)" }}>
                  {REPORT_ITEMS.map((item) => (
                    <DropdownItem 
                      key={item.href} 
                      href={item.href} 
                      label={item.label} 
                      icon={item.icon}
                      onClick={() => setReportOpen(false)} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Right - user profile */}
          <div className="flex items-center gap-2 sm:gap-4 pl-2 sm:pl-4 flex-shrink-0" style={{ borderLeft: "1px solid rgba(209,213,219,0.4)" }}>
            <div className="relative z-[9999]" ref={userRef}>
              <button
                onMouseDown={(e) => { e.preventDefault(); setUserOpen(v => !v); }}
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-700 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <UserCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden md:inline-block font-medium">Akun</span>
              </button>
              {userOpen && (
                <div className="absolute right-0 top-full mt-2 rounded-xl shadow-xl z-[9999] py-1 min-w-40" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px) saturate(1.8)", WebkitBackdropFilter: "blur(20px) saturate(1.8)", border: "1px solid rgba(209,213,219,0.35)" }}>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Page content */}
      <main className="p-3 sm:p-6">
        {children}
        <Toaster position="bottom-right" />
      </main>
    </div>
  );
}

function DropdownItem({ href, label, icon: Icon, onClick }: { 
  href: string; 
  label: string; 
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2 px-3 py-2 text-sm transition-colors",
        active ? "bg-pink-50 text-pink-600 font-medium" : "text-gray-900 hover:bg-pink-50 hover:text-pink-600"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}

// tiny clsx helper
function clsx(...args: (string | boolean | undefined | null)[]) {
  return args.filter(Boolean).join(" ");
}
