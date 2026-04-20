"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftIcon, TruckIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

// Receiving Detail - redirect ke GRN detail karena data sama
export default function ReceivingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    // Redirect ke GRN detail
    if (id) {
      router.replace(`/dashboard/purchasing/grn/${id}`);
    }
  }, [id, router]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchasing/receiving">
          <Button variant="outline" size="sm">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <TruckIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Mengalihkan ke halaman GRN...</p>
        </CardContent>
      </Card>
    </div>
  );
}
