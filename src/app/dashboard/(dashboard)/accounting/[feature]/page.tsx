import { ComingSoonPage } from "@/components/dashboard/coming-soon-page";

const ACCOUNTING_FEATURES: Record<string, string> = {
  "release-payment": "Release Payment",
  "bank-reconcile": "Bank Reconcile",
  "cash-count": "Cash Count",
  "gl-reconciliation": "GL Reconciliation",
  "general-journal": "General Journal",
  "general-ledger": "General Ledger",
  "memorial-journal": "Memorial Journal",
  "close-period-stock": "Close Period Stock",
  "close-period": "Close Period",
};

type AccountingFeaturePageProps = {
  params: Promise<{ feature: string }>;
};

export default async function AccountingFeaturePage({ params }: AccountingFeaturePageProps) {
  const { feature } = await params;
  const title = ACCOUNTING_FEATURES[feature] ?? "Accounting";

  return (
    <ComingSoonPage
      title={title}
      description={`${title} akan menjadi bagian dari modul Accounting Arkiv OS. Halaman ini disiapkan sebagai placeholder sampai workflow accounting detail dibangun.`}
      backHref="/dashboard/accounting"
      backLabel="Kembali ke Accounting"
    />
  );
}
