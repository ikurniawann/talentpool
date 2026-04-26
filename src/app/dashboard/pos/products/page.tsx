'use client';

import { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  Filter,
  ChevronDown,
  Eye,
  X,
  Check,
  Save,
  PlusCircle,
  MinusCircle,
  Settings2,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

// ============== MOCK DATA ==============
const mockProducts = [
  { 
    id: 1, 
    name: 'Nasi Goreng Special', 
    category: 'Makanan', 
    price: 50000, 
    cost: 25000,
    margin: 50,
    stock: 'unlimited',
    status: 'active',
    image: null,
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
    stock: 'unlimited',
    status: 'active',
    image: null,
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
    stock: 'unlimited',
    status: 'active',
    image: null,
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
    stock: 'unlimited',
    status: 'active',
    image: null,
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
      { id: 'mg5', name: 'Ice Level', required: false, maxSelect: 1, active: true, modifiers: [
        { id: 'm15', name: 'Less Ice', priceAdj: 0, active: true },
        { id: 'm16', name: 'Normal Ice', priceAdj: 0, active: true },
        { id: 'm17', name: 'Extra Ice', priceAdj: 1000, active: true },
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
    stock: 'unlimited',
    status: 'active',
    image: null,
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
    stock: 'unlimited',
    status: 'inactive',
    image: null,
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
    stock: 'unlimited',
    status: 'active',
    image: null,
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
    stock: 'unlimited',
    status: 'active',
    image: null,
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
      { id: 'mg10', name: 'Toppings', required: false, maxSelect: 3, active: true, modifiers: [
        { id: 'm30', name: 'Butter', priceAdj: 3000, active: true },
        { id: 'm31', name: 'Chocolate Spread', priceAdj: 5000, active: true },
        { id: 'm32', name: 'Cheese', priceAdj: 5000, active: true },
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
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

  // Close Variants Modal
  const closeVariantsModal = () => {
    setVariantModalProduct(null);
    setVariantModalData([]);
  };

  // Save Variants
  const saveVariants = () => {
    if (!variantModalProduct) return;
    
    // Update product's hasVariants flag based on whether there are any active variants
    const hasActiveVariants = variantModalData.some(v => v.active);
    
    setProducts(prev => prev.map(p => 
      p.id === variantModalProduct.id 
        ? { ...p, variants: variantModalData, hasVariants: hasActiveVariants }
        : p
    ));
    
    closeVariantsModal();
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

  // Close Modifiers Modal
  const closeModifiersModal = () => {
    setModifierModalProduct(null);
    setModifierModalData([]);
  };

  // Save Modifiers
  const saveModifiers = () => {
    if (!modifierModalProduct) return;
    
    // Update product's hasModifiers flag based on whether there are any active modifier groups
    const hasActiveModifiers = modifierModalData.some(g => g.active);
    
    setProducts(prev => prev.map(p => 
      p.id === modifierModalProduct.id 
        ? { ...p, modifierGroups: modifierModalData, hasModifiers: hasActiveModifiers }
        : p
    ));
    
    closeModifiersModal();
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
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produk & Menu</h1>
          <p className="text-gray-500 text-sm">Kelola produk, varian, dan modifier</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Tambah Produk
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari produk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
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
                  <button
                    onClick={() => openVariantsModal(product)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                      product.hasVariants
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <Settings2 className="w-3 h-3" />
                    {product.variants.length} Varian
                  </button>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => openModifiersModal(product)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                      product.hasModifiers
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    {product.modifierGroups.length} Groups
                  </button>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => toggleProductStatus(product.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      product.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {product.status === 'active' ? (
                      <ToggleRight className="w-4 h-4" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                    {product.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </button>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingProduct(product)}
                      className="p-2 text-gray-500 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Tidak ada produk ditemukan</p>
          </div>
        )}
      </div>

      {/* Variants Modal */}
      {variantModalProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Kelola Varian</h2>
                <p className="text-sm text-gray-500">{variantModalProduct.name}</p>
              </div>
              <button onClick={closeVariantsModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {variantModalData.map((variant, idx) => (
                <div key={variant.id} className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Varian {idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateVariant(variant.id, 'active', !variant.active)}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          variant.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {variant.active ? 'Aktif' : 'Nonaktif'}
                      </button>
                      <button
                        onClick={() => removeVariant(variant.id)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nama</label>
                      <input
                        type="text"
                        value={variant.name}
                        onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                        placeholder="Small"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">SKU</label>
                      <input
                        type="text"
                        value={variant.sku}
                        onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                        placeholder="NF-SM"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Harga Adj.</label>
                      <input
                        type="number"
                        value={variant.priceAdj}
                        onChange={(e) => updateVariant(variant.id, 'priceAdj', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    Harga final: {formatCurrency(variantModalProduct.price + variant.priceAdj)}
                  </div>
                </div>
              ))}
              
              <button
                onClick={addVariant}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-pink-400 hover:text-pink-600 flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Tambah Varian
              </button>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={closeVariantsModal}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={saveVariants}
                className="flex-1 px-4 py-2 text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modifiers Modal */}
      {modifierModalProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Kelola Modifier Groups</h2>
                <p className="text-sm text-gray-500">{modifierModalProduct.name}</p>
              </div>
              <button onClick={closeModifiersModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {modifierModalData.map((group, gIdx) => (
                <div key={group.id} className="p-4 bg-gray-50 rounded-lg space-y-4">
                  {/* Group Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Nama Group</label>
                        <input
                          type="text"
                          value={group.name}
                          onChange={(e) => updateModifierGroup(group.id, 'name', e.target.value)}
                          placeholder="Sugar Level"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Max Pilih</label>
                        <input
                          type="number"
                          value={group.maxSelect}
                          onChange={(e) => updateModifierGroup(group.id, 'maxSelect', parseInt(e.target.value) || 1)}
                          min="1"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Status</label>
                        <button
                          onClick={() => updateModifierGroup(group.id, 'active', !group.active)}
                          className={`w-full px-3 py-2 rounded-lg text-sm font-medium text-left ${
                            group.active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {group.active ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => removeModifierGroup(group.id)}
                      className="p-2 text-red-500 hover:text-red-700 mt-6"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                          <input
                            type="text"
                            value={modifier.name}
                            onChange={(e) => updateModifier(group.id, modifier.id, 'name', e.target.value)}
                            placeholder={`Modifier ${mIdx + 1}`}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                          />
                          <input
                            type="number"
                            value={modifier.priceAdj}
                            onChange={(e) => updateModifier(group.id, modifier.id, 'priceAdj', parseInt(e.target.value) || 0)}
                            placeholder="Harga adj."
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                          />
                        </div>
                        <button
                          onClick={() => removeModifier(group.id, modifier.id)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <MinusCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addModifier(group.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-pink-600 hover:text-pink-700"
                    >
                      <PlusCircle className="w-3 h-3" />
                      Tambah Modifier
                    </button>
                  </div>
                </div>
              ))}
              
              <button
                onClick={addModifierGroup}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-pink-400 hover:text-pink-600 flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Tambah Modifier Group
              </button>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={closeModifiersModal}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={saveModifiers}
                className="flex-1 px-4 py-2 text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal (Simplified) */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Edit Produk</h2>
              <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk</label>
                <input
                  type="text"
                  defaultValue={editingProduct.name}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga</label>
                <input
                  type="number"
                  defaultValue={editingProduct.price}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select
                  defaultValue={editingProduct.category}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  {categories.filter(c => c !== 'Semua').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setEditingProduct(null)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={() => setEditingProduct(null)}
                className="flex-1 px-4 py-2 text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition-colors font-medium"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal (Simplified) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Tambah Produk Baru</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk</label>
                <input
                  type="text"
                  placeholder="Nama produk"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga</label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
                  {categories.filter(c => c !== 'Semua').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="addHasVariants" className="w-4 h-4 text-pink-600 rounded" />
                <label htmlFor="addHasVariants" className="text-sm text-gray-700">Memiliki Varian</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="addHasModifiers" className="w-4 h-4 text-pink-600 rounded" />
                <label htmlFor="addHasModifiers" className="text-sm text-gray-700">Memiliki Modifier</label>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition-colors font-medium"
              >
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
