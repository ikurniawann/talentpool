"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logbookListQueryKeys } from "./query-keys";
import { updateLogbookItem, submitLogbookEntry } from "./api";
import type { UpdateLogbookItemPayload } from "./types";

function useInvalidateLogbookEntries() {
  const qc = useQueryClient();
  return () =>
    qc.invalidateQueries({ queryKey: logbookListQueryKeys.all });
}

export function useUpdateLogbookItem() {
  const invalidate = useInvalidateLogbookEntries();
  return useMutation({
    mutationFn: (payload: UpdateLogbookItemPayload) => updateLogbookItem(payload),
    onSuccess: invalidate,
  });
}

export function useSubmitLogbookEntry() {
  const invalidate = useInvalidateLogbookEntries();
  return useMutation({
    mutationFn: (entryId: string) => submitLogbookEntry(entryId),
    onSuccess: invalidate,
  });
}
