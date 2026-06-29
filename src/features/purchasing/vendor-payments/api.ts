import type { VendorPaymentListParams, VendorPaymentRow } from "./types";

export type * from "./types";

export async function listVendorPayments(
  params: VendorPaymentListParams = {}
): Promise<VendorPaymentRow[]> {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  const response = await fetch(`/api/purchasing/vendor-payments?${sp.toString()}`);
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || "Gagal memuat pembayaran vendor");
  }
  return result.data || [];
}
