"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logbookQueryKeys } from "./query-keys";
import {
  createLogbookTemplate,
  createLogbookEntry,
  toggleLogbookItem,
  updateLogbookEntryStatus,
} from "./api";
import type {
  CreateLogbookTemplatePayload,
  CreateLogbookEntryPayload,
  UpdateLogbookEntryStatusPayload,
} from "./types";

function useInvalidateLogbook() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: logbookQueryKeys.all });
}

export function useCreateLogbookTemplate() {
  const invalidate = useInvalidateLogbook();
  return useMutation({
    mutationFn: (payload: CreateLogbookTemplatePayload) => createLogbookTemplate(payload),
    onSuccess: invalidate,
  });
}

export function useCreateLogbookEntry() {
  const invalidate = useInvalidateLogbook();
  return useMutation({
    mutationFn: (payload: CreateLogbookEntryPayload) => createLogbookEntry(payload),
    onSuccess: invalidate,
  });
}

export function useToggleLogbookItem() {
  const invalidate = useInvalidateLogbook();
  return useMutation({
    mutationFn: ({ itemId, isChecked }: { itemId: string; isChecked: boolean }) =>
      toggleLogbookItem(itemId, isChecked),
    onSuccess: invalidate,
  });
}

export function useUpdateLogbookEntryStatus() {
  const invalidate = useInvalidateLogbook();
  return useMutation({
    mutationFn: (payload: UpdateLogbookEntryStatusPayload) =>
      updateLogbookEntryStatus(payload),
    onSuccess: invalidate,
  });
}
