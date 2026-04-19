"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { formatRupiah, getPOStatusLabel } from "@/modules/purchasing/utils";
import { Plus, Search, Eye, Pencil, ShoppingCartIcon } from "lucide-react";

export default function PurchaseOrdersListPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Purchase Order" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Order</h1>
          <p className="text-sm text-gray-500">Kelola Purchase Order</p>
        </div>
        <Link href="/dashboard/purchasing/purchase-orders/new">
          <Button><Plus className="w-4 h-4 mr-2" />Buat PO</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Cari no. PO atau supplier..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Semua Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Terkirim</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="received">Diterima</SelectItem>
              <SelectItem value="closed">Selesai</SelectItem>
              <SelectItem value="cancelled">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ShoppingCartIcon className="w-5 h-5" />Daftar Purchase Order</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["No. PO", "Supplier", "Tanggal", "Est. Terima", "Status", "Total", "Aksi"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-sm font-medium text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <ShoppingCartIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    Belum ada Purchase Order
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
