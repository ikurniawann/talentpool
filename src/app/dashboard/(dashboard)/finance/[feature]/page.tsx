import { FinanceFeaturePage } from "@/features/finance/overview";

export default async function Page({ params }: { params: Promise<{ feature: string }> }) {
  const { feature } = await params;
  return <FinanceFeaturePage feature={feature} />;
}
