import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import type {
  KpiTemplateListItem,
  KpiTemplateDetail,
  KpiTemplatePayload,
} from "./types";

export const fetchKpiTemplates = () =>
  apiGet<{ data: KpiTemplateListItem[] }>("/api/hris/kpi-templates").then(
    (res) => res.data || []
  );

export const fetchKpiTemplate = (id: string) =>
  apiGet<{ data: KpiTemplateDetail }>(`/api/hris/kpi-templates/${id}`).then(
    (res) => res.data
  );

export const createKpiTemplate = (payload: KpiTemplatePayload) =>
  apiPost<{ data: KpiTemplateDetail }>("/api/hris/kpi-templates", payload);

export const updateKpiTemplate = (id: string, payload: KpiTemplatePayload) =>
  apiPut<{ data: KpiTemplateDetail }>(`/api/hris/kpi-templates/${id}`, payload);

export const deleteKpiTemplate = (id: string) =>
  apiDelete(`/api/hris/kpi-templates/${id}`);
