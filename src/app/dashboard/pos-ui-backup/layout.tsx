'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardList,
  Calendar,
  Coins,
  Beaker,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/pos-ui-backup', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pos-ui-backup/products', label: 'Produk', icon: Package },
  { href: '/pos-ui-backup/cashier', label: 'Kasir', icon: ShoppingCart },
  { href: '/pos-ui-backup/orders', label: 'Pesanan', icon: ClipboardList },
  { href: '/pos-ui-backup/reservation', label: 'Reservasi', icon: Calendar },
  { href: '/pos-ui-backup/topup', label: 'Topup', icon: Coins },
  { href: '/pos-ui-backup/recipe-builder', label: 'Recipe', icon: Beaker },
];

export default function POSBackupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
              <span className="font-bold text-lg text-gray-900">ARK POS</span>
              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded">UI Preview</span>
            </div>
            <div className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-pink-100 text-pink-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer Note */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-gray-500">
        🎨 UI Preview dengan mock data. Untuk production, connect ke backend API.
      </footer>
    </div>
  );
}
