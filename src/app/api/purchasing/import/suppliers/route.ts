import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { message: "File tidak ditemukan" },
        { status: 400 }
      );
    }

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json(
        { message: "File CSV harus memiliki header dan minimal 1 data" },
        { status: 400 }
      );
    }

    // Parse CSV
    const parseCSV = (text: string): string[][] => {
      const lines = text.split("\n").filter((line) => line.trim());
      return lines.map((line) => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      });
    };

    const rows = parseCSV(text);
    const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const imported: any[] = [];
    const skipped: any[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    // Process each row
    for (let i = 1; i < rows.length; i++) {
      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        rowData[header] = rows[i][index] || "";
      });

      const rowNumber = i + 1;

      // Validate required fields
      const requiredFields = ["kode", "nama"];
      const missingFields = requiredFields.filter(
        (field) => !rowData[field]?.trim()
      );

      if (missingFields.length > 0) {
        errors.push({
          row: rowNumber,
          message: `Field wajib kosong: ${missingFields.join(", ")}`,
        });
        skipped.push({ row: rowNumber, data: rowData });
        continue;
      }

      // Check for duplicate kode
      const { data: existing } = await supabase
        .from("suppliers")
        .select("id")
        .eq("kode", rowData.kode)
        .single();

      if (existing) {
        errors.push({
          row: rowNumber,
          message: `Kode supplier ${rowData.kode} sudah ada`,
        });
        skipped.push({ row: rowNumber, data: rowData });
        continue;
      }

      // Prepare data for insert
      const supplierData = {
        kode: rowData.kode,
        nama: rowData.nama,
        email: rowData.email || null,
        telepon: rowData.telepon || null,
        alamat: rowData.alamat || null,
        kota: rowData.kota || null,
        provinsi: rowData.provinsi || null,
        kode_pos: rowData.kode_pos || null,
        npwp: rowData.npwp || null,
        termin_pembayaran: parseInt(rowData.termin_pembayaran) || 0,
        mata_uang: rowData.mata_uang || "IDR",
        kategori: rowData.kategori || null,
        status: rowData.status?.toLowerCase() === "active" ? true : false,
        deskripsi: rowData.deskripsi || null,
      };

      // Insert to database
      const { error } = await supabase.from("suppliers").insert(supplierData);

      if (error) {
        errors.push({
          row: rowNumber,
          message: error.message,
        });
        skipped.push({ row: rowNumber, data: rowData });
      } else {
        imported.push({ row: rowNumber, data: rowData });
      }
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      skipped: skipped.length,
      errors,
    });
  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json(
      { message: error.message || "Import gagal" },
      { status: 500 }
    );
  }
}
