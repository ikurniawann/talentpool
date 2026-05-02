'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function DashboardHomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.email) {
        const hrdEmails = [
          'demo@aapextechnology.com',
          'hrd@',
          'hr@',
          'humanresources@',
        ];

        const isHrdEmail = hrdEmails.some(h => user.email!.toLowerCase().includes(h));
        
        if (isHrdEmail) {
          // HRD user - stay at /dashboard
          setLoading(false);
          return;
        }
      }

      // Non-HRD user - redirect to POS
      router.replace('/dashboard/pos');
      setLoading(false);
    };

    checkRole();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Selamat datang di TalentPool HR System</p>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <a
          href="/dashboard/hris/candidates"
          className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900">Kandidat</h3>
          <p className="text-sm text-gray-500 mt-1">Kelola lamaran masuk</p>
        </a>
        <a
          href="/dashboard/hris/employees"
          className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900">Karyawan</h3>
          <p className="text-sm text-gray-500 mt-1">Data karyawan aktif</p>
        </a>
        <a
          href="/dashboard/hris/attendance"
          className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900">Absensi</h3>
          <p className="text-sm text-gray-500 mt-1">Rekap kehadiran</p>
        </a>
      </div>
    </div>
  );
}
