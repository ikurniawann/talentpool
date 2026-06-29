export const ITEMS_RAW_MATERIALS_PATH = "/dashboard/items/raw-materials";
export const ITEMS_PRODUCTS_PATH = "/dashboard/items/products";
export const ITEMS_PRODUCT_CATEGORIES_PATH = "/dashboard/items/product/categories";

export const PURCHASING_ITEMS_LANDING = "/dashboard/purchasing/items";

export const PURCHASING_ITEMS_BREADCRUMB = {
  label: "Items",
  href: PURCHASING_ITEMS_LANDING,
} as const;

export const RAW_MATERIAL_BREADCRUMB = {
  label: "Raw Material",
  href: ITEMS_RAW_MATERIALS_PATH,
} as const;

export const PRODUCT_BREADCRUMB = {
  label: "Product",
  href: ITEMS_PRODUCTS_PATH,
} as const;

export const ITEMS_NAV_GROUPS = [
  {
    label: "Raw Material",
    items: [
      { href: "/dashboard/items/units", label: "Unit" },
      { href: "/dashboard/items/raw-material/categories", label: "Kategori" },
      { href: "/dashboard/items/raw-material/storage", label: "Storage" },
    ],
  },
  {
    label: "Product",
    items: [
      { href: ITEMS_PRODUCT_CATEGORIES_PATH, label: "Kategori" },
      { href: ITEMS_PRODUCTS_PATH, label: "Product" },
    ],
  },
] as const;

export const ITEMS_ACTIVE_PATHS = [
  PURCHASING_ITEMS_LANDING,
  "/dashboard/purchasing/items/raw-material",
  "/dashboard/purchasing/items/product",
  "/dashboard/items/units",
  "/dashboard/items/raw-material/categories",
  "/dashboard/items/raw-material/storage",
  ITEMS_PRODUCT_CATEGORIES_PATH,
  ITEMS_PRODUCTS_PATH,
] as const;
