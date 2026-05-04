-- ============================================================
-- HRIS Notification Triggers
-- Auto-insert ke tabel notifications saat event CRUD terjadi
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Kirim notifikasi ke semua user HRD
CREATE OR REPLACE FUNCTION notify_hrd(
  p_title text,
  p_message text,
  p_type text,
  p_link text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT id, p_title, p_message, p_type, p_link
  FROM users
  WHERE role = 'hrd';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kirim notifikasi ke user tertentu (by user_id)
CREATE OR REPLACE FUNCTION notify_user(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text,
  p_link text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  IF p_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (p_user_id, p_title, p_message, p_type, p_link);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kirim ke HRD + manager langsung karyawan (via reporting_to)
CREATE OR REPLACE FUNCTION notify_hrd_and_manager(
  p_employee_id uuid,
  p_title text,
  p_message text,
  p_type text,
  p_link text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_manager_user_id uuid;
BEGIN
  -- Notify all HRD
  PERFORM notify_hrd(p_title, p_message, p_type, p_link);

  -- Notify manager jika ada (cari user_id dari reporting_to)
  SELECT u.user_id INTO v_manager_user_id
  FROM employees e
  JOIN employees m ON m.id = e.reporting_to
  LEFT JOIN employees u ON u.id = m.id
  WHERE e.id = p_employee_id
  LIMIT 1;

  IF v_manager_user_id IS NOT NULL THEN
    PERFORM notify_user(v_manager_user_id, p_title, p_message, p_type, p_link);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 1. LEAVES — Pengajuan & Status Cuti
-- ============================================================

CREATE OR REPLACE FUNCTION fn_notify_leave_changes()
RETURNS trigger AS $$
DECLARE
  v_employee_name text;
  v_employee_user_id uuid;
  v_leave_label text;
BEGIN
  -- Ambil nama & user_id karyawan
  SELECT full_name, user_id INTO v_employee_name, v_employee_user_id
  FROM employees WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);

  -- Label tipe cuti
  v_leave_label := CASE COALESCE(NEW.leave_type, OLD.leave_type)
    WHEN 'annual'      THEN 'Tahunan'
    WHEN 'sick'        THEN 'Sakit'
    WHEN 'maternity'   THEN 'Melahirkan'
    WHEN 'paternity'   THEN 'Ayah'
    WHEN 'marriage'    THEN 'Pernikahan'
    WHEN 'bereavement' THEN 'Duka Cita'
    WHEN 'unpaid'      THEN 'Tidak Dibayar'
    ELSE 'Lainnya'
  END;

  -- INSERT: pengajuan baru → notify HRD
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

  -- UPDATE: status berubah → notify karyawan & HRD
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN

    -- Approved → notify karyawan
    IF NEW.status = 'approved' THEN
      PERFORM notify_user(
        v_employee_user_id,
        '✅ Cuti Disetujui',
        'Pengajuan cuti ' || v_leave_label || ' kamu (' || NEW.total_days || ' hari) telah disetujui.',
        'status_change',
        '/dashboard/hris/leaves'
      );
      -- Juga notify HRD sebagai konfirmasi
      PERFORM notify_hrd(
        '✅ Cuti Disetujui: ' || v_employee_name,
        'Cuti ' || v_leave_label || ' (' || NEW.total_days || ' hari) telah disetujui.',
        'status_change',
        '/dashboard/hris/leaves'
      );

    -- Rejected → notify karyawan
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

    -- Cancelled → notify HRD
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM notify_hrd(
        '🚫 Cuti Dibatalkan',
        v_employee_name || ' membatalkan pengajuan cuti ' || v_leave_label || '.',
        'status_change',
        '/dashboard/hris/leaves'
      );
    END IF;

  -- DELETE: pengajuan dihapus → notify HRD
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

DROP TRIGGER IF EXISTS trg_notify_leave_changes ON leaves;
CREATE TRIGGER trg_notify_leave_changes
  AFTER INSERT OR UPDATE OR DELETE ON leaves
  FOR EACH ROW EXECUTE FUNCTION fn_notify_leave_changes();

-- ============================================================
-- 2. ATTENDANCE — Clock In / Clock Out
-- ============================================================

CREATE OR REPLACE FUNCTION fn_notify_attendance_changes()
RETURNS trigger AS $$
DECLARE
  v_employee_name text;
  v_employee_user_id uuid;
BEGIN
  SELECT full_name, user_id INTO v_employee_name, v_employee_user_id
  FROM employees WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);

  -- Clock-in baru (terlambat saja yang di-notify agar tidak noisy)
  IF TG_OP = 'INSERT' AND NEW.clock_in IS NOT NULL AND NEW.is_late = true THEN
    PERFORM notify_hrd(
      '⏰ Karyawan Terlambat',
      v_employee_name || ' clock-in terlambat ' || COALESCE(NEW.late_minutes, 0) || ' menit (' ||
        to_char(NEW.clock_in AT TIME ZONE 'Asia/Jakarta', 'HH24:MI') || ' WIB).',
      'alert',
      '/dashboard/hris/attendance'
    );

  -- Clock-out update
  ELSIF TG_OP = 'UPDATE' AND OLD.clock_out IS NULL AND NEW.clock_out IS NOT NULL THEN
    -- Hanya notify jika pulang terlalu cepat (work_hours < 7)
    IF NEW.work_hours IS NOT NULL AND NEW.work_hours < 7 THEN
      PERFORM notify_hrd(
        '⚠️ Jam Kerja Kurang: ' || v_employee_name,
        v_employee_name || ' bekerja hanya ' || round(NEW.work_hours::numeric, 1) || ' jam hari ini.',
        'alert',
        '/dashboard/hris/attendance'
      );
    END IF;

  -- DELETE absensi → notify HRD
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM notify_hrd(
      '🗑️ Data Absensi Dihapus',
      'Data absensi ' || v_employee_name || ' tanggal ' ||
        to_char(OLD.date::date, 'DD Mon YYYY') || ' telah dihapus.',
      'alert',
      '/dashboard/hris/attendance'
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_attendance_changes ON attendance;
CREATE TRIGGER trg_notify_attendance_changes
  AFTER INSERT OR UPDATE OR DELETE ON attendance
  FOR EACH ROW EXECUTE FUNCTION fn_notify_attendance_changes();

-- ============================================================
-- 3. EMPLOYEES — Karyawan Baru, Update, Nonaktif
-- ============================================================

CREATE OR REPLACE FUNCTION fn_notify_employee_changes()
RETURNS trigger AS $$
BEGIN
  -- Karyawan baru → notify HRD
  IF TG_OP = 'INSERT' THEN
    PERFORM notify_hrd(
      '👤 Karyawan Baru Ditambahkan',
      NEW.full_name || ' (' || NEW.nip || ') telah bergabung sebagai karyawan baru. Status: ' ||
        CASE NEW.employment_status
          WHEN 'permanent' THEN 'Tetap'
          WHEN 'contract'  THEN 'Kontrak'
          WHEN 'probation' THEN 'Probasi'
          WHEN 'internship' THEN 'Magang'
          ELSE NEW.employment_status
        END || '.',
      'status_change',
      '/dashboard/hris/employees'
    );

  ELSIF TG_OP = 'UPDATE' THEN
    -- Karyawan dinonaktifkan
    IF OLD.is_active = true AND NEW.is_active = false THEN
      PERFORM notify_hrd(
        '🔴 Karyawan Dinonaktifkan',
        NEW.full_name || ' (' || NEW.nip || ') telah dinonaktifkan.',
        'alert',
        '/dashboard/hris/employees/' || NEW.id
      );

    -- Karyawan diaktifkan kembali
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
      PERFORM notify_hrd(
        '🟢 Karyawan Diaktifkan Kembali',
        NEW.full_name || ' (' || NEW.nip || ') telah diaktifkan kembali.',
        'status_change',
        '/dashboard/hris/employees/' || NEW.id
      );

    -- Status kepegawaian berubah
    ELSIF OLD.employment_status IS DISTINCT FROM NEW.employment_status THEN
      PERFORM notify_hrd(
        '🔄 Status Kepegawaian Berubah',
        NEW.full_name || ': ' ||
          CASE OLD.employment_status WHEN 'permanent' THEN 'Tetap' WHEN 'contract' THEN 'Kontrak' WHEN 'probation' THEN 'Probasi' ELSE OLD.employment_status END ||
          ' → ' ||
          CASE NEW.employment_status WHEN 'permanent' THEN 'Tetap' WHEN 'contract' THEN 'Kontrak' WHEN 'probation' THEN 'Probasi' WHEN 'resigned' THEN 'Resign' WHEN 'terminated' THEN 'PHK' ELSE NEW.employment_status END,
        'status_change',
        '/dashboard/hris/employees/' || NEW.id
      );

      -- Juga notify karyawan sendiri
      PERFORM notify_user(
        NEW.user_id,
        '📋 Status Kepegawaian Kamu Berubah',
        'Status kepegawaian kamu telah diubah menjadi: ' ||
          CASE NEW.employment_status WHEN 'permanent' THEN 'Karyawan Tetap' WHEN 'contract' THEN 'Kontrak' WHEN 'probation' THEN 'Masa Percobaan' ELSE NEW.employment_status END || '.',
        'status_change',
        '/dashboard/hris/employees/' || NEW.id
      );
    END IF;

  -- DELETE karyawan → notify HRD
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM notify_hrd(
      '🗑️ Data Karyawan Dihapus',
      'Data karyawan ' || OLD.full_name || ' (' || OLD.nip || ') telah dihapus dari sistem.',
      'alert',
      '/dashboard/hris/employees'
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_employee_changes ON employees;
CREATE TRIGGER trg_notify_employee_changes
  AFTER INSERT OR UPDATE OR DELETE ON employees
  FOR EACH ROW EXECUTE FUNCTION fn_notify_employee_changes();

-- ============================================================
-- 4. ONBOARDING — Task Selesai / Semua Task Selesai
-- ============================================================

CREATE OR REPLACE FUNCTION fn_notify_onboarding_changes()
RETURNS trigger AS $$
DECLARE
  v_employee_name text;
  v_total_tasks int;
  v_completed_tasks int;
BEGIN
  SELECT full_name INTO v_employee_name
  FROM employees WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);

  IF TG_OP = 'UPDATE' AND OLD.completed = false AND NEW.completed = true THEN
    -- Cek apakah semua task sudah selesai
    SELECT COUNT(*), COUNT(*) FILTER (WHERE completed = true)
    INTO v_total_tasks, v_completed_tasks
    FROM onboarding_checklists WHERE employee_id = NEW.employee_id;

    IF v_total_tasks = v_completed_tasks THEN
      PERFORM notify_hrd(
        '🎉 Onboarding Selesai',
        'Semua ' || v_total_tasks || ' task onboarding ' || v_employee_name || ' telah diselesaikan!',
        'status_change',
        '/dashboard/hris/onboarding/' || NEW.employee_id
      );
    ELSE
      PERFORM notify_hrd(
        '✅ Task Onboarding Selesai',
        v_employee_name || ' menyelesaikan task: "' || NEW.task_name || '" (' ||
          v_completed_tasks || '/' || v_total_tasks || ' task).',
        'status_change',
        '/dashboard/hris/onboarding/' || NEW.employee_id
      );
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    PERFORM notify_hrd(
      '🗑️ Task Onboarding Dihapus',
      'Task onboarding "' || OLD.task_name || '" untuk ' || v_employee_name || ' telah dihapus.',
      'alert',
      '/dashboard/hris/onboarding/' || OLD.employee_id
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_onboarding_changes ON onboarding_checklists;
CREATE TRIGGER trg_notify_onboarding_changes
  AFTER UPDATE OR DELETE ON onboarding_checklists
  FOR EACH ROW EXECUTE FUNCTION fn_notify_onboarding_changes();

-- ============================================================
-- 5. OFFBOARDING — Resign & Status Update
-- ============================================================

CREATE OR REPLACE FUNCTION fn_notify_offboarding_changes()
RETURNS trigger AS $$
DECLARE
  v_employee_name text;
  v_resignation_label text;
BEGIN
  SELECT full_name INTO v_employee_name
  FROM employees WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);

  v_resignation_label := CASE COALESCE(NEW.resignation_type, OLD.resignation_type)
    WHEN 'voluntary'       THEN 'Mengundurkan Diri'
    WHEN 'termination'     THEN 'PHK'
    WHEN 'layoff'          THEN 'Layoff'
    WHEN 'end_of_contract' THEN 'Akhir Kontrak'
    ELSE 'Lainnya'
  END;

  IF TG_OP = 'INSERT' THEN
    PERFORM notify_hrd(
      '🚨 Pengajuan Resign Baru',
      v_employee_name || ' mengajukan ' || v_resignation_label ||
        '. Tanggal efektif: ' || to_char(NEW.resignation_date::date, 'DD Mon YYYY') || '.',
      'alert',
      '/dashboard/hris/offboarding/' || NEW.employee_id
    );

  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM notify_hrd(
      '🔄 Status Offboarding: ' || v_employee_name,
      'Status offboarding ' || v_employee_name || ' berubah menjadi: ' ||
        CASE NEW.status
          WHEN 'submitted'      THEN 'Diajukan'
          WHEN 'notice_period'  THEN 'Masa Pemberitahuan'
          WHEN 'exit_interview' THEN 'Exit Interview'
          WHEN 'completed'      THEN 'Selesai'
          ELSE NEW.status
        END || '.',
      'status_change',
      '/dashboard/hris/offboarding/' || NEW.employee_id
    );

  ELSIF TG_OP = 'DELETE' THEN
    PERFORM notify_hrd(
      '🗑️ Data Offboarding Dihapus',
      'Data offboarding ' || v_employee_name || ' telah dihapus.',
      'alert',
      '/dashboard/hris/employees'
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_offboarding_changes ON offboarding_checklists;
CREATE TRIGGER trg_notify_offboarding_changes
  AFTER INSERT OR UPDATE OR DELETE ON offboarding_checklists
  FOR EACH ROW EXECUTE FUNCTION fn_notify_offboarding_changes();

-- ============================================================
-- 6. EMPLOYEE DOCUMENTS — Upload & Hapus
-- ============================================================

CREATE OR REPLACE FUNCTION fn_notify_document_changes()
RETURNS trigger AS $$
DECLARE
  v_employee_name text;
  v_doc_label text;
BEGIN
  SELECT full_name INTO v_employee_name
  FROM employees WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);

  v_doc_label := CASE COALESCE(NEW.document_type, OLD.document_type)
    WHEN 'ktp'      THEN 'KTP'
    WHEN 'npwp'     THEN 'NPWP'
    WHEN 'ijazah'   THEN 'Ijazah'
    WHEN 'cv'       THEN 'CV/Resume'
    WHEN 'kontrak'  THEN 'Kontrak Kerja'
    WHEN 'bpjs_tk'  THEN 'BPJS TK'
    WHEN 'bpjs_kes' THEN 'BPJS Kesehatan'
    ELSE 'Dokumen'
  END;

  IF TG_OP = 'INSERT' THEN
    PERFORM notify_hrd(
      '📎 Dokumen Diupload',
      v_doc_label || ' ' || v_employee_name || ' ("' || NEW.document_name || '") berhasil diupload.',
      'status_change',
      '/dashboard/hris/employees/' || NEW.employee_id
    );

  ELSIF TG_OP = 'DELETE' THEN
    PERFORM notify_hrd(
      '🗑️ Dokumen Dihapus',
      v_doc_label || ' ' || v_employee_name || ' ("' || OLD.document_name || '") telah dihapus.',
      'alert',
      '/dashboard/hris/employees/' || OLD.employee_id
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_document_changes ON employee_documents;
CREATE TRIGGER trg_notify_document_changes
  AFTER INSERT OR DELETE ON employee_documents
  FOR EACH ROW EXECUTE FUNCTION fn_notify_document_changes();

-- ============================================================
-- 7. CANDIDATES — Lamaran & Status Pipeline
-- ============================================================

CREATE OR REPLACE FUNCTION fn_notify_candidate_changes()
RETURNS trigger AS $$
DECLARE
  v_position_title text;
  v_status_label text;
  v_old_status_label text;
BEGIN
  SELECT title INTO v_position_title FROM positions WHERE id = COALESCE(NEW.position_id, OLD.position_id);

  v_status_label := CASE COALESCE(NEW.status, OLD.status)
    WHEN 'new'               THEN 'Baru'
    WHEN 'screening'         THEN 'Screening'
    WHEN 'interview_hrd'     THEN 'Interview HRD'
    WHEN 'interview_manager' THEN 'Interview Manager'
    WHEN 'talent_pool'       THEN 'Talent Pool'
    WHEN 'hired'             THEN 'Diterima'
    WHEN 'rejected'          THEN 'Ditolak'
    ELSE COALESCE(NEW.status, OLD.status)
  END;

  IF TG_OP = 'INSERT' THEN
    PERFORM notify_hrd(
      '📥 Kandidat Baru',
      NEW.full_name || ' melamar posisi ' || COALESCE(v_position_title, 'tidak diketahui') ||
        ' (sumber: ' || NEW.source || ').',
      'status_change',
      '/dashboard/hris/candidates/' || NEW.id
    );

  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_old_status_label := CASE OLD.status
      WHEN 'new'               THEN 'Baru'
      WHEN 'screening'         THEN 'Screening'
      WHEN 'interview_hrd'     THEN 'Interview HRD'
      WHEN 'interview_manager' THEN 'Interview Manager'
      WHEN 'talent_pool'       THEN 'Talent Pool'
      WHEN 'hired'             THEN 'Diterima'
      WHEN 'rejected'          THEN 'Ditolak'
      ELSE OLD.status
    END;

    -- Masuk Talent Pool
    IF NEW.status = 'talent_pool' THEN
      PERFORM notify_hrd(
        '⭐ Kandidat Masuk Talent Pool',
        NEW.full_name || ' (' || COALESCE(v_position_title, '—') || ') dipindahkan ke Talent Pool.',
        'status_change',
        '/dashboard/hris/talent-pool'
      );

    -- Diterima (Hired)
    ELSIF NEW.status = 'hired' THEN
      PERFORM notify_hrd(
        '🎉 Kandidat Diterima!',
        NEW.full_name || ' (' || COALESCE(v_position_title, '—') || ') telah diterima sebagai karyawan.',
        'status_change',
        '/dashboard/hris/candidates/' || NEW.id
      );

    -- Ditolak
    ELSIF NEW.status = 'rejected' THEN
      PERFORM notify_hrd(
        '❌ Kandidat Ditolak',
        NEW.full_name || ' (' || COALESCE(v_position_title, '—') || ') ditolak dari proses rekrutmen.',
        'alert',
        '/dashboard/hris/candidates/' || NEW.id
      );

    -- Perubahan pipeline lainnya
    ELSE
      PERFORM notify_hrd(
        '🔄 Status Kandidat: ' || NEW.full_name,
        NEW.full_name || ' (' || COALESCE(v_position_title, '—') || '): ' ||
          v_old_status_label || ' → ' || v_status_label || '.',
        'status_change',
        '/dashboard/hris/candidates/' || NEW.id
      );
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    PERFORM notify_hrd(
      '🗑️ Data Kandidat Dihapus',
      'Data kandidat ' || OLD.full_name || ' (' || COALESCE(v_position_title, '—') || ') telah dihapus.',
      'alert',
      '/dashboard/hris/candidates'
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_candidate_changes ON candidates;
CREATE TRIGGER trg_notify_candidate_changes
  AFTER INSERT OR UPDATE OR DELETE ON candidates
  FOR EACH ROW EXECUTE FUNCTION fn_notify_candidate_changes();

-- ============================================================
-- 8. INTERVIEWS — Jadwal & Hasil Interview
-- ============================================================

CREATE OR REPLACE FUNCTION fn_notify_interview_changes()
RETURNS trigger AS $$
DECLARE
  v_candidate_name text;
  v_interview_type_label text;
BEGIN
  SELECT full_name INTO v_candidate_name FROM candidates WHERE id = COALESCE(NEW.candidate_id, OLD.candidate_id);

  v_interview_type_label := CASE COALESCE(NEW.type, OLD.type)
    WHEN 'hrd'            THEN 'HRD'
    WHEN 'hiring_manager' THEN 'Manager'
    ELSE COALESCE(NEW.type, OLD.type)
  END;

  IF TG_OP = 'INSERT' THEN
    -- Notify HRD
    PERFORM notify_hrd(
      '📅 Interview Dijadwalkan',
      'Interview ' || v_interview_type_label || ' untuk ' || v_candidate_name ||
        ' dijadwalkan: ' || to_char(NEW.interview_date AT TIME ZONE 'Asia/Jakarta', 'DD Mon YYYY HH24:MI') || ' WIB.',
      'reminder',
      '/dashboard/hris/candidates/' || NEW.candidate_id
    );
    -- Notify interviewer langsung
    PERFORM notify_user(
      NEW.interviewer_id,
      '📅 Kamu Dijadwalkan Interview',
      'Kamu dijadwalkan melakukan interview ' || v_interview_type_label ||
        ' dengan ' || v_candidate_name || ' pada ' ||
        to_char(NEW.interview_date AT TIME ZONE 'Asia/Jakarta', 'DD Mon YYYY HH24:MI') || ' WIB.',
      'reminder',
      '/dashboard/hris/candidates/' || NEW.candidate_id
    );

  ELSIF TG_OP = 'UPDATE' AND OLD.recommendation IS DISTINCT FROM NEW.recommendation AND NEW.recommendation IS NOT NULL THEN
    PERFORM notify_hrd(
      '📊 Hasil Interview: ' || v_candidate_name,
      'Rekomendasi interview ' || v_interview_type_label || ' untuk ' || v_candidate_name || ': ' ||
        CASE NEW.recommendation
          WHEN 'proceed' THEN '✅ Lanjutkan'
          WHEN 'pool'    THEN '⭐ Masuk Talent Pool'
          WHEN 'reject'  THEN '❌ Tolak'
          ELSE NEW.recommendation
        END || '.',
      'status_change',
      '/dashboard/hris/candidates/' || NEW.candidate_id
    );

  ELSIF TG_OP = 'DELETE' THEN
    PERFORM notify_hrd(
      '🗑️ Jadwal Interview Dibatalkan',
      'Jadwal interview ' || v_interview_type_label || ' untuk ' || v_candidate_name || ' telah dibatalkan.',
      'alert',
      '/dashboard/hris/candidates/' || OLD.candidate_id
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_interview_changes ON interviews;
CREATE TRIGGER trg_notify_interview_changes
  AFTER INSERT OR UPDATE OR DELETE ON interviews
  FOR EACH ROW EXECUTE FUNCTION fn_notify_interview_changes();

-- ============================================================
-- RINGKASAN TRIGGERS YANG DIBUAT:
-- leaves:             INSERT, UPDATE (status), DELETE
-- attendance:         INSERT (terlambat), UPDATE (jam kurang), DELETE
-- employees:          INSERT, UPDATE (nonaktif/aktif/status), DELETE
-- onboarding_checklists:   UPDATE (selesai), DELETE
-- offboarding:        INSERT, UPDATE (status), DELETE
-- employee_documents: INSERT, DELETE
-- candidates:         INSERT, UPDATE (status/pipeline/talent_pool/hired/rejected), DELETE
-- interviews:         INSERT, UPDATE (rekomendasi), DELETE
-- ============================================================
