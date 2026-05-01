import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get date range from query params
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    // Date range for filtering POs
    let poDateFilter = {};
    if (startDate || endDate) {
      if (startDate) {
        poDateFilter = { ...poDateFilter, gte: `${startDate}T00:00:00.000Z` };
      }
      if (endDate) {
        poDateFilter = { ...poDateFilter, lte: `${endDate}T23:59:59.999Z` };
      }
    }

    // ── KPIs ───────────────────────────────────────────────────────────────
    
    // Total PO Bulan Ini (or date range if specified)
    const startOfMonth = startDate
      ? new Date(startDate)
      : (() => {
          const d = new Date();
          d.setDate(1);
          d.setHours(0, 0, 0, 0);
          return d;
        })();
    
    const endOfMonth = endDate
      ? new Date(endDate)
      : (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + 1, 0);
          d.setHours(23, 59, 59, 999);
          return d;
        })();

    const prevMonthStart = new Date(startOfMonth);
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
    const prevMonthEnd = new Date(endOfMonth);
    prevMonthEnd.setMonth(prevMonthEnd.getMonth() - 1);

    const [
      { data: currentMonthPOs, error: poError },
      { data: prevMonthPOs },
      { count: lowStockCount },
      { count: pendingApprovalCount },
    ] = await Promise.all([
      supabase
        .from("v_purchase_orders")
        .select("id, total, created_at")
        .gte("created_at", startOfMonth.toISOString())
        .lte("created_at", endOfMonth.toISOString()),
      supabase
        .from("v_purchase_orders")
        .select("id, total, created_at")
        .gte("created_at", prevMonthStart.toISOString())
        .lte("created_at", prevMonthEnd.toISOString()),
      supabase
        .from("raw_materials")
        .select("id", { count: "exact", head: true })
        .filter("qty_on_hand", "lt", "minimum_stok"),
      supabase
        .from("v_purchase_orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "waiting_approval"),
    ]);

    if (poError) {
      console.error("Current month PO error:", poError);
      throw poError;
    }

    const totalPOCount = currentMonthPOs?.length ?? 0;
    const prevPOCount = prevMonthPOs?.length ?? 0;
    const totalPOCountChange = prevPOCount > 0
      ? ((totalPOCount - prevPOCount) / prevPOCount) * 100
      : 0;

    const totalPOValue = currentMonthPOs?.reduce((sum, po) => sum + (po.total || 0), 0) ?? 0;
    const prevPOValue = prevMonthPOs?.reduce((sum, po) => sum + (po.total || 0), 0) ?? 0;
    const totalPOValueChange = prevPOValue > 0
      ? ((totalPOValue - prevPOValue) / prevPOValue) * 100
      : 0;

    // ── Action POs (Overdue & Pending) ────────────────────────────────────

    const { data: actionPOsData } = await supabase
      .from("v_purchase_orders")
      .select(`
        id,
        nomor_po,
        tanggal_po,
        tanggal_kirim_estimasi,
        status,
        nama_supplier
      `)
      .or("status.eq.sent,status.eq.waiting_approval")
      .order("tanggal_kirim_estimasi", { ascending: true, nullsFirst: false })
      .limit(10);

    const formattedActionPOs = actionPOsData?.map((po: any) => ({
      id: po.id,
      po_number: po.nomor_po,
      supplier_name: po.nama_supplier || "Unknown",
      order_date: po.tanggal_po,
      expected_date: po.tanggal_kirim_estimasi,
      status: po.status,
      days_overdue: po.tanggal_kirim_estimasi 
        ? Math.max(0, Math.floor((new Date().getTime() - new Date(po.tanggal_kirim_estimasi).getTime()) / (1000 * 60 * 60 * 24)))
        : 0,
    })) ?? [];

    // ── Stock Alerts ───────────────────────────────────────────────────────

    const [{ data: stockAlertsData }, { data: units }] = await Promise.all([
      supabase
        .from("raw_materials")
        .select("id, name, category, qty_on_hand, minimum_stok, unit_id")
        .filter("qty_on_hand", "lt", "minimum_stok")
        .order("qty_on_hand", { ascending: true })
        .limit(10),
      supabase.from("units").select("id, name"),
    ]);

    const unitMap = new Map(units?.map(u => [u.id, u.name]) || []);

    const formattedStockAlerts = stockAlertsData?.map((item: any) => ({
      id: item.id,
      material_name: item.name,
      category: item.category || "Uncategorized",
      qty_on_hand: item.qty_on_hand || 0,
      minimum_stok: item.minimum_stok || 0,
      unit: unitMap.get(item.unit_id) || "pcs",
      alert_level: item.qty_on_hand === 0 ? "critical" : "warning",
    })) ?? [];

    // ── Monthly Trends (simplified) ───────────────────────────────────────

    const { data: monthlyData } = await supabase
      .from("v_purchase_orders")
      .select("total, created_at, kategori")
      .order("created_at", { ascending: true })
      .limit(100);

    const monthlyTrends: Record<string, any>[] = [];
    if (monthlyData) {
      const months: Record<string, Record<string, number>> = {};
      monthlyData.forEach((po: any) => {
        const date = new Date(po.created_at);
        const monthKey = date.toLocaleString("id-ID", { month: "short" });
        const category = po.kategori || "Lainnya";
        
        if (!months[monthKey]) {
          months[monthKey] = { month: monthKey };
        }
        months[monthKey][category] = (months[monthKey][category] || 0) + (po.total || 0);
      });
      
      Object.values(months).forEach((data) => {
        monthlyTrends.push(data);
      });
    }

    // ── HPP Trends (simplified - empty for now) ───────────────────────────

    const formattedHPPTrends: any[] = [];

    // ── Supplier Performance (simplified) ─────────────────────────────────

    const { data: suppliersData } = await supabase
      .from("suppliers")
      .select("id, name")
      .limit(10);

    const formattedSupplierPerf = suppliersData?.map((supplier: any) => ({
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      on_time_rate: 85,
      qc_pass_rate: 95,
      total_deliveries: 0,
      avg_lead_time_days: 3,
    })) ?? [];

    return NextResponse.json({
      kpis: {
        totalPOCount,
        totalPOCountChange: Math.round(totalPOCountChange * 10) / 10,
        totalPOValue,
        totalPOValueChange: Math.round(totalPOValueChange * 10) / 10,
        lowStockCount,
        pendingApprovalCount,
      },
      monthlyTrends,
      actionPOs: formattedActionPOs,
      stockAlerts: formattedStockAlerts,
      hppTrends: formattedHPPTrends,
      supplierPerformance: formattedSupplierPerf,
    });
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    const errorMessage = error?.message || String(error);
    const errorDetails = error?.details || error?.hint || error?.code || '';
    return NextResponse.json(
      { 
        error: "Failed to fetch dashboard data", 
        message: errorMessage,
        details: errorDetails
      },
      { status: 500 }
    );
  }
}
