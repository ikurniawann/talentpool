"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircleIcon,
  KeyIcon,
  PencilIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToastContainer, useToast } from "@/components/ui/toast";
import {
  ADMIN_USER_ROLES,
  APPROVAL_LEVELS,
  APPROVAL_MODULES,
  APPROVAL_WORKFLOWS,
} from "@/lib/admin/user-management";
import type { UserRole } from "@/types";

type ApprovalLevel = "checker" | "approver" | "final_approver";
type UserStatus = "active" | "inactive";

interface ApprovalPermission {
  id?: string;
  module: string;
  workflow: string;
  approval_level: ApprovalLevel;
  approval_limit: number | null;
  is_active: boolean;
}

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  brand_id: string | null;
  status: UserStatus;
  auth_status?: string;
  last_sign_in_at: string | null;
  brands?: { id: string; name: string } | null;
  user_approval_permissions?: ApprovalPermission[];
}

interface BrandOption {
  id: string;
  name: string;
}

interface UserForm {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  brand_id: string;
  status: UserStatus;
  approval_permissions: ApprovalPermission[];
}

const emptyPermission: ApprovalPermission = {
  module: "purchasing",
  workflow: "purchase_request",
  approval_level: "approver",
  approval_limit: null,
  is_active: true,
};

const emptyForm: UserForm = {
  email: "",
  password: "",
  full_name: "",
  role: "admin",
  brand_id: "",
  status: "active",
  approval_permissions: [],
};

const roleLabels: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  hrd: "HRD",
  hiring_manager: "Hiring Manager",
  direksi: "Direksi",
  purchasing_admin: "Purchasing Admin",
  purchasing_manager: "Purchasing Manager",
  purchasing_staff: "Purchasing Staff",
  finance_staff: "Finance Staff",
  warehouse_staff: "Warehouse Staff",
  warehouse_admin: "Warehouse Admin",
  pos: "POS",
  pos_supervisor: "POS Supervisor",
  qc_staff: "QC Staff",
};

