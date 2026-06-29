"use client";

import { useQuery } from "@tanstack/react-query";
import { schedulesQueryKeys } from "./query-keys";
import {
  fetchScheduleStaff,
  fetchStaffSchedules,
  fetchScheduleBrands,
} from "./api";

export const useScheduleStaff = (brandFilter: string) =>
  useQuery({
    queryKey: schedulesQueryKeys.staff(brandFilter),
    queryFn: () => fetchScheduleStaff(brandFilter),
  });

export const useStaffSchedules = () =>
  useQuery({
    queryKey: schedulesQueryKeys.staffSchedules(),
    queryFn: fetchStaffSchedules,
  });

export const useScheduleBrands = () =>
  useQuery({
    queryKey: schedulesQueryKeys.brands(),
    queryFn: fetchScheduleBrands,
  });
