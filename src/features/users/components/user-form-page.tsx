"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BanknotesIcon,
  BriefcaseIcon,
  PhoneIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { FormPageBody, FormPageFooter, FormPageLayout, FormPageLoading } from "@/components/layout/form-page-layout";
import {
  FormFieldLabel,
  formComboboxClassName,
  formInputClassName,
} from "@/components/layout/form-field";
import { FormSectionCard } from "@/components/layout/form-section-card";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { ToastContainer, useToast } from "@/components/ui/toast";
import { useBusinessTree } from "@/features/configuration/business";
import { normalizeBusinessScopePayload } from "@/lib/configuration/business-scope";
import { useCreateUser, useUpdateUser } from "../mutations";
import { useUserDetail, useUserFormLookups } from "../queries";
import type { UserEmployeeFormValues } from "../types";
import {
  EMPLOYEES_ROUTES,
  GENDER_OPTIONS,
  emptyUserForm,
  workflowsForModule,
} from "../constants";
import { AppAccessFormSection } from "./app-access-form-section";

function toFormValues(detail: NonNullable<ReturnType<typeof useUserDetail>["data"]>["data"]): UserEmployeeFormValues {
  return {
    full_name: detail.fullName,
    email: detail.email,
    phone: detail.phone ?? "",
    join_date: detail.joinDate?.slice(0, 10) ?? "",
    employment_status: detail.employmentStatus,
    ktp: detail.ktp ?? "",
    npwp: detail.npwp ?? "",
    birth_date: detail.birthDate?.slice(0, 10) ?? "",
    gender: detail.gender ?? "",
    marital_status: detail.maritalStatus ?? "",
    address: detail.address ?? "",
    city: detail.city ?? "",
    province: detail.province ?? "",
    postal_code: detail.postalCode ?? "",
    department_id: detail.departmentId ?? "",
    section_id: detail.sectionId ?? "",
    job_title_id: detail.jobTitleId ?? "",
    reporting_to: detail.reportingTo ?? "",
    bank_name: detail.bankName ?? "",
    bank_account: detail.bankAccount ?? "",
    bpjs_tk: detail.bpjsTk ?? "",
    bpjs_kesehatan: detail.bpjsKesehatan ?? "",
    emergency_contact_name: detail.emergencyContactName ?? "",
    emergency_contact_phone: detail.emergencyContactPhone ?? "",
    emergency_contact_relationship: detail.emergencyContactRelationship ?? "",
    notes: detail.notes ?? "",
    nip: detail.nip ?? "",
    is_active: detail.isActive,
    end_date: detail.endDate?.slice(0, 10) ?? "",
    is_access_app: detail.isAccessApp,
    password: "",
    role: detail.appAccount?.role ?? "admin",
    business_scope: detail.appAccount?.businessScope ?? "",
    holding_id: detail.appAccount?.holdingId ?? "",
    company_id: detail.appAccount?.companyId ?? "",
    branch_id: detail.appAccount?.branchId ?? "",
    account_status: detail.appAccount?.status ?? "active",
    approval_permissions:
      detail.appAccount?.approvalPermissions
        ?.filter((p) => p.is_active)
        .map((p) => ({
          id: p.id,
          module: p.module,
          workflow: p.workflow,
          approval_level: p.approval_level as UserEmployeeFormValues["approval_permissions"][number]["approval_level"],
          approval_limit: p.approval_limit,
          is_active: true,
        })) ?? [],
  };
}

function buildPayload(form: UserEmployeeFormValues, isEdit: boolean) {
  const base: Record<string, unknown> = {};
  const nullable = (v: string) => (v === "" ? null : v);

  for (const [key, value] of Object.entries(form)) {
    if (
      key === "password" ||
      key === "role" ||
      key === "business_scope" ||
      key === "holding_id" ||
      key === "company_id" ||
      key === "branch_id" ||
      key === "account_status" ||
      key === "approval_permissions" ||
      key === "is_access_app"
    ) {
      continue;
    }
    if (typeof value === "boolean") base[key] = value;
    else if (typeof value === "string") base[key] = nullable(value);
  }

  base.is_access_app = form.is_access_app;

  if (form.is_access_app) {
    base.role = form.role;
    base.account_status = form.account_status;
    base.approval_permissions = form.approval_permissions;

    const scope = normalizeBusinessScopePayload(
      form.role === "super_admin" ? null : form.business_scope || null,
      form.holding_id || null,
      form.company_id || null,
      form.branch_id || null
    );
    Object.assign(base, scope);

    if (form.password) base.password = form.password;
    else if (!isEdit) base.password = form.password;
  }

  return base;
}

