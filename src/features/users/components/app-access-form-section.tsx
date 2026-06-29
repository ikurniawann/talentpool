"use client";

import { useMemo } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import type { BusinessTree } from "@/features/configuration/business/types";
import {
  FormFieldLabel,
  formComboboxClassName,
  formInputClassName,
} from "@/components/layout/form-field";
import type { UserEmployeeFormValues } from "../types";
import {
  ADMIN_USER_ROLES,
  APPROVAL_LEVELS,
  APPROVAL_MODULES,
  ROLE_LABELS,
  emptyApprovalPermission,
  formatCurrency,
  levelLabel,
  moduleLabel,
  workflowLabel,
  workflowsForModule,
} from "../constants";
import type { UserRole } from "@/types";
import { BusinessScopePicker } from "./business-scope-picker";

interface AppAccessFormSectionProps {
  form: UserEmployeeFormValues;
  businessTree: BusinessTree;
  isEdit: boolean;
  onChange: (patch: Partial<UserEmployeeFormValues>) => void;
}

const ACCOUNT_STATUS_OPTIONS = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
];

export function AppAccessFormSection({
  form,
  businessTree,
  isEdit,
  onChange,
}: AppAccessFormSectionProps) {
  const roleOptions = useMemo(
    () => ADMIN_USER_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] })),
    []
  );
  const moduleOptions = useMemo(
    () => APPROVAL_MODULES.map((module) => ({ value: module.value, label: module.label })),
    []
  );
  const levelOptions = useMemo(
    () => APPROVAL_LEVELS.map((level) => ({ value: level.value, label: level.label })),
    []
  );

  function updatePermission(
    index: number,
    patch: Partial<UserEmployeeFormValues["approval_permissions"][number]>
  ) {
    onChange({
      approval_permissions: form.approval_permissions.map((permission, itemIndex) => {
        if (itemIndex !== index) return permission;
        const next = { ...permission, ...patch };
        if (patch.module && patch.module !== permission.module) {
          next.workflow = workflowsForModule(patch.module)[0]?.value ?? "";
        }
        return next;
      }),
    });
  }

  function handleRoleChange(value: string) {
    const role = value as UserRole;
    if (role === "super_admin") {
      onChange({
        role,
        business_scope: "",
        holding_id: "",
        company_id: "",
        branch_id: "",
      });
      return;
    }
    onChange({ role });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-lg border border-gray-200/70 bg-gray-50/50 p-4">
        <Checkbox
          id="is_access_app"
          checked={form.is_access_app}
          onCheckedChange={(checked) => onChange({ is_access_app: checked === true })}
        />
        <div>
          <label
            htmlFor="is_access_app"
            className="cursor-pointer text-sm font-semibold text-gray-900"
          >
            Aktifkan akses login Arkiv
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Karyawan dapat masuk ke sistem dengan role dan scope data yang ditentukan.
          </p>
        </div>
      </div>

      {form.is_access_app ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {!isEdit ? (
              <div>
                <FormFieldLabel required>Password sementara</FormFieldLabel>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => onChange({ password: e.target.value })}
                  placeholder="Minimal 8 karakter"
                  className={formInputClassName}
                />
              </div>
            ) : (
              <div>
                <FormFieldLabel>Password baru (opsional)</FormFieldLabel>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => onChange({ password: e.target.value })}
                  placeholder="Kosongkan jika tidak diubah"
                  className={formInputClassName}
                />
              </div>
            )}
            <div>
              <FormFieldLabel required>Role</FormFieldLabel>
              <Combobox
                options={roleOptions}
                value={form.role}
                onChange={handleRoleChange}
                placeholder="Pilih role"
                searchPlaceholder="Cari role..."
                emptyMessage="Role tidak ditemukan"
                className={formComboboxClassName}
              />
            </div>
            <div>
              <FormFieldLabel>Status akun</FormFieldLabel>
              <Combobox
                options={ACCOUNT_STATUS_OPTIONS}
                value={form.account_status}
                onChange={(value) =>
                  onChange({ account_status: value as "active" | "inactive" })
                }
                placeholder="Pilih status"
                searchPlaceholder="Cari status..."
                emptyMessage="Status tidak ditemukan"
                className={formComboboxClassName}
              />
            </div>
          </div>

          <BusinessScopePicker form={form} tree={businessTree} onChange={onChange} />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Approval Authority</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-lg border-gray-200/80"
                onClick={() =>
                  onChange({
                    approval_permissions: [
                      ...form.approval_permissions,
                      { ...emptyApprovalPermission },
                    ],
                  })
                }
              >
                <PlusIcon className="h-4 w-4" />
                Tambah
              </Button>
            </div>

            {form.approval_permissions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200/70 py-6 text-center text-xs text-gray-400">
                Belum ada hak approval
              </p>
            ) : (
              <div className="space-y-2">
                {form.approval_permissions.map((permission, index) => {
                  const workflowOptions = workflowsForModule(permission.module).map((workflow) => ({
                    value: workflow.value,
                    label: workflow.label,
                  }));

                  return (
                    <div
                      key={index}
                      className="rounded-lg border border-gray-200/70 bg-white p-3"
                    >
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                        <Combobox
                          options={moduleOptions}
                          value={permission.module}
                          onChange={(value) => updatePermission(index, { module: value })}
                          placeholder="Module"
                          searchPlaceholder="Cari module..."
                          emptyMessage="Module tidak ditemukan"
                          className={formComboboxClassName}
                        />
                        <Combobox
                          options={workflowOptions}
                          value={permission.workflow}
                          onChange={(value) => updatePermission(index, { workflow: value })}
                          placeholder="Workflow"
                          searchPlaceholder="Cari workflow..."
                          emptyMessage="Workflow tidak ditemukan"
                          className={formComboboxClassName}
                        />
                        <Combobox
                          options={levelOptions}
                          value={permission.approval_level}
                          onChange={(value) =>
                            updatePermission(index, {
                              approval_level: value as typeof permission.approval_level,
                            })
                          }
                          placeholder="Level"
                          searchPlaceholder="Cari level..."
                          emptyMessage="Level tidak ditemukan"
                          className={formComboboxClassName}
                        />
                        <Input
                          type="number"
                          min="0"
                          placeholder="Limit nominal"
                          value={permission.approval_limit ?? ""}
                          onChange={(e) =>
                            updatePermission(index, {
                              approval_limit:
                                e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                          className={formInputClassName}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            onChange({
                              approval_permissions: form.approval_permissions.filter(
                                (_, itemIndex) => itemIndex !== index
                              ),
                            })
                          }
                          className="h-10 w-10 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {moduleLabel(permission.module)} / {workflowLabel(permission.workflow)} /{" "}
                        {levelLabel(permission.approval_level)} /{" "}
                        {formatCurrency(permission.approval_limit)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
