"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "📊",
    roles: ["hrd", "hiring_manager", "direksi"],
  },
  {
    href: "/dashboard/candidates",
    label: "Kandidat",
    icon: "👥",
    roles: ["hrd", "hiring_manager"],
  },
  {
    href: "/dashboard/pipeline",
    label: "Pipeline",
    icon: "📋",
    roles: ["hrd", "hiring_manager"],
  },
  {
    href: "/dashboard/talent-pool",
    label: "Talent Pool",
    icon: "🌟",
    roles: ["hrd"],
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: "📈",
    roles: ["hrd", "direksi"],
  },
  {
    href: "/dashboard/settings",
    label: "Pengaturan",
    icon: "⚙️",
    roles: ["hrd"],
  },
];

interface SidebarProps {
  userRole?: string;
}

export function DashboardSidebar({ userRole = "hrd" }: SidebarProps) {
  const pathname = usePathname();

  const filteredNav = navItems.filter(
    (item) => !userRole || item.roles.includes(userRole as any)
  );

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">Talent Pool</h1>
        <p className="text-sm text-gray-500">Aapex Technology</p>
      </div>

      <nav className="space-y-1">
        {filteredNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-blue-50 text-blue-700"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8 pt-8 border-t border-gray-200">
        <div className="flex items-center gap-3 px-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
            A
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Admin HRD</p>
            <p className="text-xs text-gray-500">HRD</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
