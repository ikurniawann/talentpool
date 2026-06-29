import type {
  QCInspection,
  QCListParams,
  QCListResult,
} from "./types";
import { QCNotFoundError } from "./types";

export type {
  QCRecord,
  QCInspection,
  QCListParams,
  QCListResult,
} from "./types";
export { QCNotFoundError } from "./types";

export async function listQC(params: QCListParams = {}): Promise<QCListResult> {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.search) sp.set("search", params.search);

  const res = await fetch(`/api/purchasing/qc?${sp.toString()}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || json.error || `HTTP ${res.status}`);

  return {
    data: json.data || [],
    total: json.pagination?.total || 0,
  };
}

export async function getQC(id: string): Promise<QCInspection> {
  const res = await fetch(`/api/purchasing/qc/${id}`);
  if (!res.ok) {
    if (res.status === 404) throw new QCNotFoundError();
    throw new Error("Gagal memuat data QC");
  }
  const json = await res.json();
  return json.data;
}
