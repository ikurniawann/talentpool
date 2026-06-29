"use client";

import { useQuery } from "@tanstack/react-query";
import { getCrmDashboard, getTierConfig, getXpConfig } from "./api";
import { dashboardQueryKeys } from "./query-keys";

export const useCrmDashboard = () =>
  useQuery({
    queryKey: dashboardQueryKeys.summary(),
    queryFn: getCrmDashboard,
  });

export const useCrmXpConfig = () =>
  useQuery({
    queryKey: dashboardQueryKeys.xpConfig(),
    queryFn: getXpConfig,
  });

export const useCrmTierConfig = () =>
  useQuery({
    queryKey: dashboardQueryKeys.tierConfig(),
    queryFn: getTierConfig,
  });
