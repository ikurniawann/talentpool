"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getCustomers, type Customer } from "@/lib/pos-api";

const TIER_DISCOUNTS: Record<string, number> = {
  platinum: 15,
  gold: 10,
  silver: 5,
  bronze: 0,
};

export interface CustomerWithDiscount extends Customer {
  discount: number;
}

export function usePosCustomers() {
  const [customers, setCustomers] = useState<CustomerWithDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCustomers();
      const data = (res.data || []).map((c) => ({
        ...c,
        discount: TIER_DISCOUNTS[c.membership_tier?.toLowerCase()] || 0,
      })) as CustomerWithDiscount[];
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const findCustomer = useCallback(
    (idOrPhone: string) => {
      return customers.find((c) => c.id === idOrPhone || c.phone === idOrPhone);
    },
    [customers]
  );

  return { customers, loading, error, refetch: fetchCustomers, findCustomer };
}
