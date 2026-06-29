"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ITEMS_NAV_GROUPS, PURCHASING_ITEMS_BREADCRUMB } from "@/modules/purchasing/constants/items-nav";
import { ArrowRight, Box, Package } from "lucide-react";

const GROUP_ICONS = {
  "Raw Material": Package,
  Product: Box,
} as const;

export function PurchasingItemsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200/70 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Items</h1>
        <p className="mt-1 text-sm text-gray-500">Kelola master data bahan baku dan produk</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {ITEMS_NAV_GROUPS.map((group) => {
          const Icon = GROUP_ICONS[group.label as keyof typeof GROUP_ICONS] ?? Package;
          return (
            <Card key={group.label} className="flex h-full flex-col border-gray-200/70 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-pink-50 p-2">
                    <Icon className="h-5 w-5 text-pink-600" />
                  </div>
                  <CardTitle className="text-lg">{group.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-2">
                {group.items.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="outline"
                      className="h-10 w-full justify-between border-gray-200/80 text-gray-800 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-700"
                    >
                      {item.label}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
