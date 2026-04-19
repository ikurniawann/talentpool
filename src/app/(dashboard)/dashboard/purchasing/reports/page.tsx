"use client";

import { redirect } from "next/navigation";

export default function ReportsIndexPage() {
  redirect("/dashboard/purchasing/reports/inventory-valuation");
}
