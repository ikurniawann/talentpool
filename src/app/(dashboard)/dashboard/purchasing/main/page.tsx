"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Package, ShoppingCart, Truck, Warehouse, ArrowLeftRight, FileText } from "lucide-react";

export default function PurchasingMainMenuPage() {
  const modules = [
    {
      title: "Supplier",
      href: "/dashboard/purchasing/suppliers",
      icon: Building2,
      description: "Kelola data supplier & vendor",
      features: ["Add/Edit Supplier", "Payment Terms", "Contact Info"],
    },
    {
      title: "Bahan Baku",
      href: "/dashboard/purchasing/raw-materials",
      icon: Package,
      description: "Master data bahan baku",
      features: ["Raw Materials", "Stock Tracking", "Unit Conversion"],
    },
    {
      title: "Purchase Order",
      href: "/dashboard/purchasing/po",
      icon: ShoppingCart,
      description: "Create & manage PO",
      features: ["New PO", "Approval Workflow", "Print PO"],
    },
    {
      title: "Penerimaan Barang",
      href: "/dashboard/purchasing/grn",
      icon: Truck,
      description: "Goods Receipt Note (GRN)",
      features: ["Receive Items", "Partial Receive", "Update Stock"],
    },
    {
      title: "Inventory",
      href: "/dashboard/inventory",
      icon: Warehouse,
      description: "Manage warehouse stock",
      features: ["Stock List", "Low Stock Alert", "Movements"],
    },
    {
      title: "Retur",
      href: "/dashboard/purchasing/returns",
      icon: ArrowLeftRight,
      description: "Return to supplier",
      features: ["Create Return", "Track Status", "Credit Note"],
    },
    {
      title: "Laporan",
      href: "/dashboard/inventory/low-stock",
      icon: FileText,
      description: "Analytics & reports",
      features: ["Low Stock Report", "PO Summary", "Valuation"],
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">🛒 Purchasing Modules</h1>
        <p className="text-xs text-gray-500 mt-0.5">Pilih modul untuk memulai</p>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module) => (
          <Link key={module.href} href={module.href}>
            <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer h-full group">
              <CardHeader className="pb-3">
                <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <module.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-base">{module.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-gray-600 mb-3">{module.description}</p>
                <div className="space-y-1.5">
                  {module.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <div className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />
                      <span className="truncate">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
