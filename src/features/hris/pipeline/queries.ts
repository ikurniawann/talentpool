"use client";

import { useQuery } from "@tanstack/react-query";
import { pipelineQueryKeys } from "./query-keys";
import { fetchPipelineCandidates, fetchPipelineBrands } from "./api";

export const usePipelineCandidates = () =>
  useQuery({
    queryKey: pipelineQueryKeys.candidates(),
    queryFn: fetchPipelineCandidates,
  });

export const usePipelineBrands = () =>
  useQuery({
    queryKey: pipelineQueryKeys.brands(),
    queryFn: fetchPipelineBrands,
  });
