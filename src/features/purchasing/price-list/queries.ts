"use client";

import { useQuery } from "@tanstack/react-query";
import type { Supplier } from "@/types/supplier";
import type { RawMaterialWithStock, Unit } from "@/types/purchasing";
import { listPriceLists, getPriceList, listSuppliers, listRawMaterials, listUnits } from "@/lib/purchasing";
import { priceListQueryKeys } from "./query-keys";

export const usePriceLists = () =>
  useQuery({
    queryKey: priceListQueryKeys.list(),
    queryFn: async () => {
      const response = await listPriceLists();
      return Array.isArray(response) ? response : [response];
    },
  });

export const usePriceList = (id: string) =>
  useQuery({
    queryKey: priceListQueryKeys.detail(id),
    queryFn: () => getPriceList(id),
    enabled: !!id,
  });

export interface PriceListFormData {
  suppliers: Supplier[];
  materials: RawMaterialWithStock[];
  units: Unit[];
}

export const usePriceListFormData = () =>
  useQuery<PriceListFormData>({
    queryKey: priceListQueryKeys.formData(),
    queryFn: async () => {
      const [suppliersRes, materialsRes, unitsRes] = await Promise.all([
        listSuppliers({ is_active: true }),
        listRawMaterials({ limit: 100, is_active: true }),
        listUnits(),
      ]);
      return {
        suppliers: suppliersRes as unknown as Supplier[],
        materials: materialsRes.data,
        units: unitsRes.data || [],
      };
    },
  });
