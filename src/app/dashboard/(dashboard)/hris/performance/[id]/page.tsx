import { PerformanceDetailPage } from "@/features/hris/performance";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <PerformanceDetailPage params={params} />;
}
