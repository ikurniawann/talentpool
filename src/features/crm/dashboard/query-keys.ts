export const dashboardQueryKeys = {
  all: ["crm", "dashboard"] as const,
  summary: () => ["crm", "dashboard", "summary"] as const,
  xpConfig: () => ["crm", "dashboard", "xp-config"] as const,
  tierConfig: () => ["crm", "dashboard", "tier-config"] as const,
};
