'use client';

import { useState } from 'react';
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
  X,
  Save,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';

// ============== MOCK DATA ==============
const mockProducts = [
  { 
    id: 1, 
    name: 'Nasi Goreng Special', 
    category: 'Makanan', 
    price: 50000, 
    cost: 25000,
    margin: 50,
    status: 'active',
    hasVariants: true,
    hasModifiers: true,
    variants: [
      { id: 'v1', name: 'Small', sku: 'NF-SM', priceAdj: -10000, active: true },
      { id: 'v2', name: 'Medium', sku: 'NF-MD', priceAdj: 0, active: true },
      { id: 'v3', name: 'Large', sku: 'NF-LG', priceAdj: 15000, active: true },
    ],
    modifierGroups: [
      { id: 'mg1', name: 'Sugar Level', required: true, maxSelect: 1, active: true, modifiers: [
        { id: 'm1', name: 'No Sugar', priceAdj: 0, active: true },
        { id: 'm2', name: 'Less Sugar (25%)', priceAdj: 0, active: true },
        { id: 'm3', name: 'Half Sweet (50%)', priceAdj: 0, active: true },
        { id: 'm4', name: 'Full Sweet (100%)', priceAdj: 0, active: true },
      ]},
      { id: 'mg2', name: 'Toppings', required: false, maxSelect: 3, active: true, modifiers: [
        { id: 'm5', name: 'Extra Egg', priceAdj: 5000, active: true },
        { id: 'm6', name: 'Extra Chicken', priceAdj: 10000, active: true },
        { id: 'm7', name: 'Extra Rice', priceAdj: 5000, active: true },
      ]},
    ],
  },
  { 
    id: 2, 
    name: 'Ayam Bakar Madu', 
    category: 'Makanan', 
    price: 55000, 
    cost: 28000,
    margin: 49,
    status: 'active',
    hasVariants: true,
    hasModifiers: false,
    variants: [
      { id: 'v4', name: 'Paha', sku: 'AB-PH', priceAdj: 0, active: true },
      { id: 'v5', name: 'Dada', sku: 'AB-DD', priceAdj: 5000, active: true },
      { id: 'v6', name: 'Sayap', sku: 'AB-SW', priceAdj: -5000, active: true },
    ],
    modifierGroups: [],
  },
  { 
    id: 3, 
    name: 'Mie Goreng Jawa', 
    category: 'Makanan', 
    price: 45000, 
    cost: 22000,
    margin: 51,
    status: 'active',
    hasVariants: false,
    hasModifiers: true,
    variants: [],
    modifierGroups: [
      { id: 'mg3', name: 'Spice Level', required: true, maxSelect: 1, active: true, modifiers: [
        { id: 'm8', name: 'No Spice', priceAdj: 0, active: true },
        { id: 'm9', name: 'Less Spice', priceAdj: 0, active: true },
        { id: 'm10', name: 'Normal Spice', priceAdj: 0, active: true },
        { id: 'm11', name: 'Extra Spice', priceAdj: 0, active: true },
      ]},
    ],
  },
  { 
    id: 4, 
    name: 'Es Teh Manis', 
    category: 'Minuman', 
    price: 5000, 
    cost: 2000,
    margin: 60,
    status: 'active',
    hasVariants: true,
    hasModifiers: true,
    variants: [
      { id: 'v7', name: 'Hot', sku: 'ET-H', priceAdj: 0, active: true },
      { id: 'v8', name: 'Ice', sku: 'ET-I', priceAdj: 1000, active: true },
      { id: 'v9', name: 'Regular', sku: 'ET-R', priceAdj: 0, active: true },
    ],
    modifierGroups: [
      { id: 'mg4', name: 'Sugar Level', required: true, maxSelect: 1, active: true, modifiers: [
        { id: 'm12', name: 'No Sugar', priceAdj: 0, active: true },
        { id: 'm13', name: 'Less Sweet', priceAdj: 0, active: true },
        { id: 'm14', name: 'Normal', priceAdj: 0, active: true },
      ]},
    ],
  },
  { 
    id: 5, 
    name: 'Kopi Susu Gula Aren', 
    category: 'Minuman', 
    price: 18000, 
    cost: 8000,
    margin: 56,
    status: 'active',
    hasVariants: true,
    hasModifiers: true,
    variants: [
      { id: 'v10', name: 'Hot', sku: 'KS-H', priceAdj: 0, active: true },
      { id: 'v11', name: 'Ice', sku: 'KS-I', priceAdj: 2000, active: true },
    ],
    modifierGroups: [
      { id: 'mg6', name: 'Sugar Level', required: true, maxSelect: 1, active: true, modifiers: [
        { id: 'm18', name: 'No Sugar', priceAdj: 0, active: true },
        { id: 'm19', name: 'Less Sugar', priceAdj: 0, active: true },
        { id: 'm20', name: 'Half Sweet', priceAdj: 0, active: true },
        { id: 'm21', name: 'Full Sweet', priceAdj: 0, active: true },
      ]},
    ],
  },
  { 
    id: 6, 
    name: 'Jus Alpukat', 
    category: 'Minuman', 
    price: 15000, 
    cost: 7000,
    margin: 53,
    status: 'inactive',
    hasVariants: false,
    hasModifiers: true,
    variants: [],
    modifierGroups: [
      { id: 'mg7', name: 'Toppings', required: false, maxSelect: 5, active: true, modifiers: [
        { id: 'm22', name: 'Chocolate', priceAdj: 3000, active: true },
        { id: 'm23', name: 'Caramel', priceAdj: 3000, active: true },
        { id: 'm24', name: 'Whipped Cream', priceAdj: 5000, active: true },
      ]},
    ],
  },
  { 
    id: 7, 
    name: 'Kentang Goreng', 
    category: 'Snack', 
    price: 12000, 
    cost: 5000,
    margin: 58,
    status: 'active',
    hasVariants: false,
    hasModifiers: true,
    variants: [],
    modifierGroups: [
      { id: 'mg8', name: 'Seasoning', required: false, maxSelect: 2, active: true, modifiers: [
        { id: 'm25', name: 'Extra Salt', priceAdj: 0, active: true },
        { id: 'm26', name: 'Cheese Sauce', priceAdj: 5000, active: true },
      ]},
    ],
  },
  { 
    id: 8, 
    name: 'Roti Bakar', 
    category: 'Snack', 
    price: 20000, 
    cost: 10000,
    margin: 50,
    status: 'active',
    hasVariants: true,
    hasModifiers: true,
    variants: [
      { id: 'v12', name: 'Small', sku: 'RB-S', priceAdj: -5000, active: true },
      { id: 'v13', name: 'Medium', sku: 'RB-M', priceAdj: 0, active: true },
      { id: 'v14', name: 'Large', sku: 'RB-L', priceAdj: 8000, active: true },
    ],
    modifierGroups: [
      { id: 'mg9', name: 'Sugar Level', required: true, maxSelect: 1, active: true, modifiers: [
        { id: 'm27', name: 'No Sugar', priceAdj: 0, active: true },
        { id: 'm28', name: 'Less Sweet', priceAdj: 0, active: true },
        { id: 'm29', name: 'Normal Sweet', priceAdj: 0, active: true },
      ]},
    ],
  },
];

