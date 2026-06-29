export const logbookQueryKeys = {
  all: ["hris", "logbook"] as const,
  me: () => ["hris", "logbook", "me"] as const,
  departments: () => ["hris", "logbook", "departments"] as const,
  templates: () => ["hris", "logbook", "templates"] as const,
  entries: () => ["hris", "logbook", "entries"] as const,
  summary: () => ["hris", "logbook", "summary"] as const,
};
