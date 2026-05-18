"use client";

import { useReducer, useCallback, useEffect } from "react";

export interface PosCartItem {
  id: string;               // composite: productId + variant + modifier join
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  variantName?: string;
  variantPriceAdj?: number;
  modifierNames?: string[];
  modifierPriceAdj?: number;
  imageUrl?: string;
}

interface CartState {
  items: PosCartItem[];
  orderType: "dine_in" | "takeaway" | "delivery" | "self_order";
  selectedTable: string | null;
  selectedCustomerId: string | null;
  notes: string;
  includeTax: boolean;
}

type CartAction =
  | { type: "ADD_ITEM"; item: PosCartItem }
  | { type: "UPDATE_QTY"; id: string; delta: number }
  | { type: "REMOVE_ITEM"; id: string }
  | { type: "CLEAR_CART" }
  | { type: "SET_ORDER_TYPE"; orderType: CartState["orderType"] }
  | { type: "SET_TABLE"; table: string | null }
  | { type: "SET_CUSTOMER"; customerId: string | null }
  | { type: "SET_NOTES"; notes: string }
  | { type: "SET_INCLUDE_TAX"; include: boolean }
  | { type: "HYDRATE"; state: CartState };

const STORAGE_KEY = "pos_cart_state";

function getInitialState(): CartState {
  if (typeof window === "undefined") {
    return { items: [], orderType: "dine_in", selectedTable: null, selectedCustomerId: null, notes: "", includeTax: false };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  return { items: [], orderType: "dine_in", selectedTable: null, selectedCustomerId: null, notes: "", includeTax: false };
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find(
        (i) => i.productId === action.item.productId && i.variantName === action.item.variantName && JSON.stringify(i.modifierNames) === JSON.stringify(action.item.modifierNames)
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i === existing ? { ...i, quantity: i.quantity + action.item.quantity, notes: action.item.notes || i.notes } : i
          ),
        };
      }
      return { ...state, items: [...state.items, action.item] };
    }
    case "UPDATE_QTY": {
      return {
        ...state,
        items: state.items
          .map((i) => (i.id === action.id ? { ...i, quantity: Math.max(0, i.quantity + action.delta) } : i))
          .filter((i) => i.quantity > 0),
      };
    }
    case "REMOVE_ITEM":
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case "CLEAR_CART":
      return { ...state, items: [], selectedTable: null, selectedCustomerId: null, notes: "" };
    case "SET_ORDER_TYPE":
      return { ...state, orderType: action.orderType, selectedTable: action.orderType === "dine_in" ? state.selectedTable : null };
    case "SET_TABLE":
      return { ...state, selectedTable: action.table };
    case "SET_CUSTOMER":
      return { ...state, selectedCustomerId: action.customerId };
    case "SET_NOTES":
      return { ...state, notes: action.notes };
    case "SET_INCLUDE_TAX":
      return { ...state, includeTax: action.include };
    case "HYDRATE":
      return action.state;
    default:
      return state;
  }
}

export function usePosCart() {
  const [state, dispatch] = useReducer(cartReducer, getInitialState());

  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const addItem = useCallback((item: PosCartItem) => dispatch({ type: "ADD_ITEM", item }), []);
  const updateQty = useCallback((id: string, delta: number) => dispatch({ type: "UPDATE_QTY", id, delta }), []);
  const removeItem = useCallback((id: string) => dispatch({ type: "REMOVE_ITEM", id }), []);
  const clearCart = useCallback(() => dispatch({ type: "CLEAR_CART" }), []);
  const setOrderType = useCallback((orderType: CartState["orderType"]) => dispatch({ type: "SET_ORDER_TYPE", orderType }), []);
  const setTable = useCallback((table: string | null) => dispatch({ type: "SET_TABLE", table }), []);
  const setCustomer = useCallback((customerId: string | null) => dispatch({ type: "SET_CUSTOMER", customerId }), []);
  const setNotes = useCallback((notes: string) => dispatch({ type: "SET_NOTES", notes }), []);
  const setIncludeTax = useCallback((include: boolean) => dispatch({ type: "SET_INCLUDE_TAX", include }), []);

  // Derived values
  const subtotal = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = state.includeTax ? Math.round((subtotal) * 0.1) : 0;
  const total = subtotal + tax;
  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);

  return {
    ...state,
    subtotal,
    tax,
    total,
    itemCount,
    addItem,
    updateQty,
    removeItem,
    clearCart,
    setOrderType,
    setTable,
    setCustomer,
    setNotes,
    setIncludeTax,
  };
}