const categories = ['Semua', 'Makanan', 'Minuman', 'Snack', 'Dessert'];

// ============== TYPES ==============
type Product = typeof mockProducts[0];
type Variant = Product['variants'][0];
type ModifierGroup = Product['modifierGroups'][0];
type Modifier = ModifierGroup['modifiers'][0];

// ============== HELPERS ==============
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// ============== MAIN COMPONENT ==============
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  
  // Variants Modal
  const [variantModalProduct, setVariantModalProduct] = useState<Product | null>(null);
  const [variantModalData, setVariantModalData] = useState<Variant[]>([]);
  
  // Modifiers Modal
  const [modifierModalProduct, setModifierModalProduct] = useState<Product | null>(null);
  const [modifierModalData, setModifierModalData] = useState<ModifierGroup[]>([]);

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Open Variants Modal
  const openVariantsModal = (product: Product) => {
    setVariantModalProduct(product);
    setVariantModalData(product.variants.map(v => ({ ...v })));
  };

  // Save Variants
  const saveVariants = () => {
    if (!variantModalProduct) return;
    const hasActiveVariants = variantModalData.some(v => v.active);
    setProducts(prev => prev.map(p => 
      p.id === variantModalProduct.id 
        ? { ...p, variants: variantModalData, hasVariants: hasActiveVariants }
        : p
    ));
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
  const updateVariant = (id: string, field: keyof Variant, value: string | number | boolean) => {
    setVariantModalData(prev => prev.map(v => 
      v.id === id ? { ...v, [field]: value } : v
    ));
  };

  // Open Modifiers Modal
  const openModifiersModal = (product: Product) => {
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
    setProducts(prev => prev.map(p => 
      p.id === modifierModalProduct.id 
        ? { ...p, modifierGroups: modifierModalData, hasModifiers: hasActiveModifiers }
        : p
    ));
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
  const updateModifierGroup = (id: string, field: keyof ModifierGroup, value: string | number | boolean) => {
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
  const updateModifier = (groupId: string, modifierId: string, field: keyof Modifier, value: string | number | boolean) => {
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
  const toggleProductStatus = (id: number) => {
    setProducts(prev => prev.map(p => 
      p.id === id ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' } : p
    ));
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
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                  <th className="p-4 font-medium">Produk</th>
                  <th className="p-4 font-medium">Kategori</th>
                  <th className="p-4 font-medium">Harga</th>
                  <th className="p-4 font-medium">Margin</th>
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
                    </td>
                    <td className="p-4">
                      <span className="text-green-600 font-medium">{product.margin}%</span>
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
                        <Button variant="ghost" size="icon-sm">
                          <Edit className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="icon-sm">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredProducts.length === 0 && (
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
                    <Button variant="ghost" size="icon-sm" onClick={() => removeVariant(variant.id)}>
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
                  <Button variant="ghost" size="icon-sm" onClick={() => removeModifierGroup(group.id)} className="mt-6">
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
                      <Button variant="ghost" size="icon-sm" onClick={() => removeModifier(group.id, modifier.id)}>
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
