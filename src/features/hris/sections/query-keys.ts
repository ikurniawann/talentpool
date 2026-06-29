export const sectionsQueryKeys = {
  all: ["hris", "sections"] as const,
  staff: (brandFilter: string) =>
    ["hris", "sections", "staff", brandFilter] as const,
  sections: (brandFilter: string) =>
    ["hris", "sections", "list", brandFilter] as const,
  staffSections: () => ["hris", "sections", "staff-sections"] as const,
  brands: () => ["hris", "sections", "brands"] as const,
};
