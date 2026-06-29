export interface ScheduleBrand {
  id: string;
  name: string;
}

export interface ScheduleStaffMember {
  id: string;
  full_name: string;
  employee_code: string;
  brands?: { name: string };
}

export interface StaffScheduleRow {
  id?: string;
  staff_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_off: boolean;
}
