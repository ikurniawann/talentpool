"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getProfitReport } from "./api";
import { reportsQueryKeys } from "./query-keys";
import type { ProfitReportParams } from "./types";

export const useProfitReport = (params: ProfitReportParams) =>
  useQuery({
    queryKey: reportsQueryKeys.profit(params),
    queryFn: () => getProfitReport(params),
    placeholderData: keepPreviousData,
    enabled: Boolean(params.date_from && params.date_to),
  });
