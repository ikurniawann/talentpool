export interface DashboardEmployeeKpi {
  id: string;
  name: string;
  category: string;
  target: number;
  actual_value: number | null;
  achievement_percentage: number | null;
  unit: string;
  period_label: string;
  status: string;
  weight: number | null;
  employee: {
    id: string;
    full_name: string;
    nip: string;
    department?: { name: string };
    position?: { title: string };
  };
}

export interface DashboardPerformanceReview {
  id: string;
  period_label: string;
  overall_score: number | null;
  status: string;
  employee: {
    id: string;
    full_name: string;
    department?: { name: string };
  };
}

export interface KpiDashboardParams {
  period_label?: string;
}

export interface KpiDashboardData {
  kpis: DashboardEmployeeKpi[];
  reviews: DashboardPerformanceReview[];
}
