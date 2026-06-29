export const productionQueryKeys = {
  all: ["purchasing", "production"] as const,
  dashboard: ["purchasing", "production", "dashboard"] as const,
  cogs: (productId: string) =>
    ["purchasing", "production", "cogs", productId] as const,
  recipeProducts: ["purchasing", "production", "recipe-products"] as const,
  order: (id: string) => ["purchasing", "production", "order", id] as const,
};
