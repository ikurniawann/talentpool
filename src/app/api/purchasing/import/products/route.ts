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

      const required = ["kode", "nama", "satuan_penjualan"];
      const missing = required.filter((f) => !rowData[f]?.trim());
      if (missing.length > 0) {
        errors.push({ row: rowNumber, message: `Field wajib kosong: ${missing.join(", ")}` });
        skipped.push({ row: rowNumber, data: rowData });
        continue;
      }

      const { data: existing } = await supabase.from("products").select("id").eq("kode", rowData.kode).single();
      if (existing) {
        errors.push({ row: rowNumber, message: `Kode produk ${rowData.kode} sudah ada` });
        skipped.push({ row: rowNumber, data: rowData });
        continue;
      }

      const productData = {
        kode: rowData.kode, nama: rowData.nama,
        kategori: rowData.kategori || null,
        satuan_penjualan: rowData.satuan_penjualan,
        satuan_produksi: rowData.satuan_produksi || rowData.satuan_penjualan,
        qty_per_unit: parseFloat(rowData.qty_per_unit) || 1,
        harga_jual: parseFloat(rowData.harga_jual) || 0,
        harga_modal: parseFloat(rowData.harga_modal) || 0,
        stok_minimum: parseInt(rowData.stok_minimum) || 0,
        stok_maksimum: parseInt(rowData.stok_maksimum) || 0,
        berat_murni: parseFloat(rowData.berat_murni) || 0,
        berat_kotor: parseFloat(rowData.berat_kotor) || 0,
        panjang: parseFloat(rowData.panjang) || 0,
        lebar: parseFloat(rowData.lebar) || 0,
        tinggi: parseFloat(rowData.tinggi) || 0,
        sku: rowData.sku || null,
        barcode: rowData.barcode || null,
        deskripsi: rowData.deskripsi || null,
        is_active: rowData.status?.toLowerCase() === "active",
      };

      const { error } = await supabase.from("products").insert(productData);
      if (error) { errors.push({ row: rowNumber, message: error.message }); skipped.push({ row: rowNumber, data: rowData }); }
      else imported.push({ row: rowNumber, data: rowData });
    }

    return NextResponse.json({ success: true, imported: imported.length, skipped: skipped.length, errors });
  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json({ message: error.message || "Import gagal" }, { status: 500 });
  }
}
