"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { schedulesQueryKeys } from "./query-keys";
import { saveStaffSchedule } from "./api";
import type { StaffScheduleRow } from "./types";

export function useSaveStaffSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ staffId, rows }: { staffId: string; rows: StaffScheduleRow[] }) =>
      saveStaffSchedule(staffId, rows),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: schedulesQueryKeys.staffSchedules() }),
  });
}
