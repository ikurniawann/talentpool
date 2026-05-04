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
    <div className="p-6">
      <BreadcrumbNav items={[
        { label: "Purchasing", href: "/dashboard/purchasing" },
        { label: "Laporan" },
      ]} />

      <div className="mt-4 mb-8">
        <h1 className="text-2xl font-bold">Laporan Purchasing</h1>
        <p className="text-sm text-gray-500 mt-1">Pilih laporan yang ingin ditampilkan</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {REPORT_CARDS.map((card) => (
          <Card key={card.href} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-6 h-6 ${card.accent}`} />
                </div>
                <CardTitle className="text-lg">{card.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{card.description}</p>
              <Link href={card.href}>
                <Button variant="outline" size="sm" className={`w-full border-current ${card.accent} hover:bg-opacity-10`}>
                  Lihat Laporan
                  <ArrowRightIcon className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
