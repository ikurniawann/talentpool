#!/usr/bin/env python3
import re

with open('/Users/ilham/Desktop/talentpool/migrations/003_360_feedback_complete_clean.sql', 'r') as f:
    content = f.read()

# Fix CREATE INDEX
content = re.sub(r'^CREATE INDEX idx_', 'CREATE INDEX IF NOT EXISTS idx_', content, flags=re.MULTILINE)

# Fix DROP POLICY before CREATE POLICY
content = re.sub(
    r'CREATE POLICY "allow all (\w+)" ON (\w+) FOR ALL USING \(true\);',
    r'DROP POLICY IF EXISTS "allow all \1" ON \2;\nCREATE POLICY "allow all \1" ON \2 FOR ALL USING (true);',
    content
)

# Fix DROP TRIGGER before CREATE TRIGGER
content = re.sub(
    r'CREATE TRIGGER trg_calculate_feedback_summary',
    r'DROP TRIGGER IF EXISTS trg_calculate_feedback_summary ON feedback_responses;\nCREATE TRIGGER trg_calculate_feedback_summary',
    content
)

# Fix feedback_cycles INSERT
content = re.sub(
    r"INSERT INTO feedback_cycles \(id, name, period_label, start_date, end_date, status, kpi_weight, feedback_weight, is_anonymous, allow_self_assessment, require_manager_review\) VALUES\n  \('7b8c9563-60e3-4e11-9233-5ef98fec9dc8', 'Q1 2026 Performance Review', 'Q1 2026', '2026-01-01', '2026-03-31', 'completed', 70\.00, 30\.00, true, true, true\);",
    "INSERT INTO feedback_cycles (id, name, period_label, start_date, end_date, status, kpi_weight, feedback_weight, is_anonymous, allow_self_assessment, require_manager_review) VALUES\n  ('7b8c9563-60e3-4e11-9233-5ef98fec9dc8', 'Q1 2026 Performance Review', 'Q1 2026', '2026-01-01', '2026-03-31', 'completed', 70.00, 30.00, true, true, true)\nON CONFLICT (id) DO NOTHING;",
    content
)

# Fix feedback_summaries INSERT - remove id and gen_random_uuid(), add ON CONFLICT
content = re.sub(
    r"INSERT INTO feedback_summaries \(id, cycle_id, employee_id, ([^(]+)\) SELECT gen_random_uuid\(\), '7b8c9563-60e3-4e11-9233-5ef98fec9dc8', e\.id, ([^;]+);",
    r"INSERT INTO feedback_summaries (cycle_id, employee_id, \1) SELECT '7b8c9563-60e3-4e11-9233-5ef98fec9dc8', e.id, \2 ON CONFLICT (cycle_id, employee_id) DO NOTHING;",
    content
)

with open('/Users/ilham/Desktop/talentpool/migrations/003_360_feedback_final.sql', 'w') as f:
    f.write(content)

print("Migration file fixed: 003_360_feedback_final.sql")
