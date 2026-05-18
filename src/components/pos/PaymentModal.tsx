"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wifi } from "lucide-react";

export type PaymentMethod = "cash" | "qris" | "credit_card" | "ark_coin";

interface Props {
  open: boolean;
  total: number;
  totalAfterArk: number;
  selectedCustomer: {
    id: string;
    name?: string;
    ark_coin_balance: number;
  } | null;
  onClose: () => void;
  onConfirm: (payload: {
    method: PaymentMethod;
    cashReceived: string;
    arkToUse: number;
  }) => void;
  formatCurrency: (v: number) => string;
  formatArk: (v: number) => string;
  onTapNFC: () => void;
}

export function PaymentModal({
  open,
  total,
  totalAfterArk,
  selectedCustomer,
  onClose,
  onConfirm,
  formatCurrency,
  formatArk,
  onTapNFC,
}: Props) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [arkToUse, setArkToUse] = useState(0);

  useEffect(() => {
    if (method === "ark_coin") {
      const max = selectedCustomer ? Math.min(selectedCustomer.ark_coin_balance, total) : 0;
      setArkToUse(max);
    } else {
      setArkToUse(0);
    }
  }, [method, selectedCustomer, total]);

  useEffect(() => {
    if (!open) {
      setMethod("cash");
      setCashReceived("");
      setArkToUse(0);
    }
  }, [open]);

  const maxArkUsable = selectedCustomer ? Math.min(selectedCustomer.ark_coin_balance, total) : 0;
  const change = method === "cash" ? (parseFloat(cashReceived) || 0) - totalAfterArk : 0;

  const isValid = (() => {
    if (method === "cash") {
      return (parseFloat(cashReceived) || 0) >= totalAfterArk;
    }
    if (method === "ark_coin") {
      return !!selectedCustomer && selectedCustomer.ark_coin_balance >= total;
    }
    return true;
  })();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Metode Pembayaran</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { key: "cash", title: "Cash", desc: "Bayar dengan uang tunai" },
                { key: "qris", title: "QRIS", desc: "Scan QR code" },
                { key: "credit_card", title: "Credit Card", desc: "Visa / Mastercard" },
                { key: "ark_coin", title: "ARK Coin", desc: formatArk(selectedCustomer?.ark_coin_balance || 0) },
              ] as { key: PaymentMethod; title: string; desc: string }[]
            ).map((m) => (
              <button
                key={m.key}
                onClick={() => {
                  setMethod(m.key);
                  if (m.key === "ark_coin" && !selectedCustomer) {
                    onTapNFC();
                  }
                }}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  method === m.key ? "border-pink-600 bg-pink-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-lg font-semibold">{m.title}</div>
                <div className="text-xs text-gray-500">{m.desc}</div>
              </button>
            ))}
          </div>

          {method === "cash" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Jumlah Uang Diterima</label>
              <input
                type="number"
                placeholder="0"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <div className="text-sm text-gray-500">Kembalian: {formatCurrency(change)}</div>
            </div>
          )}

          {method === "ark_coin" && !selectedCustomer && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-center space-y-3">
              <Wifi className="w-8 h-8 text-amber-500 mx-auto" />
              <div className="text-sm font-semibold text-amber-700">Member belum dipilih</div>
              <button
                onClick={onTapNFC}
                className="w-full py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600"
              >
                Tap Kartu NFC
              </button>
            </div>
          )}

          {method === "ark_coin" && selectedCustomer && (
            <div className="space-y-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Saldo ARK</span>
                <span className="font-semibold text-amber-600">{formatArk(selectedCustomer.ark_coin_balance)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total tagihan</span>
                <span className="font-semibold text-gray-900">{formatArk(total)}</span>
              </div>
              <div
                className={`text-sm font-medium ${
                  selectedCustomer.ark_coin_balance >= total ? "text-green-600" : "text-red-500"
                }`}
              >
                {selectedCustomer.ark_coin_balance >= total
                  ? "✓ Saldo cukup untuk membayar penuh"
                  : `Saldo kurang ${formatArk(total - selectedCustomer.ark_coin_balance)}`}
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-pink-600">{formatCurrency(total)}</span>
            </div>
          </div>

          <button
            onClick={() => onConfirm({ method, cashReceived, arkToUse })}
            disabled={!isValid}
            className="w-full py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Konfirmasi Pembayaran
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
