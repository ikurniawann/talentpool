'use client';

import { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Beaker, 
  Package, 
  Search,
  AlertCircle,
  Save,
  X
} from 'lucide-react';

// Mock data - Raw materials from purchasing module
const mockRawMaterials = [
  { id: 1, name: 'Daging Ayam', unit: 'kg', cost: 35000, stock: 2.5 },
  { id: 2, name: 'Beras', unit: 'kg', cost: 12000, stock: 10 },
  { id: 3, name: 'Telur', unit: 'butir', cost: 2500, stock: 15 },
  { id: 4, name: 'Minyak Goreng', unit: 'liter', cost: 18000, stock: 5 },
  { id: 5, name: 'Susu UHT', unit: 'liter', cost: 15000, stock: 3 },
  { id: 6, name: 'Gula Aren', unit: 'gram', cost: 500, stock: 500 },
  { id: 7, name: 'Kopi Bubuk', unit: 'gram', cost: 800, stock: 200 },
  { id: 8, name: 'Teh Hitam', unit: 'gram', cost: 300, stock: 100 },
  { id: 9, name: 'Garam', unit: 'gram', cost: 50, stock: 200 },
  { id: 10, name: 'Kecap Manis', unit: 'ml', cost: 100, stock: 500 },
];

// Mock recipe for editing
const mockRecipe = {
  productName: 'Nasi Goreng Special',
  productId: 1,
  servings: 1,
  ingredients: [
    { materialId: 2, name: 'Beras', quantity: 0.15, unit: 'kg', cost: 1800 },
    { materialId: 1, name: 'Daging Ayam', quantity: 0.1, unit: 'kg', cost: 3500 },
    { materialId: 3, name: 'Telur', quantity: 1, unit: 'butir', cost: 2500 },
    { materialId: 4, name: 'Minyak Goreng', quantity: 0.02, unit: 'liter', cost: 360 },
    { materialId: 9, name: 'Garam', quantity: 5, unit: 'gram', cost: 250 },
    { materialId: 10, name: 'Kecap Manis', quantity: 30, unit: 'ml', cost: 3000 },
  ],
  wastePercentage: 5,
};

export default function RecipeBuilderPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(mockRecipe);
  const [ingredients, setIngredients] = useState(selectedProduct.ingredients);
  const [servings, setServings] = useState(selectedProduct.servings);
  const [wastePercentage, setWastePercentage] = useState(selectedProduct.wastePercentage);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const filteredMaterials = mockRawMaterials.filter((material) =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addIngredient = (material: typeof mockRawMaterials[0]) => {
    const newIngredient = {
      materialId: material.id,
      name: material.name,
      quantity: 0,
      unit: material.unit,
      cost: 0,
    };
    setIngredients([...ingredients, newIngredient]);
    setShowMaterialPicker(false);
    setSearchTerm('');
  };

  const updateIngredient = (index: number, field: string, value: number) => {
    const updated = [...ingredients];
    const ingredient = updated[index];
    
    if (field === 'quantity') {
      ingredient.quantity = value;
      // Find material cost
      const material = mockRawMaterials.find(m => m.id === ingredient.materialId);
      if (material) {
        ingredient.cost = value * material.cost;
      }
    }
    
    updated[index] = ingredient;
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const totalIngredientCost = ingredients.reduce((sum, ing) => sum + ing.cost, 0);
  const wasteCost = totalIngredientCost * (wastePercentage / 100);
  const totalCost = totalIngredientCost + wasteCost;
  const costPerServing = totalCost / servings;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recipe Builder</h1>
          <p className="text-gray-500 text-sm">
            Buat dan kelola resep produk dengan bahan baku dari purchasing
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
          <Save className="w-5 h-5" />
          Simpan Resep
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recipe Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Info */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Produk</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Produk
                </label>
                <input
                  type="text"
                  value={selectedProduct.productName}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Porsi (Servings)
                </label>
                <input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Bahan-bahan</h2>
              <button
                onClick={() => setShowMaterialPicker(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 text-sm text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tambah Bahan
              </button>
            </div>

            {ingredients.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Beaker className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Belum ada bahan</p>
                <p className="text-sm">Klik "Tambah Bahan" untuk memulai</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-x-auto">
                <div className="min-w-[600px] grid grid-cols-12 gap-2 text-sm font-medium text-gray-500 pb-2 border-b">
                  <div className="col-span-4">Bahan</div>
                  <div className="col-span-2">Jumlah</div>
                  <div className="col-span-2">Satuan</div>
                  <div className="col-span-3">Subtotal</div>
                  <div className="col-span-1"></div>
                </div>
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="min-w-[600px] grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <div className="font-medium text-gray-900">{ingredient.name}</div>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        value={ingredient.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      />
                    </div>
                    <div className="col-span-2 text-sm text-gray-600">{ingredient.unit}</div>
                    <div className="col-span-3 font-medium text-gray-900">
                      {formatCurrency(ingredient.cost)}
                    </div>
                    <div className="col-span-1">
                      <button
                        onClick={() => removeIngredient(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Waste Percentage */}
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Waste & Shrinkage</h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-full sm:flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Persentase Waste (%)
                </label>
                <input
                  type="number"
                  value={wastePercentage}
                  onChange={(e) => setWastePercentage(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="w-full sm:flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimasi Waste Cost
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-lg font-medium text-gray-900">
                  {formatCurrency(wasteCost)}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              💡 Waste mencakup bahan yang terbuang saat persiapan dan penyusutan saat memasak
            </p>
          </div>
        </div>

        {/* Right: Cost Summary */}
        <div className="space-y-6">
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 sticky top-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Ringkasan Biaya</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Bahan</span>
                <span className="font-medium">{formatCurrency(totalIngredientCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Waste ({wastePercentage}%)</span>
                <span className="font-medium">{formatCurrency(wasteCost)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-100">
                <span className="font-semibold text-gray-900">Total HPP</span>
                <span className="font-bold text-green-600">{formatCurrency(totalCost)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-100 bg-green-50 -mx-6 px-6 py-3">
                <span className="font-semibold text-gray-900">HPP per Porsi</span>
                <span className="font-bold text-green-600">{formatCurrency(costPerServing)}</span>
              </div>
            </div>

            {/* Stock Alerts */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                Peringatan Stok
              </h3>
              <div className="space-y-2">
                {ingredients.filter(ing => {
                  const material = mockRawMaterials.find(m => m.id === ing.materialId);
                  return material && material.stock < ing.quantity;
                }).map((ing) => (
                  <div key={ing.materialId} className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                    ⚠️ {ing.name}: butuh {ing.quantity} {ing.unit}, stok hanya {
                      mockRawMaterials.find(m => m.id === ing.materialId)?.stock
                    } {ing.unit}
                  </div>
                ))}
                {ingredients.every(ing => {
                  const material = mockRawMaterials.find(m => m.id === ing.materialId);
                  return !material || material.stock >= ing.quantity;
                }) && (
                  <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                    ✅ Semua bahan tersedia dalam jumlah cukup
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Material Picker Modal */}
      {showMaterialPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full my-8 flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Pilih Bahan Baku</h2>
              <button
                onClick={() => {
                  setShowMaterialPicker(false);
                  setSearchTerm('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari bahan baku..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-2">
                {filteredMaterials.map((material) => (
                  <button
                    key={material.id}
                    onClick={() => addIngredient(material)}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{material.name}</div>
                      <div className="text-sm text-gray-500">
                        Stok: {material.stock} {material.unit}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {formatCurrency(material.cost)} / {material.unit}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
