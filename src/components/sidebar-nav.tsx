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
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  UsersIcon as UsersIconSolid,
  ClipboardDocumentListIcon as ClipboardIconSolid,
  StarIcon as StarIconSolid,
  ChartBarIcon as ChartIconSolid,
  Cog6ToothIcon as CogIconSolid,
  ArrowRightStartOnRectangleIcon as LogoutIconSolid,
} from "@heroicons/react/24/solid";

const iconMap: Record<string, { outline: React.ElementType; solid: React.ElementType }> = {
  home: { outline: HomeIcon, solid: HomeIconSolid },
  users: { outline: UsersIcon, solid: UsersIconSolid },
  clipboard: { outline: ClipboardDocumentListIcon, solid: ClipboardIconSolid },
  star: { outline: StarIcon, solid: StarIconSolid },
  chart: { outline: ChartBarIcon, solid: ChartIconSolid },
  settings: { outline: Cog6ToothIcon, solid: CogIconSolid },
  logout: { outline: ArrowRightStartOnRectangleIcon, solid: LogoutIconSolid },
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

interface SidebarNavProps {
  navItems: NavItem[];
  userName: string;
  userRole: string;
}

export default function SidebarNav({ navItems, userName, userRole }: SidebarNavProps) {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  const toggleMenu = (key: string) => {
    setExpandedMenus(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  return (
    <aside className="w-64 bg-gradient-to-br from-[#303b64] to-[#425aad] flex flex-col shadow-xl">
      <div className="p-6 border-b border-white/10">
        <h2 className="font-bold text-lg text-white">Talent Pool</h2>
        <p className="text-xs text-white/60 mt-0.5">Aapex Technology</p>
        <div className="mt-3 p-2 bg-white/10 backdrop-blur-sm rounded-lg">
          <p className="text-xs font-medium text-white">{userName}</p>
          <p className="text-xs text-white/60 capitalize">{userRole.replace("_", " ")}</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedMenus.includes(item.label);
          const itemActive = isActive(item.href);

          return (
            <div key={item.href}>
              <button
                onClick={() => hasChildren && toggleMenu(item.label)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  itemActive
                    ? "bg-white/20 text-white font-medium"
                    : "text-white/80 hover:bg-white/10"
                } ${hasChildren ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <NavIcon name={item.icon} isActive={itemActive} />
                  {item.label}
                </div>
                {hasChildren && (
                  <ChevronDownIcon
                    className={`w-4 h-4 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </button>
              {hasChildren && isExpanded && (
                <div className="ml-9 mt-1 space-y-1">
                  {item.children!.map((child) => {
                    const childActive = isActive(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          childActive
                            ? 'bg-white/20 text-white font-medium'
                            : 'text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <form
          action={async () => {
            "use server";
            const { createClient } = await import("@/lib/supabase/server");
            const sb = await createClient();
            await sb.auth.signOut();
            const { redirect } = await import("next/navigation");
            redirect("/login");
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-300 rounded-lg hover:bg-red-500/20 transition-colors"
          >
            <NavIcon name="logout" className="w-5 h-5" isActive={false} />
            Keluar
          </button>
        </form>
      </div>
    </aside>
  );
}
