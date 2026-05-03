"use client";

import { ReactNode } from "react";

export default function HRISLayout({ children }: { children: ReactNode }) {
  // Simplified layout - no top navigation
  // Navigation handled by main dashboard sidebar
  return (
    <div className="p-6">
      {children}
    </div>
  );
}
