import type { PerformanceReviewListParams } from "./types";

export const performanceQueryKeys = {
  all: ["hris", "performance"] as const,
  reviews: (params: PerformanceReviewListParams) =>
    ["hris", "performance", "reviews", params] as const,
  review: (id: string) => ["hris", "performance", "review", id] as const,
  employees: () => ["hris", "performance", "employees"] as const,
  templates: () => ["hris", "performance", "templates"] as const,
  templateDetail: (id: string) =>
    ["hris", "performance", "template-detail", id] as const,
  editData: (id: string) => ["hris", "performance", "edit-data", id] as const,
};
