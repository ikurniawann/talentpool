import { RouteGroup } from "./index";

/**
 * Purchasing module route definitions.
 * Each route maps a URL path to a page component.
 *
 * Convention:
 *   path: URL segment (kebab-case)
 *   page: relative path to page file under ../pages/
 *   label: sidebar display name (Indonesian)
 *   icon: heroicons outline class (without "h-5 w-5" — shared by NavSidebar)
 */
export const PURCHASING_ROUTES: RouteGroup = {
  groupKey: "purchasing",
  groupLabel: "Purchasing",
  icon: "ShoppingCartIcon", // Maps to heroicons outline
  basePath: "/dashboard/purchasing",
  routes: [
    // ── Suppliers ──────────────────────────────────────────
    {
      path: "suppliers",
      label: "Supplier",
      children: [
        { path: "suppliers/new", label: "Tambah Supplier" },
        { path: "suppliers/[id]", label: "Detail Supplier" },
        { path: "suppliers/[id]/edit", label: "Edit Supplier" },
      ],
    },

    // ── Raw Materials ──────────────────────────────────────
    {
      path: "raw-materials",
      label: "Bahan Baku",
      children: [
        { path: "raw-materials/new", label: "Tambah Bahan" },
        { path: "raw-materials/[id]", label: "Detail Bahan" },
        { path: "raw-materials/[id]/edit", label: "Edit Bahan" },
      ],
    },

    // ── Products ────────────────────────────────────────────
    {
      path: "products",
      label: "Produk",
      children: [
        { path: "products/new", label: "Tambah Produk" },
        { path: "products/[id]", label: "Detail Produk" },
        { path: "products/[id]/edit", label: "Edit Produk" },
        { path: "products/[id]/bom", label: "BOM Editor" },
      ],
    },

    // ── Purchase Orders ──────────────────────────────────────
    {
      path: "purchase-orders",
      label: "Purchase Order",
      badge: "open",
      children: [
        { path: "purchase-orders/new", label: "Buat PO" },
        { path: "purchase-orders/[id]", label: "Detail PO" },
        { path: "purchase-orders/[id]/edit", label: "Edit PO" },
        { path: "purchase-orders/approval", label: "Approval PO" },
      ],
    },

    // ── Receiving ───────────────────────────────────────────
    {
      path: "receiving",
      label: "Penerimaan",
      badge: "pending_grn",
      children: [
        { path: "receiving/new", label: "Terima Barang" },
        { path: "receiving/[id]", label: "Detail GRN" },
      ],
    },

    // ── QC ──────────────────────────────────────────────────
    {
      path: "qc",
      label: "Quality Control",
      badge: "pending_qc",
      children: [
        { path: "qc/[id]", label: "Detail QC" },
      ],
    },

    // ── Delivery ────────────────────────────────────────────
    {
      path: "delivery",
      label: "Pengiriman",
      badge: null,
      children: [
        { path: "delivery/[id]", label: "Detail Pengiriman" },
      ],
    },

    // ── Returns ─────────────────────────────────────────────
    {
      path: "returns",
      label: "Retur",
      badge: null,
      children: [
        { path: "returns/new", label: "Buat Retur" },
        { path: "returns/[id]", label: "Detail Retur" },
      ],
    },

    // ── Inventory ────────────────────────────────────────────
    {
      path: "inventory",
      label: "Inventori",
      badge: "low_stock",
      children: [
        { path: "inventory/adjustment", label: "Koreksi Stok" },
        { path: "inventory/[id]/movements", label: "Mutasi Stok" },
      ],
    },

    // ── Reports ──────────────────────────────────────────────
    {
      path: "reports",
      label: "Laporan",
      icon: "DocumentChartBarIcon",
      badge: null,
      children: [
        { path: "reports/inventory-valuation", label: "Valuasi Stok" },
        { path: "reports/po-summary", label: "Summary PO" },
        {
          path: "reports/supplier-performance",
          label: "Performa Supplier",
        },
        { path: "reports/hpp-breakdown", label: "HPP Produk" },
      ],
    },
  ],
};
