"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const TOAST_MESSAGES: Record<string, string> = {
  "created:draft": "Draft PR berhasil disimpan",
  "created:submit": "PR berhasil disubmit",
  "updated:draft": "Perubahan PR berhasil disimpan",
  "updated:submit": "PR berhasil disubmit",
  "approval:approved": "PR berhasil diapprove",
  "approval:rejected": "PR berhasil ditolak",
  "revision:created": "Draft revisi PR berhasil dibuat",
};

export function PRDetailToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handledKey = useRef<string | null>(null);

  useEffect(() => {
    const candidates = [
      ["created", searchParams.get("created")],
      ["updated", searchParams.get("updated")],
      ["approval", searchParams.get("approval")],
      ["revision", searchParams.get("revision")],
    ] as const;

    const match = candidates.find(([, value]) => Boolean(value));
    if (!match) return;

    const key = `${match[0]}:${match[1]}`;
    if (handledKey.current === key) return;

    const message = TOAST_MESSAGES[key];
    if (!message) return;

    handledKey.current = key;
    toast.success(message);
    router.replace(pathname);
  }, [pathname, router, searchParams]);

  return null;
}
