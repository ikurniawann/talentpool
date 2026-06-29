export type BusinessScopeLevel = "holding" | "company" | "branch";

export interface BusinessScopeInput {
  business_scope?: BusinessScopeLevel | null;
  holding_id?: string | null;
  company_id?: string | null;
  branch_id?: string | null;
}

export const BUSINESS_SCOPE_LABELS: Record<BusinessScopeLevel, string> = {
  holding: "Holding",
  company: "Company",
  branch: "Branch",
};

export const BUSINESS_SCOPE_DESCRIPTIONS: Record<BusinessScopeLevel, string> = {
  holding: "Dapat melihat semua company dan branch di holding yang dipilih.",
  company: "Hanya dapat melihat branch di company yang dipilih.",
  branch: "Hanya dapat melihat data branch yang dipilih.",
};

export function normalizeBusinessScopePayload(
  scope: BusinessScopeLevel | null | undefined,
  holdingId?: string | null,
  companyId?: string | null,
  branchId?: string | null
): BusinessScopeInput {
  if (!scope) {
    return {
      business_scope: null,
      holding_id: null,
      company_id: null,
      branch_id: null,
    };
  }

  if (scope === "holding") {
    return {
      business_scope: "holding",
      holding_id: holdingId ?? null,
      company_id: null,
      branch_id: null,
    };
  }

  if (scope === "company") {
    return {
      business_scope: "company",
      holding_id: holdingId ?? null,
      company_id: companyId ?? null,
      branch_id: null,
    };
  }

  return {
    business_scope: "branch",
    holding_id: holdingId ?? null,
    company_id: companyId ?? null,
    branch_id: branchId ?? null,
  };
}

export function validateBusinessScope(
  role: string | undefined,
  isAccessApp: boolean,
  input: BusinessScopeInput
): string | null {
  if (!isAccessApp) return null;
  if (!role || role === "super_admin") return null;

  if (!input.business_scope) {
    return "Scope akses data wajib dipilih untuk role ini";
  }

  if (input.business_scope === "holding" && !input.holding_id) {
    return "Holding wajib dipilih";
  }

  if (input.business_scope === "company") {
    if (!input.holding_id || !input.company_id) {
      return "Holding dan company wajib dipilih";
    }
  }

  if (input.business_scope === "branch") {
    if (!input.holding_id || !input.company_id || !input.branch_id) {
      return "Holding, company, dan branch wajib dipilih";
    }
  }

  return null;
}
