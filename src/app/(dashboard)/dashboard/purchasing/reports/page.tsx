import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah, formatDate } from "@/lib/purchasing/utils";
import { TrendingUp, Package, Clock, AlertCircle, FileText } from "lucide-react";

export default async function ReportsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const allowedRoles = ["purchasing_manager", "finance_staff", "direksi"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard/purchasing");
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // PR Aging Report
  const { data: prAging } = await supabase
    .from("purchase_requests")
    .select(`
      *,
      department:departments(name),
      requester:users(full_name)
    `)
    .in("status", ["pending_head", "pending_finance", "pending_direksi"])
    .order("created_at", { ascending: true });

  const agingData = prAging?.map((pr: any) => {
    const days = Math.floor(
      (new Date().getTime() - new Date(pr.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    return { ...pr, days };
  }) || [];

  const agingBuckets = {
    "<7": agingData.filter((d) => d.days < 7).length,
    "7-14": agingData.filter((d) => d.days >= 7 && d.days < 14).length,
    "14-30": agingData.filter((d) => d.days >= 14 && d.days < 30).length,
    ">30": agingData.filter((d) => d.days >= 30).length,
  };

  // Spending by Department
  const { data: deptSpending } = await supabase
    .from("purchase_requests")
    .select(`
      total_amount,
      department:departments(name)
    `)
    .gte("created_at", sixMonthsAgo.toISOString())
    .eq("status", "approved");

  const spendingByDept = deptSpending?.reduce((acc: any, pr: any) => {
    const deptName = pr.department?.name || "Unknown";
    acc[deptName] = (acc[deptName] || 0) + (pr.total_amount || 0);
    return acc;
  }, {}) || {};

  // Top Vendors
  const { data: vendorSpending } = await supabase
    .from("purchase_orders")
    .select(`
      total,
      vendor:vendors(name)
    `)
    .gte("created_at", sixMonthsAgo.toISOString())
    .eq("status", "received");

  const spendingByVendor = vendorSpending?.reduce((acc: any, po: any) => {
    const vendorName = po.vendor?.name || "Unknown";
    acc[vendorName] = (acc[vendorName] || 0) + (po.total || 0);
    return acc;
  }, {}) || {};

  const topVendors = Object.entries(spendingByVendor)
    .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
    .slice(0, 5);

  // Monthly Trends
  const monthlyData: any = {};
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = date.toISOString().slice(0, 7);
    monthlyData[monthKey] = { pr: 0, po: 0, amount: 0 };
  }

  const { data: monthlyPR } = await supabase
    .from("purchase_requests")
    .select("total_amount, created_at")
    .gte("created_at", sixMonthsAgo.toISOString());

  monthlyPR?.forEach((pr: any) => {
    const month = pr.created_at.slice(0, 7);
    if (monthlyData[month]) {
      monthlyData[month].pr += 1;
      monthlyData[month].amount += pr.total_amount || 0;
    }
  });

  const { data: monthlyPO } = await supabase
    .from("purchase_orders")
    .select("created_at")
    .gte("created_at", sixMonthsAgo.toISOString());

  monthlyPO?.forEach((po: any) => {
    const month = po.created_at.slice(0, 7);
    if (monthlyData[month]) {
      monthlyData[month].po += 1;
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Laporan Purchasing</h1>
        <p className="text-sm text-gray-500">Analytics dan laporan pengadaan</p>
      </div>

      {/* PR Aging */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            PR Aging Analysis
          </CardTitle>
          <p className="text-sm text-gray-500">PR yang masih menunggu approval</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "< 7 Hari", count: agingBuckets["<7"], color: "bg-green-500" },
              { label: "7-14 Hari", count: agingBuckets["7-14"], color: "bg-yellow-500" },
              { label: "14-30 Hari", count: agingBuckets["14-30"], color: "bg-orange-500" },
              { label: "> 30 Hari", count: agingBuckets[">30"], color: "bg-red-500" },
            ].map((bucket) => (
              <div key={bucket.label} className="text-center">
                <p className="text-3xl font-bold mb-1">{bucket.count}</p>
                <p className="text-sm text-gray-600">{bucket.label}</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`${bucket.color} h-2 rounded-full`}
                    style={{
                      width: `${agingData.length > 0 ? (bucket.count / agingData.length) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {agingData.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3">No. PR</th>
                    <th className="text-left py-2 px-3">Departemen</th>
                    <th className="text-left py-2 px-3">Requester</th>
                    <th className="text-right py-2 px-3">Total</th>
                    <th className="text-center py-2 px-3">Hari</th>
                  </tr>
                </thead>
                <tbody>
                  {agingData.slice(0, 10).map((pr: any) => (
                    <tr key={pr.id} className="border-b">
                      <td className="py-2 px-3 font-medium">{pr.pr_number}</td>
                      <td className="py-2 px-3">{pr.department?.name}</td>
                      <td className="py-2 px-3">{pr.requester?.full_name}</td>
                      <td className="py-2 px-3 text-right">{formatRupiah(pr.total_amount)}</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`font-medium ${
                            pr.days > 30
                              ? "text-red-600"
                              : pr.days > 14
                              ? "text-orange-600"
                              : "text-green-600"
                          }`}
                        >
                          {pr.days} hari
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Department */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Pengeluaran per Departemen
            </CardTitle>
            <p className="text-sm text-gray-500">6 bulan terakhir (PR approved)</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(spendingByDept)
                .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
                .map(([dept, amount]: [string, any]) => (
                  <div key={dept}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{dept}</span>
                      <span>{formatRupiah(amount)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            (Number(amount) / Math.max(...Object.values(spendingByDept).map(Number))) * 100,
                            100
                          )}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Vendors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5" />
              Top Vendor (PO Received)
            </CardTitle>
            <p className="text-sm text-gray-500">6 bulan terakhir</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topVendors.length > 0 ? (
                topVendors.map(([vendor, amount]: [string, any], index: number) => (
                  <div key={vendor}>
                    <div className="flex justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <span className="font-medium">{vendor}</span>
                      </div>
                      <span>{formatRupiah(amount)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            (amount / (topVendors[0][1] as number)) * 100,
                            100
                          )}%`
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">Belum ada data vendor</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Tren Bulanan
          </CardTitle>
          <p className="text-sm text-gray-500">6 bulan terakhir</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4">Bulan</th>
                  <th className="text-center py-3 px-4">Jumlah PR</th>
                  <th className="text-center py-3 px-4">Jumlah PO</th>
                  <th className="text-right py-3 px-4">Total Nilai</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(monthlyData).map(([month, data]: [string, any]) => (
                  <tr key={month} className="border-b">
                    <td className="py-3 px-4 font-medium">
                      {new Date(month + "-01").toLocaleString("id-ID", {
                        month: "long",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 text-center">{data.pr}</td>
                    <td className="py-3 px-4 text-center">{data.po}</td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatRupiah(data.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
