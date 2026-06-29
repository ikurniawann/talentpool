import { createBrowserClient } from "@/lib/pg/browser-client";
import { buildListUrl, apiGet, apiPost, apiDelete } from "@/lib/api-client";
import type {
  ScheduleBrand,
  ScheduleStaffMember,
  StaffScheduleRow,
} from "./types";

export const fetchScheduleStaff = (brandFilter: string) =>
  apiGet<{ data: ScheduleStaffMember[] }>(
    buildListUrl("/api/staff", {
      brand_id: brandFilter !== "all" ? brandFilter : undefined,
      status: "active",
    })
  ).then((res) => res.data || []);

export const fetchStaffSchedules = () =>
  apiGet<{ data: StaffScheduleRow[] }>("/api/staff-schedules").then(
    (res) => res.data || []
  );

export async function fetchScheduleBrands(): Promise<ScheduleBrand[]> {
  const db = createBrowserClient();
  const { data } = await db
    .from("brands")
    .select("*")
    .eq("is_active", true)
    .order("name");
  return (data as ScheduleBrand[]) || [];
}

export async function saveStaffSchedule(
  staffId: string,
  rows: StaffScheduleRow[]
) {
  await apiDelete(`/api/staff-schedules?staff_id=${staffId}`);
  if (rows.length > 0) {
    await apiPost("/api/staff-schedules", { schedules: rows });
  }
}
