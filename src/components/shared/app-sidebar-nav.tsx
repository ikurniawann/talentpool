"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { isNavLinkActive } from "@/lib/iam/nav-active";
import type { NavItem } from "@/lib/iam/types";
import { AppSidebarNavIcon } from "./app-sidebar-nav-icons";

interface AppSidebarNavProps {
  navItems: NavItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
}

function collectActiveGroupLabels(items: NavItem[], pathname: string, ancestors: string[] = []): string[] {
  const labels: string[] = [];

  for (const item of items) {
    const childHrefs = item.children?.map((child) => child.href) ?? [];
    const selfActive = isNavLinkActive(pathname, item.href, childHrefs);
    const childActive = item.children?.some((child) =>
      isNavLinkActive(pathname, child.href, childHrefs)
    );

    if (item.children?.length && (selfActive || childActive)) {
      labels.push(...ancestors, item.label);
    }

    if (item.children?.length) {
      labels.push(...collectActiveGroupLabels(item.children, pathname, [...ancestors, item.label]));
    }
  }

  return labels;
}

function isGroupActive(item: NavItem, pathname: string): boolean {
  if (!item.children?.length) {
    return isNavLinkActive(pathname, item.href, []);
  }

  const childHrefs = item.children.map((child) => child.href);
  return (
    pathname === item.href ||
    item.children.some((child) => isNavLinkActive(pathname, child.href, childHrefs))
  );
}

export default function AppSidebarNav({
  navItems,
  collapsed = false,
  onNavigate,
  className = "",
}: AppSidebarNavProps) {
  const pathname = usePathname();
  const autoExpanded = useMemo(
    () => [...new Set(collectActiveGroupLabels(navItems, pathname))],
    [navItems, pathname]
  );
  const [expandedMenus, setExpandedMenus] = useState<string[]>(autoExpanded);

  useEffect(() => {
    setExpandedMenus((prev) => [...new Set([...prev, ...autoExpanded])]);
  }, [autoExpanded]);

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const itemShellClass = (itemActive: boolean, extra = "") =>
    [
      "flex w-full items-center rounded-lg text-sm transition-colors",
      collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
      itemActive
        ? "bg-pink-600 font-semibold text-white"
        : "text-gray-900 hover:bg-pink-100",
      extra,
    ]
      .filter(Boolean)
      .join(" ");

  const renderItem = (item: NavItem, depth = 0, peerHrefs: string[] = []) => {
    const hasChildren = Boolean(item.children?.length);
    const childHrefs = hasChildren ? item.children!.map((child) => child.href) : [];
    const itemActive = hasChildren
      ? isGroupActive(item, pathname)
      : isNavLinkActive(pathname, item.href, peerHrefs);
    const isExpanded = expandedMenus.includes(item.label);

    if (hasChildren) {
      return (
        <div key={`${item.href}-${item.label}`}>
          <button
            type="button"
            onClick={() => toggleMenu(item.label)}
            aria-expanded={isExpanded}
            className={itemShellClass(
              itemActive,
              collapsed ? "" : "justify-between"
            )}
            title={collapsed ? item.label : undefined}
          >
            {collapsed ? (
              <AppSidebarNavIcon name={item.icon} isActive={itemActive} />
            ) : (
              <>
                <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <AppSidebarNavIcon name={item.icon} isActive={itemActive} />
                  <span>{item.label}</span>
                </span>
                <ChevronDownIcon
                  className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
              </>
            )}
          </button>
          {isExpanded && !collapsed && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children!.map((child) => renderItem(child, depth + 1, childHrefs))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={`${item.href}-${item.label}`}
        href={item.href}
        onClick={onNavigate}
        className={itemShellClass(
          itemActive,
          !collapsed && depth > 0 ? "ml-4" : ""
        )}
        title={collapsed ? item.label : undefined}
      >
        <AppSidebarNavIcon name={item.icon} isActive={itemActive} />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  const topLevelHrefs = navItems.map((item) => item.href);

  return (
    <nav
      className={`flex-1 overflow-y-auto ${
        collapsed ? "space-y-1 p-2" : "space-y-1 p-3"
      } ${className}`}
    >
      {navItems.map((item) => renderItem(item, 0, topLevelHrefs))}
    </nav>
  );
}
