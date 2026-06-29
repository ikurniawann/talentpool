import { buildListUrl, apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import type {
  PerformanceReviewListItem,
  PerformanceReviewListParams,
  PerformanceReviewDetail,
  PerformanceReviewPayload,
  PerformanceEmployee,
  PerformanceTemplate,
  PerformanceReviewEditData,
} from "./types";

export const fetchPerformanceReviews = (params: PerformanceReviewListParams) =>
  apiGet<{ data: PerformanceReviewListItem[] }>(
    buildListUrl("/api/hris/performance/reviews", {
      period_label: params.period_label,
      status: params.status,
      limit: params.limit ?? 50,
    })
  ).then((res) => res.data || []);

export const fetchPerformanceReview = (id: string) =>
  apiGet<{ data: PerformanceReviewDetail }>(
    `/api/hris/performance/reviews/${id}`
  ).then((res) => res.data);

export const deletePerformanceReview = (id: string) =>
  apiDelete(`/api/hris/performance/reviews?id=${id}`);

export const createPerformanceReview = (payload: PerformanceReviewPayload) =>
  apiPost<{ data: PerformanceReviewDetail }>("/api/hris/performance/reviews", payload);

export const updatePerformanceReview = (id: string, payload: PerformanceReviewPayload) =>
  apiPut<{ data: PerformanceReviewDetail }>(`/api/hris/performance/reviews/${id}`, payload);

export const fetchPerformanceEmployees = () =>
  apiGet<{ data: PerformanceEmployee[] }>(
    "/api/hris/employees?limit=100&status=active"
  ).then((res) => res.data || []);

export const fetchPerformanceTemplates = () =>
  apiGet<{ data: PerformanceTemplate[] }>("/api/hris/kpi-templates?limit=100").then(
    (res) => (res.data || []).filter((template: PerformanceTemplate) => template.status !== "archived")
  );

export const fetchPerformanceTemplateDetail = (id: string) =>
  apiGet<{ data: PerformanceTemplate }>(`/api/hris/kpi-templates/${id}`).then(
    (res) => res.data
  );

export async function fetchPerformanceReviewEditData(
  id: string
): Promise<PerformanceReviewEditData> {
  const reviewRes = await apiGet<{ data: PerformanceReviewDetail }>(
    `/api/hris/performance/reviews/${id}`
  );
  const review = reviewRes.data;

  const [kpisRes, behavioralRes, developmentsRes, employeesRes] = await Promise.all([
    apiGet<{ data: unknown[] }>(
      `/api/hris/performance/employee-kpis?employee_id=${review.employee_id}&period_label=${review.period_label}`
    ).catch(() => ({ data: [] })),
    apiGet<{ data: unknown }>(
      `/api/hris/performance/behavioral?employee_id=${review.employee_id}&review_period=${review.period_label}`
    ).catch(() => ({ data: null })),
    apiGet<{ data: unknown[] }>(
      `/api/hris/performance/development-plans?employee_id=${review.employee_id}&review_period=${review.period_label}`
    ).catch(() => ({ data: [] })),
    apiGet<{ data: PerformanceEmployee[] }>(
      "/api/hris/employees?limit=100&status=active"
    ).catch(() => ({ data: [] })),
  ]);

  return {
    review,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kpis: (kpisRes.data as any[]) || [],
    behavioral: behavioralRes.data ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    developments: (developmentsRes.data as any[]) || [],
    employees: employeesRes.data || [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const upsertEmployeeKpi = (row: Record<string, any>) =>
  row.id
    ? apiPut("/api/hris/performance/employee-kpis", row)
    : apiPost("/api/hris/performance/employee-kpis", row);

export async function savePerformanceReviewEdit(args: {
  reviewId: string;
  reviewPayload: PerformanceReviewPayload;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kpiRows: Record<string, any>[];
}) {
  await updatePerformanceReview(args.reviewId, args.reviewPayload);
  for (const row of args.kpiRows) {
    await upsertEmployeeKpi(row);
  }
}
