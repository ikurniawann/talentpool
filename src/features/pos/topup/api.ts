import { getCustomers, processTopup } from "@/lib/pos-api";
import type {
  CustomerListParams,
  ProcessTopupPayload,
  TopupCustomer,
  TopupResult,
} from "./types";

export type * from "./types";

export async function listTopupCustomers(params: CustomerListParams = {}): Promise<TopupCustomer[]> {
  const res = await getCustomers(params);
  if (!res.success) {
    throw new Error("Gagal memuat pelanggan");
  }
  return (res.data ?? []) as TopupCustomer[];
}

export async function submitTopup(payload: ProcessTopupPayload): Promise<TopupResult> {
  const res = await processTopup({
    customer_id: payload.customer_id,
    amount: payload.amount,
    payment_method: payload.payment_method as "qris" | "credit_card" | "cash",
  });
  if (!res.success || !res.data) {
    throw new Error((res as { error?: string }).error || "Topup gagal");
  }
  return res.data as TopupResult;
}
