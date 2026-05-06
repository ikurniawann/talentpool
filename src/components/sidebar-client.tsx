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
} from "@heroicons/react/24/solid";
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
  | "identification";

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
  user: { full_name: string; role: string };
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
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["HRIS Modules"]);
  const [collapsed, setCollapsed] = useState(false);

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
            <div className="ml-9 mt-1 space-y-0.5">
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
          lg:relative lg:translate-x-0 lg:z-0 lg:flex
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          ${collapsed ? "lg:w-20" : "lg:w-64"}
        `}
      >
        {/* Header */}
        <SidebarHeader
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          user={user}
        />

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => renderNavItem(item))}
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
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">{children}</main>
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
  user: { full_name: string; role: string };
}

function SidebarHeader({ collapsed, onToggleCollapse, user }: SidebarHeaderProps) {
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
          <div className="mt-3 p-2.5 bg-pink-100 backdrop-blur-sm rounded-lg text-center border border-pink-200">
            <p className="text-xs font-semibold text-gray-900">{user.full_name}</p>
            <p className="text-xs text-pink-600 capitalize">
              {user.role.replace("_", " ")}
            </p>
          </div>
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
        <>
          <div className="mb-3">
            <NotificationBell />
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 
                     bg-gradient-to-r from-pink-600 to-pink-700 text-white 
                     rounded-lg hover:from-pink-700 hover:to-pink-800 
                     transition-all font-medium shadow-md hover:shadow-lg"
          >
            <NavIcon name="logout" className="w-5 h-5" isActive={false} />
            <span>Keluar</span>
          </button>
        </>
      ) : (
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center p-3 rounded-lg 
                   hover:bg-pink-100 text-gray-700"
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
}

function MobileHeader({ onMenuClick, userName, onLogout }: MobileHeaderProps) {
  return (
    <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <button onClick={onMenuClick} className="p-2 hover:bg-gray-100 rounded-lg">
        <Bars3Icon className="w-6 h-6 text-gray-700" />
      </button>
      <span className="font-semibold text-gray-900">{userName}</span>
      <button onClick={onLogout} className="p-2 hover:bg-gray-100 rounded-lg">
        <ArrowRightStartOnRectangleIcon className="w-6 h-6 text-gray-700" />
      </button>
    </header>
  );
}
