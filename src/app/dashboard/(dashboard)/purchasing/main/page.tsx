"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { ArrowRight, Building2, Package, Ruler, Utensils } from "lucide-react";

export default function PurchasingMainMenuPage() {
  const modules = [
    {
      title: "Satuan",
      href: "/dashboard/purchasing/units",
      icon: Ruler,
      description: "Kelola satuan pembelian, stok, dan konversi bahan baku.",
      accent: "text-slate-600",
      bg: "bg-slate-50",
    },
    {
      title: "Supplier",
      href: "/dashboard/purchasing/suppliers",
      icon: Building2,
      description: "Kelola data supplier, kontak, alamat, dan informasi vendor.",
      accent: "text-pink-600",
      bg: "bg-pink-50",
    },
    {
      title: "Bahan Baku",
      href: "/dashboard/purchasing/raw-materials",
      icon: Package,
      description: "Master bahan baku beserta satuan, kategori, dan stok minimum.",
      accent: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Produk",
      href: "/dashboard/purchasing/products",
      icon: Utensils,
      description: "Kelola produk dan relasi kebutuhan bahan baku.",
      accent: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Master Data" },
        ]}
      />

      <div className="border-b border-gray-200/70 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Master Data Purchasing</h1>
        <p className="mt-1 text-sm text-gray-500">Pilih master data yang ingin dikelola</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {modules.map((module) => (
          <Card key={module.href} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${module.bg}`}>
                  <module.icon className={`h-6 w-6 ${module.accent}`} />
                </div>
                <CardTitle className="text-lg">{module.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{module.description}</p>
              <Link href={module.href}>
                <Button variant="outline" size="sm" className={`w-full border-current ${module.accent}`}>
                  Buka Menu
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