function formatCurrency(value: number | null) {
  if (value == null) return "Tanpa limit";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function workflowLabel(value: string) {
  return APPROVAL_WORKFLOWS.find((item) => item.value === value)?.label ?? value;
}

function moduleLabel(value: string) {
  return APPROVAL_MODULES.find((item) => item.value === value)?.label ?? value;
}

function levelLabel(value: ApprovalLevel) {
  return APPROVAL_LEVELS.find((item) => item.value === value)?.label ?? value;
}

function workflowsForModule(module: string) {
  return APPROVAL_WORKFLOWS.filter((workflow) => workflow.module === module);
}

export default function UserManagementClient() {
  const { toasts, showToast, removeToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [usersRes, brandsRes] = await Promise.all([
      window.fetch("/api/admin/users"),
      window.fetch("/api/brands"),
    ]);
    const usersJson = await usersRes.json();
    const brandsJson = await brandsRes.json();

    if (!usersRes.ok) showToast(usersJson.error || "Gagal mengambil data user", "error");
    else setUsers(usersJson.data || []);

    if (brandsRes.ok) setBrands(brandsJson.data || []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchData]);

  const filteredUsers = useMemo(() => {
    const keyword = search.toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        user.full_name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword);
      const matchesRole = roleFilter ? user.role === roleFilter : true;
      const matchesStatus = statusFilter ? user.status === statusFilter : true;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [roleFilter, search, statusFilter, users]);

  const approvalUsers = users.filter((user) =>
    user.user_approval_permissions?.some((permission) => permission.is_active)
  ).length;

  function openCreate() {
    setSelectedUser(null);
    setForm(emptyForm);
    setDialog("create");
  }

  function openEdit(user: AdminUser) {
    setSelectedUser(user);
    setForm({
      email: user.email,
      password: "",
      full_name: user.full_name,
      role: user.role,
      brand_id: user.brand_id ?? "",
      status: user.status ?? "active",
      approval_permissions:
        user.user_approval_permissions?.filter((permission) => permission.is_active).map((permission) => ({
          module: permission.module,
          workflow: permission.workflow,
          approval_level: permission.approval_level,
          approval_limit: permission.approval_limit,
          is_active: true,
        })) ?? [],
    });
    setDialog("edit");
  }

  function updatePermission(index: number, patch: Partial<ApprovalPermission>) {
    setForm((current) => ({
      ...current,
      approval_permissions: current.approval_permissions.map((permission, itemIndex) => {
        if (itemIndex !== index) return permission;
        const next = { ...permission, ...patch };
        if (patch.module && patch.module !== permission.module) {
          next.workflow = workflowsForModule(patch.module)[0]?.value ?? "";
        }
        return next;
      }),
    }));
  }

  function removePermission(index: number) {
    setForm((current) => ({
      ...current,
      approval_permissions: current.approval_permissions.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function saveUser() {
    if (!form.full_name.trim() || !form.email.trim()) {
      showToast("Nama dan email wajib diisi", "error");
      return;
    }

    if (dialog === "create" && form.password.length < 8) {
      showToast("Password sementara minimal 8 karakter", "error");
      return;
    }

    const invalidWorkflow = form.approval_permissions.some((permission) =>
      workflowsForModule(permission.module).every((workflow) => workflow.value !== permission.workflow)
    );
    if (invalidWorkflow) {
      showToast("Workflow approval harus sesuai dengan module", "error");
      return;
    }

    const permissionKeys = form.approval_permissions
      .filter((permission) => permission.is_active)
      .map((permission) => `${permission.module}:${permission.workflow}:${permission.approval_level}`);
    if (new Set(permissionKeys).size !== permissionKeys.length) {
      showToast("Approval authority tidak boleh duplikat", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        brand_id: form.brand_id || null,
        password: dialog === "create" ? form.password : undefined,
        approval_permissions: form.approval_permissions,
      };
      const url = dialog === "edit" ? `/api/admin/users/${selectedUser!.id}` : "/api/admin/users";
      const res = await window.fetch(url, {
        method: dialog === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) showToast(json.error || "Gagal menyimpan user", "error");
      else {
        showToast(json.message || "User berhasil disimpan");
        setDialog(null);
        fetchData();
      }
    } catch {
      showToast("Gagal terhubung ke server", "error");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(user: AdminUser) {
    const res = await window.fetch(`/api/admin/users/${user.id}/reset-password`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) showToast(json.error || "Gagal mengirim reset password", "error");
    else showToast(json.message || "Reset password berhasil dikirim");
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <UserGroupIcon className="h-7 w-7 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500">Kelola akses, role, dan approval authority Arkiv OS</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <PlusIcon className="h-4 w-4" />
          Tambah User
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Total User</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">User Aktif</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {users.filter((user) => user.status === "active").length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Approval Authority</p>
          <p className="mt-2 text-2xl font-bold text-blue-700">{approvalUsers}</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 lg:flex-row">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama atau email..."
            className="lg:max-w-sm"
          />
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Semua role</option>
            {ADMIN_USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Semua status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">Belum ada user sesuai filter</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="p-3 text-left font-medium text-gray-600">User</th>
                  <th className="p-3 text-left font-medium text-gray-600">Role</th>
                  <th className="p-3 text-left font-medium text-gray-600">Outlet</th>
                  <th className="p-3 text-left font-medium text-gray-600">Approval</th>
                  <th className="p-3 text-left font-medium text-gray-600">Status</th>
                  <th className="p-3 text-right font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const approvals = user.user_approval_permissions?.filter((permission) => permission.is_active) ?? [];
                  return (
                    <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-3">
                        <p className="font-medium text-gray-900">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </td>
                      <td className="p-3">
                        <Badge className="bg-blue-50 text-blue-700">{roleLabels[user.role]}</Badge>
                      </td>
                      <td className="p-3 text-gray-600">{user.brands?.name ?? "Semua outlet"}</td>
                      <td className="p-3">
                        {approvals.length === 0 ? (
                          <span className="text-xs text-gray-400">Tidak ada</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {approvals.slice(0, 2).map((permission) => (
                              <Badge key={`${permission.module}-${permission.workflow}-${permission.approval_level}`} className="bg-emerald-50 text-emerald-700">
                                {workflowLabel(permission.workflow)}
                              </Badge>
                            ))}
                            {approvals.length > 2 && <Badge className="bg-gray-100 text-gray-600">+{approvals.length - 2}</Badge>}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge className={user.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}>
                          {user.status === "active" ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(user)} className="p-1.5 text-blue-600">
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => resetPassword(user)} className="p-1.5 text-gray-600">
                            <KeyIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={dialog != null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog === "edit" ? "Edit User" : "Tambah User"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-gray-600">Nama lengkap</label>
              <Input value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Email</label>
              <Input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </div>
            {dialog === "create" && (
              <div>
                <label className="text-xs font-medium text-gray-600">Password sementara</label>
                <Input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-600">Role</label>
              <select
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserRole }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {ADMIN_USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Outlet</label>
              <select
                value={form.brand_id}
                onChange={(event) => setForm((current) => ({ ...current, brand_id: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Semua outlet</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Status</label>
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as UserStatus }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-emerald-600" />
                <h2 className="text-sm font-semibold text-gray-900">Approval Authority</h2>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    approval_permissions: [...current.approval_permissions, { ...emptyPermission }],
                  }))
                }
                className="gap-1"
              >
                <PlusIcon className="h-4 w-4" />
                Tambah Approval
              </Button>
            </div>

            {form.approval_permissions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
                User ini belum punya hak approval
              </div>
            ) : (
              <div className="space-y-2">
                {form.approval_permissions.map((permission, index) => (
                  <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                    <select
                      value={permission.module}
                      onChange={(event) => updatePermission(index, { module: event.target.value })}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      {APPROVAL_MODULES.map((module) => (
                        <option key={module.value} value={module.value}>
                          {module.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={permission.workflow}
                      onChange={(event) => updatePermission(index, { workflow: event.target.value })}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      {workflowsForModule(permission.module).map((workflow) => (
                        <option key={workflow.value} value={workflow.value}>
                          {workflow.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={permission.approval_level}
                      onChange={(event) => updatePermission(index, { approval_level: event.target.value as ApprovalLevel })}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      {APPROVAL_LEVELS.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Limit nominal"
                      value={permission.approval_limit ?? ""}
                      onChange={(event) =>
                        updatePermission(index, {
                          approval_limit: event.target.value === "" ? null : Number(event.target.value),
                        })
                      }
                    />
                    <Button type="button" variant="ghost" onClick={() => removePermission(index)} className="text-red-600">
                      <XMarkIcon className="h-4 w-4" />
                    </Button>
                    <div className="md:col-span-5 text-xs text-gray-500">
                      {moduleLabel(permission.module)} / {workflowLabel(permission.workflow)} / {levelLabel(permission.approval_level)} / {formatCurrency(permission.approval_limit)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Batal
            </Button>
            <Button onClick={saveUser} disabled={saving} className="gap-2">
              <CheckCircleIcon className="h-4 w-4" />
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
