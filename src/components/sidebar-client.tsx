"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  HomeIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  StarIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  BriefcaseIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  BookOpenIcon,
  CubeIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import { NotificationBell } from "./hris/NotificationBell";
import {
  HomeIcon as HomeIconSolid,
  UsersIcon as UsersIconSolid,
  ClipboardDocumentListIcon as ClipboardIconSolid,
  StarIcon as StarIconSolid,
  ChartBarIcon as ChartIconSolid,
  Cog6ToothIcon as CogIconSolid,
  ArrowRightStartOnRectangleIcon as LogoutIconSolid,
  BriefcaseIcon as BriefcaseIconSolid,
  ShoppingCartIcon as ShoppingCartIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  ClipboardDocumentCheckIcon as ClipboardDocumentCheckIconSolid,
  BookOpenIcon as BookOpenIconSolid,
  CubeIcon as CubeIconSolid,
  BuildingOffice2Icon as BuildingOffice2IconSolid,
} from "@heroicons/react/24/solid";

const iconMap: Record<string, { outline: React.ElementType; solid: React.ElementType }> = {
  home: { outline: HomeIcon, solid: HomeIconSolid },
  users: { outline: UsersIcon, solid: UsersIconSolid },
  clipboard: { outline: ClipboardDocumentListIcon, solid: ClipboardIconSolid },
  star: { outline: StarIcon, solid: StarIconSolid },
  chart: { outline: ChartBarIcon, solid: ChartIconSolid },
  settings: { outline: Cog6ToothIcon, solid: CogIconSolid },
  logout: { outline: ArrowRightStartOnRectangleIcon, solid: LogoutIconSolid },
  briefcase: { outline: BriefcaseIcon, solid: BriefcaseIconSolid },
  shopping: { outline: ShoppingCartIcon, solid: ShoppingCartIconSolid },
  cube: { outline: CubeIcon, solid: CubeIconSolid },
  pr: { outline: DocumentTextIcon, solid: DocumentTextIconSolid },
  po: { outline: ClipboardDocumentCheckIcon, solid: ClipboardDocumentCheckIconSolid },
  reports: { outline: BookOpenIcon, solid: BookOpenIconSolid },
  sitemap: { outline: BuildingOffice2Icon, solid: BuildingOffice2IconSolid },
};

function NavIcon({ name, className, isActive }: { name: string; className?: string; isActive: boolean }) {
  const entry = iconMap[name];
  const Icon = isActive ? entry?.solid : entry?.outline;
  if (!Icon) return null;
  return <Icon className={className ?? "w-5 h-5"} />;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  children?: NavItem[];
}

interface SidebarClientProps {
  user: { full_name: string; role: string };
  navItems: NavItem[];
  children: React.ReactNode;
}

export default function SidebarClient({ user, navItems, children }: SidebarClientProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string, isChildItem = false) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    // For child items, use exact match
    if (isChildItem) {
      return pathname === href;
    }
    // For parent items, use startsWith
    return pathname.startsWith(href);
  };

  const toggleMenu = (key: string) => {
    setExpandedMenus(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const handleLogout = async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const sb = createClient();
    await sb.auth.signOut();
    window.location.href = "/login";
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex min-h-screen" style={{ background: "linear-gradient(135deg, #eef2ff 0%, #faf5ff 40%, #f0f9ff 75%, #fef3ff 100%)" }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 bg-gradient-to-br from-pink-50 to-white flex flex-col
          transform transition-all duration-200 ease-in-out shadow-xl
          lg:relative lg:translate-x-0 lg:z-0 lg:flex
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          ${collapsed ? "lg:w-20" : "lg:w-64"}
        `}
      >
        {/* Logo / Brand */}
        <div className={`p-4 border-b border-pink-200 flex flex-col items-center ${collapsed ? 'px-2' : ''}`}>
          <img src="/logos/logo.png" alt="Arkiv OS" className={`${collapsed ? 'w-12 h-12' : 'w-32 h-auto'} object-contain mb-3 transition-all`} />
          {!collapsed && (
            <div className="px-4 pb-3 w-full">
              <p className="text-xs text-gray-500 px-2 mb-2 text-center">Backoffice</p>
              <div className="mt-3 p-2.5 bg-pink-100 backdrop-blur-sm rounded-lg text-center border border-pink-200">
                <p className="text-xs font-semibold text-gray-900">{user.full_name}</p>
                <p className="text-xs text-pink-600 capitalize">{user.role.replace("_", " ")}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedMenus.includes(item.label);
            const itemActive = isActive(item.href);

            return (
              <div key={`${item.href}-${item.label}`}>
                {hasChildren ? (
                  <>
                    <button
                      onClick={() => !collapsed && toggleMenu(item.label)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors
                        ${itemActive
                          ? "bg-pink-600 text-white font-semibold"
                          : "text-gray-900 hover:bg-pink-100"
                        }
                        ${collapsed ? 'justify-center' : 'justify-between'}
                        cursor-pointer
                      `}
                      title={collapsed ? item.label : ''}
                    >
                      <div className="flex items-center gap-3">
                        <NavIcon name={item.icon} isActive={itemActive} />
                        {!collapsed && item.label}
                      </div>
                      {!collapsed && (
                        <ChevronDownIcon
                          className={`w-4 h-4 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </button>
                    {isExpanded && !collapsed && (
                      <div className="ml-9 mt-1 space-y-0.5">
                        {item.children!.map((child) => {
                          const childActive = isActive(child.href, true); // exact match for child
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={closeMobile}
                              className={`
                                block px-3 py-1.5 text-sm rounded-lg transition-colors
                                ${childActive
                                  ? 'bg-pink-600 text-white font-semibold'
                                  : 'text-gray-900 hover:bg-pink-100 hover:text-gray-900'
                                }
                              `}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    onClick={closeMobile}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors w-full
                      ${itemActive
                        ? "bg-pink-600 text-white font-semibold"
                        : "text-gray-900 hover:bg-pink-100"
                      }
                      ${collapsed ? 'justify-center' : ''}
                    `}
                    title={collapsed ? item.label : ''}
                  >
                    <NavIcon name={item.icon} isActive={itemActive} />
                    {!collapsed && item.label}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* Notifications (desktop) */}
        {!collapsed && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-pink-100 transition-colors">
              <NotificationBell />
              <span className="text-sm text-gray-700">Notifikasi</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="px-3 pb-2 flex justify-center">
            <NotificationBell />
          </div>
        )}

        {/* Logout & Collapse Toggle */}
        <div className="p-3 border-t border-pink-200 space-y-2">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Keluar' : ''}
          >
            <NavIcon name="logout" className="w-5 h-5" isActive={false} />
            {!collapsed && 'Keluar'}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-3 px-3 py-2.5 text-sm text-gray-700 rounded-lg hover:bg-pink-100 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRightIcon className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeftIcon className="w-5 h-5" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-center p-4 sticky top-0 z-20" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.8)", WebkitBackdropFilter: "blur(20px) saturate(1.8)", borderBottom: "1px solid rgba(209,213,219,0.35)" }}>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 absolute left-4"
          >
            <Bars3Icon className="w-5 h-5 text-gray-700" />
          </button>
          <img src="/logos/logo.png" alt="Arkiv OS" className="h-10 w-auto object-contain" />
          <div className="absolute right-4">
            <NotificationBell />
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
