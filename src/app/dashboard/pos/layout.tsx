"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  PackageIcon,
  ShoppingCartIcon,
  ClipboardListIcon,
  UserCircle,
  Coins,
  ChefHat,
  Calendar,
  LogOut,
  Printer,
  SlidersHorizontal,
  Table2,
} from "lucide-react";
import { ActivityLogBell } from "@/components/layout/ActivityLogBell";
import { ShiftModal } from "@/components/pos/ShiftModal";
import { createClient } from "@/lib/supabase/client";
import { usePosShift } from "@/hooks/use-pos-shift";
import { useState } from "react";

const CASHIER_ID = "00000000-0000-0000-0000-000000000001";

const POS_ITEMS = [
  { href: "/dashboard/pos", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/dashboard/pos/products", label: "Produk", icon: PackageIcon },
  { href: "/dashboard/pos/cashier-new", label: "Kasir", icon: ShoppingCartIcon },
  { href: "/dashboard/pos/open-bills", label: "Open Bills", icon: Table2 },
  { href: "/dashboard/pos/orders", label: "Pesanan", icon: ClipboardListIcon },
  { href: "/dashboard/pos/reservation", label: "Reservasi", icon: Calendar },
  { href: "/dashboard/pos/topup", label: "Topup", icon: Coins },
  { href: "/dashboard/pos/kds", label: "KDS", icon: ChefHat },
  { href: "/dashboard/pos/print-queue", label: "Print Queue", icon: Printer },
  { href: "/dashboard/pos/printer-settings", label: "Printer", icon: SlidersHorizontal },
];

function clsx(...args: (string | boolean | undefined | null)[]) {
  return args.filter(Boolean).join(" ");
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

export default function POSLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = createClient();
  const { shift, isActive: hasShift, loading: loadingShift, openShift, closeShift } = usePosShift(CASHIER_ID);
  const [showShiftModal, setShowShiftModal] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div>
      {/* Horizontal Navigation Bar */}
      <div className="sticky top-0 z-40 w-full bg-white border-b border-gray-200">
        <div className="flex h-14 items-center justify-between px-3 sm:px-4">
          {/* Left - Logo + Navigation tabs */}
          <div className="flex items-center gap-3 flex-1 overflow-x-auto scrollbar-hide">
            <Image
              src="/logo.png"
              alt="Prologue Wonderland"
              width={120}
              height={32}
              className="h-8 w-auto flex-shrink-0 object-contain"
              priority
            />
            {POS_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    active
                      ? "border-pink-600 text-pink-600"
                      : "border-transparent text-gray-900 hover:text-pink-600 hover:border-pink-400"
                  )}
                >
                  <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right - Bell icon, user profile, logout */}
          <div className="flex items-center gap-2 sm:gap-4 pl-2 sm:pl-4 border-l border-gray-200 flex-shrink-0">
            <ActivityLogBell
              posShift={{
                isActive: hasShift,
                loading: loadingShift,
                shiftNumber: shift?.shift_number,
                totalOrders: shift?.total_orders || 0,
                totalSales: shift?.total_sales || 0,
                onClick: () => setShowShiftModal(true),
                formatCurrency,
              }}
            />
            <button
              type="button"
              onClick={() => setShowShiftModal(true)}
              className={clsx(
                "hidden sm:inline-flex h-8 items-center rounded-lg border px-3 text-xs font-semibold transition-colors",
                hasShift
                  ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                  : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              )}
            >
              {hasShift ? "Tutup Shift" : "Buka Shift"}
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-900">
              <UserCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-900" />
              <span className="hidden md:inline-block font-medium">User</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Keluar"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden md:inline-block">Keluar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Page content */}
      <main className="p-3 sm:p-6">
        {children}
      </main>

      <ShiftModal
        open={showShiftModal}
        shift={shift}
        onClose={() => setShowShiftModal(false)}
        onOpenShift={openShift}
        onCloseShift={closeShift}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
