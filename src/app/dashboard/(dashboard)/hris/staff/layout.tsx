"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UsersIcon, CalendarDaysIcon, Squares2X2Icon } from "@heroicons/react/24/outline";

const tabs = [
  { href: "/dashboard/hris/staff", label: "Staff List", icon: UsersIcon },
  { href: "/dashboard/hris/staff/schedules", label: "Jadwal", icon: CalendarDaysIcon },
  { href: "/dashboard/hris/staff/sections", label: "Section", icon: Squares2X2Icon },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      {/* Sub-nav tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                ${isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
