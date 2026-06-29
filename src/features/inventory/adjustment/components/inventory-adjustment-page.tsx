import { ComingSoonPage } from "@/components/dashboard/coming-soon-page";

export function InventoryAdjustmentPage() {
  return (
    <ComingSoonPage
      title="Inventory Adjustment"
      description="Halaman ini akan digunakan untuk koreksi stok, stock opname, penyesuaian quantity, dan catatan selisih inventory."
      backHref="/dashboard/inventory"
      backLabel="Kembali ke Inventory"
    />
  );
}
