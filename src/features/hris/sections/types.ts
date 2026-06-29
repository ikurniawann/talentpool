export interface SectionBrand {
  id: string | number;
  name: string;
}

export interface SectionStaffMember {
  id: string;
  full_name: string;
  employee_code: string;
  brand_id?: string;
  brands?: { name: string };
}

export interface SectionItem {
  id: string;
  name: string;
  code: string;
  color: string;
  brand_id: string;
  brands?: { name: string };
}

export interface StaffSectionLink {
  id: string;
  staff_id: string;
  section_id: string;
  sections?: { name: string; color: string };
}

export interface CreateSectionPayload {
  name: string;
  code: string;
  brand_id: string;
  color: string;
}

export interface AssignStaffSectionPayload {
  staff_id: string;
  section_id: string;
}
