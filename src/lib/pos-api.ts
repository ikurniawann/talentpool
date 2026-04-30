/**
 * POS API Client
 * Helper functions for calling POS backend APIs
 */

const API_BASE = '/api/pos';

// Generic fetch wrapper
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `API error: ${response.status}`);
  }

  return data;
}

// ============ PRODUCTS ============

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  base_price: number;
  cost_price?: number;
  is_active: boolean;
  is_available: boolean;
  image_url?: string;
  variants?: ProductVariant[];
  modifiers?: ProductModifier[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  group_name: string;
  price_adjustment: number;
  is_active: boolean;
}

export interface ProductModifier {
  id: string;
  modifier_group: {
    name: string;
    modifiers: Array<{
      id: string;
      name: string;
      price_adjustment: number;
    }>;
  };
}

export async function getProducts(params?: { category?: string; search?: string }) {
  const queryString = params ? new URLSearchParams(params as any).toString() : '';
  return fetchAPI<{ success: boolean; data: Product[] }>(`/products${queryString ? '?' + queryString : ''}`);
}

// ============ CUSTOMERS ============

export interface Customer {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  membership_tier: string;
  ark_coin_balance: number;
  total_xp: number;
  current_xp: number;
  total_spent: number;
  visit_count: number;
  discount?: number; // Discount percentage based on tier
}

export async function getCustomers(params?: { search?: string; phone?: string }) {
  const queryString = params ? new URLSearchParams(params as any).toString() : '';
  return fetchAPI<{ success: boolean; data: Customer[] }>(`/customers${queryString ? '?' + queryString : ''}`);
}

export async function saveCustomer(customer: Partial<Customer> & { phone: string }) {
  return fetchAPI<{ success: boolean; data: Customer; message: string }>('/customers', {
    method: 'POST',
    body: JSON.stringify(customer),
  });
}

// ============ ORDERS ============

export interface OrderItem {
  product_id: string;
  product_name: string;
  product_sku: string;
  variants?: Array<{ name: string; group: string; price: number }>;
  modifiers?: Array<{ name: string; group: string }>;
  quantity: number;
  unit_price: number;
  subtotal: number;
  total_amount: number;
}

export interface CreateOrderRequest {
  order_type: 'dine_in' | 'takeaway' | 'delivery' | 'self_order';
  customer_id?: string;
  cashier_id: string;
  server_id?: string;
  table_id?: string;
  items: OrderItem[];
  subtotal: number;
  discount_amount?: number;
  discount_reason?: string;
  tax_amount?: number;
  service_charge_amount?: number;
  total_amount: number;
  payment_method?: 'cash' | 'qris' | 'debit' | 'credit' | 'ark_coin';
  amount_paid?: number;
  notes?: string;
  special_requests?: string;
  ark_coins_used?: number;
}

export async function createOrder(order: CreateOrderRequest) {
  return fetchAPI<{ success: boolean; data: any }>('/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  });
}

export async function getOrders(params?: { status?: string; customer_id?: string; limit?: number }) {
  const queryString = params ? new URLSearchParams(params as any).toString() : '';
  return fetchAPI<{ success: boolean; data: any[] }>(`/orders${queryString ? '?' + queryString : ''}`);
}

export async function getCustomerFavoriteProducts(customerId: string, products: Product[] = []) {
  // Fetch orders for this customer
  const response = await fetchAPI<{ success: boolean; data: any[] }>(`/orders?customer_id=${customerId}&status=completed&limit=100`);
  
  if (!response.success || !response.data) return [];
  
  // Count product occurrences from order items
  const productCounts: Record<string, number> = {};
  
  response.data.forEach((order: any) => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        if (!productCounts[item.product_id]) {
          productCounts[item.product_id] = 0;
        }
        productCounts[item.product_id] += item.quantity;
      });
    }
  });
  
  // Sort by count descending and take top 4
  const topProductIds = Object.entries(productCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([id]) => id);
  
  // Return actual product objects that match the IDs
  return products.filter(p => topProductIds.includes(p.id));
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  additionalData?: { payment_status?: string; payment_method?: string; amount_paid?: number; cancelled_reason?: string }
) {
  const response = await fetch(`/api/pos/orders/${orderId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status, ...additionalData }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `API error: ${response.status}`);
  }

  return data;
}

// ============ DASHBOARD ============

export async function getDashboardStats(period?: 'today' | 'week' | 'month') {
  return fetchAPI<{ success: boolean; data: any }>(`/dashboard?period=${period || 'today'}`);
}

// ============ TOPUP ============

export async function processTopup(data: {
  customer_id: string;
  amount: number;
  payment_method?: 'qris' | 'credit_card' | 'cash';
}) {
  return fetchAPI<{ success: boolean; data: any }>('/topup', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============ RESERVATIONS ============

export async function getReservations(params?: { date?: string; status?: string }) {
  const queryString = params ? new URLSearchParams(params as any).toString() : '';
  return fetchAPI<{ success: boolean; data: any[] }>(`/reservations${queryString ? '?' + queryString : ''}`);
}

export async function createReservation(reservation: {
  customer_name: string;
  customer_phone: string;
  reservation_date: string;
  time_slot: string;
  pax_count: number;
  table_id?: string;
  deposit_amount?: number;
  notes?: string;
}) {
  return fetchAPI<{ success: boolean; data: any }>('/reservations', {
    method: 'POST',
    body: JSON.stringify(reservation),
  });
}

export async function updateReservationStatus(
  reservationId: string,
  status: string,
  additionalData?: { notes?: string }
) {
  return fetchAPI<{ success: boolean; data: any }>(`/reservations/${reservationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...additionalData }),
  });
}
