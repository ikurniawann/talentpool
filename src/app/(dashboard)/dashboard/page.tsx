import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";

export default async function DashboardHome() {
  const user = await getUser();
  const supabase = await createClient();

  // Fetch stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [totalResult, newResult, pipelineResult, hiredResult] = await Promise.all([
    supabase.from("candidates").select("id", { count: "exact", head: true }),
    supabase
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfMonth),
    supabase
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .not("status", "in", '("hired","rejected","talent_pool")'),
    supabase
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .eq("status", "hired")
      .gte("updated_at", startOfMonth),
  ]);

  // Recent candidates
  const { data: recentCandidates } = await supabase
    .from("candidates")
    .select("id, full_name, status, created_at, brands(name), positions(title)")
    .order("created_at", { ascending: false })
    .limit(5);

  const stats = [
    {
      label: "Total Kandidat",
      value: totalResult.count ?? 0,
      icon: "👥",
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Baru Bulan Ini",
      value: newResult.count ?? 0,
      icon: "🆕",
      color: "bg-green-50 text-green-700",
    },
    {
      label: "Dalam Pipeline",
      value: pipelineResult.count ?? 0,
      icon: "📋",
      color: "bg-yellow-50 text-yellow-700",
    },
    {
      label: "Diterima Bulan Ini",
      value: hiredResult.count ?? 0,
      icon: "✅",
      color: "bg-emerald-50 text-emerald-700",
    },
  ];

  const statusLabels: Record<string, string> = {
    new: "Baru",
    screening: "Screening",
    interview_hrd: "Interview HRD",
    interview_manager: "Interview Manager",
    talent_pool: "Talent Pool",
    hired: "Diterima",
    rejected: "Ditolak",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Selamat Datang, {user?.full_name}
        </h1>
        <p className="text-gray-500 mt-1">
          Berikut ringkasan rekrutmen kamu
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`p-5 rounded-xl ${stat.color}`}
          >
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-3xl font-bold">{stat.value}</div>
            <div className="text-sm mt-1 opacity-80">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Candidates */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Kandidat Terbaru</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentCandidates && recentCandidates.length > 0 ? (
            recentCandidates.map((c) => (
              <div key={c.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{c.full_name}</p>
                  <p className="text-sm text-gray-500">
                    {(c.positions as any)?.[0]?.title ?? "Tanpa Posisi"} · {(c.brands as any)?.[0]?.name ?? "Semua Outlet"}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    c.status === "hired"
                      ? "bg-emerald-100 text-emerald-700"
                      : c.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : c.status === "talent_pool"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {statusLabels[c.status] ?? c.status}
                </span>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              Belum ada kandidat
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
