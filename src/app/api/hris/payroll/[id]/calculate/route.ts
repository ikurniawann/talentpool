// ============================================================
// API Route: Calculate Payroll for a Run
// POST: Calculate payroll for all employees in a run
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculatePayroll } from '@/lib/payroll/calculator';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================
// POST /api/hris/payroll/[id]/calculate
// ============================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get payroll run
    const { data: payrollRun } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('id', id)
      .single();

    if (!payrollRun) {
      return NextResponse.json(
        { error: 'Payroll run tidak ditemukan' },
        { status: 404 }
      );
    }

    if (payrollRun.status !== 'draft') {
      return NextResponse.json(
        { error: 'Hanya payroll draft yang bisa dihitung' },
        { status: 400 }
      );
    }

    // Get all active employees
    const { data: employees } = await supabase
      .from('employees')
      .select('*')
      .eq('is_active', true);

    if (!employees || employees.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada karyawan aktif' },
        { status: 400 }
      );
    }

    const results: any[] = [];
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalBjtkEmployee = 0;
    let totalBjtkEmployer = 0;
    let totalPph21 = 0;

    // Calculate payroll for each employee
    for (const employee of employees) {
      // Get salary data
      const { data: salary } = await supabase
        .from('employee_salary')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('is_active', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

      if (!salary) {
        console.warn(`No salary data for employee ${employee.id}`);
        continue;
      }

      // Get attendance for the period
      const startDate = `${payrollRun.period_year}-${String(payrollRun.period_month).padStart(2, '0')}-01`;
      const endDate = `${payrollRun.period_year}-${String(payrollRun.period_month).padStart(2, '0')}-31`;

      const { data: attendance } = await supabase
        .from('attendance')
        .select('date, work_hours, status')
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('employee_id', employee.id);

      const workingDays = attendance?.filter(d => d.status !== 'absent').length || 20;
      const presentDays = attendance?.filter(d => d.status === 'present' || d.status === 'late').length || 0;
      const lateDays = attendance?.filter(d => d.status === 'late').length || 0;

      // Get unpaid leave
      const { data: leaves } = await supabase
        .from('leaves')
        .select('start_date, end_date')
        .eq('employee_id', employee.id)
        .eq('leave_type', 'unpaid')
        .eq('status', 'approved')
        .gte('start_date', startDate)
        .lte('start_date', endDate);

      const unpaidLeaveDays = leaves?.reduce((acc, leave) => {
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return acc + days;
      }, 0) || 0;

      // Calculate payroll
      const payrollResult = await calculatePayroll({
        employeeId: employee.id,
        periodMonth: payrollRun.period_month,
        periodYear: payrollRun.period_year,
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

      // Insert payroll detail
      const { data: detail, error } = await supabase
        .from('payroll_details')
        .insert({
          payroll_run_id: id,
          employee_id: employee.id,
          base_salary: payrollResult.baseSalary,
          fixed_allowance: payrollResult.fixedAllowance,
          variable_allowance: payrollResult.variableAllowance,
          transport_allowance: payrollResult.transportAllowance,
          meal_allowance: payrollResult.mealAllowance,
          housing_allowance: payrollResult.housingAllowance,
          overtime_pay: payrollResult.overtimePay,
          thr: payrollResult.thr,
          bonus: payrollResult.bonus,
          other_earning: payrollResult.otherEarning,
          gross_salary: payrollResult.grossSalary,
          bpjs_tk_jht_deduction: payrollResult.bpjsTkJhtDeduction,
          bpjs_tk_jp_deduction: payrollResult.bpjsTkJpDeduction,
          bpjs_kes_deduction: payrollResult.bpjsKesDeduction,
          tapera_deduction: payrollResult.taperaDeduction,
          pph21_deduction: payrollResult.pph21Deduction,
          unpaid_leave_deduction: payrollResult.unpaidLeaveDeduction,
          other_deduction: payrollResult.otherDeduction,
          total_deductions: payrollResult.totalDeductions,
          net_salary: payrollResult.netSalary,
          bpjs_tk_jht_employer: payrollResult.bpjsTkJhtEmployer,
          bpjs_tk_jp_employer: payrollResult.bpjsTkJpEmployer,
          bpjs_tk_jkk_employer: payrollResult.bpjsTkJkkEmployer,
          bpjs_tk_jkm_employer: payrollResult.bpjsTkJkmEmployer,
          bpjs_kes_employer: payrollResult.bpjsKesEmployer,
          tapera_employer: payrollResult.taperaEmployer,
          taxable_income: payrollResult.taxableIncome,
          ptkp_amount: payrollResult.ptkpAmount,
          pph21_annual: payrollResult.pph21Annual,
          pph21_monthly: payrollResult.pph21Monthly,
          working_days: workingDays,
          present_days: presentDays,
          late_days: lateDays,
          unpaid_leave_days: unpaidLeaveDays,
          status: 'calculated',
        })
        .select(`
          *,
          employee:employees (
            id,
            full_name,
            nip
          )
        `)
        .single();

      if (error) {
        console.error(`Error inserting payroll detail for ${employee.id}:`, error);
        continue;
      }

      results.push(detail);

      // Accumulate totals
      totalGross += payrollResult.grossSalary;
      totalDeductions += payrollResult.totalDeductions;
      totalNet += payrollResult.netSalary;
      totalBjtkEmployee += payrollResult.bpjsTkJhtDeduction + payrollResult.bpjsTkJpDeduction + payrollResult.bpjsKesDeduction + payrollResult.taperaDeduction;
      totalBjtkEmployer += payrollResult.totalEmployerContribution;
      totalPph21 += payrollResult.pph21Deduction;
    }

    // Update payroll run with totals
    await supabase
      .from('payroll_runs')
      .update({
        total_employees: results.length,
        total_gross: totalGross,
        total_deductions: totalDeductions,
        total_net: totalNet,
        total_bjtk_employee: totalBjtkEmployee,
        total_bjtk_employer: totalBjtkEmployer,
        total_pph21: totalPph21,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return NextResponse.json({
      data: results,
      summary: {
        total_employees: results.length,
        total_gross: totalGross,
        total_deductions: totalDeductions,
        total_net: totalNet,
        total_bjtk_employee: totalBjtkEmployee,
        total_bjtk_employer: totalBjtkEmployer,
        total_pph21: totalPph21,
      },
      message: `Payroll berhasil dihitung untuk ${results.length} karyawan`
    });

  } catch (error) {
    console.error('Error calculating payroll:', error);
    return NextResponse.json(
      { error: 'Gagal menghitung payroll', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
