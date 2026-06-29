# 📋 Unit Test Plan - Arkiv OS

> **Document Version**: 1.0  
> **Last Updated**: Mei 2026  
> **Status**: Draft - Pending Approval  
> **Author**: OpenCode AI Agent  
> **Project**: Arkiv OS (ERP Terintegrasi)

---

## 📌 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Test Strategy & Objectives](#3-test-strategy--objectives)
4. [Test Environment Setup](#4-test-environment-setup)
5. [Directory Structure](#5-directory-structure)
6. [Test Cases Detail](#6-test-cases-detail)
   - [P0 - Critical Tests](#p0---critical-tests)
   - [P1 - Important Tests](#p1---important-tests)
   - [P2 - Nice-to-Have Tests](#p2---nice-to-have-tests)
7. [Mocking Strategy](#7-mocking-strategy)
8. [Execution Roadmap](#8-execution-roadmap)
9. [Definition of Done](#9-definition-of-done)
10. [Appendix](#10-appendix)

---

## 1. Executive Summary

### 📊 Project Overview

| Attribute | Detail |
|-----------|--------|
| **Project Name** | Arkiv OS |
| **Stack** | Next.js 16.2.3, React 19, TypeScript, PostgreSQL, Tailwind v4 |
| **Scope** | ERP Terintegrasi (HRIS, Purchasing, Inventory, POS) |
| **Test Framework** | Vitest + jsdom + @testing-library/react |
| **Coverage Provider** | v8 |

### 🎯 Objective
Membuat unit test yang komprehensif untuk:
- **Menjaga stabilitas** setelah TypeScript build strict diaktifkan
- **Mencegah regresi** saat refactor auth system (Fase 1.2)
- **Validasi logic bisnis kritis** terutama POS XP accumulation dan HRIS promotion flow
- **Mencapai coverage minimum 60%** untuk API routes

---

## 2. Current State Analysis

### ✅ Existing Setup

```
� Test Framework:        Vitest v4.1.4 ✅
� Test Environment:      jsdom ✅
� Testing Library:       @testing-library/react ✅
� Coverage Provider:     v8 ✅
� Config File:           vitest.config.ts ✅
� Setup File:            src/test/setup.ts ✅
� Current Tests:         2 files (auth.test.ts, schemas.test.ts)
```

### 📉 Current Coverage

| Module | Coverage | Status |
|--------|----------|--------|
| API Routes | ~0% | ⚠️ None |
| Zod Schemas | ~30% | 🟡 Partial (purchasing only) |
| Auth Helpers | ~90% | ✅ Good |
| Components | ~0% | ⚠️ None |
| Utils/Helpers | ~0% | ⚠️ None |
| **Overall** | **~5%** | 🔴 Critical Gap |

### 🔍 Gap Identified

1. **No API Route Tests** - Semua API route tidak punya unit test
2. **No Component Tests** - Render logic tidak ter-cover
3. **No Mock Strategy** - pg pool / REST API mock belum standardisasi
4. **Missing Fixtures** - Tidak ada sample data reusable
5. **POS XP Logic** - Fitur kritis tetapi tidak di-test
6. **HRIS Promotion** - Flow sensitif tetapi tidak di-proteksi dengan test

---

## 3. Test Strategy & Objectives

### 🎯 Coverage Targets

| Metric | Target | Priority |
|--------|--------|----------|
| Overall Coverage | 60% | P0 |
| API Routes (src/app/api) | 80% | P0 |
| Type Validations | 90% | P0 |
| Components (src/components) | 50% | P1 |
| Utils/Helpers | 70% | P1 |
| Error Scenarios | 100% | P0 |

### 🧪 Test Categories

| Category | Focus Area | Example Tests |
|----------|-----------|---------------|
| **Functionality** | CRUD operations, business logic | Create employee, promote candidate |
| **Validation** | Input validation, schema enforcement | Zod schema validation, type checking |
| **Edge Cases** | Null/undefined, empty data, boundary | Missing email, invalid UUID, 0 stock |
| **Error Handling** | Auth failures, DB errors, timeouts | 401, 404, 500 responses |
| **Integration Steps** | Cross-module workflows | Candidate → Employee promotion flow |

---

## 4. Test Environment Setup

### 📦 Dependencies (Sudah Terinstall)

```json
{
  "devDependencies": {
    "vitest": "^4.1.4",
    "jsdom": "^29.0.2",
    "@testing-library/react": "^16.3.2",
    "@testing-library/jest-dom": "^6.9.1",
    "@vitest/ui": "^4.1.4"
  }
}
```

### ⚙️ vitest.config.ts (Existing)

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/test/', '*.config.*'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## 5. Directory Structure

### 📁 Target Structure (Akan Dibuat)

```
src/
├── test/
│   ├── setup.ts                          # ✅ Existing - tambah mocks
│   ├── setup.mocks.ts                    # 🆕 Mock registration global
│   ├── mocks/
│   │   ├── pg-pool.ts                   # 🆕 Mock pg pool / REST API
│   │   ├── nextjs.ts                     # 🆕 Mock next/navigation, next/server
│   │   └── fixtures/
│   │       ├── candidates.ts            # 🆕 Sample candidate data
│   │       ├── employees.ts             # 🆕 Sample employee data
│   │       ├── positions.ts             # 🆕 Sample position/brand data
│   │       └── pos-orders.ts            # 🆕 Sample POS order data
│   ├── unit/
│   │   ├── api/                          # 🆕 API route tests
│   │   │   ├── candidates.test.ts
│   │   │   ├── employees.test.ts
│   │   │   ├── pos-orders.test.ts
│   │   │   ├── inventory.test.ts
│   │   │   └── purchasing.test.ts
│   │   ├── components/                   # 🆕 Component tests
│   │   │   ├── EmployeeTable.test.tsx
│   │   │   ├── PromoteCandidateButton.test.tsx
│   │   │   └── LeaveRequestForm.test.tsx
│   │   ├── utils/                      # 🆕 Utility tests
│   │   │   ├── validation.test.ts
│   │   │   ├── date-format.test.ts
│   │   │   └── pagination.test.ts
│   │   └── types/                      # 🆕 Type safety tests
│   │       └── type-check.test.ts
│   └── integration/                       # 🆕 Integration tests
│       └── hris-workflow.test.ts
```

---

## 6. Test Cases Detail

---

### P0 --- Critical Tests (Wajib Sebelum Release)

#### 6.1 API Route Tests

##### 6.1.1 Candidates API (`src/test/unit/api/candidates.test.ts`)

| Test Case | Scenario | Expected Result |
|-----------|----------|-----------------|
| `GET-01` | Request list candidates tanpa filter | Return 200, array, pagination meta |
| `GET-02` | Filter by status = "screening" | Return data filtered |
| `GET-03` | Search dengan keyword "john" | Return hasil search sanitasi |
| `GET-04` | SQL Injection attempt: `search="; DROP TABLE` | Data escaped, return 200 kosong |
| `GET-05` | Rate limiting headers | X-RateLimit-* headers present |
| `POST-01` | Submit valid candidate | Status 201, id ter-generate |
| `POST-02` | Submit tanpa full_name | Status 400, message validation error |
| `POST-03` | Submit dengan email invalid | Status 400, error email format |
| `POST-04` | Submit duplicate email | Status 409, error email exists |
| `GET-05` | Get candidate by ID | Status 200, data + joined fields |
| `GET-06` | Get candidate ID not found | Status 404 |

**Code Skeleton:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from '@/app/api/candidates/route';

describe('API /api/candidates', () => {
  describe('GET', () => {
    it('returns paginated list of candidates', async () => {
      // Arrange
      const request = new Request('http://localhost:3000/api/candidates');
      
      // Act
      const response = await GET(request);
      const body = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toBeDefined();
    });
    
    it('filters by status parameter', async () => {
      // Arrange
      const request = new Request(
        'http://localhost:3000/api/candidates?status=screening'
      );
      
      // Act
      const response = await GET(request);
      const body = await response.json();
      
      // Assert
      expect(body.data.every((c: any) => c.status === 'screening')).toBe(true);
    });

    it('sanitizes search input against SQL injection', async () => {
      // Arrange
      const maliciousSearch = "'; DROP TABLE candidates; --";
      const request = new Request(
        `http://localhost:3000/api/candidates?search=${encodeURIComponent(maliciousSearch)}`
      );
      
      // Act
      const response = await GET(request);
      
      // Assert - should not throw, return empty or normal
      expect(response.status).toBe(200);
    });
  });

  describe('POST', () => {
    it('creates candidate with valid data', async () => {
      // Arrange
      const candidate = {
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '081234567890',
        domicile: 'Jakarta',
        source: 'portal',
      };
      const request = new Request('http://localhost:3000/api/candidates', {
        method: 'POST',
        body: JSON.stringify(candidate),
      });
      
      // Act
      const response = await POST(request);
      
      // Assert
      expect(response.status).toBe(201);
    });
    
    it('rejects candidate without full_name', async () => {
      // Arrange
      const invalid = { email: 'test@test.com' };
      const request = new Request('http://localhost:3000/api/candidates', {
        method: 'POST',
        body: JSON.stringify(invalid),
      });
      
      // Act
      const response = await POST(request);
      const body = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(body.error).toBeDefined();
    });
  });
});
```

---

##### 6.1.2 Employees API (`src/test/unit/api/employees.test.ts`)

| ID | Scenario | Priority |
|----|----------|----------|
| `EMP-GET-01` | List employees dengan filter department | P0 |
| `EMP-GET-02` | Search by NIP | P0 |
| `EMP-GET-03` | Pagination (page=2, limit=10) | P0 |
| `EMP-POST-01` | Create employee dengan NIP auto-generate | P0 |
| `EMP-POST-02` | Create dengan email duplicate (reject) | P0 |
| `EMP-POST-03` | Validate required fields | P0 |
| `EMP-PUT-01` | Update status → trigger history record | P0 |
| `EMP-PUT-02` | Update dengan email yang sudah dipakai user lain | P0 |
| `EMP-PUT-03` | Update NIP yang sudah ada | P0 |
| `EMP-DEL-01` | Soft delete → is_active=false + end_date set | P0 |

---

##### 6.1.3 POS Orders API (`src/test/unit/api/pos-orders.test.ts`)

> ⚠️ **CRITICAL BUG FIX TESTS** - Fokus pada XP accumulation fix

| ID | Scenario | Priority |
|----|----------|----------|
| `POS-POST-01` | Create order with paid amount ≥ total → status "completed" | P0 |
| `POS-POST-02` | Create order with ARK coins → deduct customer balance | P0 |
| `POS-POST-03` | Create order → XP earned ACCUMULATED (not overwritten!) | 🔴 P0 |
| `POS-POST-04` | Create order with customer_id=null → skip XP update | P0 |
| `POS-POST-05` | Invalid order (empty items) → reject 400 | P0 |
| `POS-PATCH-01` | Update to "completed" → set completed_at | P0 |
| `POS-PATCH-02` | Update with ARK payment → deduct balance | P0 |
| `POS-XP-01` | Customer dengan existing XP: 100, order earns 50 → XP jadi 150 | 🔴 P0 |
| `POS-XP-02` | Customer visit_count increment (bukan overwrite 1) | 🔴 P0 |

**Critical XP Test Skeleton:**
```typescript
describe('POS XP Accumulation (CRITICAL BUG FIX)', () => {
  it('ACCUMULATES XP instead of overwriting', async () => {
    // Arrange: Customer dengan 100 XP
    const customerId = 'test-customer-1';
    const currentXp = 100;
    const xpEarned = 75;
    const visitCount = 5;
    
    // Mock customer dengan data sebelumnya
    mockDb.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: customerId,
          total_xp: currentXp,
          current_xp: currentXp,
          visit_count: visitCount,
          membership_tier: 'gold'
        }
      })
    });
    
    // Act: Buat order
    const order = createMockOrder({ customer_id: customerId, xp_earned: xpEarned });
    const response = await POST(createRequest(order));
    
    // Assert: Total XP harus 175 (100 + 75), bukan 75
    expect(mockDb.from).toHaveBeenCalledWith('pos_customers');
    expect(mockDb.from().update).toHaveBeenCalledWith(
      expect.objectContaining({
        total_xp: currentXp + xpEarned,        // 175, bukan 75
        current_xp: currentXp + xpEarned,      // 175, bukan 75
        visit_count: visitCount + 1,           // 6, bukan 1
      })
    );
  });

  it('does NOT reset XP to earned amount only', async () => {
    // Ini regression test untuk BUG POS yang dicekik
    // Fail kalau ada yang nulis `total_xp: xp_earned` langsung
  });
});
```

---

##### 6.1.4 Auth/Authorization Tests (`src/test/api/auth.test.ts` - Extend)

| ID | Scenario | Priority |
|----|----------|----------|
| `AUTH-01` | API route dengan `createAdminClient()` → wajib ada session check | P0 |
| `AUTH-02` | `/api/candidates` GET tanpa login → 401 | P0 |
| `AUTH-03` | `/api/hris/employees` POST oleh non-HRD → 403 | P0 |
| `AUTH-04` | `/api/pos/orders` POST tanpa session → 401 | P0 |
| `AUTH-05` | `/api/purchasing/*` oleh role karyawan biasa → 403 | P0 |

---

#### 6.2 Component Tests

##### 6.2.1 PromoteCandidateButton (`src/test/unit/components/PromoteCandidateButton.test.tsx`)

| ID | Scenario | Priority |
|----|----------|----------|
| `PROMOTE-01` | Render "Promote" button jika candidate eligible | P0 |
| `PROMOTE-02` | Hide button jika `promoted_to_employee_id` sudah set | P0 |
| `PROMOTE-03` | Klik button → buka dialog | P0 |
| `PROMOTE-04` | Submit form → call API → show success | P0 |
| `PROMOTE-05` | Invalid employment_status → set as EmploymentStatus enum | P0 |

```typescript
describe('PromoteCandidateButton Component', () => {
  const eligibleCandidate = {
    id: 'candidate-1',
    full_name: 'John Doe',
    promoted_to_employee_id: null,
    // ...
  };

  it('renders promote button for eligible candidate', () => {
    render(<PromoteCandidateButton candidate={eligibleCandidate} />);
    expect(screen.getByText(/Promosikan/i)).toBeInTheDocument();
  });

  it('shows success state if already promoted', () => {
    const promotedCandidate = {
      ...eligibleCandidate,
      promoted_to_employee_id: 'emp-1',
    };
    render(<PromoteCandidateButton candidate={promotedCandidate} />);
    expect(screen.getByText(/Sudah Jadi Karyawan/i)).toBeInTheDocument();
  });

  it('opens dialog on click and submits promotion form', async () => {
    const user = userEvent.setup();
    render(<PromoteCandidateButton candidate={eligibleCandidate} />);
    
    // Open dialog
    await user.click(screen.getByText(/Promosikan/i));
    expect(screen.getByText(/Promosikan ke Karyawan/i)).toBeInTheDocument();
    
    // Fill form
    await user.type(screen.getByLabelText(/Join Date/i), '2025-01-15');
    await user.selectOptions(
      screen.getByLabelText(/Status Karyawan/i),
      'permanent'
    );
    
    // Submit
    await user.click(screen.getByText(/Konfirmasi/i));
    
    // API call assertion
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/hris/promote',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('candidate_id'),
      })
    );
  });
});
```

---

#### 6.3 Type Validation Tests

##### 6.3.1 Zod Schema Validation (`src/test/unit/api/schemas.test.ts` - Extend)

| ID | Schema | Scenario | Priority |
|----|--------|----------|----------|
| `ZOD-01` | Candidate | Accept valid data | P0 |
| `ZOD-02` | Candidate | Reject missing full_name | P0 |
| `ZOD-03` | Candidate | Reject invalid email format | P0 |
| `ZOD-04` | Candidate | Reject invalid phone (non-Indonesian) | P0 |
| `ZOD-05` | Candidate | Reject invalid status enum | P0 |
| `ZOD-06` | Employee | Accept valid employment_status enum | P0 |
| `ZOD-07` | Employee | Rejoin date format fail | P0 |
| `ZOD-08` | Employee | NIP format validasi | P0 |

---

### P1 --- Important Tests

#### 6.4 Component Tests

##### 6.4.1 EmployeeTable Component

| ID | Scenario |
|----|----------|
| `TABLE-01` | Render dengan data kosong → show empty state |
| `TABLE-02` | Render dengan data → kolom NIP, Nama, Dept, Jabatan |
| `TABLE-03` | Filter by employment status |
| `TABLE-04` | Search by name |
| `TABLE-05` | Pagination click → fetch new page |
| `TABLE-06` | Loading state → skeleton |
| `TABLE-07` | Klik "Detail" → navigate ke employee detail |

#### 6.5 Integration Tests

##### 6.5.1 HRIS Workflow (`src/test/integration/hris-workflow.test.ts`)

| ID | Workflow Step |
|----|---------------|
| `WF-01` | Candidate baru apply → status: "new" |
| `WF-02` | HR screening → status: "screening" |
| `WF-03` | Interview HRD → status: "interview_hrd" |
| `WF-04` | Interview Manager → status: "interview_manager" |
| `WF-05` | Manager approve → status: "hired" |
| `WF-06` | Promote to Employee → NIP generate, employee record created |
| `WF-07` | Check employee data: nip format EMP-YYYY-XXXXX |

---

### P2 --- Nice-to-Have

#### 6.6 Type Safety & Coverage

| ID | Scenario |
|----|----------|
| `TYPE-01` | No `any` types in API routes |
| `TYPE-02` | No `any` types in components |
| `TYPE-03` | All API responses typed correctly |

---

## 7. Mocking Strategy

### 7.1 pg pool Mock (`src/test/mocks/pg-pool.ts`)

```typescript
import { vi } from 'vitest';

/**
 * Mock pg pool / REST API untuk testing API routes
 * Tidak perlu koneksi database asli (tidak ada network call)
 */
export const createMockDb = () => ({
  auth: {
    getUser: vi.fn(() => 
      Promise.resolve({ data: { user: { id: 'test-user-1', email: 'test@test.com' } } })
    ),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    inList: vi.fn().mockReturnThis(),
    count: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    then: vi.fn().mockReturnThis(),
  })),
  rpc: vi.fn(),
});

/**
 * Mock untuk createClient (server)
 */
export const mockServerClient = () => {
  const mock = createMockDb();
  vi.mock('@/lib/pg/create-client', () => ({
    createClient: vi.fn(() => Promise.resolve(mock)),
  }));
  return mock;
};
```

### 7.2 Next.js Mock (`src/test/mocks/nextjs.ts`)

```typescript
import { vi } from 'vitest';

// Mock next/server
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init = {}) => ({
      status: init.status || 200,
      json: () => Promise.resolve(data),
      headers: new Headers(),
    })),
  },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => '/dashboard'),
}));
```

### 7.3 Fixtures (`src/test/mocks/fixtures/`)

```typescript
// fixtures/employees.ts
export const mockEmployee = {
  id: 'emp-1',
  full_name: 'Jane Smith',
  nip: 'EMP-2025-00001',
  email: 'jane@test.com',
  phone: '081234567890',
  join_date: '2025-01-15',
  employment_status: 'permanent',
  department_id: 'dept-1',
  section_id: 'sec-1',
  job_title_id: 'pos-1',
  department: { id: 'dept-1', name: 'IT', code: 'IT' },
  job_title: { id: 'pos-1', title: 'Software Engineer' },
};
```

---

## 8. Execution Roadmap

### 📅 Sprint Breakdown

| Sprint | Focus Area | Estimasi | File Tests | Stories |
|--------|------------|----------|------------|---------|
| **Sprint 1** | Setup mocks + candidates API | 4 jam | 1 (candidates.test.ts) + mocks | 5 test cases |
| **Sprint 2** | HRIS employees API | 4 jam | 1 (employees.test.ts) | 10 test cases |
| **Sprint 3** | POS orders + XP logic | 5 jam | 1 (pos-orders.test.ts) | 8 test cases |
| **Sprint 4** | Components (PromoteButton, Table) | 3 jam | 2-3 test files | 6 test cases |
| **Sprint 5** | Schema validation + integration | 3 jam | 2 test files (schemas, workflow) | 8 test cases |
| **Sprint 6** | Coverage gap + edge cases | 2 jam | Utility tests | - |

**Total Estimasi:** 21 jam (~2.5 hari kerja intensif)

### 🔄 Development Cycle

```
Week 1 (Sprint 1-2):  API Routes (candidates + employees)
Week 2 (Sprint 3-4):  POS + Components
Week 3 (Sprint 5-6):  Integration + Coverage
```

---

## 9. Definition of Done

### ✅ Acceptance Criteria

| # | Criteria | How to Verify |
|---|----------|---------------|
| 1 | `npm run test` lulus tanpa failure | Jalankan command |
| 2 | Coverage API routes > 80% | `npm run test:coverage` |
| 2 | Coverage components > 50% | `npm run test:coverage` |
| 3 | Coverage types/validation > 90% | `npm run test:coverage` |
| 4 | Tidak ada `any` types di test files | `grep -r ": any" src/test/ --include="*.ts"` → kosong |
| 5 | All mocks reusable | Cek `src/test/mocks/` terstruktur |
| 6 | POS XP bug fix ter-test | Test assert total_xp = prev + earned |
| 7 | Auth flow ter-proteksi | Test assert 401/403 untuk unauthorized |
| 8 | Regression suite di CI | `npm run test` di pre-commit atau CI pipeline |

### 📊 Coverage Report Format

```json
{
  "total": {
    "lines": { "total": 5000, "covered": 3500, "pct": 70 },
    "functions": { "total": 800, "covered": 600, "pct": 75 },
    "branches": { "total": 2000, "covered": 1200, "pct": 60 }
  }
}
```

---

## 10. Appendix

### A. Commands Reference

| Command | Purpose |
|---------|---------|
| `npm run test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate coverage report |
| `npx vitest run --reporter=verbose` | Detailed test output |
| `npx vitest run src/test/unit/api/candidates.test.ts` | Run single file |

### B. Best Practices

1. **Arrange-Act-Assert** - Selalu gunakan pattern 3A
2. **Mock External Dependencies** - pg pool, fetch, next/router
3. **Descriptive Names** - `it('should return 404 when candidate not found')`
4. **Isolation** - Tiap test harus bisa jalan sendiri
5. **Cleanup** - Gunakan `beforeEach` untuk reset mocks
6. **Coverage** - Targetkan happy path + error path

### C. Resources

- [Vitest Documentation](https://vitest.dev/guide/)
- [Testing Library](https://testing-library.com/)
- [mock.js Best Practices](https://vitest.dev/guide/mocking.html)

---

## 📋 Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| Author | OpenCode AI | Mei 2026 | ✅ Draft |
| Reviewer | [Pending] | - | ⏳ Not Reviewed |
| Approval | [Pending] | - | ⏳ Pending |

---

*Document ini siap untuk review. Setelah approved, eksekusi dimulai dari Sprint 1: Setup Mocks & Candidate API Tests.* 🚀
