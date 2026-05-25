"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import {
  ArchiveBoxIcon,
  ShoppingCartIcon,
  DocumentChartBarIcon,
  BuildingOfficeIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

const REPORT_CARDS = [
  {
    href: "/dashboard/purchasing/reports/inventory-valuation",
    icon: ArchiveBoxIcon,
    title: "Valuasi Inventory",
    description: "Nilai stok bahan baku berdasarkan harga rata-rata, lengkap dengan status dan breakdown kategori.",
    accent: "text-pink-600",
    bg: "bg-pink-50",
  },
  {
    href: "/dashboard/purchasing/reports/po-summary",
    icon: ShoppingCartIcon,
    title: "Ringkasan PO",
    description: "Rekapitulasi Purchase Order per periode, supplier, dan status dengan grand total nilai.",
    accent: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    href: "/dashboard/purchasing/reports/po-detail",
    icon: DocumentChartBarIcon,
    title: "Detail PO",
    description: "Rincian setiap PO beserta line item, qty diterima, harga satuan, dan subtotal per item.",
    accent: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    href: "/dashboard/purchasing/reports/supplier-performance",
    icon: BuildingOfficeIcon,
    title: "Performa Supplier",
    description: "Evaluasi supplier berdasarkan ketepatan pengiriman, reject rate, lead time, dan total transaksi.",
    accent: "text-green-600",
    bg: "bg-green-50",
  },
];

export default function ReportsHubPage() {
  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[
        { label: "Purchasing", href: "/dashboard/purchasing" },
        { label: "Laporan" },
      ]} />

      <div className="border-b border-gray-200/70 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Laporan Purchasing</h1>
        <p className="mt-1 text-sm text-gray-500">Pilih laporan yang ingin ditampilkan</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {REPORT_CARDS.map((card) => (
          <Card key={card.href} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${card.bg}`}>
                  <card.icon className={`h-6 w-6 ${card.accent}`} />
                </div>
                <CardTitle className="text-lg">{card.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{card.description}</p>
              <Link href={card.href}>
                <Button variant="outline" size="sm" className={`w-full border-current ${card.accent}`}>
                  Lihat Laporan
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
