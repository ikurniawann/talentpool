import { buildListUrl, apiGet } from "@/lib/api-client";
import type {
  LogbookCurrentUser,
  LogbookDepartment,
  LogbookEntry,
  LogbookEntriesParams,
  UpdateLogbookItemPayload,
} from "./types";

const BASE = "/api/hris/logbook";

async function patchLogbook(body: Record<string, unknown>) {
  const res = await fetch(BASE, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || "Request failed");
  return json;
}

export const fetchLogbookMe = () =>
  apiGet<{ data: LogbookCurrentUser | null }>(`${BASE}?resource=me`).then(
    (res) => res.data
  );

export const fetchLogbookDepartments = () =>
  apiGet<{ data: LogbookDepartment[] }>(`${BASE}?resource=departments`).then(
    (res) => res.data
  );

export const fetchLogbookEntries = (params?: LogbookEntriesParams) =>
  apiGet<{ data: LogbookEntry[] }>(
    buildListUrl(BASE, { resource: "entries", ...(params ?? {}) })
  ).then((res) => res.data);

export const updateLogbookItem = (payload: UpdateLogbookItemPayload) =>
  patchLogbook({ action: "update-item", ...payload });

export const submitLogbookEntry = (entryId: string) =>
  patchLogbook({ action: "submit-entry", entry_id: entryId });
