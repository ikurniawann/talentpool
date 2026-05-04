/**
 * Payroll Calculation Engine
 * Indonesia 2026 Compliance (PPh 21 ETR, BPJS, THR, Tapera)
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================
// TYPES
// ============================================================

export interface PayrollInput {
  employeeId: string;
  periodMonth: number;
  periodYear: number;
  
  // Earnings
  baseSalary: number;
  fixedAllowance: number;
  variableAllowance?: number;
  transportAllowance?: number;
  mealAllowance?: number;
  housingAllowance?: number;
  overtimeHours?: number;
  overtimeRate?: number;
  bonus?: number;
  
  // Attendance
  workingDays: number;
  presentDays: number;
  lateDays?: number;
  unpaidLeaveDays?: number;
  
  // Employee status
  joinDate: string;
  employmentStatus: string;
  ptkpStatus: string;
  isTaxable: boolean;
  
  // Benefits enrollment
  bpjsTkEnrolled: boolean;
  bpjsKesEnrolled: boolean;
  taperaEnrolled: boolean;
}

export interface PayrollResult {
  // Earnings
  baseSalary: number;
  fixedAllowance: number;
  variableAllowance: number;
  transportAllowance: number;
  mealAllowance: number;
  housingAllowance: number;
  overtimePay: number;
  thr: number;
  bonus: number;
  otherEarning: number;
  grossSalary: number;
  
  // Deductions (Employee)
  bpjsTkJhtDeduction: number;
  bpjsTkJpDeduction: number;
  bpjsKesDeduction: number;
  taperaDeduction: number;
  pph21Deduction: number;
  unpaidLeaveDeduction: number;
  otherDeduction: number;
  totalDeductions: number;
  
  // Net
  netSalary: number;
  
  // Employer Contributions
  bpjsTkJhtEmployer: number;
  bpjsTkJpEmployer: number;
  bpjsTkJkkEmployer: number;
  bpjsTkJkmEmployer: number;
  bpjsKesEmployer: number;
  taperaEmployer: number;
  totalEmployerContribution: number;
  
  // Tax Details
  taxableIncome: number;
  ptkpAmount: number;
  pph21Annual: number;
  pph21Monthly: number;
  
  // Cost to Company
  costToCompany: number;
}

export interface PTKPConfig {
  ptkp_tk_0: number;
  ptkp_tk_1: number;
  ptkp_tk_2: number;
  ptkp_tk_3: number;
  ptkp_k_0: number;
  ptkp_k_1: number;
  ptkp_k_2: number;
  ptkp_k_3: number;
}

// ============================================================
// CONSTANTS (2026 Rates)
// ============================================================

const BPJS_RATES = {
  // Employee
  bpjs_tk_jht: 0.02, // 2%
  bpjs_tk_jp: 0.01, // 1% (if salary >= 5M)
  bpjs_kes: 0.01, // 1%
  tapera: 0.025, // 2.5%
  
  // Employer
  bpjs_tk_jht_employer: 0.037, // 3.7%
  bpjs_tk_jp_employer: 0.02, // 2%
  bpjs_tk_jkk_employer: 0.0024, // 0.24%
  bpjs_tk_jkm_employer: 0.003, // 0.30%
  bpjs_kes_employer: 0.04, // 4%
  tapera_employer: 0.005, // 0.5%
};

const BPJS_CAPS = {
  bpjs_tk: 10414000, // UMP 2026 cap for BPJS TK
  bpjs_kes: 12000000, // Cap for BPJS Kesehatan
};

const PPH21_BRACKETS = [
  { limit: 60000000, rate: 0.05 }, // 0-60jt: 5%
  { limit: 190000000, rate: 0.15 }, // 60-250jt: 15%
  { limit: 250000000, rate: 0.25 }, // 250-500jt: 25%
  { limit: 4500000000, rate: 0.30 }, // 500jt-5M: 30%
  { limit: Infinity, rate: 0.35 }, // >5M: 35%
];

const JABATAN_EXPENSE = {
  percentage: 0.05, // 5% of gross
  max: 6000000, // Max 6M per year
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get PTKP amount based on status
 */
