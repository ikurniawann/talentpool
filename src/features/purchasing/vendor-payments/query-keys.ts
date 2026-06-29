import type { VendorPaymentListParams } from "./types";

export const vendorPaymentsQueryKeys = {
  all: ["purchasing", "vendor-payments"] as const,
  list: (params: VendorPaymentListParams) =>
    ["purchasing", "vendor-payments", "list", params] as const,
};
