# 360° Feedback System

## Overview

360° Feedback System adalah implementasi dari konsep **KPI 360° Intelligence** yang menggabungkan:
- **KPI (60-70%)**: Performance metrics berbasis hasil
- **360° Feedback (30-40%)**: Behavioral metrics dari multi-source feedback

## Architecture

### Database Tables

```
feedback_cycles           # Periode feedback (Q1, Q2, Annual)
    └── feedback_assignments  # Siapa menilai siapa
            └── feedback_responses  # Jawaban per criteria
                    └── feedback_summaries  # Aggregated scores + AI insights
                            └── development_plans  # Action items
```

### Behavioral Categories (5 Metrics)

1. **Leadership** (20%)
   - Menetapkan arah dan tujuan yang jelas
   - Memberikan feedback konstruktif
   - Menginspirasi dan memotivasi

2. **Communication** (20%)
   - Komunikasi verbal yang efektif
   - Komunikasi tertulis yang baik
   - Mendengarkan aktif

3. **Collaboration** (20%)
   - Berbagi pengetahuan
   - Dukungan kepada rekan tim
   - Fleksibilitas dalam tim

4. **Accountability** (20%)
   - Memenuhi komitmen
   - Tanggung jawab atas kesalahan
   - Inisiatif dan proaktif

5. **Problem Solving** (20%)
   - Analisis masalah sistematis
   - Solusi kreatif dan inovatif
   - Pengambilan keputusan

## Scoring Formula

```
Final Score = (KPI Score × 70%) + (360° Score × 30%)

360° Score = Average dari semua reviewer × semua criteria
```

### Grade Scale

| Score | Grade | Description |
|-------|-------|-------------|
| 90-100 | A | Excellent |
| 80-89 | B | Good |
| 70-79 | C | Average |
| 60-69 | D | Below Average |
| < 60 | E | Poor |

## API Endpoints

### Feedback Cycles
- `GET /api/hris/feedback-cycles` - List cycles
- `POST /api/hris/feedback-cycles` - Create cycle
- `GET /api/hris/feedback-cycles/[id]` - Get cycle detail
- `PUT /api/hris/feedback-cycles/[id]` - Update cycle
- `DELETE /api/hris/feedback-cycles/[id]` - Delete cycle

### Feedback Assignments
- `GET /api/hris/feedback-assignments` - List assignments
- `POST /api/hris/feedback-assignments` - Create assignment(s)
- `GET /api/hris/feedback-assignments/[id]` - Get assignment detail
- `PUT /api/hris/feedback-assignments/[id]` - Update assignment
- `DELETE /api/hris/feedback-assignments/[id]` - Delete assignment

### Feedback Responses
- `GET /api/hris/feedback-responses` - List responses
- `POST /api/hris/feedback-responses` - Submit response(s)
- `GET /api/hris/feedback-responses/[id]` - Get response detail
- `PUT /api/hris/feedback-responses/[id]` - Update response
- `DELETE /api/hris/feedback-responses/[id]` - Delete response

### Feedback Summaries
- `GET /api/hris/feedback-summaries` - List summaries
- `POST /api/hris/feedback-summaries` - Create summary

### Feedback Categories
- `GET /api/hris/feedback-categories` - List categories + criteria

## UI Pages

### 1. Cycles Management
**Path:** `/dashboard/hris/performance/360-feedback/cycles`

Fitur:
- View all feedback cycles
- Create new cycle
- Edit/delete draft cycles
- Track progress (completion rate)

### 2. Submit Feedback
**Path:** `/dashboard/hris/performance/360-feedback/submit`

Fitur:
- View pending assignments
- Rate employees per criteria (1-5 scale)
- Add written comments
- Submit feedback

### 3. Results Dashboard
**Path:** `/dashboard/hris/performance/360-feedback/results`

Fitur:
- View all feedback summaries
- Filter by grade
- See behavioral scores breakdown
- AI insights (strengths, weaknesses)
- Burnout risk & promotion potential

## Workflow

