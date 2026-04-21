import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatRupiah, formatDate, getPOStatusLabel } from "@/lib/purchasing/utils";

interface PrintPOPageProps {
  params: Promise<{ id: string }>;
}

export default async function PrintPOPage({ params }: PrintPOPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: po, error } = await supabase
    .from("purchase_orders")
    .select(`
      *,
      items:po_items(*),
      vendor:vendors(*),
      pr:purchase_requests(pr_number)
    `)
    .eq("id", id)
    .single();

  if (error || !po) {
    console.error("PO Error:", error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Data PO Tidak Ditemukan</h1>
          <p className="text-gray-600 mb-4">ID: {id}</p>
          <p className="text-gray-500">{error?.message || "PO tidak ada di database"}</p>
          <a 
            href="/dashboard/purchasing/po" 
            className="mt-6 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Kembali ke List PO
          </a>
        </div>
      </div>
    );
  }

  const statusBadge = getPOStatusLabel(po.status);

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
      <div className="border-b-2 border-gray-800 pb-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-wide">
              Purchase Order
            </h1>
            <p className="text-xl text-gray-600 mt-1">Pesanan Pembelian</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{po.po_number}</p>
            <p className="text-sm text-gray-600">Tanggal: {formatDate(po.order_date)}</p>
          </div>
        </div>
      </div>

      {/* Vendor Info */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-bold text-sm uppercase text-gray-500 mb-2">Kepada:</h3>
          <p className="font-bold text-lg">{po.vendor?.name}</p>
          <p className="text-gray-700">{po.vendor?.address}</p>
          <p className="text-gray-600 mt-2">Attn: {po.vendor?.contact_person}</p>
          <p className="text-gray-600">Telp: {po.vendor?.phone}</p>
          <p className="text-gray-600">Email: {po.vendor?.email}</p>
        </div>
        <div>
          <h3 className="font-bold text-sm uppercase text-gray-500 mb-2">Dari:</h3>
          <p className="font-bold text-lg">Aapex Technology</p>
          <p className="text-gray-700">Jl. Raya No. 123, Jakarta</p>
          <p className="text-gray-600">Telp: 021-12345678</p>
          <p className="text-gray-600">Email: purchasing@aapex.id</p>
          {po.pr?.pr_number && (
            <p className="text-sm text-gray-500 mt-2">
              Ref PR: {po.pr.pr_number}
            </p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse mb-8">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-gray-800">
            <th className="text-left py-3 px-3 text-sm font-semibold w-12">No</th>
            <th className="text-left py-3 px-3 text-sm font-semibold">Deskripsi Barang/Jasa</th>
            <th className="text-center py-3 px-3 text-sm font-semibold w-20">Qty</th>
            <th className="text-center py-3 px-3 text-sm font-semibold w-24">Satuan</th>
            <th className="text-right py-3 px-3 text-sm font-semibold w-32">Harga</th>
            <th className="text-right py-3 px-3 text-sm font-semibold w-32">Total</th>
          </tr>
        </thead>
        <tbody>
          {po.items?.map((item: any, index: number) => (
            <tr key={item.id} className="border-b">
              <td className="py-3 px-3 text-sm text-center">{index + 1}</td>
              <td className="py-3 px-3 text-sm">
                {item.description}
                {item.notes && (
                  <p className="text-xs text-gray-500">{item.notes}</p>
                )}
              </td>
              <td className="py-3 px-3 text-sm text-center">{item.qty}</td>
              <td className="py-3 px-3 text-sm text-center">{item.unit}</td>
              <td className="py-3 px-3 text-sm text-right">
                {formatRupiah(item.unit_price)}
              </td>
              <td className="py-3 px-3 text-sm text-right font-medium">
                {formatRupiah(item.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Calculations */}
      <div className="flex justify-end mb-8">
        <div className="w-80">
          <div className="flex justify-between py-2">
            <span>Subtotal</span>
            <span>{formatRupiah(po.subtotal)}</span>
          </div>
          
          {po.discount_amount > 0 && (
            <div className="flex justify-between py-2">
              <span>Diskon ({po.discount_percent}%)</span>
              <span>-{formatRupiah(po.discount_amount)}</span>
            </div>
          )}
          
          <div className="flex justify-between py-2">
            <span>PPN ({po.tax_percent}%)</span>
            <span>{formatRupiah(po.tax_amount)}</span>
          </div>
          
          {po.shipping_cost > 0 && (
            <div className="flex justify-between py-2">
              <span>Biaya Pengiriman</span>
              <span>{formatRupiah(po.shipping_cost)}</span>
            </div>
          )}
          
          <div className="flex justify-between py-3 border-t-2 border-gray-800 font-bold text-lg">
            <span>TOTAL</span>
            <span>{formatRupiah(po.total)}</span>
          </div>
        </div>
      </div>

      {/* Terms & Delivery */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h4 className="font-bold text-sm uppercase text-gray-500 mb-2">Ketentuan Pembayaran:</h4>
          <p className="text-sm text-gray-700 capitalize">
            {po.payment_terms ? po.payment_terms.replace("_", " ") : "Net 14 Hari"}
          </p>
          
          <h4 className="font-bold text-sm uppercase text-gray-500 mt-4 mb-2">Alamat Pengiriman:</h4>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{po.delivery_address}</p>
          
          {po.delivery_date && (
            <>
              <h4 className="font-bold text-sm uppercase text-gray-500 mt-4 mb-2">Estimasi Pengiriman:</h4>
              <p className="text-sm text-gray-700">{formatDate(po.delivery_date)}</p>
            </>
          )}
        </div>
        
        <div>
          {po.notes && (
            <>
              <h4 className="font-bold text-sm uppercase text-gray-500 mb-2">Catatan:</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{po.notes}</p>
            </>
          )}
        </div>
      </div>

      {/* Signature Section */}
      <div className="mt-12">
        <h4 className="font-semibold text-sm mb-6 border-b pb-2">
          Persetujuan / Approval
        </h4>
        <div className="grid grid-cols-3 gap-8">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-8">Dibuat oleh,</p>
            <div className="border-t border-gray-400 pt-2 mx-4">
              <p className="font-medium text-sm">Purchasing Staff</p>
              <p className="text-xs text-gray-500">Aapex Technology</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500 mb-8">Disetujui oleh,</p>
            <div className="border-t border-gray-400 pt-2 mx-4">
              <p className="text-gray-300">........................</p>
              <p className="text-xs text-gray-400">Purchasing Manager</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500 mb-8">Diterima oleh Vendor,</p>
            <div className="border-t border-gray-400 pt-2 mx-4">
              <p className="text-gray-300">........................</p>
              <p className="text-xs text-gray-400">Nama & Stamp</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 pt-4 border-t text-center text-xs text-gray-400">
        <p>This Purchase Order is generated by Aapex Purchasing System</p>
        <p className="mt-1">
          Document printed: {new Date().toLocaleString("id-ID")}
        </p>
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
    </div>
  );
}
