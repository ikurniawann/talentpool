"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboardIcon,
  PackageIcon,
  ShoppingCartIcon,
  ClipboardListIcon,
  BarChart3Icon,
  ChevronDownIcon,
  UserCircle,
  Coins,
  Calendar,
  LogOut,
} from "lucide-react";
import { ActivityLogBell } from "@/components/layout/ActivityLogBell";
import { createClient } from "@/lib/supabase/client";

const POS_ITEMS = [
  { href: "/dashboard/pos", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/dashboard/pos/products", label: "Produk", icon: PackageIcon },
  { href: "/dashboard/pos/cashier-new", label: "Kasir", icon: ShoppingCartIcon },
  { href: "/dashboard/pos/orders", label: "Pesanan", icon: ClipboardListIcon },
  { href: "/dashboard/pos/reservation", label: "Reservasi", icon: Calendar },
  { href: "/dashboard/pos/topup", label: "Topup", icon: Coins },
];

function clsx(...args: (string | boolean | undefined | null)[]) {
  return args.filter(Boolean).join(" ");
}

export default function POSLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = createClient();

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
            <img src="/logo.png" alt="Prologue Wonderland" className="h-8 w-auto object-contain flex-shrink-0" />
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
            <ActivityLogBell />
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
    </div>
  );
}
