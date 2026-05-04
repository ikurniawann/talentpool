-- Migration: Fix Known Issues from Fase 1
-- Date: 2026-05-04
-- Description: Auto-create leave balances, improve GPS validation, add notifications

-- ============================================
-- 1. AUTO-CREATE LEAVE BALANCE TRIGGER
-- ============================================

-- Function to auto-create leave balance when employee joins
CREATE OR REPLACE FUNCTION initialize_employee_leave_balance()
RETURNS TRIGGER AS $$
DECLARE
  join_year INTEGER;
  join_month INTEGER;
  months_remaining INTEGER;
  pro_rated_leave INTEGER;
BEGIN
  -- Get join year and month
  join_year := EXTRACT(YEAR FROM NEW.join_date);
  join_month := EXTRACT(MONTH FROM NEW.join_date);
  
  -- Calculate pro-rated annual leave
  months_remaining := 12 - join_month;
  pro_rated_leave := GREATEST(0, FLOOR((months_remaining::DECIMAL / 12.0) * 12));
  
  -- Insert leave balance for current year
  INSERT INTO leave_balances (
    employee_id,
    year,
    annual_leave_total,
    annual_leave_used,
    sick_leave_used,
    unpaid_leave_used,
    maternity_leave_used,
    paternity_leave_used,
    emergency_leave_used,
    pilgrimage_leave_used,
    menstrual_leave_used
  ) VALUES (
    NEW.id,
    join_year,
    pro_rated_leave,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_employee_create_init_leave_balance ON employees;

-- Create trigger on employee insert
CREATE TRIGGER on_employee_create_init_leave_balance
  AFTER INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION initialize_employee_leave_balance();

-- ============================================
-- 2. AUTO-CREATE LEAVE BALANCE FOR NEW YEAR
-- ============================================

-- Function to create leave balances for new year
CREATE OR REPLACE FUNCTION create_annual_leave_balances(year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE))
RETURNS INTEGER AS $$
DECLARE
  emp RECORD;
  created_count INTEGER := 0;
  leave_quota INTEGER := 12;
BEGIN
  -- Loop through all active employees
  FOR emp IN 
    SELECT id, join_date 
    FROM employees 
    WHERE is_active = true 
    AND employment_status NOT IN ('resigned', 'terminated')
  LOOP
    -- Check if balance already exists
    IF NOT EXISTS (
      SELECT 1 FROM leave_balances 
      WHERE employee_id = emp.id AND year = year
    ) THEN
      -- Calculate pro-rated for first year
      IF EXTRACT(YEAR FROM emp.join_date) = year THEN
        leave_quota := GREATEST(0, FLOOR(
          ((12 - EXTRACT(MONTH FROM emp.join_date))::DECIMAL / 12.0) * 12
        ));
      ELSE
        leave_quota := 12;
      END IF;
      
      -- Insert new balance
      INSERT INTO leave_balances (
        employee_id,
        year,
        annual_leave_total,
        annual_leave_used,
        sick_leave_used,
        unpaid_leave_used,
        maternity_leave_used,
        paternity_leave_used,
        emergency_leave_used,
        pilgrimage_leave_used,
        menstrual_leave_used
      ) VALUES (
        emp.id,
        year,
        leave_quota,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      );
      
      created_count := created_count + 1;
    END IF;
  END LOOP;
  
  RETURN created_count;
END;
$$ LANGUAGE plpgsql;

-- Example: Run this at the beginning of each year
-- SELECT create_annual_leave_balances(2026);

-- ============================================
-- 3. IMPROVED GPS VALIDATION
-- ============================================

-- Function to validate GPS coordinates
CREATE OR REPLACE FUNCTION validate_gps_location(
  latitude DECIMAL,
  longitude DECIMAL,
  accuracy DECIMAL DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check latitude range (-90 to 90)
  IF latitude < -90 OR latitude > 90 THEN
    RETURN FALSE;
  END IF;
  
  -- Check longitude range (-180 to 180)
  IF longitude < -180 OR longitude > 180 THEN
    RETURN FALSE;
  END IF;
  
  -- Check accuracy if provided (should be < 1000 meters for reasonable accuracy)
  IF accuracy IS NOT NULL AND accuracy > 1000 THEN
    RETURN FALSE;
  END IF;
  
  -- Check for null island (0, 0) - common GPS error
  IF ABS(latitude) < 0.0001 AND ABS(longitude) < 0.0001 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add check constraint to attendance table
ALTER TABLE attendance 
  DROP CONSTRAINT IF EXISTS valid_gps_coordinates;

-- Note: Can't add CHECK constraint with function call directly
-- Instead, we'll add a trigger for validation

CREATE OR REPLACE FUNCTION validate_attendance_gps()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate clock_in_location if present
  IF NEW.clock_in_location IS NOT NULL THEN
    IF NOT validate_gps_location(
      (NEW.clock_in_location->>'latitude')::DECIMAL,
      (NEW.clock_in_location->>'longitude')::DECIMAL,
      (NEW.clock_in_location->>'accuracy')::DECIMAL
    ) THEN
      RAISE EXCEPTION 'Invalid GPS coordinates for clock_in_location';
    END IF;
  END IF;
  
  -- Validate clock_out_location if present
  IF NEW.clock_out_location IS NOT NULL THEN
    IF NOT validate_gps_location(
      (NEW.clock_out_location->>'latitude')::DECIMAL,
      (NEW.clock_out_location->>'longitude')::DECIMAL,
      (NEW.clock_out_location->>'accuracy')::DECIMAL
    ) THEN
      RAISE EXCEPTION 'Invalid GPS coordinates for clock_out_location';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_attendance_gps_before_insert ON attendance;

CREATE TRIGGER validate_attendance_gps_before_insert
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION validate_attendance_gps();

-- ============================================
-- 4. IN-APP NOTIFICATION SYSTEM
-- ============================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- leave_request, leave_approved, leave_rejected, attendance_alert, onboarding_task, offboarding_alert, general
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  action_url VARCHAR(500), -- Optional URL for action
  metadata JSONB DEFAULT '{}', -- Additional data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Optional expiration
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_employee_id_idx ON notifications(employee_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- RLS policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY users_view_own_notifications ON notifications
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.user_id = auth.uid() 
      AND employees.id = notifications.employee_id
    )
  );

