"use client";

import { useQuery } from "@tanstack/react-query";
import { sectionsQueryKeys } from "./query-keys";
import {
  fetchSectionStaff,
  fetchSections,
  fetchStaffSections,
  fetchSectionBrands,
} from "./api";

export const useSectionStaff = (brandFilter: string) =>
  useQuery({
    queryKey: sectionsQueryKeys.staff(brandFilter),
    queryFn: () => fetchSectionStaff(brandFilter),
  });

export const useSectionsList = (brandFilter: string) =>
  useQuery({
    queryKey: sectionsQueryKeys.sections(brandFilter),
    queryFn: () => fetchSections(brandFilter),
  });

export const useStaffSections = () =>
  useQuery({
    queryKey: sectionsQueryKeys.staffSections(),
    queryFn: fetchStaffSections,
  });

export const useSectionBrands = () =>
  useQuery({
    queryKey: sectionsQueryKeys.brands(),
    queryFn: fetchSectionBrands,
  });
