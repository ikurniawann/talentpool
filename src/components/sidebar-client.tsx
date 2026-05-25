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
  BuildingOffice2Icon,
  CircleStackIcon,
  BuildingOfficeIcon,
  IdentificationIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  PlusIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ChartPieIcon,
  ArrowDownOnSquareIcon,
  TruckIcon,
  DocumentMagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
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
  CircleStackIcon as CircleStackIconSolid,
  BuildingOfficeIcon as BuildingOfficeIconSolid,
  IdentificationIcon as IdentificationIconSolid,
  CalendarIcon as CalendarIconSolid,
  CurrencyDollarIcon as DollarIconSolid,
  PlusIcon as PlusIconSolid,
  PaperAirplaneIcon as PaperAirplaneIconSolid,
  CheckCircleIcon as CheckCircleIconSolid,
  ChartPieIcon as ChartPieIconSolid,
  ArrowDownOnSquareIcon as ArrowDownOnSquareIconSolid,
  TruckIcon as TruckIconSolid,
  DocumentMagnifyingGlassIcon as DocumentMagnifyingGlassIconSolid,
} from "@heroicons/react/24/solid";
import { ActivityLogBell } from "./layout/ActivityLogBell";
import { NotificationBell } from "./hris/NotificationBell";

// ============================================================================
// Icon Configuration
// ============================================================================

type IconName =
  | "home"
  | "users"
  | "clipboard"
  | "star"
  | "chart"
  | "settings"
  | "logout"
  | "briefcase"
  | "shopping"
  | "cube"
  | "pr"
  | "po"
  | "reports"
  | "sitemap"
  | "database"
  | "building"
  | "identification"
  | "calendar"
  | "dollar-sign"
  | "money"
  | "user-plus"
  | "file-text"
  | "chart-bar"
  | "plus"
  | "paper-airplane"
  | "check-circle"
  | "chart-pie"
  | "arrow-down-on-square"
  | "truck"
  | "document-magnifying-glass"
  | "circle-stack"
  | "document-text"
  | "clipboard-document-check";

interface IconSet {
  outline: React.ElementType;
  solid: React.ElementType;
}

const iconMap: Record<IconName, IconSet> = {
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
  database: { outline: CircleStackIcon, solid: CircleStackIconSolid },
  building: { outline: BuildingOfficeIcon, solid: BuildingOfficeIconSolid },
  identification: { outline: IdentificationIcon, solid: IdentificationIconSolid },
  calendar: { outline: CalendarIcon, solid: CalendarIconSolid },
  "dollar-sign": { outline: CurrencyDollarIcon, solid: DollarIconSolid },
  money: { outline: CurrencyDollarIcon, solid: DollarIconSolid },
  "user-plus": { outline: UsersIcon, solid: UsersIconSolid },
  "file-text": { outline: DocumentTextIcon, solid: DocumentTextIconSolid },
  "chart-bar": { outline: ChartBarIcon, solid: ChartIconSolid },
  plus: { outline: PlusIcon, solid: PlusIconSolid },
  "paper-airplane": { outline: PaperAirplaneIcon, solid: PaperAirplaneIconSolid },
  "check-circle": { outline: CheckCircleIcon, solid: CheckCircleIconSolid },
  "chart-pie": { outline: ChartPieIcon, solid: ChartPieIconSolid },
  "arrow-down-on-square": { outline: ArrowDownOnSquareIcon, solid: ArrowDownOnSquareIconSolid },
  truck: { outline: TruckIcon, solid: TruckIconSolid },
  "document-magnifying-glass": { outline: DocumentMagnifyingGlassIcon, solid: DocumentMagnifyingGlassIconSolid },
  "circle-stack": { outline: CircleStackIcon, solid: CircleStackIconSolid },
  "document-text": { outline: DocumentTextIcon, solid: DocumentTextIconSolid },
  "clipboard-document-check": { outline: ClipboardDocumentCheckIcon, solid: ClipboardDocumentCheckIconSolid },
};

// ============================================================================
// Types
// ============================================================================

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  children?: NavItem[];
}

interface SidebarClientProps {
  user: { full_name: string; role: string; email?: string };
  navItems: NavItem[];
  children: React.ReactNode;
}

// ============================================================================
// Helper Components
// ============================================================================

interface NavIconProps {
  name: IconName;
  className?: string;
  isActive: boolean;
}

function NavIcon({ name, className = "w-5 h-5", isActive }: NavIconProps) {
  const entry = iconMap[name];
  const Icon = isActive ? entry?.solid : entry?.outline;
  if (!Icon) return null;
  return <Icon className={className} />;
}

// ============================================================================
// Main Component
// ============================================================================

