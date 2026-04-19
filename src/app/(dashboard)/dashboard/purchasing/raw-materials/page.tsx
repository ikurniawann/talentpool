"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { CubeIcon, PlusIcon, MagnifyingGlassIcon, EyeIcon, PencilSquareIcon } from "@heroicons/react/24/outline";

export default function RawMaterialsListPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Bahan Baku" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bahan Baku</h1>
          <p className="text-sm text-gray-500">Master bahan baku</p>
        </div>
        <Link href="/dashboard/purchasing/raw-materials/new">
          <Button><PlusIcon className="w-4 h-4 mr-2" />Tambah Bahan</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Cari bahan baku..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Semua Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="discontinued">Dihentikan</SelectItem>
              <SelectItem value="out_of_stock">Habis</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CubeIcon className="w-5 h-5" />Daftar Bahan Baku</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["Kode", "Nama Bahan", "Satuan", "Stok", "Min. Stok", "Harga Avg", "Status", "Aksi"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-sm font-medium text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <CubeIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    Belum ada bahan baku
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
