import { redirect } from "next/navigation";

interface ReceivePOPageProps {
  params: Promise<{ id: string }>;
}

// Redirect ke halaman GRN baru
export default async function ReceivePOPage({ params }: ReceivePOPageProps) {
  const { id } = await params;
  // Redirect ke halaman GRN dengan PO ID sebagai parameter
  redirect(`/dashboard/purchasing/grn/new?po_id=${id}`);
}
