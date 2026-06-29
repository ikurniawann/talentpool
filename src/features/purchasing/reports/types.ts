export interface SupplierPerfRow {
  id: string;
  supplier_name?: string;
  no_po?: string;
  total_po?: number;
  on_time_count?: number;
  late_count?: number;
  reject_rate?: number;
  avg_lead_time_days?: number;
  total_value?: number;
  rating?: number;
}

export interface HPPRow {
  id: string;
  product_code?: string;
  product_name?: string;
  category?: string;
  qty_produced?: number;
  raw_material_cost?: number;
  labor_cost?: number;
  overhead_cost?: number;
  hpp_per_unit?: number;
  period?: string;
}

export interface POSummary {
  po_number: string;
  vendor: string;
  vendor_code: string;
  status: string;
  tanggal_po: string;
  tanggal_diterima?: string;
  total_amount: number;
  total_amount_formatted: string;
  mata_uang: string;
  item_count: number;
  created_by: string;
}

export interface StatusSummary {
  status: string;
  count: number;
  total: number;
  total_formatted: string;
}

export interface POSummaryResult {
  summary: POSummary[];
  byStatus: StatusSummary[];
  grandTotal: number;
}

export interface POSummaryParams {
  date_from?: string;
  date_to?: string;
  status?: string;
  vendor_id?: string;
}

export interface PODetailParams {
  date_from?: string;
  date_to?: string;
  status?: string;
  vendor_id?: string;
}

export type StockMovementType =
  | "all"
  | "in"
  | "out"
  | "adjustment"
  | "transfer"
  | "return";

export interface StockMaterial {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  satuan: string;
  lokasi_rak: string;
  qty_onhand: number;
  avg_cost: number;
  min_stock: number;
  max_stock: number | null;
  status_stok: string;
}

export interface StockMovement {
  id: string;
  raw_material_id: string;
  material_kode: string;
  material_nama: string;
  material_kategori: string;
  tipe: Exclude<StockMovementType, "all">;
  jumlah: number;
  qty_before: number;
  qty_after: number;
  unit_cost: number;
  total_cost: number;
  reference_type: string;
  reference_number: string;
  alasan: string;
  catatan: string;
  created_at: string | null;
}

export interface StockCardSummary {
  opening_balance: number;
  closing_balance: number;
  total_in: number;
  total_out: number;
  total_adjustment_in: number;
  total_adjustment_out: number;
  total_return: number;
  total_transfer: number;
  total_value: number;
  movement_count: number;
}

export interface StockCardResponse {
  materials: StockMaterial[];
  selected_material: StockMaterial | null;
  movements: StockMovement[];
  summary: StockCardSummary;
}

export interface StockCardParams {
  material_id?: string;
  search?: string;
  tipe?: Exclude<StockMovementType, "all">;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

export interface InventoryApiRow {
  id?: string;
  raw_material_id?: string;
  kode?: string;
  nama?: string;
  kategori?: string;
  lokasi_rak?: string;
  qty_onhand?: number;
  min_stock?: number;
  stok_minimum?: number;
  max_stock?: number | null;
  stok_maximum?: number | null;
  avg_cost?: number;
  unit_cost?: number;
  satuan?: string;
  satuan_besar_nama?: string;
}

export interface InventoryValuationParams {
  date_from?: string;
  date_to?: string;
}

export type PoSummaryExportFormat = "csv" | "json";

export interface PoSummaryExportResult {
  blob: Blob;
  extension: PoSummaryExportFormat;
}
