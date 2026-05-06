import { redirect } from "next/navigation";

export default function PerformanceRedirect() {
  redirect("/dashboard/performance/dashboard");
}
