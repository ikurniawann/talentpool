import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatRupiah, formatDate, getPRStatusLabel } from "@/lib/purchasing/utils";
import { PurchaseRequest, PRItem } from "@/types/purchasing";

interface PrintPRPageProps {
  params: Promise<{ id: string }>;
}

export default async function PrintPRPage({ params }: PrintPRPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pr } = await supabase
    .from("purchase_requests")
    .select(`
      *,
      items:pr_items(*),
      requester:users(full_name),
      department:departments(name, code),
      approved_head:users!purchase_requests_approved_by_head_fkey(full_name),
      approved_finance:users!purchase_requests_approved_by_finance_fkey(full_name),
      approved_direksi:users!purchase_requests_approved_by_direksi_fkey(full_name)
    `)
    .eq("id", id)
    .single();

  if (!pr) {
    notFound();
  }

  const statusBadge = getPRStatusLabel(pr.status);

  return (
    <div className="min-h-screen bg-white p-8 print:p-0">
      {/* Print Styles via inline style tag */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4;
                margin: 15mm;
              }
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              .no-print {
                display: none !important;
              }
            }
          `,
        }}
      />

      {/* Header */}
      <div className="text-center mb-8 border-b pb-6">
        <h1 className="text-2xl font-bold uppercase tracking-wide">
          Purchase Request
        </h1>
        <p className="text-gray-600 mt-1">Permintaan Pembelian</p>
      </div>

      {/* Document Info */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <table className="text-sm">
            <tbody>
              <tr>
                <td className="pr-4 py-1 font-medium">No. PR</td>
                <td className="py-1">: {pr.pr_number}</td>
              </tr>
              <tr>
                <td className="pr-4 py-1 font-medium">Tanggal</td>
                <td className="py-1">: {formatDate(pr.created_at)}</td>
              </tr>
              <tr>
                <td className="pr-4 py-1 font-medium">Departemen</td>
                <td className="py-1">: {pr.department?.name || "-"}</td>
              </tr>
              <tr>
                <td className="pr-4 py-1 font-medium">Requester</td>
                <td className="py-1">: {pr.requester?.full_name || "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="text-right">
          <div className={`inline-block px-4 py-2 rounded border ${statusBadge.color.replace('bg-', 'border-').replace('text-', 'bg-opacity-10 bg-')}`}>
            <span className={`font-semibold ${statusBadge.color.split(' ')[1]}`}>
              {statusBadge.label}
            </span>
          </div>
          {pr.required_date && (
            <p className="text-sm text-gray-600 mt-2">
              Dibutuhkan: {formatDate(pr.required_date)}
            </p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse mb-8">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-gray-800">
            <th className="text-left py-3 px-4 text-sm font-semibold w-12">No</th>
            <th className="text-left py-3 px-4 text-sm font-semibold">Deskripsi Barang/Jasa</th>
            <th className="text-center py-3 px-4 text-sm font-semibold w-20">Qty</th>
            <th className="text-center py-3 px-4 text-sm font-semibold w-24">Satuan</th>
            <th className="text-right py-3 px-4 text-sm font-semibold w-32">Est. Harga</th>
            <th className="text-right py-3 px-4 text-sm font-semibold w-32">Total</th>
          </tr>
        </thead>
        <tbody>
          {pr.items?.map((item: PRItem, index: number) => (
            <tr key={item.id} className="border-b">
              <td className="py-3 px-4 text-sm text-center">{index + 1}</td>
              <td className="py-3 px-4 text-sm">{item.description}</td>
              <td className="py-3 px-4 text-sm text-center">{item.qty}</td>
              <td className="py-3 px-4 text-sm text-center">{item.unit}</td>
              <td className="py-3 px-4 text-sm text-right">
                {formatRupiah(item.estimated_price)}
              </td>
              <td className="py-3 px-4 text-sm text-right font-medium">
                {formatRupiah(item.total)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-800">
            <td colSpan={5} className="py-4 px-4 text-right font-bold">
              TOTAL ESTIMASI
            </td>
            <td className="py-4 px-4 text-right font-bold text-lg">
              {formatRupiah(pr.total_amount)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Notes */}
      {pr.notes && (
        <div className="mb-8">
          <h4 className="font-semibold text-sm mb-2">Catatan:</h4>
          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
            {pr.notes}
          </p>
        </div>
      )}

      {/* Approval Section */}
      <div className="mt-12">
        <h4 className="font-semibold text-sm mb-4 border-b pb-2">
          Persetujuan / Approval
        </h4>
        <div className="grid grid-cols-3 gap-8">
          {/* Requester */}
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-8">Diajukan oleh,</p>
            <div className="border-t border-gray-400 pt-2 mx-4">
              <p className="font-medium text-sm">{pr.requester?.full_name || "-"}</p>
              <p className="text-xs text-gray-500">Requester</p>
            </div>
          </div>

          {/* Head Dept */}
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-8">Disetujui oleh,</p>
            <div className="border-t border-gray-400 pt-2 mx-4">
              {pr.approved_by_head ? (
                <>
                  <p className="font-medium text-sm">{pr.approved_head?.full_name}</p>
                  <p className="text-xs text-gray-500">
                    Head Dept ({formatDate(pr.approved_at_head)})
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-300">........................</p>
                  <p className="text-xs text-gray-400">Head Dept</p>
                </>
              )}
            </div>
          </div>

          {/* Finance / Direksi */}
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-8">Disetujui oleh,</p>
            <div className="border-t border-gray-400 pt-2 mx-4">
              {pr.approved_by_finance ? (
                <>
                  <p className="font-medium text-sm">{pr.approved_finance?.full_name}</p>
                  <p className="text-xs text-gray-500">
                    Finance ({formatDate(pr.approved_at_finance)})
                  </p>
                </>
              ) : pr.approved_by_direksi ? (
                <>
                  <p className="font-medium text-sm">{pr.approved_direksi?.full_name}</p>
                  <p className="text-xs text-gray-500">
                    Direksi ({formatDate(pr.approved_at_direksi)})
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-300">........................</p>
                  <p className="text-xs text-gray-400">Finance / Direksi</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print Button */}
      <div className="no-print fixed bottom-6 right-6">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Cetak
        </button>
      </div>

      {/* Footer */}
      <div className="fixed bottom-4 left-0 right-0 text-center text-xs text-gray-400 no-print">
        <p>Generated by Aapex Purchasing System</p>
      </div>
    </div>
  );
}
