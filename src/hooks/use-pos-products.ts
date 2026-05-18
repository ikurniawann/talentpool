"use client";

import { useState, useEffect, useCallback } from "react";
import { getProducts, type Product } from "@/lib/pos-api";

export function usePosProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(["Semua"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getProducts();
      const data = res.data || [];
      setProducts(data);
      const cats = Array.from(new Set(data.map((p) => p.category?.name || "Uncategorized")));
      setCategories(["Semua", ...cats]);
    } catch (err: any) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, categories, loading, error, refetch: fetchProducts };
}
