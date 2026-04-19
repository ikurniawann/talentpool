import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiUser,
  ApiError,
  successResponse,
} from "@/lib/api/auth";

// GET /api/purchasing/cogs/product/:produk_id
// Real-time HPP calculation based on BOM × avg_cost + overhead allocation

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ produk_id: string }> }
) {
  try {
    await requireApiUser();
    const supabase = await createClient();
    const { produk_id } = await params;

    // Validate UUID
    if (!z.string().uuid().safeParse(produk_id).success) {
      throw ApiError.badRequest("Invalid produk ID");
    }

    // Fetch product with BOM
    const { data: produk, error: produkError } = await supabase
      .from("produk")
      .select(
        `
        *,
        satuan:satuan_id(id, kode, nama),
        bom_items:bom(
          *,
          bahan_baku:bahan_baku_id(
            id, kode, nama,
            inventory:inventory(bahan_baku_id, qty_in_stock, avg_cost)
          ),
          satuan:satuan_id(id, kode, nama)
        )
      `
      )
      .eq("id", produk_id)
      .single();

    if (produkError || !produk) {
      throw ApiError.notFound("Produk tidak ditemukan");
    }

    if (!produk.bom_items || produk.bom_items.length === 0) {
      return successResponse({
        produk_id: produk.id,
        kode: produk.kode,
        nama: produk.nama,
        satuan: produk.satuan,
        harga_jual: produk.harga_jual,
        hpp_per_unit: 0,
        total_bom_cost: 0,
        total_overhead: 0,
        breakdown_bahan: [],
        warning: "Produk belum memiliki BOM (Bill of Materials)",
      });
    }

    // Get overhead rate from system settings or use default 10%
    const { data: settings } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "overhead_rate")
      .single();

    const overheadRate = settings ? parseFloat(settings.value) / 100 : 0.1;

    // Calculate cost breakdown per ingredient
    let totalBomCost = 0;
    const breakdownBahan: Array<{
      bahan_id: string;
      kode: string;
      nama: string;
      jumlah: number;
      satuan: string;
      qty_in_stock: number;
      avg_cost: number;
      waste_percentage: number;
      effective_qty: number;
      subtotal: number;
    }> = [];

    for (const bom of produk.bom_items) {
      const bahan = bom.bahan_baku;
      const qtyInStock = bahan?.inventory?.[0]?.qty_in_stock || 0;
      const avgCost = bahan?.inventory?.[0]?.avg_cost || 0;
      const wastePct = bom.waste_percentage || 0;

      // Apply waste: if 10% waste, need 1/(1-0.1) = 1.111 units per unit produced
      const effectiveQty = bom.jumlah / (1 - wastePct / 100);
      const subtotal = effectiveQty * avgCost;

      totalBomCost += subtotal;

      breakdownBahan.push({
        bahan_id: bahan.id,
        kode: bahan.kode,
        nama: bahan.nama,
        jumlah: bom.jumlah,
        satuan: bom.satuan?.nama || "-",
        qty_in_stock: qtyInStock,
        avg_cost: avgCost,
        waste_percentage: wastePct,
        effective_qty: Math.round(effectiveQty * 1000) / 1000,
        subtotal: Math.round(subtotal * 100) / 100,
      });
    }

    const totalOverhead = totalBomCost * overheadRate;
    const hppPerUnit = Math.round((totalBomCost + totalOverhead) * 100) / 100;
    const totalBomCostRounded = Math.round(totalBomCost * 100) / 100;
    const totalOverheadRounded = Math.round(totalOverhead * 100) / 100;

    // Compute margin vs harga_jual
    let margin = null;
    let marginPct = null;
    if (produk.harga_jual && produk.harga_jual > 0) {
      margin = produk.harga_jual - hppPerUnit;
      marginPct = Math.round(((margin / produk.harga_jual) * 100) * 100) / 100;
    }

    // Check if any ingredient is below minimum stock
    const criticalIngredients = breakdownBahan.filter(
      (b) => b.qty_in_stock < b.jumlah * 10 // less than 10x required
    );

    return successResponse({
      produk_id: produk.id,
      kode: produk.kode,
      nama: produk.nama,
      satuan: produk.satuan,
      harga_jual: produk.harga_jual,
      hpp_per_unit: hppPerUnit,
      total_bom_cost: totalBomCostRounded,
      overhead_rate: overheadRate * 100,
      total_overhead: totalOverheadRounded,
      breakdown_bahan: breakdownBahan,
      margin_vs_harga_jual: margin,
      margin_percentage: marginPct,
      margin_label: marginPct
        ? marginPct > 30
          ? "Healthy"
          : marginPct > 15
          ? "Acceptable"
          : "Thin"
        : null,
      stock_warnings:
        criticalIngredients.length > 0
          ? criticalIngredients.map((c) => ({
              nama: c.nama,
              qty_in_stock: c.qty_in_stock,
              required_per_unit: c.jumlah,
              stock_coverage_units:
                c.jumlah > 0
                  ? Math.round((c.qty_in_stock / c.jumlah) * 10) / 10
                  : 0,
            }))
          : [],
    });
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return ApiError.badRequest("Invalid params", error.issues).toResponse();
    }
    console.error("Error calculating HPP:", error);
    return ApiError.server("Failed to calculate HPP").toResponse();
  }
}
