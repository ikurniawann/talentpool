// ============================================
// API ROUTE: /api/purchasing/price-list/:id
// ============================================

import { NextRequest } from "next/server";
import { createServerPgClient } from "@/lib/pg/create-client";
import { z } from "zod";

const updatePriceListSchema = z.object({
  supplier_id: z.string().uuid().optional(),
  bahan_baku_id: z.string().uuid().optional(),
  harga: z.number().min(0).optional(),
  satuan_id: z.string().uuid().optional(),
  minimum_qty: z.number().min(0).optional(),
  lead_time_days: z.number().min(0).optional(),
  is_preferred: z.boolean().optional(),
  berlaku_dari: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  berlaku_sampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  catatan: z.string().optional(),
  is_active: z.boolean().optional(),
});

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// GET /api/purchasing/price-list/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await createServerPgClient();

    const { data, error } = await db
      .from("supplier_price_lists")
      .select(`
        *,
        supplier:suppliers!supplier_id (
          id,
          kode,
          nama_supplier
        ),
        bahan_baku:raw_materials!bahan_baku_id (
          id,
          kode,
          nama
        ),
        satuan:units!satuan_id (
          id,
          kode,
          nama
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return Response.json(
          { success: false, message: "Price list tidak ditemukan" },
          { status: 404 }
        );
      }
      throw error;
    }

    return Response.json({ success: true, data });
  } catch (error: unknown) {
    console.error("Error fetching price list:", error);
    return Response.json(
      { success: false, message: getErrorMessage(error, "Gagal mengambil data") },
      { status: 500 }
    );
  }
}

// PUT /api/purchasing/price-list/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await createServerPgClient();
    const body = await request.json();

    const validated = updatePriceListSchema.parse(body);

    const { data: existingPriceList, error: existingError } = await db
      .from("supplier_price_lists")
      .select("bahan_baku_id,satuan_id")
      .eq("id", id)
      .single();

    if (existingError) throw existingError;

    const nextMaterialId = validated.bahan_baku_id || existingPriceList.bahan_baku_id;
    const nextUnitId = validated.satuan_id || existingPriceList.satuan_id;

    if (nextMaterialId && nextUnitId) {
      const { data: conversion, error: conversionError } = await db
        .from("raw_material_unit_conversions")
        .select("id")
        .eq("raw_material_id", nextMaterialId)
        .eq("satuan_id", nextUnitId)
        .eq("is_active", true)
        .maybeSingle();

      if (conversionError) throw conversionError;
      if (!conversion) {
        return Response.json(
          { success: false, message: "Satuan belum dikonfigurasi pada master bahan baku" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await db
      .from("supplier_price_lists")
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return Response.json({
      success: true,
      data,
      message: "Price list berhasil diupdate",
    });
  } catch (error: unknown) {
    console.error("Error updating price list:", error);

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          message: "Validasi gagal",
          errors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    return Response.json(
      { success: false, message: getErrorMessage(error, "Gagal mengupdate price list") },
      { status: 500 }
    );
  }
}

// DELETE /api/purchasing/price-list/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await createServerPgClient();

    // Soft delete - set is_active = false
    const { error } = await db
      .from("supplier_price_lists")
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    return Response.json({
      success: true,
      message: "Price list berhasil dihapus",
    });
  } catch (error: unknown) {
    console.error("Error deleting price list:", error);
    return Response.json(
      { success: false, message: getErrorMessage(error, "Gagal menghapus price list") },
      { status: 500 }
    );
  }
}
