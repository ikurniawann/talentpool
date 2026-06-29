"use client";

import { useQuery } from "@tanstack/react-query";
import { listTopupCustomers } from "./api";
import { topupQueryKeys } from "./query-keys";
import type { CustomerListParams } from "./types";

export const useTopupCustomers = (params: CustomerListParams = {}) =>
  useQuery({
    queryKey: topupQueryKeys.customers(params),
    queryFn: () => listTopupCustomers(params),
  });