-- Policy: System can insert notifications (via service role)
CREATE POLICY system_insert_notifications ON notifications
  FOR INSERT
  WITH CHECK (true); -- Allow service role to insert

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY users_update_own_notifications ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_employee_id UUID,
  p_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_action_url VARCHAR DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    employee_id,
    type,
    title,
    message,
    action_url,
    metadata
  ) VALUES (
    p_user_id,
    p_employee_id,
    p_type,
    p_title,
    p_message,
    p_action_url,
    p_metadata
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET 
    is_read = TRUE,
    read_at = NOW()
  WHERE id = p_notification_id
  AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET 
    is_read = TRUE,
    read_at = NOW()
  WHERE user_id = auth.uid()
  AND is_read = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. NOTIFICATION TRIGGERS
-- ============================================

-- Trigger: Notify manager on new leave request
CREATE OR REPLACE FUNCTION notify_on_leave_request()
RETURNS TRIGGER AS $$
DECLARE
  v_manager_id UUID;
  v_employee RECORD;
BEGIN
  -- Get employee info
  SELECT e.*, u.id as user_id
  INTO v_employee
  FROM employees e
  LEFT JOIN users u ON u.id = e.user_id
  WHERE e.id = NEW.employee_id;
  
  -- Get manager (simplified - in real app, get from org structure)
  SELECT id INTO v_manager_id
  FROM users
  WHERE role IN ('hiring_manager', 'hrd')
  LIMIT 1;
  
  -- Create notification for manager
  IF v_manager_id IS NOT NULL THEN
    PERFORM create_notification(
      v_manager_id,
      NEW.employee_id,
      'leave_request',
      'Pengajuan Cuti Baru',
      v_employee.full_name || ' mengajukan ' || 
        CASE NEW.leave_type
          WHEN 'annual' THEN 'cuti tahunan'
          WHEN 'sick' THEN 'cuti sakit'
          WHEN 'maternity' THEN 'cuti melahirkan'
          WHEN 'paternity' THEN 'cuti ayah'
          WHEN 'unpaid' THEN 'cuti tanpa upah'
          WHEN 'emergency' THEN 'cuti darurat'
          WHEN 'pilgrimage' THEN 'cuti haji/umrah'
          WHEN 'menstrual' THEN 'cuti haid'
          ELSE NEW.leave_type
        END || ' selama ' || NEW.total_days || ' hari.',
      '/dashboard/hris/leaves',
      jsonb_build_object(
        'leave_id', NEW.id,
        'leave_type', NEW.leave_type,
        'total_days', NEW.total_days,
        'start_date', NEW.start_date,
        'end_date', NEW.end_date
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notify_on_leave_request_insert ON leaves;

CREATE TRIGGER notify_on_leave_request_insert
  AFTER INSERT ON leaves
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_on_leave_request();

-- Trigger: Notify employee on leave approval/rejection
CREATE OR REPLACE FUNCTION notify_on_leave_decision()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_user_id UUID;
BEGIN
  -- Get employee's user_id
  SELECT user_id INTO v_employee_user_id
  FROM employees
  WHERE id = NEW.employee_id;
  
  IF v_employee_user_id IS NOT NULL THEN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
      PERFORM create_notification(
        v_employee_user_id,
        NEW.employee_id,
        'leave_approved',
        'Cuti Disetujui',
        'Pengajuan cuti Anda telah disetujui oleh ' || 
          COALESCE(
            (SELECT full_name FROM employees WHERE id = NEW.approved_by),
            'HRD/Manager'
          ) || '.',
        '/dashboard/hris/leaves',
        jsonb_build_object('leave_id', NEW.id, 'status', NEW.status)
      );
    ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
      PERFORM create_notification(
        v_employee_user_id,
        NEW.employee_id,
        'leave_rejected',
        'Cuti Ditolak',
        'Pengajuan cuti Anda ditolak. Alasan: ' || 
          COALESCE(NEW.rejection_reason, 'Tidak ada alasan diberikan.'),
        '/dashboard/hris/leaves',
        jsonb_build_object('leave_id', NEW.id, 'status', NEW.status, 'reason', NEW.rejection_reason)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notify_on_leave_decision_update ON leaves;

CREATE TRIGGER notify_on_leave_decision_update
  AFTER UPDATE ON leaves
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND (NEW.status = 'approved' OR NEW.status = 'rejected'))
  EXECUTE FUNCTION notify_on_leave_decision();

-- ============================================
-- 6. CLEANUP: Remove expired notifications
-- ============================================

-- Function to cleanup old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE created_at < NOW() - (days_old || ' days')::INTERVAL
  OR (expires_at IS NOT NULL AND expires_at < NOW());
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENT: Migration Info
-- ============================================
COMMENT ON SCHEMA public IS 'HRIS Fase 1 - Known Issues Fixed: Auto leave balance, GPS validation, Notifications';
