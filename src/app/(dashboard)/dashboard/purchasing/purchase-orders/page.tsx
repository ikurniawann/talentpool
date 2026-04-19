"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { formatRupiah, getPOStatusLabel } from "@/modules/purchasing/utils";
import { Plus, Search, Eye, Pencil, ShoppingCartIcon } from "lucide-react";

interface POItem {
  id: string;
  po_number: string;
  supplier_name: string;
  order_date: string;
  expected_date: string;
  status: string;
  total_amount: number;
}

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  // TODO: fetch from API
  const orders: POItem[] = [];

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Purchase Orders" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500">Kelola pesanan pembelian ke supplier</p>
        </div>
        <Button onClick={() => router.push("/dashboard/purchasing/purchase-orders/new")}>
          <Plus className="w-4 h-4 mr-2" />Buat PO
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cari no. PO atau supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Terkirim</SelectItem>
              <SelectItem value="confirmed">Dikonfirmasi</SelectItem>
              <SelectItem value="partial">Sebagian</SelectItem>
              <SelectItem value="received">Diterima</SelectItem>
              <SelectItem value="cancelled">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCartIcon className="w-5 h-5" />
            Daftar Purchase Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["No. PO", "Supplier", "Tgl PO", "Tgl Diperlukan", "Total", "Status", "Aksi"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-sm font-medium text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      <ShoppingCartIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Belum ada purchase order</p>
                      <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/purchasing/purchase-orders/new")}>
                        <Plus className="w-4 h-4 mr-2" />Buat PO Pertama
                      </Button>
                    </td>
                  </tr>
                ) : (
                  orders.map((po) => (
                    <tr key={po.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium text-blue-600">{po.po_number}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{po.supplier_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{po.order_date}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{po.expected_date}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-900">{formatRupiah(po.total_amount)}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{getPOStatusLabel(po.status)}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Link href={`/dashboard/purchasing/purchase-orders/${po.id}`}>
                            <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          </Link>
                          <Link href={`/dashboard/purchasing/purchase-orders/${po.id}/edit`}>
                            <Button variant="ghost" size="sm"><Pencil className="w-4 h-4" /></Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
