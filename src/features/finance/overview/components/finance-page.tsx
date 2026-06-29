import { ComingSoonPage } from "@/components/dashboard/coming-soon-page";

export function FinancePage() {
  return (
    <ComingSoonPage
      title="Finance"
      description="Modul ini akan menjadi pusat cash received, receipt, cash payment, petty cash, supplier payable, customer receivable, POS settlement, reimbursement, dan disbursement."
      backHref="/dashboard"
      backLabel="Kembali ke Dashboard"
    />
  );
}
