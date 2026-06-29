import { apiGet } from "@/lib/api-client";
import type {
  LogbookCurrentUser,
  LogbookDepartment,
  LogbookTemplate,
  LogbookEntry,
  LogbookSummaryRow,
  CreateLogbookTemplatePayload,
  CreateLogbookEntryPayload,
  UpdateLogbookEntryStatusPayload,
} from "./types";

const BASE = "/api/hris/logbook";

async function mutateLogbook(method: "POST" | "PATCH", body: Record<string, unknown>) {
  const res = await fetch(BASE, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || "Request failed");
  return json;
}

export const fetchLogbookMe = () =>
  apiGet<{ data: LogbookCurrentUser | null }>(`${BASE}?resource=me`).then((res) => res.data);

export const fetchLogbookDepartments = () =>
  apiGet<{ data: LogbookDepartment[] }>(`${BASE}?resource=departments`).then((res) => res.data);

export const fetchLogbookTemplates = () =>
  apiGet<{ data: LogbookTemplate[] }>(`${BASE}?resource=templates`).then((res) => res.data);

export const fetchLogbookEntries = () =>
  apiGet<{ data: LogbookEntry[] }>(`${BASE}?resource=entries`).then((res) => res.data);

export const fetchLogbookSummary = () =>
  apiGet<{ data: LogbookSummaryRow[] }>(`${BASE}?resource=summary`).then((res) => res.data);

export const createLogbookTemplate = (payload: CreateLogbookTemplatePayload) =>
  mutateLogbook("POST", { action: "create-template", ...payload });

export const createLogbookEntry = (payload: CreateLogbookEntryPayload) =>
  mutateLogbook("POST", { action: "create-entry", ...payload }) as Promise<{
    data?: { id?: string };
  }>;

export const toggleLogbookItem = (itemId: string, isChecked: boolean) =>
  mutateLogbook("PATCH", { action: "update-item", item_id: itemId, is_checked: isChecked });

export const updateLogbookEntryStatus = (payload: UpdateLogbookEntryStatusPayload) =>
  mutateLogbook("PATCH", payload as unknown as Record<string, unknown>);
