'use client';

import { Minus, Plus, Trash2, ShoppingBag, Utensils, Truck, Check } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  variantName?: string;
  modifierNames?: string[];
}

interface CartPanelProps {
  cart: CartItem[];
  orderType: 'dine_in' | 'takeaway' | 'delivery' | 'self_order';
  selectedTable: string | null;
  subtotal: number;
  discountAmount: number;
  selectedCustomer: any;
  includeTax: boolean;
  tax: number;
  arkToUseCapped: number;
  paymentMethod: string;
  totalAfterArk: number;
  total: number;
  formatCurrency: (value: number) => string;
  formatArk: (value: number) => string;
  setIncludeTax: (val: boolean) => void;
  setShowPaymentModal: () => void;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
}

export function CartPanel({
  cart,
  orderType,
  selectedTable,
  subtotal,
  discountAmount,
  selectedCustomer,
  includeTax,
  tax,
  arkToUseCapped,
  paymentMethod,
  totalAfterArk,
  total,
  formatCurrency,
  formatArk,
  setIncludeTax,
  setShowPaymentModal,
  updateQuantity,
  removeFromCart,
}: CartPanelProps) {
  return (
    <div className="w-full lg:w-96 bg-white rounded-xl border border-gray-200 flex flex-col max-h-[60vh] lg:max-h-none">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">Pesanan</h2>
          <span className="text-sm text-gray-500">{cart.reduce((sum, i) => sum + i.quantity, 0)} item</span>
        </div>
        
        {/* Order Type & Table Badges */}
        <div className="flex flex-wrap gap-2">
          {orderType === 'dine_in' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-100 text-pink-700 text-xs font-medium rounded-full">
              <Utensils className="w-3 h-3" /> Dine-in
            </span>
          )}
          {orderType === 'takeaway' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              <ShoppingBag className="w-3 h-3" /> Takeaway
            </span>
          )}
          {orderType === 'delivery' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
              <Truck className="w-3 h-3" /> Delivery
            </span>
          )}
          {selectedTable && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-100 text-pink-700 text-xs font-medium rounded-full">
              {selectedTable}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada item</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 truncate">{item.name}</div>
                
                {(item.variantName || (item.modifierNames && item.modifierNames.length > 0)) && (
                  <div className="flex flex-wrap gap-1 mt-1 mb-1">
                    {item.variantName && (
                      <span className="inline-flex items-center px-1.5 py-0.5 bg-pink-100 text-pink-700 text-xs font-medium rounded">
                        {item.variantName}
                      </span>
                    )}
                    {item.modifierNames && item.modifierNames.map((mod, idx) => (
                      <span key={idx} className="inline-flex items-center px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                        {mod}
                      </span>
                    ))}
                  </div>
                )}
                
                {item.notes && (
                  <div className="text-xs text-gray-500 italic mt-1">📝 {item.notes}</div>
                )}
                
                <div className="text-xs text-gray-500">{formatCurrency(item.price)}</div>
                <div className="text-xs text-amber-600 font-medium">{formatArk(item.price)}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                  <Plus className="w-3 h-3" />
                </button>
                <button onClick={() => removeFromCart(item.id)} className="ml-1 text-gray-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="p-4 border-t border-gray-200 space-y-2 bg-gray-50">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <div className="text-right">
            <div className="font-medium text-gray-900">{formatCurrency(subtotal)}</div>
            <div className="text-xs text-amber-600 font-medium">{formatArk(subtotal)}</div>
          </div>
        </div>
        {discountAmount > 0 && selectedCustomer && (
          <div className="flex justify-between text-sm">
            <span className="text-green-600">Diskon ({selectedCustomer.discount}%)</span>
            <span className="font-medium text-green-600">-{formatCurrency(discountAmount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <button onClick={() => setIncludeTax(!includeTax)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${includeTax ? 'bg-pink-600 border-pink-600' : 'border-gray-300'}`}>
              {includeTax && <Check className="w-3 h-3 text-white" />}
            </div>
            <span>Pajak (10%)</span>
          </button>
          <div className="text-right">
            <div className="font-medium text-gray-900">{formatCurrency(tax)}</div>
            <div className="text-xs text-amber-600 font-medium">{formatArk(tax)}</div>
          </div>
        </div>
        {paymentMethod === 'ark_coin' && arkToUseCapped > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-amber-600">ARK Coin</span>
            <span className="font-medium text-amber-600">-{formatArk(arkToUseCapped)}</span>
          </div>
        )}
        {paymentMethod === 'ark_coin' ? (
          <div className="text-center pt-3 border-t border-gray-300">
            <div className="text-lg font-bold text-gray-900 mb-1">Total Pembayaran</div>
            <div className="text-4xl font-bold text-amber-600">{formatArk(totalAfterArk)}</div>
            <div className="text-xs text-gray-500 mt-1">≈ {formatCurrency(totalAfterArk)}</div>
          </div>
        ) : (
          <div className="flex justify-between items-end pt-3 border-t border-gray-300">
            <div>
              <div className="text-lg font-bold text-gray-900">Total</div>
              <div className="text-xs text-amber-600 font-medium">{formatArk(totalAfterArk)}</div>
            </div>
            <div className="text-2xl font-bold text-pink-600">{formatCurrency(totalAfterArk)}</div>
          </div>
        )}
      </div>

      {/* Pay Button */}
      <div className="p-4 border-t border-gray-200">
        <button 
          onClick={setShowPaymentModal}
          disabled={cart.length === 0} 
          className="w-full py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Bayar {formatCurrency(total)}
        </button>
      </div>
    </div>
  );
}