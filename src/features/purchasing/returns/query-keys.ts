import type { ReturnListParams } from "@/types/purchasing";

export const returnsQueryKeys = {
  all: ["purchasing", "returns"] as const,
  list: (params: ReturnListParams) =>
    ["purchasing", "returns", "list", params] as const,
  detail: (id: string) => ["purchasing", "returns", "detail", id] as const,
  formData: (grnId?: string | null) =>
    ["purchasing", "returns", "form-data", grnId ?? null] as const,
};
