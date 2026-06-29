export const schedulesQueryKeys = {
  all: ["hris", "schedules"] as const,
  staff: (brandFilter: string) =>
    ["hris", "schedules", "staff", brandFilter] as const,
  staffSchedules: () => ["hris", "schedules", "staff-schedules"] as const,
  brands: () => ["hris", "schedules", "brands"] as const,
};
