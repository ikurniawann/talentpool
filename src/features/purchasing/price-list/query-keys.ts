export const priceListQueryKeys = {
  all: ["purchasing", "price-list"] as const,
  list: () => ["purchasing", "price-list", "list"] as const,
  detail: (id: string) => ["purchasing", "price-list", "detail", id] as const,
  formData: () => ["purchasing", "price-list", "form-data"] as const,
};
