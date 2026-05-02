// ============================================================
// HRIS Module - TypeScript Types
// Fase 0: Foundation
// ============================================================

// ============================================================
// ENUMS
// ============================================================

export type EmploymentStatus =
  | 'probation'
  | 'contract'
  | 'permanent'
  | 'internship'
  | 'resigned'
  | 'terminated'
  | 'suspended';

export type GenderType = 'male' | 'female';

export type MaritalStatusType = 'single' | 'married' | 'divorced' | 'widowed';

// ============================================================
// DEPARTMENT
// ============================================================

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  brand_id: string | null;
  parent_department_id: string | null;
  cost_center: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  parent_department?: Department;
  sub_departments?: Department[];
  brand?: Brand;
}

export interface DepartmentWithRelations extends Department {
  employee_count?: number;
  parent_department?: Department;
  sub_departments?: Department[];
}

// ============================================================
// EMPLOYEE
// ============================================================

export interface Employee {
  // Core Identity
  id: string;
  user_id: string | null;
  old_staff_id: string | null;
  
  // Personal Information
  full_name: string;
  nip: string;
  ktp: string | null;
  npwp: string | null;
  email: string;
  phone: string;
  birth_date: string | null;
  gender: GenderType | null;
  marital_status: MaritalStatusType | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  
  // Employment Information
  join_date: string;
  end_date: string | null;
  employment_status: EmploymentStatus;
  is_active: boolean;
  
  // Organization Structure
  department_id: string | null;
  section_id: string | null;
  job_title_id: string | null;
  reporting_to: string | null;
  
  // Compensation & Benefits
  bank_name: string | null;
  bank_account: string | null;
  bpjs_tk: string | null;
  bpjs_kesehatan: string | null;
  
  // Emergency Contact
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  
  // Metadata
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeWithRelations extends Employee {
  // Joined fields
  department?: Department;
  section?: Section;
  job_title?: Position;
  manager?: Employee;
  direct_reports?: Employee[];
  user?: User;
}

// ============================================================
// EXISTING TYPES (Re-export dari index.ts)
// ============================================================

import type { Brand, Position, User, Candidate } from './index';

// Section dari staff module (existing table)
export interface Section {
  id: string;
  brand_id: string;
  name: string;
  code: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
}

// Staff dari staff module (existing table - untuk backward compatibility)
export interface Staff {
  id: string;
  full_name: string;
  employee_code: string;
  email: string | null;
  phone: string | null;
  position_id: string | null;
  brand_id: string;
  hire_date: string;
  status: 'active' | 'inactive' | 'resigned';
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// PROMOTION (Talent Pool → Employee Integration)
// ============================================================

export interface PromotionRequest {
  candidate_id: string;
  join_date?: string;
  employment_status?: EmploymentStatus;
  department_id?: string;
  reporting_to?: string;
}

export interface PromotionResponse {
  employee_id: string;
  nip: string;
  message: string;
}

// ============================================================
// ORGANIZATION CHART
// ============================================================

export interface OrgNode {
  id: string;
  name: string;
  type: 'department' | 'employee';
  children?: OrgNode[];
  // Employee-specific
  job_title?: string;
  email?: string;
  photo_url?: string;
  is_active?: boolean;
  // Department-specific
  code?: string;
  employee_count?: number;
}

// ============================================================
// API REQUEST/RESPONSE TYPES
// ============================================================

export interface EmployeeListFilters {
  search?: string;
  department_id?: string;
  section_id?: string;
  employment_status?: EmploymentStatus;
  is_active?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'full_name' | 'join_date' | 'nip' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface EmployeeCreateData {
  full_name: string;
  email: string;
  phone: string;
  join_date: string;
  employment_status: EmploymentStatus;
  department_id?: string;
  section_id?: string;
  job_title_id?: string;
  reporting_to?: string;
  ktp?: string;
  npwp?: string;
  birth_date?: string;
  gender?: GenderType;
  marital_status?: MaritalStatusType;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  bank_name?: string;
  bank_account?: string;
  bpjs_tk?: string;
  bpjs_kesehatan?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  photo_url?: string;
  notes?: string;
}

export interface EmployeeUpdateData extends Partial<EmployeeCreateData> {
  end_date?: string;
  is_active?: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

// ============================================================
// FORM TYPES (React Hook Form)
// ============================================================

export interface EmployeeFormData {
  full_name: string;
  email: string;
  phone: string;
  join_date: string;
  employment_status: EmploymentStatus;
  department_id?: string;
  section_id?: string;
  job_title_id?: string;
  reporting_to?: string;
  ktp?: string;
  npwp?: string;
  birth_date?: string;
  gender?: GenderType;
  marital_status?: MaritalStatusType;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  bank_name?: string;
  bank_account?: string;
  bpjs_tk?: string;
  bpjs_kesehatan?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  photo_url?: string;
  notes?: string;
}

export interface PromoteCandidateFormData {
  join_date: string;
  employment_status: EmploymentStatus;
  department_id?: string;
  reporting_to?: string;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  probation: 'Probation',
  contract: 'Kontrak',
  permanent: 'Tetap',
  internship: 'Magang',
  resigned: 'Mengundurkan Diri',
  terminated: 'Diberhentikan',
  suspended: 'Diskorsing',
};

export const EMPLOYMENT_STATUS_COLORS: Record<EmploymentStatus, string> = {
  probation: 'bg-yellow-500',
  contract: 'bg-blue-500',
  permanent: 'bg-green-500',
  internship: 'bg-purple-500',
  resigned: 'bg-gray-500',
  terminated: 'bg-red-500',
  suspended: 'bg-orange-500',
};

export const GENDER_LABELS: Record<GenderType, string> = {
  male: 'Laki-laki',
  female: 'Perempuan',
};

export const MARITAL_STATUS_LABELS: Record<MaritalStatusType, string> = {
  single: 'Belum Menikah',
  married: 'Menikah',
  divorced: 'Cerai Hidup',
  widowed: 'Cerai Mati',
};

// Helper function untuk format NIP display
export const formatNIP = (nip: string): string => {
  // EMP-2026-00001 → EMP-2026-00001 (already formatted)
  return nip;
};

// Helper function untuk calculate tenure
export const calculateTenure = (joinDate: string): string => {
  const join = new Date(joinDate);
  const now = new Date();
  const years = now.getFullYear() - join.getFullYear();
  const months = now.getMonth() - join.getMonth();
  
  if (years > 0) {
    return `${years} tahun ${Math.max(0, months)} bulan`;
  } else if (months > 0) {
    return `${months} bulan`;
  } else {
    return 'Baru bergabung';
  }
};
