import { ComingSoonPage } from "@/components/dashboard/coming-soon-page";

export function InventoryTransfersPage() {
  return (
    <ComingSoonPage
      title="Transfer Out / In"
      description="Halaman ini akan dipakai untuk memindahkan stok antar lokasi, gudang, station, atau area produksi dengan histori transfer masuk dan keluar."
      backHref="/dashboard/inventory"
      backLabel="Kembali ke Inventory"
    />
  );
}
