import { ComingSoonPage } from "@/components/dashboard/coming-soon-page";

export default function FinanceAccountingPage() {
  return (
    <ComingSoonPage
      title="Finance & Accounting"
      description="Modul ini akan menjadi pusat approval finance, pembayaran vendor, inventory valuation, HPP/COGS, journal, ledger, dan laporan keuangan."
      backHref="/dashboard"
      backLabel="Kembali ke Dashboard"
    />
  );
}
