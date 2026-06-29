export type LogbookDepartment = { id: string; name: string; code: string };

export type LogbookCurrentUser = {
  id: string;
  full_name: string;
  role: string;
  employee?: {
    department_id: string | null;
    department?: LogbookDepartment | null;
  } | null;
};

export type LogbookEntryItem = {
  id: string;
  title: string;
  description?: string | null;
  weight: number;
  is_required: boolean;
  is_checked: boolean;
  notes?: string | null;
  sort_order: number;
};

export type LogbookEntry = {
  id: string;
  title: string;
  entry_date: string;
  status: string;
  completion_percentage: number;
  kpi_score: number;
  department_id: string;
  department?: LogbookDepartment;
  template?: { id: string; name: string; frequency: string };
  items?: LogbookEntryItem[];
};

export interface LogbookEntriesParams {
  department_id?: string;
  date?: string;
}

export interface UpdateLogbookItemPayload {
  item_id: string;
  is_checked?: boolean;
  notes?: string;
}
