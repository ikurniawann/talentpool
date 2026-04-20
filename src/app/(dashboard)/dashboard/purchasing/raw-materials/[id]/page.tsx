"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import PurchasingGuard from "@/modules/purchasing/components/auth/PurchasingGuard";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import {
  CubeIcon,
  PencilSquareIcon,
  ArrowLeftIcon,
  TruckIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { RawMaterial } from "@/types/raw-material";

function StokStatusBadge({ status }: { status: string }) {
  if (status === "AMAN") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aman</Badge>;
  if (status === "MENIPIS") return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Menipis</Badge>;
  if (status === "HABIS") return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Habis</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function InfoRow({ label, value, className }: { label: string; value?: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="font-medium text-gray-900 mt-0.5">
        {value ?? <span className="text-gray-300">—</span>}
      </p>
    </div>
  );
}

export default function RawMaterialDetailPage() {
  return (
    <PurchasingGuard minRole="purchasing_staff">
      <RawMaterialDetailInner />
    </PurchasingGuard>
  );
}

function RawMaterialDetailInner() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  const [material, setMaterial] = useState<RawMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function fetchDetail() {
      setLoading(true);
      setError(null);

      try {
        // Fetch raw material by ID
        const { data, error: apiError } = await supabase
          .from("bahan_baku")
          .select(
            `
            id,
            kode,
            nama,
            kategori,
            shelf_life_days,
            storage_condition,
            minimum_stock,
            maximum_stock,
            konversi_factor,
            is_active,
            created_at,
            created_at,
            satuan_besar:satuan_id(id, kode, nama),
            satuan_kecil:satuan_kecil_id(id, kode, nama),
            inventory:inventory(jumlah_tersedia, jumlah_dipesan, jumlah_maksimum, unit_cost)
          `
          )
          .eq("id", id)
          .maybeSingle();

        if (apiError) throw apiError;
        if (!data) throw new Error("Bahan baku tidak ditemukan");

        // Fetch preferred supplier
        const { data: prefSpl } = await supabase
          .from("supplier_price_lists")
          .select(
            `
            harga,
            supplier:suppliers!inner(id, nama_supplier, pic_name, pic_phone)
          `
          )
          .eq("bahan_baku_id", id)
          .eq("is_preferred", true)
          .eq("is_active", true)
          .maybeSingle();

        // Compute status
        const inv = Array.isArray(data.inventory) ? data.inventory[0] : data.inventory;
        const qtyOnhand = Number(inv?.jumlah_tersedia ?? 0);
        const minStock = Number(data.minimum_stock ?? 0);
        let statusStok = "AMAN";
        if (qtyOnhand === 0) statusStok = "HABIS";
        else if (qtyOnhand <= minStock) statusStok = "MENIPIS";

        setMaterial({
          ...data,
          qty_onhand: qtyOnhand,
          avg_cost: Number(inv?.unit_cost ?? 0),
          status_stok: statusStok,
          supplier_utama: prefSpl
            ? {
                id: (prefSpl.supplier as any)?.id,
                nama: (prefSpl.supplier as any)?.nama_supplier,
                harga: prefSpl.harga,
              }
            : null,
        } as RawMaterial);
      } catch (err: any) {
        setError(err.message ?? "Gagal memuat detail bahan baku");
        toast({
          title: "Gagal memuat",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [id, supabase, toast]);

  const isAdmin = user?.role === "purchasing_admin" || user?.role === "super_admin";

  if (loading) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Bahan Baku", href: "/dashboard/purchasing/raw-materials" },
          { label: "..." },
        ]} />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Bahan Baku", href: "/dashboard/purchasing/raw-materials" },
          { label: "Error" },
        ]} />
        <Card>
          <CardContent className="p-8 text-center">
            <CubeIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">{error ?? "Data tidak ditemukan"}</p>
            <Link href="/dashboard/purchasing/raw-materials">
              <Button variant="outline" className="mt-4">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Kembali ke Daftar
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Bahan Baku", href: "/dashboard/purchasing/raw-materials" },
          { label: material.kode },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <CubeIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{material.nama}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-sm text-gray-500">{material.kode}</span>
              {material.kategori && (
                <Badge variant="outline">{material.kategori.replace(/_/g, " ")}</Badge>
              )}
              <StokStatusBadge status={material.status_stok} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/purchasing/raw-materials">
            <Button variant="outline">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </Link>
          {isAdmin && (
            <Link href={`/dashboard/purchasing/raw-materials/${material.id}/edit`}>
              <Button>
                <PencilSquareIcon className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stok */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-gray-500 uppercase">Stok Tersedia</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {material.qty_onhand.toLocaleString("id-ID")}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {material.satuan_besar?.nama ?? "—"}
              {material.satuan_kecil && ` / ${material.satuan_kecil.nama}`}
            </p>
          </CardContent>
        </Card>

        {/* Min Stok */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-gray-500 uppercase">Min. Stok</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {(material.minimum_stock ?? 0).toLocaleString("id-ID")}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Max: {material.maximum_stock ? material.maximum_stock.toLocaleString("id-ID") : "—"}
            </p>
          </CardContent>
        </Card>

        {/* Avg Cost */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-gray-500 uppercase">Harga Average</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {material.avg_cost > 0 ? formatCurrency(material.avg_cost) : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">per {material.satuan_besar?.nama ?? "unit"}</p>
          </CardContent>
        </Card>

        {/* Shelf Life */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-gray-500 uppercase">Shelf Life</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {material.shelf_life_days > 0 ? `${material.shelf_life_days} hari` : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 capitalize">
              {material.storage_condition ?? "ambient"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Bahan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Kode" value={material.kode} />
              <InfoRow label="Nama" value={material.nama} />
              <InfoRow
                label="Kategori"
                value={material.kategori?.replace(/_/g, " ")}
              />
              <InfoRow label="Satuan Besar" value={material.satuan_besar?.nama} />
              <InfoRow label="Satuan Kecil" value={material.satuan_kecil?.nama} />
              <InfoRow
                label="Faktor Konversi"
                value={material.satuan_kecil ? `1 = ${material.konversi_factor}` : "—"}
              />
              <InfoRow label="Storage" value={material.storage_condition} className="capitalize" />
              <InfoRow
                label="Status"
                value={<StokStatusBadge status={material.status_stok} />}
              />
              <InfoRow
                label="Dibuat"
                value={new Date(material.created_at).toLocaleDateString("id-ID", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Inventory */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow
                label="Tersedia"
                value={material.qty_onhand.toLocaleString("id-ID")}
              />
              <InfoRow
                label="Dipesan"
                value={material.qty_onhand > 0 ? "0" : "—"}
              />
              <InfoRow
                label="Min Stok"
                value={(material.minimum_stock ?? 0).toLocaleString("id-ID")}
              />
              <InfoRow
                label="Max Stok"
                value={material.maximum_stock?.toLocaleString("id-ID")}
              />
              <InfoRow
                label="Unit Cost"
                value={material.avg_cost > 0 ? formatCurrency(material.avg_cost) : "—"}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supplier */}
      {material.supplier_utama && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TruckIcon className="w-5 h-5" />
              Supplier Utama
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoRow label="Nama" value={material.supplier_utama.nama} />
              <InfoRow
                label="Harga"
                value={formatCurrency(material.supplier_utama.harga)}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