interface UserFormPageProps {
  mode: "create" | "edit";
  employeeId?: string;
}

export function UserFormPage({ mode, employeeId }: UserFormPageProps) {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const isEdit = mode === "edit";

  const { data: detailRes, isLoading: detailLoading } = useUserDetail(
    isEdit && employeeId ? employeeId : null
  );
  const { data: businessTreeData } = useBusinessTree();
  const businessTree = businessTreeData ?? { holdings: [] };
  const { data: lookups } = useUserFormLookups();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const [form, setForm] = useState<UserEmployeeFormValues>(emptyUserForm);

  const departments = lookups?.departments ?? [];
  const sections = lookups?.sections ?? [];
  const positions = lookups?.positions ?? [];
  const managers = lookups?.managers ?? [];
  const employmentStatuses = lookups?.employmentStatuses ?? [];

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (isEdit && detailRes?.data) {
      setForm(toFormValues(detailRes.data));
    }
  }, [isEdit, detailRes?.data]);

  const selectedDeptName = departments.find((d) => d.id === form.department_id)?.name;
  const filteredPositions = useMemo(
    () =>
      form.department_id
        ? positions.filter((p) => p.department === selectedDeptName)
        : [],
    [form.department_id, positions, selectedDeptName]
  );

  const genderOptions = useMemo(
    () => GENDER_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    []
  );
  const employmentStatusOptions = useMemo(
    () => employmentStatuses.map((o) => ({ value: o.code, label: o.name })),
    [employmentStatuses]
  );
  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: d.id, label: d.name })),
    [departments]
  );
  const positionOptions = useMemo(
    () => filteredPositions.map((p) => ({ value: p.id, label: p.title, description: p.department })),
    [filteredPositions]
  );
  const sectionOptions = useMemo(
    () => sections.map((s) => ({ value: s.id, label: s.name })),
    [sections]
  );
  const managerOptions = useMemo(
    () =>
      managers.map((m) => ({
        value: m.id,
        label: m.full_name,
        description: m.nip,
      })),
    [managers]
  );

  function setField(patch: Partial<UserEmployeeFormValues>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  async function handleSubmit() {
    if (!form.full_name || !form.email || !form.join_date || !form.employment_status) {
      showToast("Nama, email, tanggal bergabung, dan status kepegawaian wajib diisi", "error");
      return;
    }

    if (form.is_access_app) {
      if (!isEdit && form.password.length < 8) {
        showToast("Password minimal 8 karakter untuk akses aplikasi", "error");
        return;
      }
      if (!form.role) {
        showToast("Role wajib dipilih untuk akses aplikasi", "error");
        return;
      }
      if (form.role !== "super_admin" && !form.business_scope) {
        showToast("Scope akses data wajib dipilih", "error");
        return;
      }
      if (form.role !== "super_admin" && form.business_scope === "holding" && !form.holding_id) {
        showToast("Holding wajib dipilih", "error");
        return;
      }
      if (
        form.role !== "super_admin" &&
        form.business_scope === "company" &&
        (!form.holding_id || !form.company_id)
      ) {
        showToast("Holding dan company wajib dipilih", "error");
        return;
      }
      if (
        form.role !== "super_admin" &&
        form.business_scope === "branch" &&
        (!form.holding_id || !form.company_id || !form.branch_id)
      ) {
        showToast("Holding, company, dan branch wajib dipilih", "error");
        return;
      }
    }

    const invalidWorkflow = form.approval_permissions.some((permission) =>
      workflowsForModule(permission.module).every((w) => w.value !== permission.workflow)
    );
    if (invalidWorkflow) {
      showToast("Workflow approval harus sesuai module", "error");
      return;
    }

    const payload = buildPayload(form, isEdit);

    try {
      if (isEdit && employeeId) {
        const res = await updateMutation.mutateAsync({ id: employeeId, ...payload });
        showToast(res.message || "Data berhasil diperbarui", "success");
        router.push(EMPLOYEES_ROUTES.detail(employeeId));
      } else {
        const res = await createMutation.mutateAsync(payload as Parameters<typeof createMutation.mutateAsync>[0]);
        showToast(res.message || "Karyawan berhasil ditambahkan", "success");
        router.push(EMPLOYEES_ROUTES.detail(res.data.id));
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menyimpan data", "error");
    }
  }

  const backHref =
    isEdit && employeeId
      ? EMPLOYEES_ROUTES.detail(employeeId)
      : EMPLOYEES_ROUTES.list;

  if (isEdit && detailLoading) {
    return <FormPageLoading />;
  }

  return (
    <FormPageLayout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href={backHref}>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-600">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? "Edit Karyawan" : "Tambah Karyawan"}
            </h1>
            <p className="text-sm text-gray-500">
              Data kepegawaian dan akses aplikasi dalam satu formulir
            </p>
          </div>
        </div>
        <Link href={backHref}>
          <Button variant="outline" className="h-10 rounded-lg border-gray-200/80">
            Kembali
          </Button>
        </Link>
      </div>

      <FormPageBody>
        <FormSectionCard
          icon={UserCircleIcon}
          title="Informasi Personal"
          description="Data identitas dan kontak dasar karyawan."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <FormFieldLabel required>Nama Lengkap</FormFieldLabel>
              <Input
                value={form.full_name}
                onChange={(e) => setField({ full_name: e.target.value })}
                className={formInputClassName}
              />
            </div>
            <div className="sm:col-span-2">
              <FormFieldLabel required>Email</FormFieldLabel>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setField({ email: e.target.value })}
                className={formInputClassName}
              />
            </div>
            <div>
              <FormFieldLabel>Telepon</FormFieldLabel>
              <Input
                value={form.phone}
                onChange={(e) => setField({ phone: e.target.value })}
                className={formInputClassName}
              />
            </div>
            <div>
              <FormFieldLabel>NIK / KTP</FormFieldLabel>
              <Input
                value={form.ktp}
                onChange={(e) => setField({ ktp: e.target.value })}
                className={formInputClassName}
              />
            </div>
            <div>
              <FormFieldLabel>Tanggal Lahir</FormFieldLabel>
              <Input
                type="date"
                value={form.birth_date}
                onChange={(e) => setField({ birth_date: e.target.value })}
                className={formInputClassName}
              />
            </div>
            <div>
              <FormFieldLabel>Jenis Kelamin</FormFieldLabel>
              <Combobox
                options={genderOptions}
                value={form.gender}
                onChange={(value) => setField({ gender: value })}
                placeholder="Pilih"
                searchPlaceholder="Cari..."
                emptyMessage="Tidak ditemukan"
                allowClear
                className={formComboboxClassName}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <FormFieldLabel>Alamat</FormFieldLabel>
              <Input
                value={form.address}
                onChange={(e) => setField({ address: e.target.value })}
                className={formInputClassName}
              />
            </div>
          </div>
        </FormSectionCard>

        <FormSectionCard
          icon={BriefcaseIcon}
          title="Data Kepegawaian"
          description="Penempatan organisasi internal dan status kepegawaian."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FormFieldLabel required>Tanggal Bergabung</FormFieldLabel>
              <Input
                type="date"
                value={form.join_date}
                onChange={(e) => setField({ join_date: e.target.value })}
                className={formInputClassName}
              />
            </div>
            <div>
              <FormFieldLabel required>Status Kepegawaian</FormFieldLabel>
              <Combobox
                options={employmentStatusOptions}
                value={form.employment_status}
                onChange={(value) => setField({ employment_status: value })}
                placeholder="Pilih"
                searchPlaceholder="Cari status..."
                emptyMessage="Status tidak ditemukan"
                className={formComboboxClassName}
              />
            </div>
            <div>
              <FormFieldLabel>Departemen</FormFieldLabel>
              <Combobox
                options={departmentOptions}
                value={form.department_id}
                onChange={(value) => setField({ department_id: value, job_title_id: "" })}
                placeholder="Pilih"
                searchPlaceholder="Cari departemen..."
                emptyMessage="Departemen tidak ditemukan"
                allowClear
                className={formComboboxClassName}
              />
            </div>
            <div>
              <FormFieldLabel>Jabatan</FormFieldLabel>
              <Combobox
                options={positionOptions}
                value={form.job_title_id}
                onChange={(value) => setField({ job_title_id: value })}
                placeholder="Pilih"
                searchPlaceholder="Cari jabatan..."
                emptyMessage="Jabatan tidak ditemukan"
                disabled={!form.department_id}
                allowClear
                className={formComboboxClassName}
              />
            </div>
            <div>
              <FormFieldLabel>Seksi</FormFieldLabel>
              <Combobox
                options={sectionOptions}
                value={form.section_id}
                onChange={(value) => setField({ section_id: value })}
                placeholder="Pilih"
                searchPlaceholder="Cari seksi..."
                emptyMessage="Seksi tidak ditemukan"
                allowClear
                className={formComboboxClassName}
              />
            </div>
            <div>
              <FormFieldLabel>Atasan</FormFieldLabel>
              <Combobox
                options={managerOptions}
                value={form.reporting_to}
                onChange={(value) => setField({ reporting_to: value })}
                placeholder="Pilih"
                searchPlaceholder="Cari atasan..."
                emptyMessage="Atasan tidak ditemukan"
                allowClear
                className={formComboboxClassName}
              />
            </div>
          </div>
        </FormSectionCard>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <FormSectionCard icon={BanknotesIcon} title="Bank & BPJS" bodyClassName="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FormFieldLabel>Bank</FormFieldLabel>
                <Input
                  value={form.bank_name}
                  onChange={(e) => setField({ bank_name: e.target.value })}
                  className={formInputClassName}
                />
              </div>
              <div>
                <FormFieldLabel>Rekening</FormFieldLabel>
                <Input
                  value={form.bank_account}
                  onChange={(e) => setField({ bank_account: e.target.value })}
                  className={formInputClassName}
                />
              </div>
            </div>
          </FormSectionCard>

          <FormSectionCard icon={PhoneIcon} title="Kontak Darurat" bodyClassName="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FormFieldLabel>Nama</FormFieldLabel>
                <Input
                  value={form.emergency_contact_name}
                  onChange={(e) => setField({ emergency_contact_name: e.target.value })}
                  className={formInputClassName}
                />
              </div>
              <div>
                <FormFieldLabel>Telepon</FormFieldLabel>
                <Input
                  value={form.emergency_contact_phone}
                  onChange={(e) => setField({ emergency_contact_phone: e.target.value })}
                  className={formInputClassName}
                />
              </div>
            </div>
          </FormSectionCard>
        </div>

        <FormSectionCard
          icon={ShieldCheck}
          title="Akses Aplikasi"
          description="Login Arkiv, role, scope business, dan hak approval."
          bodyClassName="p-0"
        >
          <div className="px-5 py-5">
            <AppAccessFormSection
              form={form}
              businessTree={businessTree}
              isEdit={isEdit}
              onChange={setField}
            />
          </div>
        </FormSectionCard>
      </FormPageBody>

      <FormPageFooter>
        <Button
          variant="outline"
          onClick={() => router.push(backHref)}
          disabled={isSubmitting}
          className="h-10 rounded-lg border-gray-200/80"
        >
          Batal
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="h-10 gap-2 rounded-lg bg-pink-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-pink-700"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Karyawan"}
        </Button>
      </FormPageFooter>
    </FormPageLayout>
  );
}
