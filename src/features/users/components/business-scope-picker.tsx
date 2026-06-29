"use client";

import { useMemo } from "react";
import { Combobox } from "@/components/ui/combobox";
import type { BusinessTree } from "@/features/configuration/business/types";
import { FormFieldLabel, formComboboxClassName } from "@/components/layout/form-field";
import {
  BUSINESS_SCOPE_DESCRIPTIONS,
  BUSINESS_SCOPE_LABELS,
  type BusinessScopeLevel,
} from "@/lib/configuration/business-scope";
import type { UserEmployeeFormValues } from "../types";

interface BusinessScopePickerProps {
  form: Pick<
    UserEmployeeFormValues,
    "business_scope" | "holding_id" | "company_id" | "branch_id" | "role"
  >;
  tree: BusinessTree;
  onChange: (patch: Partial<UserEmployeeFormValues>) => void;
}

const SCOPE_OPTIONS = [
  { value: "holding", label: BUSINESS_SCOPE_LABELS.holding },
  { value: "company", label: BUSINESS_SCOPE_LABELS.company },
  { value: "branch", label: BUSINESS_SCOPE_LABELS.branch },
];

export function BusinessScopePicker({ form, tree, onChange }: BusinessScopePickerProps) {
  const isSuperAdmin = form.role === "super_admin";

  const holdings = tree.holdings;
  const companies =
    holdings.find((h) => h.id === form.holding_id)?.companies ?? [];
  const branches =
    companies.find((c) => c.id === form.company_id)?.branches ?? [];

  const holdingOptions = useMemo(
    () => holdings.map((holding) => ({ value: holding.id, label: holding.name })),
    [holdings]
  );
  const companyOptions = useMemo(
    () => companies.map((company) => ({ value: company.id, label: company.name })),
    [companies]
  );
  const branchOptions = useMemo(
    () => branches.map((branch) => ({ value: branch.id, label: branch.name })),
    [branches]
  );

  function handleScopeChange(value: string) {
    const scope = value as BusinessScopeLevel;
    onChange({
      business_scope: scope,
      holding_id: "",
      company_id: "",
      branch_id: "",
    });
  }

  function handleHoldingChange(value: string) {
    onChange({
      holding_id: value,
      company_id: "",
      branch_id: "",
    });
  }

  function handleCompanyChange(value: string) {
    onChange({
      company_id: value,
      branch_id: "",
    });
  }

  if (isSuperAdmin) {
    return (
      <div className="rounded-lg border border-gray-200/70 bg-gray-50/50 p-4">
        <p className="text-sm font-medium text-gray-900">Scope Akses Data</p>
        <p className="mt-1 text-xs text-gray-500">
          Super Admin memiliki akses penuh ke seluruh holding, company, dan branch.
        </p>
      </div>
    );
  }

  const scope = form.business_scope as BusinessScopeLevel | "";

  return (
    <div className="space-y-4 rounded-lg border border-gray-200/70 bg-gray-50/50 p-4">
      <div>
        <FormFieldLabel required>Scope Akses Data</FormFieldLabel>
        <Combobox
          options={SCOPE_OPTIONS}
          value={scope || ""}
          onChange={handleScopeChange}
          placeholder="Pilih scope"
          searchPlaceholder="Cari scope..."
          emptyMessage="Scope tidak ditemukan"
          className={formComboboxClassName}
        />
        {scope ? (
          <p className="mt-1.5 text-xs text-gray-500">
            {BUSINESS_SCOPE_DESCRIPTIONS[scope]}
          </p>
        ) : null}
      </div>

      {scope ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <FormFieldLabel required>Holding</FormFieldLabel>
            <Combobox
              options={holdingOptions}
              value={form.holding_id || ""}
              onChange={handleHoldingChange}
              placeholder="Pilih holding"
              searchPlaceholder="Cari holding..."
              emptyMessage="Holding tidak ditemukan"
              className={formComboboxClassName}
            />
          </div>

          {scope === "company" || scope === "branch" ? (
            <div>
              <FormFieldLabel required>Company</FormFieldLabel>
              <Combobox
                options={companyOptions}
                value={form.company_id || ""}
                onChange={handleCompanyChange}
                placeholder="Pilih company"
                searchPlaceholder="Cari company..."
                emptyMessage="Company tidak ditemukan"
                disabled={!form.holding_id}
                className={formComboboxClassName}
              />
            </div>
          ) : null}

          {scope === "branch" ? (
            <div>
              <FormFieldLabel required>Branch</FormFieldLabel>
              <Combobox
                options={branchOptions}
                value={form.branch_id || ""}
                onChange={(value) => onChange({ branch_id: value })}
                placeholder="Pilih branch"
                searchPlaceholder="Cari branch..."
                emptyMessage="Branch tidak ditemukan"
                disabled={!form.company_id}
                className={formComboboxClassName}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
