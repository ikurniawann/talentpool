/**
 * Purchasing module sidebar menu items.
 * Consumed by the main NavSidebar component.
 */
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

export interface MenuBadge {
  key: string;
  label: string;
  color: "red" | "orange" | "blue" | "green";
}

export interface SidebarItem {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: MenuBadge;
  children?: SidebarItem[];
}

export const PURCHASING_MENU_ITEMS: SidebarItem[] = [
  {
    key: "suppliers",
    label: "Supplier",
    href: "/dashboard/purchasing/suppliers",
    icon: BuildingOfficeIcon,
  },
  {
    key: "raw-materials",
    label: "Bahan Baku",
    href: "/dashboard/purchasing/raw-materials",
    icon: CubeIcon,
  },
  {
    key: "products",
    label: "Produk",
    href: "/dashboard/purchasing/products",
    icon: CubeTransparentIcon,
  },
  {
    key: "purchase-orders",
    label: "Purchase Order",
    href: "/dashboard/purchasing/purchase-orders",
    icon: ShoppingCartIcon,
    badge: { key: "open", label: "0", color: "blue" },
  },
  {
    key: "receiving",
    label: "Penerimaan",
    href: "/dashboard/purchasing/receiving",
    icon: TruckIcon,
    badge: { key: "pending_grn", label: "0", color: "orange" },
  },
  {
    key: "qc",
    label: "Quality Control",
    href: "/dashboard/purchasing/qc",
    icon: CheckBadgeIcon,
    badge: { key: "pending_qc", label: "0", color: "orange" },
  },
  {
    key: "delivery",
    label: "Pengiriman",
    href: "/dashboard/purchasing/delivery",
    icon: TruckIcon,
  },
  {
    key: "returns",
    label: "Retur",
    href: "/dashboard/purchasing/returns",
    icon: ArrowUturnLeftIcon,
  },
  {
    key: "inventory",
    label: "Inventori",
    href: "/dashboard/purchasing/inventory",
    icon: ArchiveBoxIcon,
    badge: { key: "low_stock", label: "0", color: "red" },
  },
  {
    key: "reports",
    label: "Laporan",
    href: "/dashboard/purchasing/reports",
    icon: DocumentChartBarIcon,
  },
];

/** Badge color to Tailwind classes */
export const BADGE_COLORS: Record<MenuBadge["color"], string> = {
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
};
