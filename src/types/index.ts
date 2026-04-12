// ============================================================
// Types for Talent Pool & Recruitment System
// ============================================================

// --- Enums ---
export type UserRole = "hrd" | "hiring_manager" | "direksi";
export type CandidateSource =
  | "portal"
  | "internal"
  | "referral"
  | "jobstreet"
  | "instagram"
  | "jobfair"
  | "other";
export type CandidateStatus =
  | "new"
  | "screening"
  | "interview_hrd"
  | "interview_manager"
  | "talent_pool"
  | "hired"
  | "rejected";
export type InterviewType = "hrd" | "hiring_manager";
export type InterviewRecommendation = "proceed" | "pool" | "reject";
export type NotificationChannel = "whatsapp" | "email";
export type NotificationStatus = "pending" | "sent" | "failed";

// --- Tables ---

export interface Brand {
  id: string;
  name: string;
  industry: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Position {
  id: string;
  brand_id: string;
  title: string;
  department: string;
  level: string;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  full_name: string;
  role: UserRole;
  brand_id: string | null;
  created_at: string;
}

export interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  domicile: string;
  source: CandidateSource;
  position_id: string | null;
  brand_id: string | null;
  cv_url: string | null;
  photo_url: string | null;
  status: CandidateStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Interview {
  id: string;
  candidate_id: string;
  interviewer_id: string;
  interview_date: string;
  type: InterviewType;
  scorecard: Scorecard | null;
  recommendation: InterviewRecommendation | null;
  notes: string | null;
  created_at: string;
}

export interface Scorecard {
  // Generic scorecard, fields vary per position
  // Common fields:
  technical_skills?: number; // 1-5
  communication?: number; // 1-5
  attitude?: number; // 1-5
  appearance?: number; // 1-5
  experience?: number; // 1-5
  culture_fit?: number; // 1-5
  overall_score?: number; // 1-5
  notes?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface NotificationLog {
  id: string;
  candidate_id: string | null;
  channel: NotificationChannel;
  message: string;
  status: NotificationStatus;
  sent_at: string | null;
}

// --- API / Form DTOs ---

export interface CandidateCreateInput {
  full_name: string;
  email: string;
  phone: string;
  domicile: string;
  source: CandidateSource;
  position_id?: string;
  brand_id?: string;
  notes?: string;
  cv_url?: string;
  photo_url?: string;
}

export interface CandidateUpdateInput {
  full_name?: string;
  email?: string;
  phone?: string;
  domicile?: string;
  source?: CandidateSource;
  position_id?: string | null;
  brand_id?: string | null;
  status?: CandidateStatus;
  notes?: string | null;
  cv_url?: string | null;
  photo_url?: string | null;
}

export interface InterviewCreateInput {
  candidate_id: string;
  interviewer_id: string;
  interview_date: string;
  type: InterviewType;
  scorecard?: Scorecard;
  recommendation?: InterviewRecommendation;
  notes?: string;
}

export interface PositionCreateInput {
  brand_id: string;
  title: string;
  department: string;
  level: string;
}

// --- Pipeline ---

export type PipelineStage =
  | "new"
  | "screening"
  | "interview_hrd"
  | "interview_manager"
  | "talent_pool"
  | "hired"
  | "rejected";

export interface PipelineColumn {
  id: PipelineStage;
  label: string;
  candidates: Candidate[];
}

// --- Dashboard ---

export interface DashboardStats {
  total_candidates: number;
  new_this_month: number;
  in_pipeline: number;
  hired_this_month: number;
  rejected_this_month: number;
  by_brand: { brand_id: string; brand_name: string; count: number }[];
  by_position: { position_id: string; position_title: string; count: number }[];
  by_source: { source: CandidateSource; count: number }[];
  "pipeline funnel": { stage: PipelineStage; count: number }[];
}

// --- API Response ---

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// --- Supabase Database Row types (for Supabase JS returns) ---

export type BrandRow = Brand;
export type PositionRow = Position;
export type UserRow = User;
export type CandidateRow = Candidate;
export type InterviewRow = Interview;
export type NotificationLogRow = NotificationLog;
