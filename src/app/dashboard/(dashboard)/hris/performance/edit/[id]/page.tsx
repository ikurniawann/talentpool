import { EditPerformanceReviewPage } from "@/features/hris/performance";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <EditPerformanceReviewPage params={params} />;
}
