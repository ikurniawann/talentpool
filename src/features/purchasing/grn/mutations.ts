"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteGrn, updateGrn, createGrn, createQCInspection } from "./api";
import { grnQueryKeys } from "./query-keys";

export const useDeleteGrn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGrn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grnQueryKeys.all });
    },
  });
};

export const useUpdateGrn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) =>
      updateGrn(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grnQueryKeys.all });
    },
  });
};

export const useCreateGrn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => createGrn(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grnQueryKeys.all });
    },
  });
};

export const useCreateQCInspection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => createQCInspection(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grnQueryKeys.all });
    },
  });
};
