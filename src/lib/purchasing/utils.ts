import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Generate nomor PR dengan format: PR-YYYY-NNNNN
 * Contoh: PR-2024-00001
 */
export async function generatePRNumber(
  supabase: SupabaseClient
): Promise<string> {
  const year = new Date().getFullYear();
  
  // Cari PR terakhir di tahun ini
  const { data: lastPR } = await supabase
    .from("purchase_requests")
    .select("pr_number")
    .ilike("pr_number", `PR-${year}-%`)
    .order("pr_number", { ascending: false })
    .limit(1);
  
  let sequence = 1;
  if (lastPR && lastPR.length > 0) {
    const lastNum = parseInt(lastPR[0].pr_number.split("-")[2]);
    sequence = lastNum + 1;
  }
  
  return `PR-${year}-${String(sequence).padStart(5, "0")}`;
}

/**
 * Generate nomor PO dengan format: PO-YYYY-NNNNN
 */
export async function generatePONumber(
  supabase: SupabaseClient
): Promise<string> {
  const year = new Date().getFullYear();
  
  const { data: lastPO } = await supabase
    .from("purchase_orders")
    .select("po_number")
    .ilike("po_number", `PO-${year}-%`)
    .order("po_number", { ascending: false })
    .limit(1);
  
  let sequence = 1;
  if (lastPO && lastPO.length > 0) {
    const lastNum = parseInt(lastPO[0].po_number.split("-")[2]);
    sequence = lastNum + 1;
  }
  
  return `PO-${year}-${String(sequence).padStart(5, "0")}`;
}

/**
 * Generate nomor Vendor dengan format: V-YYYY-NNNN
 */
export async function generateVendorCode(
  supabase: SupabaseClient
): Promise<string> {
  const year = new Date().getFullYear();
  
  const { data: lastVendor } = await supabase
    .from("vendors")
    .select("code")
    .ilike("code", `V-${year}-%`)
    .order("code", { ascending: false })
    .limit(1);
  
  let sequence = 1;
  if (lastVendor && lastVendor.length > 0) {
    const lastNum = parseInt(lastVendor[0].code.split("-")[2]);
    sequence = lastNum + 1;
  }
  
  return `V-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Format currency to Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date to Indonesian format
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Get approval threshold based on amount
 * Returns the required approval level
 */
export function getRequiredApprovalLevel(
  amount: number
): { level: string | null; minAmount: number } {
  // Thresholds (sesuaikan dengan kebutuhan)
  const THRESHOLD_HEAD = 5_000_000;      // > 5jt butuh approval Head Dept
  const THRESHOLD_FINANCE = 20_000_000;  // > 20jt butuh approval Finance
  const THRESHOLD_DIREKSI = 50_000_000;  // > 50jt butuh approval Direksi
  
  if (amount >= THRESHOLD_DIREKSI) {
    return { level: "direksi", minAmount: THRESHOLD_DIREKSI };
  }
  if (amount >= THRESHOLD_FINANCE) {
    return { level: "finance", minAmount: THRESHOLD_FINANCE };
  }
  if (amount >= THRESHOLD_HEAD) {
    return { level: "head_dept", minAmount: THRESHOLD_HEAD };
  }
  
  return { level: null, minAmount: 0 }; // Auto-approved untuk amount kecil
}

/**
 * Get next status after approval
 */
export function getNextPRStatus(
  currentStatus: string,
  amount: number
): string {
  const thresholds = getRequiredApprovalLevel(amount);
  
  switch (currentStatus) {
    case "draft":
      return thresholds.level === "head_dept" ? "pending_head" : 
             thresholds.level === "finance" ? "pending_finance" : 
             thresholds.level === "direksi" ? "pending_direksi" : "approved";
    case "pending_head":
      return thresholds.level === "finance" ? "pending_finance" : 
             thresholds.level === "direksi" ? "pending_direksi" : "approved";
    case "pending_finance":
      return thresholds.level === "direksi" ? "pending_direksi" : "approved";
    case "pending_direksi":
      return "approved";
    default:
      return currentStatus;
  }
}

/**
 * Status label mapper
 */
export function getPRStatusLabel(status: string): { label: string; color: string } {
  const labels: Record<string, { label: string; color: string }> = {
    draft: { label: "Draft", color: "bg-gray-100 text-gray-700" },
    pending_head: { label: "Pending Head Dept", color: "bg-yellow-100 text-yellow-700" },
    pending_finance: { label: "Pending Finance", color: "bg-orange-100 text-orange-700" },
    pending_direksi: { label: "Pending Direksi", color: "bg-red-100 text-red-700" },
    approved: { label: "Approved", color: "bg-green-100 text-green-700" },
    rejected: { label: "Ditolak", color: "bg-red-200 text-red-800" },
    converted: { label: "PO Dibuat", color: "bg-blue-100 text-blue-700" },
  };
  
  return labels[status] || { label: status, color: "bg-gray-100 text-gray-700" };
}

export function getPOStatusLabel(status: string): { label: string; color: string } {
  const labels: Record<string, { label: string; color: string }> = {
    draft: { label: "Draft", color: "bg-gray-100 text-gray-700" },
    sent: { label: "Terkirim", color: "bg-blue-100 text-blue-700" },
    partial: { label: "Partial", color: "bg-yellow-100 text-yellow-700" },
    received: { label: "Diterima", color: "bg-green-100 text-green-700" },
    closed: { label: "Selesai", color: "bg-gray-200 text-gray-800" },
    cancelled: { label: "Dibatalkan", color: "bg-red-100 text-red-700" },
  };
  
  return labels[status] || { label: status, color: "bg-gray-100 text-gray-700" };
}

/**
 * Priority badge mapper
 */
export function getPriorityBadge(priority: string): { label: string; color: string } {
  const badges: Record<string, { label: string; color: string }> = {
    low: { label: "Rendah", color: "bg-gray-100 text-gray-700" },
    medium: { label: "Sedang", color: "bg-blue-100 text-blue-700" },
    high: { label: "Tinggi", color: "bg-orange-100 text-orange-700" },
    urgent: { label: "Mendesak", color: "bg-red-100 text-red-700" },
  };
  
  return badges[priority] || { label: priority, color: "bg-gray-100 text-gray-700" };
}
