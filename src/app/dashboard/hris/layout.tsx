"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const HRIS_MODULES = [
  { href: "/dashboard/hris/candidates", label: "Kandidat" },
  { href: "/dashboard/hris/pipeline", label: "Pipeline" },
  { href: "/dashboard/hris/talent-pool", label: "Talent Pool" },
  { href: "/dashboard/hris/staff", label: "Staff" },
  { href: "/dashboard/hris/analytics", label: "Analytics" },
  { href: "/dashboard/hris/attendance", label: "Absensi" },
  { href: "/dashboard/hris/leaves", label: "Cuti & Izin" },
  { href: "/dashboard/hris/employees", label: "Karyawan" },
];

export default function HRISLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      {/* Top Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto">
          {HRIS_MODULES.map((module) => {
            const isActive = pathname === module.href || pathname.startsWith(module.href + '/');
            return (
              <Link
                key={module.href}
                href={module.href}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${isActive
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {module.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page Content */}
      <div>
        {children}
      </div>
    </div>
  );
}
