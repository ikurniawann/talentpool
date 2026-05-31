import { ComingSoonPage } from "@/components/dashboard/coming-soon-page";

export default function InventoryStockPage() {
  return (
    <ComingSoonPage
      title="Inventory Stock"
      description="Halaman ini akan menjadi pusat stok raw material dan WIP, termasuk saldo stok, lokasi, batch, dan status ketersediaan."
      backHref="/dashboard/inventory"
      backLabel="Kembali ke Inventory"
    />
  );
}
