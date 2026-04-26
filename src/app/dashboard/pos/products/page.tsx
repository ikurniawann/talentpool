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
  Recipe
} from 'lucide-react';

// Mock data
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
    image: '/images/products/nasi-goreng.jpg',
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
    image: '/images/products/ayam-bakar.jpg',
  },
  {
    id: 3,
    name: 'Es Teh Manis',
    category: 'Minuman',
    price: 5000,
    cost: 2000,
    margin: 60,
    stock: 'unlimited',
    status: 'active',
    image: '/images/products/es-teh.jpg',
  },
  {
    id: 4,
    name: 'Kopi Susu Gula Aren',
    category: 'Minuman',
    price: 18000,
    cost: 8000,
    margin: 56,
    stock: 'unlimited',
    status: 'active',
    image: '/images/products/kopi-susu.jpg',
  },
  {
    id: 5,
    name: 'Mie Goreng Jawa',
    category: 'Makanan',
    price: 45000,
    cost: 22000,
    margin: 51,
    stock: 'unlimited',
    status: 'active',
    image: '/images/products/mie-goreng.jpg',
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
    image: '/images/products/jus-alpukat.jpg',
  },
];

const categories = ['Semua', 'Makanan', 'Minuman', 'Snack', 'Dessert'];

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const filteredProducts = mockProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Produk</h1>
          <p className="text-gray-500 text-sm">Kelola menu dan resep produk</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Tambah Produk
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari produk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <div className="relative w-full sm:w-auto">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white cursor-pointer"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Product Image */}
            <div className="h-40 sm:h-48 bg-gray-100 relative">
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <Package className="w-12 h-12 sm:w-16 sm:h-16" />
              </div>
              {product.status === 'inactive' && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-full">
                  Nonaktif
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-3 sm:p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-500">{product.category}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-base sm:text-lg font-bold text-gray-900">
                    {formatCurrency(product.price)}
                  </div>
                  <div className="text-xs text-gray-500">
                    HPP: {formatCurrency(product.cost)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs sm:text-sm font-semibold ${
                    product.margin >= 50 ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {product.margin}% margin
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-gray-100 flex-wrap">
                <button
                  className="flex-1 min-w-[80px] flex items-center justify-center gap-1 px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                  Detail
                </button>
                <button
                  onClick={() => setEditingProduct(product.id)}
                  className="flex-1 min-w-[80px] flex items-center justify-center gap-1 px-2 sm:px-3 py-2 text-xs sm:text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                  Edit
                </button>
                <button
                  className="flex items-center justify-center gap-1 px-2 sm:px-3 py-2 text-xs sm:text-sm text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* Recipe Link */}
              <button className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                <Recipe className="w-3 h-3 sm:w-4 sm:h-4" />
                Kelola Resep
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full my-8">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Tambah Produk Baru</h2>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Produk
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Contoh: Nasi Goreng Special"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategori
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                    {categories.filter(c => c !== 'Semua').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Harga Jual
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HPP (Cost)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> Setelah membuat produk, jangan lupa untuk menambahkan resep 
                  agar stok bahan baku terupdate otomatis saat penjualan.
                </p>
              </div>
            </div>
            <div className="p-4 sm:p-6 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-full sm:w-auto px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors mt-2 sm:mt-0"
              >
                Simpan Produk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
