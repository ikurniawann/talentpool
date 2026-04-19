"use client";

import { Card, CardContent } from "@/components/ui/card";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import PurchasingGuard from "@/modules/purchasing/components/auth/PurchasingGuard";

export default function RawMaterialsNewPage() {
  return (
    <PurchasingGuard allowedRoles={["purchasing_staff", "purchasing_manager", "purchasing_admin", "super_admin"]}>
      <div className="space-y-6">
        <BreadcrumbNav
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Purchasing", href: "/dashboard/purchasing" },
            { label: "Bahan Baku", href: "/dashboard/purchasing/raw-materials" },
            { label: "Tambah Bahan" },
          ]}
        />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tambah Bahan Baku</h1>
            <p className="text-sm text-gray-500">Formulir bahan baku baru</p>
          </div>
          <Link href="/dashboard/purchasing/raw-materials">
            <Button variant="ghost">Batal</Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-400 py-12">
              <p className="text-sm">Form tambah bahan baku belum tersedia</p>
              <p className="text-xs mt-1">Page stub — POST /api/purchasing/materials</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PurchasingGuard>
  );
}
