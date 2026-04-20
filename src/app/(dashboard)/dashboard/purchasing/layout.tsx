"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Toaster } from "sonner";
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
  { href: "/dashboard/purchasing/receiving", label: "Penerimaan", icon: TruckIcon },
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
      {/* Sub-nav: grouped tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-6">
        
        {/* Master Data — dropdown (paling atas) */}
        <div className="relative" ref={masterRef}>
          <button
            onClick={() => setMasterOpen((v) => !v)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer",
              isInMasterSection
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <CubeIcon className="w-3.5 h-3.5" />
            Master Data
            <ChevronDownIcon className={clsx("w-3 h-3 transition-transform", masterOpen && "rotate-180")} />
          </button>

          {masterOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-48">
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Master Data</p>
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

        {/* Transaksi */}
        {TRANSAKSI_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors",
                active ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          );
        })}

        {/* Inventori */}
        <Link
          href="/dashboard/purchasing/inventory"
          className={clsx(
            "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors",
            pathname === "/dashboard/purchasing/inventory"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          <ArchiveBoxIcon className="w-3.5 h-3.5" />
          Inventori
        </Link>

        {/* Laporan — dropdown */}
        <div className="relative" ref={reportRef}>
          <button
            onClick={() => setReportOpen((v) => !v)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer",
              isInReportSection
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <DocumentChartBarIcon className="w-3.5 h-3.5" />
            Laporan
            <ChevronDownIcon className={clsx("w-3 h-3 transition-transform", reportOpen && "rotate-180")} />
          </button>

          {reportOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-48">
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
      {children}
      <Toaster position="top-right" richColors />
    </div>
  );
}

function DropdownItem({ href, label, icon: Icon, onClick }: { 
  href: string; 
  label: string; 
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2 px-3 py-2 text-xs transition-colors",
        active ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Link>
  );
}

// tiny clsx helper
function clsx(...args: (string | boolean | undefined | null)[]) {
  return args.filter(Boolean).join(" ");
}