### 1. HR Admin Creates Cycle
```
1. Navigate to 360° Feedback > Cycles
2. Click "New Cycle"
3. Fill in:
   - Name (e.g., "Q1 2026 Performance Review")
   - Period Label (e.g., "Q1 2026")
   - Start & End Dates
   - KPI/Feedback weights (default 70/30)
   - Options (anonymous, self-assessment, manager review)
4. Save
```

### 2. Assign Reviewers
```
1. Open cycle detail
2. Click "Assign Reviewers"
3. Select employees to be reviewed
4. For each employee, assign:
   - Manager (1)
   - Peers (multiple)
   - Subordinates (if any)
   - Self (optional)
5. Save assignments
```

### 3. Employees Submit Feedback
```
1. Navigate to 360° Feedback > Submit Feedback
2. Select employee to review
3. Rate each criteria (1-5)
4. Add comments (optional but recommended)
5. Submit
```

### 4. Auto-Calculation
```
- Trigger: When response is submitted
- Process:
  1. Calculate average per category
  2. Calculate overall 360° score
  3. Fetch KPI score from employee_kpis
  4. Calculate final score (70/30)
  5. Determine grade (A-E)
  6. Generate AI insights (future)
```

### 5. Manager Review
```
1. Manager receives notification
2. Review summary + insights
3. Approve or request revision
4. Finalize
```

## Migration

### Step 1: Run Core Schema
```bash
# In Supabase SQL Editor or via CLI
psql -h <host> -U postgres -d talentpool -f migrations/003_360_feedback_system.sql
```

### Step 2: Import Dummy Data (Optional)
```bash
# Import seed data dari KPI 360 Data Dummy.xlsx
psql -h <host> -U postgres -d talentpool -f migrations/004_seed_360_feedback_complete.sql
```

**Note:** File seed data akan:
- Create feedback cycle "Q1 2026 Performance Review"
- Insert 40 feedback summaries dengan AI insights
- Match employees berdasarkan NIP (EMP001, EMP002, dst)

**Data Statistics:**
- Total employees: 40
- Score range: 63.05 - 90.04
- Average Final Score: 77.91
- Grade distribution:
  - Grade A: 1 employee
  - Grade B: 15 employees
  - Grade C: 21 employees
  - Grade D: 3 employees

## Next Steps (Phase 2)

### AI Enhancement Layer
- [ ] Sentiment analysis untuk feedback comments
- [ ] Bias detection dalam scoring
- [ ] Pattern recognition (KPI vs behavior gap)
- [ ] Predictive insights (burnout, promotion)

### Integration
- [ ] Auto-populate KPI scores dari employee_kpis
- [ ] Email notifications untuk assignments
- [ ] Reminder system untuk pending feedback
- [ ] Export to PDF/Excel

### Development Plans
- [ ] Create development plan dari weaknesses
- [ ] Track progress improvement
- [ ] Link ke training/courses
- [ ] Manager check-ins

## Files Created

### Migrations
- `migrations/003_360_feedback_system.sql`

### API Routes
- `src/app/api/hris/feedback-cycles/route.ts`
- `src/app/api/hris/feedback-cycles/[id]/route.ts`
- `src/app/api/hris/feedback-assignments/route.ts`
- `src/app/api/hris/feedback-assignments/[id]/route.ts`
- `src/app/api/hris/feedback-responses/route.ts`
- `src/app/api/hris/feedback-responses/[id]/route.ts`
- `src/app/api/hris/feedback-summaries/route.ts`
- `src/app/api/hris/feedback-categories/route.ts`

### UI Pages
- `src/app/dashboard/(dashboard)/hris/performance/360-feedback/page.tsx`
- `src/app/dashboard/(dashboard)/hris/performance/360-feedback/cycles/page.tsx`
- `src/app/dashboard/(dashboard)/hris/performance/360-feedback/cycles/new/page.tsx`
- `src/app/dashboard/(dashboard)/hris/performance/360-feedback/submit/page.tsx`
- `src/app/dashboard/(dashboard)/hris/performance/360-feedback/results/page.tsx`

### Documentation
- `docs/360-feedback-system.md` (this file)
