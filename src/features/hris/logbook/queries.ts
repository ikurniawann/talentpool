"use client";

import { useQuery } from "@tanstack/react-query";
import { logbookQueryKeys } from "./query-keys";
import {
  fetchLogbookMe,
  fetchLogbookDepartments,
  fetchLogbookTemplates,
  fetchLogbookEntries,
  fetchLogbookSummary,
} from "./api";

export const useLogbookMe = () =>
  useQuery({ queryKey: logbookQueryKeys.me(), queryFn: fetchLogbookMe });

export const useLogbookDepartments = () =>
  useQuery({ queryKey: logbookQueryKeys.departments(), queryFn: fetchLogbookDepartments });

export const useLogbookTemplates = () =>
  useQuery({ queryKey: logbookQueryKeys.templates(), queryFn: fetchLogbookTemplates });

export const useLogbookEntries = () =>
  useQuery({ queryKey: logbookQueryKeys.entries(), queryFn: fetchLogbookEntries });

export const useLogbookSummary = () =>
  useQuery({ queryKey: logbookQueryKeys.summary(), queryFn: fetchLogbookSummary });
