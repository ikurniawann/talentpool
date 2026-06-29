import type { AttendanceExportParams } from "./types";

export async function exportAttendanceCsv(params: AttendanceExportParams): Promise<Blob> {
  const search = new URLSearchParams();
  if (params.employee_id && params.employee_id !== "all") {
    search.set("employee_id", params.employee_id);
  }
  if (params.status && params.status !== "all") {
    search.set("status", params.status);
  }

  const response = await fetch(`/api/hris/attendance/export?${search.toString()}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Export failed");
  }
  return response.blob();
}
