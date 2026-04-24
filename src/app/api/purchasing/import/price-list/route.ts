import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ message: "File tidak ditemukan" }, { status: 400 });

    const text = await file.text();
    const parseCSV = (text: string): string[][] => {
      const lines = text.split("\n").filter((l) => l.trim());
      return lines.map((line) => {
        const result: string[] = [];
        let current = "", inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === "," && !inQuotes) { result.push(current.trim()); current = ""; }
          else current += char;
        }
        result.push(current.trim());
        return result;
      });
    };

    const rows = parseCSV(text);
    if (rows.length < 2) return NextResponse.json({ message: "File CSV harus memiliki header dan minimal 1 data" }, { status: 400 });

    const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const imported: any[] = [], skipped: any[] = [], errors: Array<{ row: number; message: string }> = [];

    for (let i = 1; i < rows.length; i++) {
      const rowData: Record<string, string> = {};
      headers.forEach((header, idx) => { rowData[header] = rows[i][idx] || ""; });
      const rowNumber = i + 1;

      const required = ["supplier_kode", "bahan_baku_kode", "harga_satuan"];
      const missing = required.filter((f) => !rowData[f]?.trim());
      if (missing.length > 0) {
        errors.push({ row: rowNumber, message: `Field wajib kosong: ${missing.join(", ")}` });
        skipped.push({ row: rowNumber, data: rowData });
        continue;
      }

      // Get supplier ID from kode
      const { data: supplier } = await supabase.from("suppliers").select("id").eq("kode", rowData.supplier_kode).single();
      if (!supplier) {
        errors.push({ row: rowNumber, message: `Supplier dengan kode ${rowData.supplier_kode} tidak ditemukan` });
        skipped.push({ row: rowNumber, data: rowData });
        continue;
      }

      // Get raw material ID from kode
      const { data: rawMaterial } = await supabase.from("raw_materials").select("id").eq("kode", rowData.bahan_baku_kode).single();
      if (!rawMaterial) {
        errors.push({ row: rowNumber, message: `Bahan baku dengan kode ${rowData.bahan_baku_kode} tidak ditemukan` });
        skipped.push({ row: rowNumber, data: rowData });
        continue;
      }

      const priceData = {
        supplier_id: supplier.id,
        raw_material_id: rawMaterial.id,
        harga_satuan: parseFloat(rowData.harga_satuan) || 0,
        mata_uang: rowData.mata_uang || "IDR",
        satuan: rowData.satuan || null,
        minimal_order: parseInt(rowData.minimal_order) || 0,
        berlaku_dari: rowData.berlaku_dari || null,
        berlaku_sampai: rowData.berlaku_sampai || null,
        is_active: rowData.status?.toLowerCase() === "active",
      };

      const { error } = await supabase.from("supplier_prices").insert(priceData);
      if (error) { errors.push({ row: rowNumber, message: error.message }); skipped.push({ row: rowNumber, data: rowData }); }
      else imported.push({ row: rowNumber, data: rowData });
    }

    return NextResponse.json({ success: true, imported: imported.length, skipped: skipped.length, errors });
  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json({ message: error.message || "Import gagal" }, { status: 500 });
  }
}
