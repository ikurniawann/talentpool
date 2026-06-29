"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateUserEmployeeInput, UpdateUserEmployeeInput } from "@/lib/users/schemas";
import {
  createEmployeeDocument,
  createUser,
  deleteEmployeeDocument,
  resetUserPassword,
  updateUser,
} from "./api";
import { usersQueryKeys } from "./query-keys";
import type { EmployeeDocumentInput } from "./types";

function useInvalidateUsers() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: usersQueryKeys.all });
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (payload: CreateUserEmployeeInput) => createUser(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateUserEmployeeInput & { id: string }) =>
      updateUser(id, payload),
    onSuccess: invalidate,
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: (id: string) => resetUserPassword(id),
  });
}

export function useCreateEmployeeDocument(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<EmployeeDocumentInput, "employee_id">) =>
      createEmployeeDocument({ employee_id: employeeId, ...payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: usersQueryKeys.documents(employeeId) });
    },
  });
}

export function useDeleteEmployeeDocument(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => deleteEmployeeDocument(docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: usersQueryKeys.documents(employeeId) });
    },
  });
}
