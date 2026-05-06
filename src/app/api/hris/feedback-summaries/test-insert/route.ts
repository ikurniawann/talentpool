import { NextResponse } from 'next/server';

/**
 * TEST ENDPOINT - Hardcoded test data for debugging
 */
export async function POST() {
  try {
    // Simulate successful response with hardcoded data
    const testData = {
      id: "test-123",
      cycle_id: "7b8c9563-60e3-4e11-9233-5ef98fec9dc8",
      employee_id: "test-emp",
      employee: {
        id: "test-emp",
        full_name: "Test Employee (Demo)",
        nip: "TEST-001",
        department: { name: "HR Department" },
        position: { title: "Software Engineer" }
      },
      cycle: {
        id: "7b8c9563-60e3-4e11-9233-5ef98fec9dc8",
        name: "Q1 2026 Performance Review",
        period_label: "Q1 2026"
      },
      leadership_score: 4.50,
      communication_score: 4.80,
      collaboration_score: 4.20,
      accountability_score: 4.60,
      problem_solving_score: 4.90,
      overall_360_score: 85.00,
      kpi_score: 88.00,
      final_score: 86.50,
      final_grade: 'B',
      burnout_risk: 'low',
      promotion_potential: 'high',
      strengths: ['Leadership kuat', 'Komunikasi sangat efektif', 'Problem solver handal'],
      weaknesses: ['Pertahankan performa dan terus berkembang']
    };

    return NextResponse.json({ 
      success: true,
      message: "Test data created successfully (DEMO MODE)",
      data: testData
    });
  } catch (error: any) {
    console.error('Test insert error:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to create test data'
    }, { status: 500 });
  }
}
