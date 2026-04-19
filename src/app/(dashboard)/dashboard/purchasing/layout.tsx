"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
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
} from "@heroicons/react/24/outline";

const NAV_ITEMS = [
  { href: "/dashboard/purchasing/suppliers", label: "Supplier", icon: BuildingOfficeIcon, section: "Master" },
  { href: "/dashboard/purchasing/raw-materials", label: "Bahan Baku", icon: CubeIcon, section: "Master" },
  { href: "/dashboard/purchasing/products", label: "Produk", icon: CubeTransparentIcon, section: "Master" },
  { href: "/dashboard/purchasing/purchase-orders", label: "Purchase Order", icon: ShoppingCartIcon, section: "Transaksi" },
  { href: "/dashboard/purchasing/receiving", label: "Penerimaan", icon: TruckIcon, section: "Transaksi" },
  { href: "/dashboard/purchasing/qc", label: "QC", icon: CheckBadgeIcon, section: "Transaksi" },
  { href: "/dashboard/purchasing/delivery", label: "Pengiriman", icon: TruckIcon, section: "Transaksi" },
  { href: "/dashboard/purchasing/returns", label: "Retur", icon: ArrowUturnLeftIcon, section: "Transaksi" },
  { href: "/dashboard/purchasing/inventory", label: "Inventori", icon: ArchiveBoxIcon, section: "Inventori" },
];

const REPORT_ITEMS = [
  { href: "/dashboard/purchasing/reports", label: "Overview", icon: DocumentChartBarIcon },
  { href: "/dashboard/purchasing/reports/inventory-valuation", label: "Valuasi Inventori", icon: ArchiveBoxIcon },
  { href: "/dashboard/purchasing/reports/po-summary", label: "Ringkasan PO", icon: ShoppingCartIcon },
  { href: "/dashboard/purchasing/reports/hpp-breakdown", label: "Detail HPP", icon: DocumentChartBarIcon },
  { href: "/dashboard/purchasing/reports/supplier-performance", label: "Performa Supplier", icon: BuildingOfficeIcon },
];

export default function PurchasingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [reportOpen, setReportOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (reportRef.current && !reportRef.current.contains(e.target as Node)) {
        setReportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isInReportSection = pathname?.startsWith("/dashboard/purchasing/reports");
  const isReportActive = isInReportSection || pathname === "/dashboard/purchasing/reports";

  return (
    <div>
      {/* Sub-nav: grouped tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-6">
        {/* Master */}
        {[
          { href: "/dashboard/purchasing/suppliers", label: "Supplier", icon: BuildingOfficeIcon },
          { href: "/dashboard/purchasing/raw-materials", label: "Bahan Baku", icon: CubeIcon },
          { href: "/dashboard/purchasing/products", label: "Produk", icon: CubeTransparentIcon },
        ].map((item) => {
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

        {/* Transaksi */}
        {[
          { href: "/dashboard/purchasing/purchase-orders", label: "Purchase Order", icon: ShoppingCartIcon },
          { href: "/dashboard/purchasing/receiving", label: "Penerimaan", icon: TruckIcon },
          { href: "/dashboard/purchasing/qc", label: "QC", icon: CheckBadgeIcon },
          { href: "/dashboard/purchasing/delivery", label: "Pengiriman", icon: TruckIcon },
          { href: "/dashboard/purchasing/returns", label: "Retur", icon: ArrowUturnLeftIcon },
        ].map((item) => {
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
              isReportActive
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
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Valuasi</p>
              <DropdownItem href="/dashboard/purchasing/reports/inventory-valuation" label="Valuasi Inventori" onClick={() => setReportOpen(false)} />
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide border-t mt-1 pt-2">Purchase Order</p>
              <DropdownItem href="/dashboard/purchasing/reports/po-summary" label="Ringkasan PO" onClick={() => setReportOpen(false)} />
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide border-t mt-1 pt-2">Produksi</p>
              <DropdownItem href="/dashboard/purchasing/reports/hpp-breakdown" label="Detail HPP" onClick={() => setReportOpen(false)} />
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide border-t mt-1 pt-2">Supplier</p>
              <DropdownItem href="/dashboard/purchasing/reports/supplier-performance" label="Performa Supplier" onClick={() => setReportOpen(false)} />
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function DropdownItem({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
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
      {label}
    </Link>
  );
}

// tiny clsx helper
function clsx(...args: (string | boolean | undefined | null)[]) {
  return args.filter(Boolean).join(" ");
}
