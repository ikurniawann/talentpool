"use client";

import { Card, CardContent } from "@/components/ui/card";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import PurchasingGuard from "@/modules/purchasing/components/auth/PurchasingGuard";

export default function InventoryValuationPage() {
  return (
    <PurchasingGuard allowedRoles={["purchasing_staff", "purchasing_manager", "purchasing_admin", "super_admin", "viewer"]}>
      <div className="space-y-6">
        <BreadcrumbNav
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Purchasing", href: "/dashboard/purchasing" },
            { label: "Laporan", href: "/dashboard/purchasing/reports" },
            { label: "Valuasi Stok" },
          ]}
        />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Valuasi Stok</h1>
            <p className="text-sm text-gray-500">Nilai inventori berdasarkan HPP</p>
          </div>
          <Link href="/dashboard/purchasing/reports">
            <Button variant="ghost">Kembali</Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-400 py-12">
              <p className="text-sm">Laporan valuasi stok belum tersedia</p>
              <p className="text-xs mt-1">GET /api/purchasing/reports/inventory-valuation</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PurchasingGuard>
  );
}
