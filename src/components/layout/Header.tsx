"use client";

import { ActivityLogBell } from "./ActivityLogBell";
import { UserCircle } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left - Empty for now, can add breadcrumbs later */}
        <div className="flex-1" />
        
        {/* Right - Activity Log Bell + User Profile */}
        <div className="flex items-center gap-4">
          {/* Activity Log Bell */}
          <ActivityLogBell />
          
          {/* User Profile Placeholder */}
          <div className="flex items-center gap-2">
            <UserCircle className="w-6 h-6 text-gray-600" />
            <span className="text-sm text-gray-700 hidden md:inline-block">User</span>
          </div>
        </div>
      </div>
    </header>
  );
}
