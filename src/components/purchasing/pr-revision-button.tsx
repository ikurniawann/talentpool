"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type PRRevisionButtonProps = {
  prId: string;
};

export function PRRevisionButton({ prId }: PRRevisionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function createRevision() {
    setLoading(true);
    try {
      const response = await fetch(`/api/purchasing/pr/${prId}/revise`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Gagal membuat revisi PR");

      setOpen(false);
      router.push(`/dashboard/purchasing/pr/${payload.data.id}/edit?revision=created`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat revisi PR");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <FileText className="mr-2 h-4 w-4" />
        Revisi PR
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat Revisi PR?</DialogTitle>
          <DialogDescription>
            Sistem akan membuat draft PR baru dari PR yang ditolak. PR lama tetap tersimpan sebagai history.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={loading} />}>
            Batal
          </DialogClose>
          <Button type="button" onClick={createRevision} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Buat Revisi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
