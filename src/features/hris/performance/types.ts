export interface PerformanceReviewListItem {
  id: string;
  employee_id: string;
  period_label: string;
  start_date: string;
  end_date: string;
  status: "draft" | "submitted" | "reviewed" | "finalized";
  grand_total_score: number;
  category: string;
  employee?: { id: string; full_name: string; job_title?: string; department?: { name: string } };
  reviewer?: { id: string; full_name: string };
  manager?: { id: string; full_name: string };
  created_at: string;
}

export interface PerformanceReviewListParams {
  period_label?: string;
  status?: string;
  limit?: number;
}

export interface PerformanceEmployee {
  id: string;
  full_name: string;
  job_title?: string | { title?: string };
  department_id?: string;
  department?: { name: string };
  brand_id?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PerformanceTemplate = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PerformanceReviewDetail = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PerformanceReviewPayload = Record<string, any>;

export interface PerformanceReviewEditData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  review: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kpis: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  behavioral: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  developments: any[];
  employees: PerformanceEmployee[];
}