export default function SidebarClient({ user, navItems, children }: SidebarClientProps) {
  const desktopNavItem: NavItem = { href: "/arkiv-os", label: "Kembali ke Desktop", icon: "home" };
  const allNavItems = [desktopNavItem, ...navItems];
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["HRIS Modules"]);
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const useActivityNotification = pathname.startsWith("/dashboard/purchasing");

  // --------------------------------------------------------------------------
  // Active State Logic
  // --------------------------------------------------------------------------

  const isActive = (href: string, isChildItem = false): boolean => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    if (isChildItem) {
      return pathname === href;
    }

    // Special handling for performance menu to match both paths
    if (href === "/dashboard/performance") {
      return (
        pathname.startsWith("/dashboard/performance") ||
        pathname.startsWith("/dashboard/hris/performance")
      );
    }

    return pathname.startsWith(href);
  };

  // --------------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------------

  const toggleMenu = (key: string) => {
    setExpandedMenus((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleLogout = async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const sb = createClient();
    await sb.auth.signOut();
    window.location.href = "/login";
  };

  const closeMobile = () => setMobileOpen(false);

  const toggleCollapse = () => setCollapsed((prev) => !prev);

  // --------------------------------------------------------------------------
  // Render Helpers
  // --------------------------------------------------------------------------

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.includes(item.label);
    const itemActive = isActive(item.href);
    const isChildItem = depth > 0;

    if (hasChildren) {
      return (
        <div key={`${item.href}-${item.label}`}>
          <ParentNavItem
            item={item}
            isExpanded={isExpanded}
            itemActive={itemActive}
            collapsed={collapsed}
            onToggle={() => toggleMenu(item.label)}
            onCloseMobile={closeMobile}
          />
          {isExpanded && !collapsed && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children!.map((child) => renderNavItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={closeMobile}
        className={`
          flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors w-full
          ${
            itemActive
              ? "bg-pink-600 text-white font-semibold"
              : "text-gray-900 hover:bg-pink-100"
          }
          ${collapsed ? "justify-center" : ""}
          ${depth > 0 ? "ml-4" : ""}
        `}
        title={collapsed ? item.label : undefined}
      >
        <NavIcon name={item.icon} isActive={itemActive} />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div
      className="flex min-h-screen"
      style={{
        background: "linear-gradient(135deg, #eef2ff 0%, #faf5ff 40%, #f0f9ff 75%, #fef3ff 100%)",
      }}
    >
      {/* Mobile Overlay */}
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
          lg:relative lg:translate-x-0 lg:z-0 lg:flex lg:shrink-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          ${collapsed ? "lg:w-20" : "lg:w-64"}
        `}
      >
        {/* Header */}
        <SidebarHeader
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          user={user}
          onAccountClick={() => setAccountOpen(true)}
        />

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {allNavItems.map((item) => renderNavItem(item))}
        </nav>

        {/* Footer */}
        <SidebarFooter collapsed={collapsed} onLogout={handleLogout} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <MobileHeader
          onMenuClick={() => setMobileOpen(true)}
          userName={user.full_name}
          onLogout={handleLogout}
          onAccountClick={() => setAccountOpen(true)}
        />

        {/* Top Bar - Desktop Notification + Logout */}
        <div className="hidden lg:flex items-center justify-end gap-3 px-6 py-3 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
          <Link
            href="/arkiv-os"
            className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-3 py-2 text-sm font-semibold text-white hover:bg-pink-700 transition-colors"
          >
            <NavIcon name="home" className="w-4 h-4" isActive={true} />
            Desktop
          </Link>
          {useActivityNotification ? <ActivityLogBell /> : <NotificationBell />}
          <div className="h-6 w-px bg-gray-200" />
          <button
            type="button"
            onClick={() => setAccountOpen(true)}
            className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-pink-100 bg-white px-3 py-2 text-left shadow-sm transition-colors hover:bg-pink-50 hover:border-pink-200"
            title="Klik untuk melihat akun login"
            aria-label="Buka popup akun login"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-pink-600 text-sm font-bold text-white">
              {user.full_name?.slice(0, 1).toUpperCase() || "A"}
            </span>
            <span>
              <span className="block text-sm text-gray-700 font-medium">{user.full_name}</span>
              {user.email && <span className="block text-xs text-gray-500">{user.email}</span>}
            </span>
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-pink-100 text-gray-500 hover:text-pink-600 transition-colors"
            title="Keluar"
          >
            <NavIcon name="logout" className="w-5 h-5" isActive={false} />
          </button>
        </div>

        {/* Page Content */}
        <main className={`flex-1 overflow-auto p-4 lg:p-6 ${collapsed ? "lg:ml-0" : ""} transition-all duration-200`}>{children}</main>

        {accountOpen && (
          <AccountPopup
            user={user}
            onClose={() => setAccountOpen(false)}
            onLogout={handleLogout}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface SidebarHeaderProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  user: { full_name: string; role: string; email?: string };
  onAccountClick: () => void;
}

function SidebarHeader({ collapsed, onToggleCollapse, user, onAccountClick }: SidebarHeaderProps) {
  return (
    <div
      className={`p-4 border-b border-pink-200 flex flex-col items-center ${
        collapsed ? "px-2" : ""
      }`}
    >
      <img
        src="/logos/logo.png"
        alt="Arkiv OS"
        className={`${
          collapsed ? "w-12 h-12" : "w-32 h-auto"
        } object-contain mb-3 transition-all`}
      />
      {!collapsed && (
        <div className="px-4 pb-3 w-full">
          <p className="text-xs text-gray-500 px-2 mb-2 text-center">Backoffice</p>
          <button
            type="button"
            onClick={onAccountClick}
            className="mt-3 w-full p-2.5 bg-pink-100 backdrop-blur-sm rounded-lg text-center border border-pink-200 hover:bg-pink-200/80 transition-colors"
            title="Lihat akun login"
          >
            <p className="text-xs font-semibold text-gray-900">{user.full_name}</p>
            {user.email && <p className="truncate text-[11px] text-gray-500">{user.email}</p>}
            <p className="text-xs text-pink-600 capitalize">
              {user.role.replace("_", " ")}
            </p>
          </button>
        </div>
      )}
      <button
        onClick={onToggleCollapse}
        className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-pink-100 text-gray-500 hidden lg:block"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronDownIcon className="w-4 h-4 rotate-90" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 -rotate-90" />
        )}
      </button>
    </div>
  );
}

interface ParentNavItemProps {
  item: NavItem;
  isExpanded: boolean;
  itemActive: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onCloseMobile: () => void;
}

function ParentNavItem({
  item,
  isExpanded,
  itemActive,
  collapsed,
  onToggle,
  onCloseMobile,
}: ParentNavItemProps) {
  return (
    <div
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors
        ${
          itemActive
            ? "bg-pink-600 text-white font-semibold"
            : "text-gray-900 hover:bg-pink-100"
        }
        ${collapsed ? "justify-center" : "justify-between"}
      `}
      title={collapsed ? item.label : ""}
    >
      <Link
        href={item.href}
        onClick={onCloseMobile}
        className="flex-1 flex items-center gap-3"
      >
        <NavIcon name={item.icon} isActive={itemActive} />
        {!collapsed && <span>{item.label}</span>}
      </Link>
      {!collapsed && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="p-1 hover:bg-black/10 rounded"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          <ChevronDownIcon
            className={`w-4 h-4 transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </button>
      )}
    </div>
  );
}

interface SidebarFooterProps {
  collapsed: boolean;
  onLogout: () => void;
}

function SidebarFooter({ collapsed, onLogout }: SidebarFooterProps) {
  return (
    <div className={`p-4 border-t border-pink-200 ${collapsed ? "px-2" : ""}`}>
      {!collapsed ? (
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-lg hover:from-pink-700 hover:to-pink-800 transition-all font-medium shadow-md hover:shadow-lg"
        >
          <NavIcon name="logout" className="w-5 h-5" isActive={false} />
          <span>Keluar</span>
        </button>
      ) : (
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center p-3 rounded-lg hover:bg-pink-100 text-gray-700"
          title="Logout"
        >
          <NavIcon name="logout" className="w-5 h-5" isActive={false} />
        </button>
      )}
    </div>
  );
}

interface MobileHeaderProps {
  onMenuClick: () => void;
  userName: string;
  onLogout: () => void;
  onAccountClick: () => void;
}

function MobileHeader({ onMenuClick, userName, onLogout, onAccountClick }: MobileHeaderProps) {
  return (
    <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <button onClick={onMenuClick} className="p-2 hover:bg-gray-100 rounded-lg">
        <Bars3Icon className="w-6 h-6 text-gray-700" />
      </button>
      <button onClick={onAccountClick} className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-pink-50">
        {userName}
      </button>
      <Link href="/arkiv-os" className="font-semibold text-pink-600">Desktop</Link>
      <button onClick={onLogout} className="p-2 hover:bg-gray-100 rounded-lg">
        <ArrowRightStartOnRectangleIcon className="w-6 h-6 text-gray-700" />
      </button>
    </header>
  );
}

function AccountPopup({
  user,
  onClose,
  onLogout,
}: {
  user: { full_name: string; role: string; email?: string };
  onClose: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/20 p-4 pt-16 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Akun Login</h2>
            <p className="text-xs text-gray-500">Session aktif Arkiv OS</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-5 rounded-2xl bg-pink-50 p-4 text-center border border-pink-100">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-pink-600 text-lg font-bold text-white">
              {user.full_name?.slice(0, 1).toUpperCase() || "A"}
            </div>
            <div className="font-semibold text-gray-900">{user.full_name}</div>
            {user.email && <div className="mt-1 text-sm text-gray-600">{user.email}</div>}
            <div className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-pink-600 ring-1 ring-pink-100">
              {user.role.replace("_", " ")}
            </div>
          </div>

          <div className="grid gap-2">
            <Link
              href="/arkiv-os"
              onClick={onClose}
              className="flex items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-3 text-sm font-semibold text-white hover:bg-pink-700"
            >
              <NavIcon name="home" className="h-5 w-5" isActive={true} />
              Kembali ke Desktop
            </Link>
            <button
              onClick={onLogout}
              className="flex items-center justify-center gap-2 rounded-xl border border-pink-200 px-4 py-3 text-sm font-semibold text-pink-700 hover:bg-pink-50"
            >
              <NavIcon name="logout" className="h-5 w-5" isActive={false} />
              Keluar / Ganti Akun
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
