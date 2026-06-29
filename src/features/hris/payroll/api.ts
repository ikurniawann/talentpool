import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import type {
  PayrollRun,
  CreatePayrollPayload,
  CalculatePayrollResult,
  PayrollRunDetail,
  PayslipDetail,
} from "./types";

export const fetchPayrollRuns = () =>
  apiGet<{ data: PayrollRun[] }>("/api/hris/payroll").then((res) => res.data || []);

export const fetchPayrollRun = (id: string) =>
  apiGet<{ data: PayrollRunDetail }>(`/api/hris/payroll/${id}`).then((res) => res.data);

export const createPayrollRun = (payload: CreatePayrollPayload) =>
  apiPost<{ data: PayrollRun }>("/api/hris/payroll", payload);

export const calculatePayroll = (runId: string, includeThr: boolean) =>
  apiPost<CalculatePayrollResult>(`/api/hris/payroll/${runId}/calculate`, {
    include_thr: includeThr,
  });

export const updatePayrollStatus = (runId: string, status: string) =>
  apiPut<{ data: PayrollRun }>(`/api/hris/payroll/${runId}`, { status });

export const deletePayrollRun = (runId: string) =>
  apiDelete(`/api/hris/payroll/${runId}`);

export const fetchPayslip = (payrollRunId: string, employeeId: string) =>
  apiGet<{ data: PayslipDetail[] }>(
    `/api/hris/payslips?payroll_run_id=${payrollRunId}&employee_id=${employeeId}`
  ).then((res) => (res.data && res.data.length > 0 ? res.data[0] : null));
