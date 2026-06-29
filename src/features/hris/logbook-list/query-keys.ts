import type { LogbookEntriesParams } from "./types";

export const logbookListQueryKeys = {
  all: ["hris", "logbook-list"] as const,
  me: () => ["hris", "logbook-list", "me"] as const,
  departments: () => ["hris", "logbook-list", "departments"] as const,
  entries: (params?: LogbookEntriesParams) =>
    ["hris", "logbook-list", "entries", params ?? {}] as const,
};
