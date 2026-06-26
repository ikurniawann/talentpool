import { ComingSoonPage } from "@/components/dashboard/coming-soon-page";

export default function AccountingPage() {
  return (
    <ComingSoonPage
      title="Accounting"
      description="Modul ini akan menjadi pusat release payment, rekonsiliasi, general journal, general ledger, closing stock, dan closing period."
      backHref="/dashboard"
      backLabel="Kembali ke Dashboard"
    />
  );
}
