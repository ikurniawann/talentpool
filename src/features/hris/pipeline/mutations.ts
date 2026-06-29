"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Candidate } from "@/types";
import { pipelineQueryKeys } from "./query-keys";
import { updateCandidateStage } from "./api";
import type { UpdateCandidateStagePayload } from "./types";

export function useUpdateCandidateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: UpdateCandidateStagePayload) =>
      updateCandidateStage(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: pipelineQueryKeys.candidates() });
      const previous = qc.getQueryData<Candidate[]>(pipelineQueryKeys.candidates());
      qc.setQueryData<Candidate[]>(pipelineQueryKeys.candidates(), (old) =>
        (old ?? []).map((c) =>
          c.id === id
            ? { ...c, status, updated_at: new Date().toISOString() }
            : c
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(pipelineQueryKeys.candidates(), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: pipelineQueryKeys.candidates() });
    },
  });
}
