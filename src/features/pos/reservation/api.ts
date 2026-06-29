import {
  createReservation,
  getCustomers,
  getPOSTables,
  getReservations,
  updateReservationStatus,
} from "@/lib/pos-api";
import type {
  CreateReservationPayload,
  ReservationCustomer,
  ReservationListParams,
  ReservationRow,
  ReservationStatus,
  ReservationTable,
} from "./types";

export type * from "./types";

export async function listReservations(params: ReservationListParams): Promise<ReservationRow[]> {
  const res = await getReservations({
    date: params.date,
    status: params.status && params.status !== "all" ? params.status : undefined,
  });
  if (!res.success) {
    throw new Error("Gagal memuat reservasi");
  }
  return (res.data ?? []) as ReservationRow[];
}

export async function listReservationCustomers(): Promise<ReservationCustomer[]> {
  const res = await getCustomers();
  if (!res.success) {
    throw new Error("Gagal memuat pelanggan");
  }
  return (res.data ?? []) as ReservationCustomer[];
}

export async function listReservationTables(): Promise<ReservationTable[]> {
  const res = await getPOSTables();
  if (!res.success) {
    throw new Error("Gagal memuat meja");
  }
  return (res.data ?? []) as ReservationTable[];
}

export async function saveReservation(payload: CreateReservationPayload): Promise<void> {
  const res = await createReservation({
    customer_name: payload.customer_name,
    customer_phone: payload.customer_phone,
    reservation_date: payload.reservation_date,
    time_slot: payload.time_slot,
    pax_count: payload.pax_count,
    table_id: payload.table_id || undefined,
    deposit_amount: payload.deposit_amount,
    notes: payload.notes || payload.special_requests,
  });
  if (!res.success) {
    throw new Error((res as { error?: string }).error || "Gagal menyimpan reservasi");
  }
}

export async function patchReservationStatus(id: string, status: ReservationStatus): Promise<void> {
  const res = await updateReservationStatus(id, status);
  if (!res.success) {
    throw new Error((res as { error?: string }).error || "Gagal update reservasi");
  }
}
