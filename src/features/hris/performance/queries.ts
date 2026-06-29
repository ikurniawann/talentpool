"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { performanceQueryKeys } from "./query-keys";
import {
  fetchPerformanceReviews,
  fetchPerformanceReview,
  fetchPerformanceEmployees,
  fetchPerformanceTemplates,
  fetchPerformanceTemplateDetail,
  fetchPerformanceReviewEditData,
} from "./api";
import type { PerformanceReviewListParams } from "./types";

export const usePerformanceReviews = (params: PerformanceReviewListParams) =>
  useQuery({
    queryKey: performanceQueryKeys.reviews(params),
    queryFn: () => fetchPerformanceReviews(params),
    placeholderData: keepPreviousData,
  });

export const usePerformanceReview = (id: string) =>
  useQuery({
    queryKey: performanceQueryKeys.review(id),
    queryFn: () => fetchPerformanceReview(id),
    enabled: !!id,
  });

export const usePerformanceEmployees = () =>
  useQuery({
    queryKey: performanceQueryKeys.employees(),
    queryFn: fetchPerformanceEmployees,
  });

export const usePerformanceTemplates = () =>
  useQuery({
    queryKey: performanceQueryKeys.templates(),
    queryFn: fetchPerformanceTemplates,
  });

export const usePerformanceTemplateDetail = (id: string) =>
  useQuery({
    queryKey: performanceQueryKeys.templateDetail(id),
    queryFn: () => fetchPerformanceTemplateDetail(id),
    enabled: !!id,
  });

export const usePerformanceReviewEditData = (id: string) =>
  useQuery({
    queryKey: performanceQueryKeys.editData(id),
    queryFn: () => fetchPerformanceReviewEditData(id),
    enabled: !!id,
  });
