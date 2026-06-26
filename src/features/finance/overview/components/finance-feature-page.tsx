import { ComingSoonPage } from "@/components/dashboard/coming-soon-page";

const FINANCE_FEATURES: Record<string, string> = {
  "cash-received": "Cash Received",
  receipt: "Receipt",
  "cash-payment": "Cash Payment",
  intercash: "Intercash",
  "petty-cash-request": "Petty Cash Request",
  "petty-cash-fulfillment": "Petty Cash Fulfillment",
  "member-balance": "Member Balance",
  "member-deposit": "Member Deposit",
  "member-withdrawal": "Member Withdrawal",
  "supplier-payable": "Supplier Payable",
  "supplier-settlement": "Supplier Settlement",
  "supplier-advance": "Supplier Advance",
  "customer-settlement": "Customer Settlement",
  "account-mapping": "Account Mapping",
  "customer-receivable": "Customer Receivable",
  "customer-advance": "Customer Advance",
  "pos-settlement": "POS Settlement",
  "tenant-reconciliation": "Tenant Reconciliation",
  "employee-advance-payment": "Employee Advance Payment",
  "employee-reimbursement": "Employee Reimbursement",
  disbursement: "Disbursement",
};

type FinanceFeaturePageProps = {
  params: Promise<{ feature: string }>;
};

export default async function FinanceFeaturePage({ params }: FinanceFeaturePageProps) {
  const { feature } = await params;
  const title = FINANCE_FEATURES[feature] ?? "Finance";

  return (
    <ComingSoonPage
      title={title}
      description={`${title} akan menjadi bagian dari modul Finance Arkiv OS. Halaman ini disiapkan sebagai placeholder sampai workflow finance detail dibangun.`}
      backHref="/dashboard/finance"
      backLabel="Kembali ke Finance"
    />
  );
}
