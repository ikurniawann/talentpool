"use client";

import { useQuery } from "@tanstack/react-query";
import { logbookListQueryKeys } from "./query-keys";
import {
  fetchLogbookMe,
  fetchLogbookDepartments,
  fetchLogbookEntries,
} from "./api";
import type { LogbookEntriesParams } from "./types";

export const useLogbookMe = () =>
  useQuery({
    queryKey: logbookListQueryKeys.me(),
    queryFn: fetchLogbookMe,
  });

export const useLogbookDepartments = () =>
  useQuery({
    queryKey: logbookListQueryKeys.departments(),
    queryFn: fetchLogbookDepartments,
  });

export const useLogbookEntries = (params?: LogbookEntriesParams) =>
  useQuery({
    queryKey: logbookListQueryKeys.entries(params),
    queryFn: () => fetchLogbookEntries(params),
  });
