-- Fix fn_notify_leave_changes: cast leave_type to text before CASE comparison
-- so PostgreSQL does not try to implicitly cast 'marriage'/'bereavement'
-- string literals to the leave_type enum (which does not contain them).
CREATE OR REPLACE FUNCTION fn_notify_leave_changes()
RETURNS trigger AS $$
DECLARE
  v_employee_name text;
  v_employee_user_id uuid;
  v_leave_label text;
BEGIN
  SELECT full_name, user_id INTO v_employee_name, v_employee_user_id
  FROM employees WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);

  v_leave_label := CASE COALESCE(NEW.leave_type, OLD.leave_type)::text
    WHEN 'annual'      THEN 'Tahunan'
    WHEN 'sick'        THEN 'Sakit'
    WHEN 'maternity'   THEN 'Melahirkan'
    WHEN 'paternity'   THEN 'Ayah'
    WHEN 'unpaid'      THEN 'Tidak Dibayar'
    WHEN 'emergency'   THEN 'Darurat'
    WHEN 'pilgrimage'  THEN 'Ibadah Haji/Umrah'
    WHEN 'menstrual'   THEN 'Haid'
    ELSE 'Lainnya'
  END;

  IF TG_OP = 'INSERT' THEN
    PERFORM notify_hrd(
      '📋 Pengajuan Cuti Baru',
      v_employee_name || ' mengajukan cuti ' || v_leave_label ||
        ' (' || NEW.total_days || ' hari) — ' ||
        to_char(NEW.start_date::date, 'DD Mon YYYY') || ' s/d ' ||
        to_char(NEW.end_date::date, 'DD Mon YYYY'),
      'approval',
      '/dashboard/hris/leaves'
    );

  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN

    IF NEW.status = 'approved' THEN
      PERFORM notify_user(
        v_employee_user_id,
        '✅ Cuti Disetujui',
        'Pengajuan cuti ' || v_leave_label || ' kamu (' || NEW.total_days || ' hari) telah disetujui.',
        'status_change',
        '/dashboard/hris/leaves'
      );
      PERFORM notify_hrd(
        '✅ Cuti Disetujui: ' || v_employee_name,
        'Cuti ' || v_leave_label || ' (' || NEW.total_days || ' hari) telah disetujui.',
        'status_change',
        '/dashboard/hris/leaves'
      );

    ELSIF NEW.status = 'rejected' THEN
      PERFORM notify_user(
        v_employee_user_id,
        '❌ Cuti Ditolak',
        'Pengajuan cuti ' || v_leave_label || ' kamu (' || NEW.total_days || ' hari) ditolak.' ||
          CASE WHEN NEW.rejection_reason IS NOT NULL
               THEN ' Alasan: ' || NEW.rejection_reason
               ELSE '' END,
        'alert',
        '/dashboard/hris/leaves'
      );

    ELSIF NEW.status = 'cancelled' THEN
      PERFORM notify_hrd(
        '🚫 Cuti Dibatalkan',
        v_employee_name || ' membatalkan pengajuan cuti ' || v_leave_label || '.',
        'status_change',
        '/dashboard/hris/leaves'
      );
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    PERFORM notify_hrd(
      '🗑️ Pengajuan Cuti Dihapus',
      'Pengajuan cuti ' || v_leave_label || ' dari ' || v_employee_name || ' telah dihapus.',
      'alert',
      '/dashboard/hris/leaves'
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
