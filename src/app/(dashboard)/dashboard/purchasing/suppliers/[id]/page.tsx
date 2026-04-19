"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { BuildingOfficeIcon, PencilSquareIcon } from "@heroicons/react/24/outline";

export default function SupplierDetailPage() {
  const { id } = useParams();
  const supplierId = id as string;
  // TODO: fetch supplier by ID

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Purchasing", href: "/dashboard/purchasing" },
        { label: "Supplier", href: "/dashboard/purchasing/suppliers" },
        { label: supplierId },
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detail Supplier</h1>
          <p className="text-sm text-gray-500">Informasi supplier</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/purchasing/suppliers/${supplierId}/edit`}>
            <Button variant="outline"><PencilSquareIcon className="w-4 h-4 mr-2" />Edit</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Informasi Supplier</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div><p className="text-xs text-gray-500">Kode</p><p className="font-medium">—</p></div>
            <div><p className="text-xs text-gray-500">Nama</p><p className="font-medium">—</p></div>
            <div><p className="text-xs text-gray-500">Jenis</p><p className="font-medium">—</p></div>
            <div><p className="text-xs text-gray-500">Status</p><Badge>—</Badge></div>
            <div><p className="text-xs text-gray-500">Email</p><p className="font-medium">—</p></div>
            <div><p className="text-xs text-gray-500">Telepon</p><p className="font-medium">—</p></div>
            <div><p className="text-xs text-gray-500">Alamat</p><p className="font-medium">—</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
