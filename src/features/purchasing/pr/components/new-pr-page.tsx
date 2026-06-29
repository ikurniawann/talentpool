"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PRForm } from "@/components/purchasing/pr-form";
import { Button } from "@/components/ui/button";
import { usePRFormData } from "../queries";
import { useCreatePurchaseRequest } from "../mutations";
import type { PRFormInput } from "../types";

export function NewPRPage() {
  const router = useRouter();
  const { data: formData, isLoading, error, isError } = usePRFormData();
  const createMutation = useCreatePurchaseRequest();

  useEffect(() => {
    if (isError && error instanceof Error && error.message.includes("403")) {
      router.replace("/dashboard/purchasing");
    }
  }, [isError, error, router]);

  async function handleCreatePR(data: PRFormInput, action: "draft" | "submit") {
    try {
      const res = await createMutation.mutateAsync({ ...data, action });
      toast.success(action === "draft" ? "PR draft berhasil disimpan" : "PR berhasil disubmit");
      router.push("/dashboard/purchasing/pr");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan PR");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-gray-500">
        Memuat form PR...
      </div>
    );
  }

  if (isError || !formData) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error instanceof Error ? error.message : "Gagal memuat data form PR"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/purchasing/pr">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Buat Purchase Request</h1>
            <p className="text-sm text-gray-500">Isi kebutuhan pembelian sebelum dibuatkan PO</p>
          </div>
        </div>
        <Link href="/dashboard/purchasing/pr">
          <Button variant="outline" className="purchasing-secondary-button">Kembali ke PR</Button>
        </Link>
      </div>

      <PRForm
        departments={formData.departments}
        materials={formData.materials}
        units={formData.units}
        onSubmit={handleCreatePR}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
