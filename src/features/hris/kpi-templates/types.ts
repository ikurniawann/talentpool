export interface KpiTemplateListItem {
  id: string;
  template_name: string;
  department?: { name: string };
  position?: { title: string };
  applicable_period: string;
  status: string;
  total_weight?: number;
  created_at: string;
  kpi_template_items?: { count: number };
}

export interface KpiTemplateDetail {
  id: string;
  template_name: string;
  department_id?: string;
  position_id?: string;
  department?: { name: string };
  position?: { title: string };
  applicable_period: string;
  effective_date: string;
  expiry_date: string;
  status: string;
  total_weight?: number;
  behavioral_weight?: number;
  project_weight?: number;
  created_at?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  template_items: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  behavioral_items?: any[];
}

export interface KpiTemplatePayload {
  template_name: string;
  department_id?: string | null;
  position_id?: string | null;
  applicable_period?: string;
  effective_date?: string;
  expiry_date?: string | null;
  status: string;
  behavioral_weight: number;
  project_weight: number;
  total_weight: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  behavioral_items: any[];
}
