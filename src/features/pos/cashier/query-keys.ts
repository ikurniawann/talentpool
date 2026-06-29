export const cashierQueryKeys = {
  all: ["pos", "cashier"] as const,
  tables: () => ["pos", "cashier", "tables"] as const,
  order: (orderId: string) => ["pos", "cashier", "order", orderId] as const,
  favorites: (customerId: string) => ["pos", "cashier", "favorites", customerId] as const,
};
