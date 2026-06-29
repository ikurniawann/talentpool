"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getProductionDashboard,
  getProductCogs,
  listRecipeProducts,
  getProductionOrder,
} from "./api";
import { productionQueryKeys } from "./query-keys";

export const useProductionDashboard = () =>
  useQuery({
    queryKey: productionQueryKeys.dashboard,
    queryFn: getProductionDashboard,
  });

export const useProductCogs = (productId: string, enabled = true) =>
  useQuery({
    queryKey: productionQueryKeys.cogs(productId),
    queryFn: () => getProductCogs(productId),
    enabled: enabled && !!productId,
  });

export const useRecipeProducts = () =>
  useQuery({
    queryKey: productionQueryKeys.recipeProducts,
    queryFn: listRecipeProducts,
  });

export const useProductionOrder = <T = unknown>(id: string) =>
  useQuery({
    queryKey: productionQueryKeys.order(id),
    queryFn: () => getProductionOrder<T>(id),
    enabled: !!id,
  });
