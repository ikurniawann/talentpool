"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "@heroicons/react/24/outline";

const NAV_SECTIONS = [
  {
    label: "Master",
    items: [
      { href: "/dashboard/purchasing/suppliers", label: "Supplier", icon: BuildingOfficeIcon },
      { href: "/dashboard/purchasing/raw-materials", label: "Bahan Baku", icon: CubeIcon },
      { href: "/dashboard/purchasing/products", label: "Produk", icon: CubeTransparentIcon },
    ],
  },
  {
    label: "Transaksi",
    items: [
      { href: "/dashboard/purchasing/purchase-orders", label: "Purchase Order", icon: ShoppingCartIcon },
      { href: "/dashboard/purchasing/receiving", label: "Penerimaan", icon: TruckIcon },
      { href: "/dashboard/purchasing/qc", label: "QC", icon: CheckBadgeIcon },
      { href: "/dashboard/purchasing/delivery", label: "Pengiriman", icon: TruckIcon },
      { href: "/dashboard/purchasing/returns", label: "Retur", icon: ArrowUturnLeftIcon },
    ],
  },
  {
    label: "Inventori",
    items: [
      { href: "/dashboard/purchasing/inventory", label: "Inventori", icon: ArchiveBoxIcon },
    ],
  },
  {
    label: "Laporan",
    items: [
      { href: "/dashboard/purchasing/reports", label: "Laporan", icon: DocumentChartBarIcon },
    ],
  },
];

export default function PurchasingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      {/* Sub-nav: grouped tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-6">
        {NAV_SECTIONS.map((section) =>
          section.items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard/purchasing" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors
                  ${isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })
        )}
      </div>
      {children}
    </div>
  );
}
