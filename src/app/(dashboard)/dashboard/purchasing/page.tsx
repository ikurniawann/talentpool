import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRupiah, getPRStatusLabel, getPriorityBadge, getPOStatusLabel } from "@/lib/purchasing/utils";
import { FileText, Plus, TrendingUp, Clock, CheckCircle, DollarSign, AlertTriangle, Package } from "lucide-react";

export default async function PurchasingPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Check if user has access to purchasing
  const allowedRoles = ["purchasing_staff", "purchasing_manager", "finance_staff", "direksi", "hrd"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard");
  }

  // Fetch stats
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  const { data: prStats } = await supabase
    .from("purchase_requests")
    .select("status, total_amount")
    .gte("created_at", `${currentMonth}-01`);

  const { data: pendingPR } = await supabase
    .from("purchase_requests")
    .select("id")
    .in("status", ["pending_head", "pending_finance", "pending_direksi"]);

  const totalPRThisMonth = prStats?.length || 0;
  const prPending = pendingPR?.length || 0;
  const totalAmountThisMonth = prStats?.reduce((sum, pr) => sum + (pr.total_amount || 0), 0) || 0;

  // Fetch PO stats
  const { data: poStats } = await supabase
    .from("purchase_orders")
    .select("status, total")
    .gte("created_at", `${currentMonth}-01`);

  const { data: pendingPO } = await supabase
    .from("purchase_orders")
    .select("id")
    .in("status", ["sent", "partial"]);

  const poSentThisMonth = poStats?.filter(po => po.status === "sent" || po.status === "partial").length || 0;
  const poPendingReceipt = pendingPO?.length || 0;
  const poTotalThisMonth = poStats?.reduce((sum, po) => sum + (po.total || 0), 0) || 0;

  // Fetch spending by department (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
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
  }, {});

  // Fetch PR aging (pending > 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data: agingPR } = await supabase
    .from("purchase_requests")
    .select("id")
    .in("status", ["pending_head", "pending_finance", "pending_direksi"])
    .lt("created_at", sevenDaysAgo.toISOString());

  const prAgingCount = agingPR?.length || 0;

  // Fetch recent PRs
  const { data: recentPRs } = await supabase
    .from("purchase_requests")
    .select(`
      *,
      requester:users(full_name),
      department:departments(name)
    `)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch recent POs
  const { data: recentPOs } = await supabase
    .from("purchase_orders")
    .select(`
      *,
      vendor:vendors(name)
    `)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchasing Dashboard</h1>
          <p className="text-sm text-gray-500">Overview pengadaan barang dan jasa</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/purchasing/reports">
            <Button variant="outline">
              <TrendingUp className="w-4 h-4 mr-2" />
              Laporan
            </Button>
          </Link>
          <Link href="/dashboard/purchasing/pr/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Buat PR Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* Alert for Aging PRs */}
      {prAgingCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <div>
            <p className="font-medium text-orange-900">
              {prAgingCount} PR menunggu approval lebih dari 7 hari
            </p>
            <p className="text-sm text-orange-700">
              Mohon segera diproses untuk menghindari keterlambatan pengadaan
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards - PR */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Purchase Request</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">PR Bulan Ini</p>
                  <p className="text-2xl font-bold">{totalPRThisMonth}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Menunggu Approval</p>
                  <p className="text-2xl font-bold">{prPending}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Estimasi</p>
                  <p className="text-2xl font-bold">{formatRupiah(totalAmountThisMonth)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Approved</p>
                  <p className="text-2xl font-bold">
                    {prStats?.filter(pr => pr.status === "approved" || pr.status === "converted").length || 0}
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-full">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats Cards - PO */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Purchase Order</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">PO Terkirim</p>
                  <p className="text-2xl font-bold">{poSentThisMonth}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Menunggu Penerimaan</p>
                  <p className="text-2xl font-bold">{poPendingReceipt}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <Package className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total PO Bulan Ini</p>
                  <p className="text-2xl font-bold">{formatRupiah(poTotalThisMonth)}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-full">
                  <DollarSign className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Department */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pengeluaran per Departemen</CardTitle>
            <p className="text-sm text-gray-500">6 bulan terakhir</p>
          </CardHeader>
          <CardContent>
            {spendingByDept && Object.keys(spendingByDept).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(spendingByDept)
                  .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
                  .map(([dept, amount]: [string, any]) => (
                    <div key={dept}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{dept}</span>
                        <span className="text-sm text-gray-600">{formatRupiah(amount)}</span>
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
            ) : (
              <p className="text-gray-500 text-center py-8">Belum ada data pengeluaran</p>
            )}
          </CardContent>
        </Card>

        {/* Recent POs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Purchase Order Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPOs?.map((po: any) => {
                const status = getPOStatusLabel(po.status);
                return (
                  <Link key={po.id} href={`/dashboard/purchasing/po/${po.id}`}>
                    <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border">
                      <div>
                        <p className="font-medium">{po.po_number}</p>
                        <p className="text-sm text-gray-500">{po.vendor?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatRupiah(po.total)}</p>
                        <Badge className={`${status.color} text-xs`}>{status.label}</Badge>
                      </div>
                    </div>
                  </Link>
                );
              }) || (
                <p className="text-gray-500 text-center py-8">Belum ada PO</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/purchasing/pr">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Purchase Request</h3>
                  <p className="text-sm text-gray-500">Kelola PR dan approval</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/purchasing/po">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Purchase Order</h3>
                  <p className="text-sm text-gray-500">Kelola PO ke vendor</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/purchasing/vendors">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Master Vendor</h3>
                  <p className="text-sm text-gray-500">Kelola data supplier</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent PRs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Purchase Request Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">No. PR</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Departemen</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Requester</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Total</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Prioritas</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {recentPRs?.map((pr) => {
                  const statusBadge = getPRStatusLabel(pr.status);
                  const priorityBadge = getPriorityBadge(pr.priority);
                  
                  return (
                    <tr key={pr.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-medium">{pr.pr_number}</span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {pr.department?.name || "-"}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {pr.requester?.full_name || "-"}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium">
                        {formatRupiah(pr.total_amount)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={priorityBadge.color}>
                          {priorityBadge.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={statusBadge.color}>
                          {statusBadge.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/dashboard/purchasing/pr/${pr.id}`}>
                          <Button variant="ghost" size="sm">
                            Detail
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
