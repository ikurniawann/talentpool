"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatRupiah, formatDate } from "@/modules/purchasing/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PriceHistoryData {
  id: string;
  bahan_baku_nama: string;
  harga: number;
  previous_price?: number | null;
  price_change_percent?: number | null;
  berlaku_dari: string;
  berlaku_sampai?: string | null;
  satuan_nama: string;
  minimum_qty: number;
  lead_time_days: number;
  is_preferred: boolean;
  catatan?: string | null;
}

interface PriceHistoryTableProps {
  data: PriceHistoryData[];
  showMaterialName?: boolean;
}

function ChangeBadge({ change }: { change: number | null | undefined }) {
  if (change === null || change === undefined) {
    return (
      <span className="flex items-center gap-1 text-xs text-gray-400">
        <Minus className="w-3 h-3" />
        -
      </span>
    );
  }

  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${
      isPositive ? "text-red-600" : isNegative ? "text-green-600" : "text-gray-400"
    }`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      {isPositive ? "+" : ""}{change.toFixed(2)}%
    </span>
  );
}

export function PriceHistoryTable({ 
  data, 
  showMaterialName = false 
}: PriceHistoryTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        Belum ada data histori harga
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 hover:bg-gray-50">
            <TableHead className="w-32">Tanggal Berlaku</TableHead>
            {showMaterialName && <TableHead>Bahan Baku</TableHead>}
            <TableHead>Harga Satuan</TableHead>
            <TableHead className="text-right">Min. Qty</TableHead>
            <TableHead className="text-right">Lead Time</TableHead>
            <TableHead className="text-center">Perubahan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Catatan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                <div>{formatDate(item.berlaku_dari)}</div>
                {item.berlaku_sampai && (
                  <div className="text-xs text-gray-400">
                    s/d {formatDate(item.berlaku_sampai)}
                  </div>
                )}
              </TableCell>
              
              {showMaterialName && (
                <TableCell className="font-medium">{item.bahan_baku_nama}</TableCell>
              )}
              
              <TableCell className="font-semibold text-blue-600">
                {formatRupiah(item.harga)}
                <div className="text-xs text-gray-400 font-normal">
                  per {item.satuan_nama}
                </div>
              </TableCell>
              
              <TableCell className="text-right">
                {item.minimum_qty} {item.satuan_nama}
              </TableCell>
              
              <TableCell className="text-right">
                <Badge variant="outline">
                  {item.lead_time_days} hari
                </Badge>
              </TableCell>
              
              <TableCell className="text-center">
                <ChangeBadge change={item.price_change_percent} />
              </TableCell>
              
              <TableCell>
                <div className="flex flex-col gap-1">
                  {item.is_preferred && (
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                      ⭐ Preferred
                    </Badge>
                  )}
                  <Badge className="bg-green-100 text-green-800 text-xs w-fit">
                    Aktif
                  </Badge>
                </div>
              </TableCell>
              
              <TableCell className="max-w-xs truncate text-sm text-gray-500">
                {item.catatan || "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
