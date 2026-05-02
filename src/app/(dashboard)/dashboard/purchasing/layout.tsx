"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Toaster } from "sonner";
import { ActivityLogBell } from "@/components/layout/ActivityLogBell";
import { UserCircle } from "lucide-react";
import {
  BuildingOfficeIcon,
  CubeIcon,
  CubeTransparentIcon,
  ShoppingCartIcon,
  TruckIcon,
  CheckBadgeIcon,
  ArrowUturnLeftIcon,
  ArchiveBoxIcon,
  DocumentChartBarIcon,
  ChevronDownIcon,
  ScaleIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

// Master Data Items
const MASTER_ITEMS = [
  { href: "/dashboard/purchasing/units", label: "Satuan", icon: ScaleIcon },
  { href: "/dashboard/purchasing/raw-materials", label: "Bahan Baku", icon: CubeIcon },
  { href: "/dashboard/purchasing/products", label: "Produk", icon: CubeTransparentIcon },
  { href: "/dashboard/purchasing/suppliers", label: "Supplier", icon: BuildingOfficeIcon },
  { href: "/dashboard/purchasing/price-list", label: "Daftar Harga", icon: TagIcon },
];

// Transaksi Items
const TRANSAKSI_ITEMS = [
  { href: "/dashboard/purchasing/po", label: "Purchase Order", icon: ShoppingCartIcon },
  { href: "/dashboard/purchasing/grn", label: "Penerimaan", icon: TruckIcon },
  { href: "/dashboard/purchasing/qc", label: "QC", icon: CheckBadgeIcon },
  { href: "/dashboard/purchasing/delivery", label: "Pengiriman", icon: TruckIcon },
  { href: "/dashboard/purchasing/returns", label: "Retur", icon: ArrowUturnLeftIcon },
];

// Report Items
const REPORT_ITEMS = [
  { href: "/dashboard/purchasing/reports/inventory-valuation", label: "Valuasi Inventori", icon: ArchiveBoxIcon },
  { href: "/dashboard/purchasing/reports/po-summary", label: "Ringkasan PO", icon: ShoppingCartIcon },
  { href: "/dashboard/purchasing/reports/hpp-breakdown", label: "Detail HPP", icon: DocumentChartBarIcon },
  { href: "/dashboard/purchasing/reports/supplier-performance", label: "Performa Supplier", icon: BuildingOfficeIcon },
];

export default function PurchasingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [masterOpen, setMasterOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const masterRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (masterRef.current && !masterRef.current.contains(e.target as Node)) {
        setMasterOpen(false);
      }
      if (reportRef.current && !reportRef.current.contains(e.target as Node)) {
        setReportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isInMasterSection = MASTER_ITEMS.some(item => pathname === item.href);
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

            {/* Transaksi - direct links */}
            {TRANSAKSI_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    active ? "border-pink-600 text-pink-600" : "border-transparent text-gray-900 hover:text-pink-600 hover:border-pink-400"
                  )}
                >
                  <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.label.split(' ')[0]}</span>
                </Link>
              );
            })}

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
                  <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Laporan</p>
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
          
          {/* Right - Bell icon and user profile */}
          <div className="flex items-center gap-2 sm:gap-4 pl-2 sm:pl-4 flex-shrink-0" style={{ borderLeft: "1px solid rgba(209,213,219,0.4)" }}>
            <ActivityLogBell />
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-900">
              <UserCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-900" />
              <span className="hidden md:inline-block font-medium">User</span>
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
