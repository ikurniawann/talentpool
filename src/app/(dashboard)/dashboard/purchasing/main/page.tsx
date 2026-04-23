"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShoppingCartIcon,
  TruckIcon,
  ArchiveBoxIcon,
  DocumentChartBarIcon,
  BuildingOfficeIcon,
  CubeIcon,
  ClipboardDocumentCheckIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";

interface DashboardStats {
  totalPO: number;
  pendingPO: number;
  pendingGRN: number;
  lowStockItems: number;
  totalSuppliers: number;
  totalMaterials: number;
}

export default function PurchasingDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPO: 0,
    pendingPO: 0,
    pendingGRN: 0,
    lowStockItems: 0,
    totalSuppliers: 0,
    totalMaterials: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      // Fetch stats from various endpoints
      const [poRes, grnRes, inventoryRes, suppliersRes, materialsRes] = await Promise.all([
        fetch("/api/purchasing/po?limit=1"),
        fetch("/api/purchasing/grn?limit=1"),
        fetch("/api/inventory/low-stock"),
        fetch("/api/purchasing/suppliers?limit=1"),
        fetch("/api/purchasing/raw-materials?limit=1"),
      ]);

      const poData = await poRes.json();
      const grnData = await grnRes.json();
      const inventoryData = await inventoryRes.json();
      const suppliersData = await suppliersRes.json();
      const materialsData = await materialsRes.json();

      setStats({
        totalPO: poData.pagination?.total || 0,
        pendingPO: poData.data?.filter((p: any) => p.status === "pending").length || 0,
        pendingGRN: grnData.data?.filter((g: any) => g.status === "pending").length || 0,
        lowStockItems: inventoryData.data?.length || 0,
        totalSuppliers: suppliersData.pagination?.total || 0,
        totalMaterials: materialsData.pagination?.total || 0,
      });
    } catch (error) {
      console.error("Error loading purchasing stats:", error);
    } finally {
      setLoading(false);
    }
  }

  const menuItems = [
    {
      title: "Supplier",
      href: "/dashboard/purchasing/suppliers",
      icon: BuildingOfficeIcon,
      color: "bg-blue-500",
      description: "Kelola data supplier",
      stat: stats.totalSuppliers,
      statLabel: "Total Supplier",
    },
    {
      title: "Bahan Baku",
      href: "/dashboard/purchasing/raw-materials",
      icon: CubeIcon,
      color: "bg-green-500",
      description: "Master data bahan baku",
      stat: stats.totalMaterials,
      statLabel: "Total Item",
    },
    {
      title: "Purchase Order",
      href: "/dashboard/purchasing/purchase-orders",
      icon: ShoppingCartIcon,
      color: "bg-purple-500",
      description: "Kelola PO & approval",
      stat: stats.pendingPO,
      statLabel: "Pending PO",
    },
    {
      title: "Penerimaan Barang",
      href: "/dashboard/purchasing/grn",
      icon: TruckIcon,
      color: "bg-orange-500",
      description: "Goods Receipt Note",
      stat: stats.pendingGRN,
      statLabel: "Pending GRN",
    },
    {
      title: "Inventory",
      href: "/dashboard/inventory",
      icon: ArchiveBoxIcon,
      color: "bg-teal-500",
      description: "Kelola stok gudang",
      stat: stats.lowStockItems,
      statLabel: "Low Stock",
    },
    {
      title: "Retur",
      href: "/dashboard/purchasing/returns",
      icon: ArrowUturnLeftIcon,
      color: "bg-red-500",
      description: "Return to supplier",
      stat: 0,
      statLabel: "Open Returns",
    },
    {
      title: "Laporan",
      href: "/dashboard/purchasing/reports",
      icon: DocumentChartBarIcon,
      color: "bg-indigo-500",
      description: "Analytics & reports",
      stat: 0,
      statLabel: "Reports",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🛒 Purchasing Dashboard</h1>
          <p className="text-sm text-gray-500">Overview & quick access ke semua modul purchasing</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <ShoppingCartIcon className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-xs text-blue-600">Total PO</p>
                <p className="text-2xl font-bold text-blue-700">{loading ? "-" : stats.totalPO}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <TruckIcon className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-xs text-orange-600">Pending GRN</p>
                <p className="text-2xl font-bold text-orange-700">{loading ? "-" : stats.pendingGRN}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <ArchiveBoxIcon className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-xs text-red-600">Low Stock</p>
                <p className="text-2xl font-bold text-red-700">{loading ? "-" : stats.lowStockItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center mb-3`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-2">{item.description}</p>
                {item.stat > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600">{item.statLabel}:</span>
                    <span className="text-sm font-bold text-gray-900">{item.stat}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
