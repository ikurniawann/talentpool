import { createClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

  // Total candidates
  const { count: totalCandidates } = await supabase
    .from("candidates")
    .select("id", { count: "exact", head: true });

  // This month
  const { count: thisMonth } = await supabase
    .from("candidates")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfMonth);

  // Last month
  const { count: lastMonth } = await supabase
    .from("candidates")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfLastMonth)
    .lte("created_at", endOfLastMonth);

  // By status
  const { data: byStatus } = await supabase
    .from("candidates")
    .select("status");

  const statusCounts = byStatus?.reduce(
    (acc, c) => {
      acc[c.status as string] = (acc[c.status as string] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) ?? {};

  // By brand
  const { data: byBrand } = await supabase
    .from("candidates")
    .select("brands(name)");

  const brandCounts = byBrand?.reduce(
    (acc, c: any) => {
      const name = c.brands?.name ?? "Tanpa Outlet";
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) ?? {};

  // By source
  const { data: bySource } = await supabase
    .from("candidates")
    .select("source");

  const sourceCounts = bySource?.reduce(
    (acc, c) => {
      acc[c.source] = (acc[c.source] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) ?? {};

  // By position
  const { data: byPosition } = await supabase
    .from("candidates")
    .select("positions(title)");

  const positionCounts = byPosition?.reduce(
    (acc, c: any) => {
      const title = c.positions?.title ?? "Tanpa Posisi";
      acc[title] = (acc[title] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) ?? {};

  const totalBrand = Object.values(brandCounts).reduce((a, b) => a + b, 0);
  const totalSource = Object.values(sourceCounts).reduce((a, b) => a + b, 0);
  const totalPosition = Object.values(positionCounts).reduce((a, b) => a + b, 0);

  const statusLabels: Record<string, string> = {
    new: "Baru",
    screening: "Screening",
    interview_hrd: "Interview HRD",
    interview_manager: "Interview Manager",
    talent_pool: "Talent Pool",
    hired: "Diterima",
    rejected: "Ditolak",
  };

  const statusColors: Record<string, string> = {
    new: "bg-blue-500",
    screening: "bg-cyan-500",
    interview_hrd: "bg-purple-500",
    interview_manager: "bg-orange-500",
    talent_pool: "bg-yellow-500",
    hired: "bg-emerald-500",
    rejected: "bg-red-500",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">
          Laporan dan statistik rekrutmen
        </p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Kandidat</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalCandidates ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Bulan Ini</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{thisMonth ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Bulan Lalu</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{lastMonth ?? 0}</p>
          {lastMonth !== null && lastMonth > 0 && thisMonth !== null && (
            <p className={`text-xs mt-1 ${(thisMonth ?? 0) >= lastMonth ? "text-emerald-600" : "text-red-600"}`}>
              {thisMonth !== null && lastMonth !== null
                ? `${((thisMonth - lastMonth) / lastMonth * 100).toFixed(1)}%`
                : ""} vs bulan lalu
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Distribusi Pipeline</h2>
          <div className="space-y-3">
            {Object.entries(statusLabels).map(([key, label]) => {
              const count = statusCounts[key] ?? 0;
              const pct = totalCandidates ? (count / totalCandidates) * 100 : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{label}</span>
                    <span className="text-gray-500">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${statusColors[key]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Brand */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Berdasarkan Outlet</h2>
          <div className="space-y-3">
            {Object.entries(brandCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => {
                const pct = totalBrand ? (count / totalBrand) * 100 : 0;
                return (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{name}</span>
                      <span className="text-gray-500">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            {Object.keys(brandCounts).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Belum ada data</p>
            )}
          </div>
        </div>

        {/* By Source */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Berdasarkan Sumber</h2>
          <div className="space-y-3">
            {Object.entries(sourceCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([source, count]) => {
                const pct = totalSource ? (count / totalSource) * 100 : 0;
                return (
                  <div key={source}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 capitalize">{source}</span>
                      <span className="text-gray-500">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-green-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            {Object.keys(sourceCounts).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Belum ada data</p>
            )}
          </div>
        </div>

        {/* By Position */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Berdasarkan Posisi</h2>
          <div className="space-y-3">
            {Object.entries(positionCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([title, count]) => {
                const pct = totalPosition ? (count / totalPosition) * 100 : 0;
                return (
                  <div key={title}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{title}</span>
                      <span className="text-gray-500">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-purple-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            {Object.keys(positionCounts).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Belum ada data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
