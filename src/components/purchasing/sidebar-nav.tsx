"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Users,
  Package,
  ShoppingCart,
  ClipboardCheck,
  RotateCcw,
  Warehouse,
  BarChart3,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  children?: { title: string; href: string }[];
}

const purchasingNavItems: NavItem[] = [
  {
    title: "Supplier",
    href: "/dashboard/purchasing/suppliers",
    icon: <Users className="w-5 h-5" />,
  },
  {
    title: "Master Data",
    href: "#",
    icon: <Package className="w-5 h-5" />,
    children: [
      { title: "Satuan", href: "/dashboard/purchasing/units" },
      { title: "Bahan Baku", href: "/dashboard/purchasing/raw-materials" },
      { title: "Produk", href: "/dashboard/purchasing/products" },
      { title: "Daftar Harga", href: "/dashboard/purchasing/price-list" },
    ],
  },
  {
    title: "Purchase Order",
    href: "/dashboard/purchasing/po",
    icon: <ShoppingCart className="w-5 h-5" />,
  },
  {
    title: "Barang Masuk",
    href: "/dashboard/purchasing/grn",
    icon: <ClipboardCheck className="w-5 h-5" />,
  },
  {
    title: "QC & Return",
    href: "#",
    icon: <RotateCcw className="w-5 h-5" />,
    children: [
      { title: "Quality Control", href: "/dashboard/purchasing/qc" },
      { title: "Return Barang", href: "/dashboard/purchasing/returns" },
    ],
  },
  {
    title: "Inventory",
    href: "/dashboard/purchasing/inventory",
    icon: <Warehouse className="w-5 h-5" />,
  },
  {
    title: "Laporan",
    href: "#",
    icon: <BarChart3 className="w-5 h-5" />,
    children: [
      { title: "Valuasi Stok", href: "/dashboard/purchasing/reports/inventory-valuation" },
      { title: "Ringkasan PO", href: "/dashboard/purchasing/reports/po-summary" },
      { title: "Performa Supplier", href: "/dashboard/purchasing/reports/supplier-performance" },
      { title: "Trend HPP", href: "/dashboard/purchasing/reports/hpp-breakdown" },
    ],
  },
];

interface SidebarNavProps {
  className?: string;
}

export function PurchasingSidebarNav({ className }: SidebarNavProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<string[]>(["Master Data"]);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (href === "#") return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isGroupActive = (item: NavItem) => {
    if (!item.children) return false;
    return item.children.some((child) => isActive(child.href));
  };

  return (
    <nav className={cn("space-y-1", className)}>
      {purchasingNavItems.map((item) => {
        if (item.children) {
          const groupActive = isGroupActive(item);
          const isOpen = openGroups.includes(item.title) || groupActive;

          return (
            <div key={item.title}>
              <button
                type="button"
                onClick={() => toggleGroup(item.title)}
                aria-expanded={isOpen}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  groupActive
                    ? "bg-blue-50 text-blue-700"
                    : "hover:bg-gray-100"
                )}
              >
                <span className="flex items-center gap-3">
                  {item.icon}
                  {item.title}
                </span>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isOpen && "rotate-90"
                  )}
                />
              </button>
              {isOpen && (
                <div className="pl-9 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        "block rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive(child.href)
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      {child.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            {item.icon}
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
