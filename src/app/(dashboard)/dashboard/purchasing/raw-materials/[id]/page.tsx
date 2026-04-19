"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { CubeIcon, PencilSquareIcon } from "@heroicons/react/24/outline";

export default function RawMaterialDetailPage() {
  const { id } = useParams();
  const materialId = id as string;
  // TODO: fetch material by ID

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Purchasing", href: "/dashboard/purchasing" },
        { label: "Bahan Baku", href: "/dashboard/purchasing/raw-materials" },
        { label: materialId },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Detail Bahan Baku</h1>
        <div className="flex gap-2">
          <Link href={`/dashboard/purchasing/raw-materials/${materialId}/edit`}>
            <Button variant="outline"><PencilSquareIcon className="w-4 h-4 mr-2" />Edit</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Informasi Bahan</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div><p className="text-xs text-gray-500">Kode</p><p className="font-medium">—</p></div>
            <div><p className="text-xs text-gray-500">Nama</p><p className="font-medium">—</p></div>
            <div><p className="text-xs text-gray-500">Satuan</p><p className="font-medium">—</p></div>
            <div><p className="text-xs text-gray-500">Status</p><Badge>—</Badge></div>
            <div><p className="text-xs text-gray-500">Stok</p><p className="font-medium">—</p></div>
            <div><p className="text-xs text-gray-500">Min. Stok</p><p className="font-medium">—</p></div>
            <div><p className="text-xs text-gray-500">Harga Avg</p><p className="font-medium">—</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
