'use client';

import { useMemo, useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  Settings2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Save,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import type { PosCatalogProduct, PosProductModifier, PosProductModifierGroup, PosProductVariant } from '../types';
import { usePosCatalogProducts } from '../queries';
import { usePatchPosProduct } from '../mutations';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const generateId = () => Math.random().toString(36).substr(2, 9);

const stationOptions = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bar', label: 'Bar' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'merchandise', label: 'Merchandise' },
  { value: 'photobooth', label: 'Photobooth' },
];

function inferStation(product: PosCatalogProduct) {
  const explicit = product.station;
  if (explicit) return explicit;
  if (/drink|minuman|kopi|coffee|tea|teh|juice|soda|latte|cappuccino/i.test(`${product.category} ${product.name}`)) {
    return 'bar';
  }
  if (/dessert|cake|kue|roti|bread|pastry|donut|bakery/i.test(`${product.category} ${product.name}`)) {
    return 'bakery';
  }
  return 'kitchen';
}

// ============== MAIN COMPONENT ==============
export function ProductsPage() {
  const { data: products = [], isLoading: loading, error: queryError } = usePosCatalogProducts();
  const patchProductMutation = usePatchPosProduct();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const queryErrorMessage = queryError instanceof Error ? queryError.message : null;
  
  // Variants Modal
  const [variantModalProduct, setVariantModalProduct] = useState<PosCatalogProduct | null>(null);
  const [variantModalData, setVariantModalData] = useState<PosProductVariant[]>([]);
  
  // Modifiers Modal
  const [modifierModalProduct, setModifierModalProduct] = useState<PosCatalogProduct | null>(null);
  const [modifierModalData, setModifierModalData] = useState<PosProductModifierGroup[]>([]);
  const [localEdits, setLocalEdits] = useState<
    Record<string, Partial<Pick<PosCatalogProduct, 'variants' | 'modifierGroups' | 'hasVariants' | 'hasModifiers'>>>
  >({});

  const displayProducts = useMemo(
    () => products.map((product) => (localEdits[product.id] ? { ...product, ...localEdits[product.id] } : product)),
    [products, localEdits]
  );

  const categories = useMemo(() => {
    const unique = Array.from(new Set(displayProducts.map((product) => product.category).filter(Boolean)));
    return ['Semua', ...unique];
  }, [displayProducts]);

  // Filter products
  const filteredProducts = displayProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Open Variants Modal
  const openVariantsModal = (product: PosCatalogProduct) => {
    setVariantModalProduct(product);
    setVariantModalData(product.variants.map(v => ({ ...v })));
  };

  // Save Variants
  const saveVariants = () => {
    if (!variantModalProduct) return;
    const hasActiveVariants = variantModalData.some(v => v.active);
    setLocalEdits((prev) => ({
      ...prev,
      [variantModalProduct.id]: {
        variants: variantModalData,
        hasVariants: hasActiveVariants,
      },
    }));
    setVariantModalProduct(null);
    setVariantModalData([]);
  };

  // Add Variant
  const addVariant = () => {
    setVariantModalData(prev => [...prev, {
      id: generateId(),
      name: '',
      sku: '',
      priceAdj: 0,
      active: true,
    }]);
  };

  // Remove Variant
  const removeVariant = (id: string) => {
    setVariantModalData(prev => prev.filter(v => v.id !== id));
  };

  // Update Variant
  const updateVariant = (id: string, field: keyof PosProductVariant, value: string | number | boolean) => {
    setVariantModalData(prev => prev.map(v => 
      v.id === id ? { ...v, [field]: value } : v
    ));
  };

  // Open Modifiers Modal
  const openModifiersModal = (product: PosCatalogProduct) => {
    setModifierModalProduct(product);
    setModifierModalData(product.modifierGroups.map(g => ({
      ...g,
      modifiers: g.modifiers.map(m => ({ ...m }))
    })));
  };

  // Save Modifiers
  const saveModifiers = () => {
    if (!modifierModalProduct) return;
    const hasActiveModifiers = modifierModalData.some(g => g.active);
    setLocalEdits((prev) => ({
      ...prev,
      [modifierModalProduct.id]: {
        modifierGroups: modifierModalData,
        hasModifiers: hasActiveModifiers,
      },
    }));
    setModifierModalProduct(null);
    setModifierModalData([]);
  };

  // Add Modifier Group
  const addModifierGroup = () => {
    setModifierModalData(prev => [...prev, {
      id: generateId(),
      name: '',
      required: false,
      maxSelect: 1,
      active: true,
      modifiers: [],
    }]);
  };

  // Remove Modifier Group
  const removeModifierGroup = (id: string) => {
    setModifierModalData(prev => prev.filter(g => g.id !== id));
  };

  // Update Modifier Group
  const updateModifierGroup = (id: string, field: keyof PosProductModifierGroup, value: string | number | boolean) => {
    setModifierModalData(prev => prev.map(g => 
      g.id === id ? { ...g, [field]: value } : g
    ));
  };

  // Add Modifier to Group
  const addModifier = (groupId: string) => {
    setModifierModalData(prev => prev.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          modifiers: [...g.modifiers, {
            id: generateId(),
            name: '',
            priceAdj: 0,
            active: true,
          }]
        };
      }
      return g;
    }));
  };

  // Remove Modifier
  const removeModifier = (groupId: string, modifierId: string) => {
    setModifierModalData(prev => prev.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          modifiers: g.modifiers.filter(m => m.id !== modifierId)
        };
      }
      return g;
    }));
  };

  // Update Modifier
  const updateModifier = (groupId: string, modifierId: string, field: keyof PosProductModifier, value: string | number | boolean) => {
    setModifierModalData(prev => prev.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          modifiers: g.modifiers.map(m => 
            m.id === modifierId ? { ...m, [field]: value } : m
          )
        };
      }
      return g;
    }));
  };

  // Toggle Product Status
  const toggleProductStatus = async (id: string) => {
    const currentProduct = displayProducts.find((product) => product.id === id);
    if (!currentProduct || savingProductId) return;

    const nextStatus = currentProduct.status === 'active' ? 'inactive' : 'active';
    setSavingProductId(id);
    setError(null);

    try {
      await patchProductMutation.mutateAsync({
        id,
        payload: { is_active: nextStatus === 'active' },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan status produk');
    } finally {
      setSavingProductId(null);
    }
  };

  const updateProductStation = async (id: string, station: string) => {
    const currentProduct = displayProducts.find((product) => product.id === id);
    if (!currentProduct || savingProductId) return;

    setSavingProductId(id);
    setError(null);

    try {
      await patchProductMutation.mutateAsync({ id, payload: { station } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan station produk');
    } finally {
      setSavingProductId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Produk & Menu</h1>
          <p className="text-sm text-gray-500">Kelola produk, varian, dan modifier</p>
        </div>
        <Button className="bg-pink-600 hover:bg-pink-700">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Produk
        </Button>
      </div>

      {(error || queryErrorMessage) && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || queryErrorMessage}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Cari produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                  <th className="p-4 font-medium">Produk</th>
                  <th className="p-4 font-medium">Kategori</th>
                  <th className="p-4 font-medium">Harga</th>
                  <th className="p-4 font-medium">Margin</th>
                  <th className="p-4 font-medium">Station</th>
                  <th className="p-4 font-medium">Varian</th>
                  <th className="p-4 font-medium">Modifiers</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-400">ID: {product.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {product.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{formatCurrency(product.price)}</div>
                      <div className="text-xs text-gray-400">HPP {formatCurrency(product.cost)}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-green-600 font-medium">{product.margin}%</span>
                    </td>
                    <td className="p-4">
                      <select
                        value={inferStation(product)}
                        onChange={(event) => updateProductStation(product.id, event.target.value)}
                        disabled={savingProductId === product.id}
                        className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                      >
                        {stationOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4">
                      <Button
                        variant={product.hasVariants ? "outline" : "ghost"}
                        size="sm"
                        onClick={() => openVariantsModal(product)}
                        className={product.hasVariants ? "border-pink-600 text-pink-600 hover:bg-pink-50" : ""}
                      >
                        <Settings2 className="w-3 h-3 mr-1" />
                        {product.variants.length}
                      </Button>
                    </td>
                    <td className="p-4">
                      <Button
                        variant={product.hasModifiers ? "outline" : "ghost"}
                        size="sm"
                        onClick={() => openModifiersModal(product)}
                        className={product.hasModifiers ? "border-green-600 text-green-600 hover:bg-green-50" : ""}
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        {product.modifierGroups.length}
                      </Button>
                    </td>
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleProductStatus(product.id)}
                        disabled={savingProductId === product.id}
                        className={product.status === 'active' ? "text-green-600" : "text-red-600"}
                      >
                        {product.status === 'active' ? (
                          <ToggleRight className="w-4 h-4 mr-1" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 mr-1" />
                        )}
                        {product.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </Button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {loading && (
            <div className="text-center py-12 text-gray-400">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-50 animate-pulse" />
              <p>Memuat produk...</p>
            </div>
          )}

          {!loading && filteredProducts.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Tidak ada produk ditemukan</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variants Modal */}
      <Dialog open={variantModalProduct !== null} onOpenChange={(open) => !open && setVariantModalProduct(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Kelola Varian</DialogTitle>
            <p className="text-sm text-gray-500">{variantModalProduct?.name}</p>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto space-y-4 py-4">
            {variantModalData.map((variant, idx) => (
              <div key={variant.id} className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Varian {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateVariant(variant.id, 'active', !variant.active)}
                      className={variant.active ? "border-green-600 text-green-600" : ""}
                    >
                      {variant.active ? 'Aktif' : 'Nonaktif'}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeVariant(variant.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nama</label>
                    <Input
                      value={variant.name}
                      onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                      placeholder="Small"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">SKU</label>
                    <Input
                      value={variant.sku}
                      onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                      placeholder="NF-SM"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Harga Adj.</label>
                    <Input
                      type="number"
                      value={variant.priceAdj}
                      onChange={(e) => updateVariant(variant.id, 'priceAdj', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  Harga final: {formatCurrency((variantModalProduct?.price || 0) + variant.priceAdj)}
                </div>
              </div>
            ))}
            
            <Button variant="outline" onClick={addVariant} className="w-full">
              <PlusCircle className="w-4 h-4 mr-2" />
              Tambah Varian
            </Button>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantModalProduct(null)}>Batal</Button>
            <Button onClick={saveVariants} className="bg-pink-600 hover:bg-pink-700">
              <Save className="w-4 h-4 mr-2" />
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modifiers Modal */}
      <Dialog open={modifierModalProduct !== null} onOpenChange={(open) => !open && setModifierModalProduct(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Kelola Modifier Groups</DialogTitle>
            <p className="text-sm text-gray-500">{modifierModalProduct?.name}</p>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto space-y-6 py-4">
            {modifierModalData.map((group) => (
              <div key={group.id} className="p-4 bg-gray-50 rounded-lg space-y-4">
                {/* Group Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nama Group</label>
                      <Input
                        value={group.name}
                        onChange={(e) => updateModifierGroup(group.id, 'name', e.target.value)}
                        placeholder="Sugar Level"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Max Pilih</label>
                      <Input
                        type="number"
                        value={group.maxSelect}
                        onChange={(e) => updateModifierGroup(group.id, 'maxSelect', parseInt(e.target.value) || 1)}
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Status</label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateModifierGroup(group.id, 'active', !group.active)}
                        className={group.active ? "border-green-600 text-green-600" : ""}
                      >
                        {group.active ? 'Aktif' : 'Nonaktif'}
                      </Button>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeModifierGroup(group.id)} className="mt-6 h-8 w-8">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
                
                {/* Required Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`req-${group.id}`}
                    checked={group.required}
                    onChange={(e) => updateModifierGroup(group.id, 'required', e.target.checked)}
                    className="w-4 h-4 text-pink-600 rounded"
                  />
                  <label htmlFor={`req-${group.id}`} className="text-sm text-gray-700">
                    Wajib dipilih (customer harus pilih minimal 1)
                  </label>
                </div>

                {/* Modifiers List */}
                <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Modifiers</div>
                  {group.modifiers.map((modifier, mIdx) => (
                    <div key={modifier.id} className="flex items-center gap-2">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <Input
                          value={modifier.name}
                          onChange={(e) => updateModifier(group.id, modifier.id, 'name', e.target.value)}
                          placeholder={`Modifier ${mIdx + 1}`}
                        />
                        <Input
                          type="number"
                          value={modifier.priceAdj}
                          onChange={(e) => updateModifier(group.id, modifier.id, 'priceAdj', parseInt(e.target.value) || 0)}
                          placeholder="Harga adj."
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeModifier(group.id, modifier.id)}>
                        <MinusCircle className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => addModifier(group.id)}>
                    <PlusCircle className="w-3 h-3 mr-1" />
                    Tambah Modifier
                  </Button>
                </div>
              </div>
            ))}
            
            <Button variant="outline" onClick={addModifierGroup} className="w-full">
              <PlusCircle className="w-4 h-4 mr-2" />
              Tambah Modifier Group
            </Button>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setModifierModalProduct(null)}>Batal</Button>
            <Button onClick={saveModifiers} className="bg-pink-600 hover:bg-pink-700">
              <Save className="w-4 h-4 mr-2" />
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
