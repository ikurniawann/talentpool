"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CubeIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import { RawMaterialStockTab } from "./raw-material-stock-tab";
import { ProductStockTab } from "./product-stock-tab";

const TAB_TRIGGER_CLASS =
  "h-11 flex-none gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 text-sm font-semibold text-gray-500 shadow-none data-active:border-pink-600 data-active:!bg-transparent data-active:text-pink-700 data-active:shadow-none";

export function InventoryStockPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Stock</h1>
        <p className="text-sm text-gray-500">
          Pantau saldo stok bahan baku dan produk jadi beserta nilainya. Filter gudang
          tersedia pada tab Raw Material.
        </p>
      </div>

      <Tabs defaultValue="raw-material" className="flex-col space-y-4">
        <TabsList
          variant="line"
          className="flex h-auto w-full justify-start gap-6 rounded-none border-b border-gray-200 bg-transparent p-0"
        >
          <TabsTrigger value="raw-material" className={TAB_TRIGGER_CLASS}>
            <CubeIcon className="h-4 w-4" />
            Raw Material
          </TabsTrigger>
          <TabsTrigger value="product" className={TAB_TRIGGER_CLASS}>
            <ShoppingBagIcon className="h-4 w-4" />
            Product
          </TabsTrigger>
        </TabsList>

        <TabsContent value="raw-material">
          <RawMaterialStockTab />
        </TabsContent>
        <TabsContent value="product">
          <ProductStockTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
