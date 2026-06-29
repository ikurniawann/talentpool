export const kpiTemplatesQueryKeys = {
  all: ["hris", "kpi-templates"] as const,
  list: () => ["hris", "kpi-templates", "list"] as const,
  detail: (id: string) => ["hris", "kpi-templates", "detail", id] as const,
};
