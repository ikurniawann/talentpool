export interface ProfitBucket {
  id: string;
  label: string;
  quantity: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  gross_margin_pct: number;
}

export interface ProfitReport {
  filters: {
    date_from: string;
    date_to: string;
  };
  summary: {
    orders: number;
    items: number;
    quantity: number;
    revenue: number;
    cogs: number;
    gross_profit: number;
    gross_margin_pct: number;
    zero_cost_items: number;
  };
  breakdowns: {
    products: ProfitBucket[];
    categories: ProfitBucket[];
    stations: ProfitBucket[];
    cashiers: ProfitBucket[];
    dates: ProfitBucket[];
  };
}

export interface ProfitReportParams {
  date_from: string;
  date_to: string;
}
