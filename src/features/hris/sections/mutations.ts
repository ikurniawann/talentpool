"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sectionsQueryKeys } from "./query-keys";
import {
  createSection,
  assignStaffSection,
  removeStaffSection,
  deleteSection,
} from "./api";
import type {
  CreateSectionPayload,
  AssignStaffSectionPayload,
} from "./types";

function useInvalidateSections() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: sectionsQueryKeys.all });
}

export function useCreateSection() {
  const invalidate = useInvalidateSections();
  return useMutation({
    mutationFn: (payload: CreateSectionPayload) => createSection(payload),
    onSuccess: invalidate,
  });
}

export function useAssignStaffSection() {
  const invalidate = useInvalidateSections();
  return useMutation({
    mutationFn: (payload: AssignStaffSectionPayload) => assignStaffSection(payload),
    onSuccess: invalidate,
  });
}

export function useRemoveStaffSection() {
  const invalidate = useInvalidateSections();
  return useMutation({
    mutationFn: ({ staffId, sectionId }: { staffId: string; sectionId: string }) =>
      removeStaffSection(staffId, sectionId),
    onSuccess: invalidate,
  });
}

export function useDeleteSection() {
  const invalidate = useInvalidateSections();
  return useMutation({
    mutationFn: (id: string) => deleteSection(id),
    onSuccess: invalidate,
  });
}
