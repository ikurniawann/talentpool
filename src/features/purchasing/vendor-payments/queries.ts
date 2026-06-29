"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { listVendorPayments } from "./api";
import { vendorPaymentsQueryKeys } from "./query-keys";
import type { VendorPaymentListParams } from "./types";

export const useVendorPaymentList = (params: VendorPaymentListParams) =>
  useQuery({
    queryKey: vendorPaymentsQueryKeys.list(params),
    queryFn: () => listVendorPayments(params),
    placeholderData: keepPreviousData,
  });
