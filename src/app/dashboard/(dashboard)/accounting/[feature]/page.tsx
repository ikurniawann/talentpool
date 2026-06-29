import { AccountingFeaturePage } from "@/features/accounting/overview";

export default async function Page({ params }: { params: Promise<{ feature: string }> }) {
  const { feature } = await params;
  return <AccountingFeaturePage feature={feature} />;
}