export function getPTKPAmount(ptkpStatus: string, config?: PTKPConfig): number {
  const defaultConfig: PTKPConfig = {
    ptkp_tk_0: 54000000,
    ptkp_tk_1: 58500000,
    ptkp_tk_2: 63000000,
    ptkp_tk_3: 67500000,
    ptkp_k_0: 58500000,
    ptkp_k_1: 63000000,
    ptkp_k_2: 67500000,
    ptkp_k_3: 72000000,
  };
  
  const cfg = config || defaultConfig;
  
  switch (ptkpStatus.toUpperCase()) {
    case 'TK/0': return cfg.ptkp_tk_0;
    case 'TK/1': return cfg.ptkp_tk_1;
    case 'TK/2': return cfg.ptkp_tk_2;
    case 'TK/3': return cfg.ptkp_tk_3;
    case 'K/0': return cfg.ptkp_k_0;
    case 'K/1': return cfg.ptkp_k_1;
    case 'K/2': return cfg.ptkp_k_2;
    case 'K/3': return cfg.ptkp_k_3;
    default: return cfg.ptkp_tk_0;
  }
}

/**
 * Calculate PPh 21 using ETR (Effective Tax Rate) progressive method
 */
export function calculatePPh21ETR(
  annualTaxableIncome: number,
  ptkpStatus: string,
  config?: PTKPConfig
): { annual: number; monthly: number } {
  const ptkpAmount = getPTKPAmount(ptkpStatus, config);
  const taxableIncome = Math.max(0, annualTaxableIncome - ptkpAmount);
  
  let taxAmount = 0;
  let remaining = taxableIncome;
  
  for (const bracket of PPH21_BRACKETS) {
    if (remaining <= 0) break;
    
    const taxableInBracket = Math.min(remaining, bracket.limit);
    taxAmount += taxableInBracket * bracket.rate;
    remaining -= bracket.limit;
  }
  
  return {
    annual: Math.round(taxAmount),
    monthly: Math.round(taxAmount / 12),
  };
}

/**
 * Calculate BPJS deductions
 */
export function calculateBPJS(
  monthlySalary: number,
  bpjsTkEnrolled: boolean = true,
  bpjsKesEnrolled: boolean = true
) {
  const calcSalaryTk = Math.min(monthlySalary, BPJS_CAPS.bpjs_tk);
  const calcSalaryKes = Math.min(monthlySalary, BPJS_CAPS.bpjs_kes);
  
  // Employee deductions
  const bpjsTkJht = bpjsTkEnrolled ? calcSalaryTk * BPJS_RATES.bpjs_tk_jht : 0;
  const bpjsTkJp = bpjsTkEnrolled && monthlySalary >= 5000000 
    ? calcSalaryTk * BPJS_RATES.bpjs_tk_jp 
    : 0;
  const bpjsKes = bpjsKesEnrolled ? calcSalaryKes * BPJS_RATES.bpjs_kes : 0;
  const tapera = bpjsTkEnrolled ? calcSalaryTk * BPJS_RATES.tapera : 0;
  
  const totalEmployee = bpjsTkJht + bpjsTkJp + bpjsKes + tapera;
  
  // Employer contributions
  const bpjsTkJhtEmployer = bpjsTkEnrolled ? calcSalaryTk * BPJS_RATES.bpjs_tk_jht_employer : 0;
  const bpjsTkJpEmployer = bpjsTkEnrolled ? calcSalaryTk * BPJS_RATES.bpjs_tk_jp_employer : 0;
  const bpjsTkJkkEmployer = bpjsTkEnrolled ? calcSalaryTk * BPJS_RATES.bpjs_tk_jkk_employer : 0;
  const bpjsTkJkmEmployer = bpjsTkEnrolled ? calcSalaryTk * BPJS_RATES.bpjs_tk_jkm_employer : 0;
  const bpjsKesEmployer = bpjsKesEnrolled ? calcSalaryKes * BPJS_RATES.bpjs_kes_employer : 0;
  const taperaEmployer = bpjsTkEnrolled ? calcSalaryTk * BPJS_RATES.tapera_employer : 0;
  
  const totalEmployer = bpjsTkJhtEmployer + bpjsTkJpEmployer + bpjsTkJkkEmployer + 
                        bpjsTkJkmEmployer + bpjsKesEmployer + taperaEmployer;
  
  return {
    employee: {
      bpjsTkJht: Math.round(bpjsTkJht),
      bpjsTkJp: Math.round(bpjsTkJp),
      bpjsKes: Math.round(bpjsKes),
      tapera: Math.round(tapera),
      total: Math.round(totalEmployee),
    },
    employer: {
      bpjsTkJht: Math.round(bpjsTkJhtEmployer),
      bpjsTkJp: Math.round(bpjsTkJpEmployer),
      bpjsTkJkk: Math.round(bpjsTkJkkEmployer),
      bpjsTkJkm: Math.round(bpjsTkJkmEmployer),
      bpjsKes: Math.round(bpjsKesEmployer),
      tapera: Math.round(taperaEmployer),
      total: Math.round(totalEmployer),
    },
  };
}

