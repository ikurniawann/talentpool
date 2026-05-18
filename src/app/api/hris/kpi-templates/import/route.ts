import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

type SheetRow = Array<string | number>;

interface ParsedKpiItem {
  item_order: number;
  perspective: string;
  category: string;
  kpi_name: string;
  kpi_definition: string;
  formula: string;
  target_text: string;
  target_value: number;
  measurement_unit: string;
  weight: number;
  frequency: string;
  control_method: string;
  score_5_description: string;
  score_4_description: string;
  score_3_description: string;
  score_2_description: string;
  score_1_description: string;
}

interface ParsedBehavioralItem {
  value: string;
  competency: string;
  behavioral_standard: string;
  weight: number;
  score_5_description: string;
  score_4_description: string;
  score_3_description: string;
  score_2_description: string;
  score_1_description: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log("Import API called");
    
    const formData = await request.formData();
    console.log("Form data received");
    
    const file = formData.get("file") as File;

    if (!file) {
      console.error("No file uploaded");
      return NextResponse.json({ error: "File Excel wajib diupload" }, { status: 400 });
    }

    console.log("File received:", file.name, file.size, "bytes");

    const buffer = Buffer.from(await file.arrayBuffer());
    console.log("Buffer created, size:", buffer.length);
    
    const workbook = XLSX.read(buffer, { type: "buffer" });
    console.log("Workbook parsed, sheets:", workbook.SheetNames);

    // Debug: Log all sheet names
    workbook.SheetNames.forEach((sheetName, idx) => {
      console.log(`Sheet ${idx}: "${sheetName}"`);
    });

    if (!workbook.SheetNames.includes("(B)RKK")) {
      return NextResponse.json({ error: "File Excel tidak memiliki sheet (B)RKK" }, { status: 400 });
    }

    const rkkSheet = workbook.Sheets["(B)RKK"];
    const rkkRows = XLSX.utils.sheet_to_json<SheetRow>(rkkSheet, { header: 1, defval: "" });

    const kpiItems: ParsedKpiItem[] = [];
    let headerRowIndex = -1;

    for (let i = 0; i < rkkRows.length; i++) {
      const row = rkkRows[i];
      if (cellText(row[0]) === "NO" && cellText(row[1]).includes("SASARAN")) {
        headerRowIndex = i;
        continue;
      }

      if (headerRowIndex === -1) continue;
      if (!row[0] || row[0] === "") continue;

      const perspective = cellText(row[1]);
      const kpiName = cellText(row[2]);
      const targetText = cellText(row[3]);
      const weight = cellNumber(row[5]);
      const formula = cellText(row[6]);
      const notes = cellText(row[7]);

      if (!kpiName) continue;

      kpiItems.push({
        item_order: parseInt(cellText(row[0]), 10) || kpiItems.length + 1,
        perspective: perspective || "Business Process",
        category: "Main KPI",
        kpi_name: kpiName,
        kpi_definition: formula,
        formula: formula,
        target_text: targetText,
        target_value: 0,
        measurement_unit: "",
        weight: weight,
        frequency: "Monthly",
        control_method: notes,
        score_5_description: "",
        score_4_description: "",
        score_3_description: "",
        score_2_description: "",
        score_1_description: "",
      });
    }

    const behavioralItems: ParsedBehavioralItem[] = [];
    if (workbook.SheetNames.includes("(G) Aspek Perilaku")) {
      const behSheet = workbook.Sheets["(G) Aspek Perilaku"];
      const behRows = XLSX.utils.sheet_to_json<SheetRow>(behSheet, { header: 1, defval: '' });

      console.log("=== Behavioral Sheet Debug ===");
      console.log("Total rows:", behRows.length);
      console.log("Header row (2):", behRows[1]);
      console.log("Sample row 3:", behRows[2]);
      console.log("Sample row 4:", behRows[3]);
      console.log("Sample row 5:", behRows[4]);

      let currentValue = "";
      let currentCompetency = "";

      for (let i = 2; i < behRows.length; i++) {
        const row = behRows[i];
        
        const valueInCell = cellText(row[0]);
        const competencyInCell = cellText(row[1]);
        const behavioralStandard = cellText(row[2]);
        const rawWeight = cellNumber(row[8]);
        const weight = rawWeight > 1 ? rawWeight : rawWeight * 100;

        console.log(`Row ${i}: value="${valueInCell}", competency="${competencyInCell}", standard="${behavioralStandard}", weight=${weight}, row[8]=${row[8]}`);

        if (valueInCell && valueInCell.toLowerCase() !== "total") {
          currentValue = valueInCell;
        }
        if (competencyInCell) {
          currentCompetency = competencyInCell;
        }

        if (!behavioralStandard || !weight) {
          console.log(`  -> Skipping row ${i}: no standard or weight`);
          continue;
        }

        let competency = currentCompetency;
        if (behavioralStandard.includes(" - ")) {
          const parts = behavioralStandard.split(" - ");
          competency = parts[0].trim();
        }

        behavioralItems.push({
          value: currentValue,
          competency: competency,
          behavioral_standard: behavioralStandard,
          weight,
          score_5_description: cellText(row[7]),
          score_4_description: cellText(row[6]),
          score_3_description: cellText(row[5]),
          score_2_description: cellText(row[4]),
          score_1_description: cellText(row[3]),
        });
        console.log(`  -> Added behavioral item: ${currentValue}`);
      }

      console.log("Parsed behavioral items:", behavioralItems.length);
      if (behavioralItems.length > 0) {
        console.log("First behavioral item:", behavioralItems[0]);
      }
    } else {
      console.log("Sheet (G) Aspek Perilaku not found!");
    }

    const totalWeight = kpiItems.reduce((sum, item) => sum + item.weight, 0);
    const totalBehavioralWeight = roundWeight(behavioralItems.reduce((sum, item) => sum + item.weight, 0));

    const fileName = file.name.replace(".xlsx", "").replace(".xls", "");
    const positionMatch = fileName.match(/PK\s+([^(]+)/);
    const positionName = positionMatch ? positionMatch[1].trim() : fileName;

    const scaledTotalWeight = roundWeight(kpiItems.reduce((sum, item) => sum + item.weight, 0));
    const projectWeight = Math.max(0, roundWeight(100 - scaledTotalWeight - totalBehavioralWeight));

    return NextResponse.json({
      success: true,
      data: {
        template_name: `Template KPI - ${positionName}`,
        position_name: positionName,
        applicable_period: new Date().getFullYear().toString(),
        behavioral_weight: totalBehavioralWeight,
        project_weight: projectWeight,
        total_weight: scaledTotalWeight,
        kpi_items: kpiItems,
        behavioral_items: behavioralItems,
        summary: {
          total_kpi_items: kpiItems.length,
          total_kpi_weight: scaledTotalWeight,
          total_behavioral_items: behavioralItems.length,
          total_behavioral_weight: totalBehavioralWeight,
          original_kpi_weight: totalWeight,
        },
      },
    });
  } catch (err: unknown) {
    console.error("Error parsing Excel:", err);
    if (err instanceof Error) {
      console.error("Stack trace:", err.stack);
    }
    return NextResponse.json({ error: getErrorMessage(err) || "Gagal memparse file Excel" }, { status: 500 });
  }
}

function cellText(value: string | number | undefined): string {
  return String(value ?? "").trim();
}

function cellNumber(value: string | number | undefined): number {
  const parsed = typeof value === "number" ? value : parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundWeight(value: number): number {
  return Math.round(value * 100) / 100;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "";
}
