"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { CubeTransparentIcon, PencilSquareIcon, ListBulletIcon } from "@heroicons/react/24/outline";

export default function ProductDetailPage() {
  const { id } = useParams();
  const productId = id as string;
  // TODO: fetch product by ID

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Purchasing", href: "/dashboard/purchasing" },
        { label: "Produk", href: "/dashboard/purchasing/products" },
        { label: productId },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Detail Produk</h1>
        <div className="flex gap-2">
          <Link href={`/dashboard/purchasing/products/${productId}/edit`}>
            <Button variant="outline"><PencilSquareIcon className="w-4 h-4 mr-2" />Edit</Button>
          </Link>
          <Link href={`/dashboard/purchasing/products/${productId}/bom`}>
            <Button variant="outline"><ListBulletIcon className="w-4 h-4 mr-2" />BOM Editor</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Informasi Produk</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div><p className="text-xs text-gray-500">Kode</p><p className="font-medium">—</p></div>
            <div><p className="text-xs text-gray-500">Nama</p><p className="font-medium">—</p></div>
            <div><p className="text-xs text-gray-500">Kategori</p><p className="font-medium">—</p></div>
            <div><p className="text-xs text-gray-500">Satuan</p><p className="font-medium">—</p></div>
            <div><p className="text-xs text-gray-500">Harga Jual</p><p className="font-medium">—</p></div>
            <div><p className="text-xs text-gray-500">HPP</p><p className="font-medium">—</p></div>
            <div><p className="text-xs text-gray-500">Status</p><Badge>—</Badge></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