/**
 * Calculate THR prorata
 */
export function calculateTHR(
  baseSalary: number,
  joinDate: string,
  periodYear: number
): number {
  const join = new Date(joinDate);
  const currentYear = new Date(periodYear, 0, 1); // Jan 1 of period year
  
  // If joined before this year, full THR
  if (join < currentYear) {
    return baseSalary;
  }
  
  // Prorata based on months worked
  const monthsWorked = Math.floor((new Date(periodYear, 11, 31).getTime() - join.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const prorata = Math.min(12, Math.max(1, monthsWorked)) / 12;
  
  return Math.round(baseSalary * prorata);
}

/**
 * Calculate overtime pay
 */
export function calculateOvertime(
  overtimeHours: number,
  hourlyRate: number,
  multiplier: number = 1.5
): number {
  return Math.round(overtimeHours * hourlyRate * multiplier);
}

/**
 * Calculate unpaid leave deduction
 */
export function calculateUnpaidLeave(
  baseSalary: number,
  workingDays: number,
  unpaidLeaveDays: number
): number {
  if (workingDays <= 0) return 0;
  const dailyRate = baseSalary / workingDays;
  return Math.round(dailyRate * unpaidLeaveDays);
}

// ============================================================
// MAIN CALCULATION FUNCTION
// ============================================================

/**
 * Calculate complete payroll for an employee
 */
export async function calculatePayroll(input: PayrollInput): Promise<PayrollResult> {
  const {
    baseSalary,
    fixedAllowance,
    variableAllowance = 0,
    transportAllowance = 0,
    mealAllowance = 0,
    housingAllowance = 0,
    overtimeHours = 0,
    overtimeRate = 1.5,
    bonus = 0,
    workingDays,
    presentDays,
    lateDays = 0,
    unpaidLeaveDays = 0,
    joinDate,
    employmentStatus,
    ptkpStatus,
    isTaxable,
    bpjsTkEnrolled,
    bpjsKesEnrolled,
    taperaEnrolled,
  } = input;
  
  // ========== EARNINGS ==========
  
  // Calculate hourly rate for overtime (base / working days / 8 hours)
  const hourlyRate = workingDays > 0 ? baseSalary / workingDays / 8 : 0;
  const overtimePay = calculateOvertime(overtimeHours, hourlyRate, overtimeRate);
  
  // Calculate THR (if eligible)
  const thr = employmentStatus === 'permanent' 
    ? calculateTHR(baseSalary, joinDate, input.periodYear) 
    : 0;
  
  // Total gross salary
  const grossSalary = 
    baseSalary +
    fixedAllowance +
    variableAllowance +
    transportAllowance +
    mealAllowance +
    housingAllowance +
    overtimePay +
    thr +
    bonus;
  
  // ========== DEDUCTIONS ==========
  
  // BPJS calculations
  const bpjsResult = calculateBPJS(baseSalary + fixedAllowance, bpjsTkEnrolled, bpjsKesEnrolled);
  
  // Tapera (if enrolled)
  const taperaDeduction = taperaEnrolled 
    ? Math.min(baseSalary, BPJS_CAPS.bpjs_tk) * BPJS_RATES.tapera 
    : 0;
  
  // Unpaid leave deduction
  const unpaidLeaveDeduction = calculateUnpaidLeave(baseSalary, workingDays, unpaidLeaveDays);
  
  // Calculate taxable income for PPh 21
  const monthlyTaxableIncome = grossSalary - bpjsResult.employee.total - taperaDeduction;
  const annualTaxableIncome = monthlyTaxableIncome * 12;
  
  // PPh 21 calculation
  let pph21Deduction = 0;
  if (isTaxable) {
    const pph21Result = calculatePPh21ETR(annualTaxableIncome, ptkpStatus);
    pph21Deduction = pph21Result.monthly;
  }
  
  // Total deductions
  const totalDeductions = 
    bpjsResult.employee.bpjsTkJht +
    bpjsResult.employee.bpjsTkJp +
    bpjsResult.employee.bpjsKes +
    taperaDeduction +
    pph21Deduction +
    unpaidLeaveDeduction;
  
  // Net salary (take home pay)
  const netSalary = grossSalary - totalDeductions;
  
  // ========== EMPLOYER CONTRIBUTIONS ==========
  
  const totalEmployerContribution = bpjsResult.employer.total;
  
  // Cost to Company
  const costToCompany = grossSalary + totalEmployerContribution;
  
  // ========== RETURN RESULT ==========
  
  return {
    // Earnings
    baseSalary: Math.round(baseSalary),
    fixedAllowance: Math.round(fixedAllowance),
    variableAllowance: Math.round(variableAllowance),
    transportAllowance: Math.round(transportAllowance),
    mealAllowance: Math.round(mealAllowance),
    housingAllowance: Math.round(housingAllowance),
    overtimePay: Math.round(overtimePay),
    thr: Math.round(thr),
    bonus: Math.round(bonus),
    otherEarning: 0,
    grossSalary: Math.round(grossSalary),
    
    // Deductions (Employee)
    bpjsTkJhtDeduction: bpjsResult.employee.bpjsTkJht,
    bpjsTkJpDeduction: bpjsResult.employee.bpjsTkJp,
    bpjsKesDeduction: bpjsResult.employee.bpjsKes,
    taperaDeduction: Math.round(taperaDeduction),
    pph21Deduction: Math.round(pph21Deduction),
    unpaidLeaveDeduction: Math.round(unpaidLeaveDeduction),
    otherDeduction: 0,
    totalDeductions: Math.round(totalDeductions),
    
    // Net
    netSalary: Math.round(netSalary),
    
    // Employer Contributions
    bpjsTkJhtEmployer: bpjsResult.employer.bpjsTkJht,
    bpjsTkJpEmployer: bpjsResult.employer.bpjsTkJp,
    bpjsTkJkkEmployer: bpjsResult.employer.bpjsTkJkk,
    bpjsTkJkmEmployer: bpjsResult.employer.bpjsTkJkm,
    bpjsKesEmployer: bpjsResult.employer.bpjsKes,
    taperaEmployer: bpjsResult.employer.tapera,
    totalEmployerContribution: Math.round(totalEmployerContribution),
    
    // Tax Details
    taxableIncome: Math.round(annualTaxableIncome),
    ptkpAmount: getPTKPAmount(ptkpStatus),
    pph21Annual: Math.round(pph21Deduction * 12),
    pph21Monthly: Math.round(pph21Deduction),
    
    // Cost to Company
    costToCompany: Math.round(costToCompany),
  };
}

/**
 * Fetch employee data and calculate payroll from database
 */
export async function calculatePayrollForEmployee(
  employeeId: string,
  periodMonth: number,
  periodYear: number
): Promise<PayrollResult | null> {
  const supabase = await createClient();
  
  // Fetch employee data
  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .single();
  
  if (!employee) return null;
  
  // Fetch salary data
  const { data: salary } = await supabase
    .from('employee_salary')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('is_active', true)
    .order('effective_date', { ascending: false })
    .limit(1)
    .single();
  
  if (!salary) return null;
  
  // Fetch attendance for the period
  const { data: attendance } = await supabase
    .from('attendance')
    .select('date, work_hours, status')
    .gte('date', `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`)
    .lte('date', `${periodYear}-${String(periodMonth).padStart(2, '0')}-31`)
    .eq('employee_id', employeeId);
  
  // Calculate working days and present days
  const workingDays = attendance?.filter(d => d.status !== 'absent').length || 0;
  const presentDays = attendance?.filter(d => d.status === 'present' || d.status === 'late').length || 0;
  const lateDays = attendance?.filter(d => d.status === 'late').length || 0;
  
  // Fetch unpaid leave
  const { data: leaves } = await supabase
    .from('leaves')
    .select('start_date, end_date')
    .eq('employee_id', employeeId)
    .eq('leave_type', 'unpaid')
    .eq('status', 'approved')
    .gte('start_date', `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`)
    .lte('start_date', `${periodYear}-${String(periodMonth).padStart(2, '0')}-31`);
  
  const unpaidLeaveDays = leaves?.reduce((acc, leave) => {
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return acc + days;
  }, 0) || 0;
  
  // Calculate payroll
  return calculatePayroll({
    employeeId,
    periodMonth,
    periodYear,
    baseSalary: salary.base_salary || 0,
    fixedAllowance: salary.fixed_allowance || 0,
    variableAllowance: salary.variable_allowance || 0,
    transportAllowance: salary.transport_allowance || 0,
    mealAllowance: salary.meal_allowance || 0,
    housingAllowance: salary.housing_allowance || 0,
    workingDays,
    presentDays,
    lateDays,
    unpaidLeaveDays,
    joinDate: employee.join_date,
    employmentStatus: employee.employment_status,
    ptkpStatus: salary.ptkp_status || 'TK/0',
    isTaxable: salary.is_taxable ?? true,
    bpjsTkEnrolled: salary.bpjs_tk_enrolled ?? true,
    bpjsKesEnrolled: salary.bpjs_kes_enrolled ?? true,
    taperaEnrolled: salary.tapera_enrolled ?? true,
  });
}
