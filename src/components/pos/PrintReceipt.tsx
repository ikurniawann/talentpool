"use client";

import type { PosCartItem } from "@/hooks/use-pos-cart";

export interface ReceiptPayload {
  orderId?: string;
  orderNumber?: string;
  orderType: string;
  table: string | null;
  items: PosCartItem[];
  notes: string;
  total: number;
  change: number;
  paymentMethod: string;
  customerName?: string;
  discountAmount: number;
  taxAmount: number;
}

export function printThermalReceipt(payload: ReceiptPayload, label: "KITCHEN" | "BAR" | "CUSTOMER") {
  const {
    orderId,
    orderNumber,
    orderType,
    table,
    items,
    notes,
    total,
    change,
    paymentMethod,
    customerName,
    discountAmount,
    taxAmount,
  } = payload;

  const win = window.open("", "_blank", "width=320,height=600");
  if (!win) {
    alert("Izinkan popup untuk print.");
    return;
  }

  const formatCurrency = (n: number) =>
    "Rp " + new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(Math.abs(n));

  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="width:28px;vertical-align:top;font-weight:bold;padding:3px 2px">${item.quantity}x</td>
      <td style="padding:3px 2px">
        <strong>${item.name}</strong>
        ${item.variantName ? `<br><small style="color:#555">${item.variantName}</small>` : ""}
        ${item.modifierNames?.length ? `<br><small style="color:#555">${item.modifierNames.join(", ")}</small>` : ""}
        ${item.notes ? `<br><em style="color:#555">* ${item.notes}</em>` : ""}
      </td>
    </tr>
    <tr><td colspan="2"><div style="border-top:1px dashed #ccc;margin:2px 0"></div></td></tr>
  `
    )
    .join("");

  const isKitchen = label === "KITCHEN";
  const isBar = label === "BAR";

  win.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${label}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:'Courier New',monospace; font-size:12px; width:72mm; padding:6mm 4mm; }
      h1 { font-size:15px; text-align:center; letter-spacing:2px; margin-bottom:4px; }
      .center { text-align:center; }
      .divider { border-top:1px dashed #000; margin:6px 0; }
      .big { font-size:16px; font-weight:bold; text-align:center; }
      table { width:100%; border-collapse:collapse; }
      @media print { @page { margin:0; size:72mm auto; } }
    </style>
  </head>
  <body>
    <h1>--- ${label} ---</h1>
    <div class="big">${orderType.replace(/_/g, "-").toUpperCase()}</div>
    ${table ? `<div class="center">${table}</div>` : ""}
    <div class="center">Order #${(orderNumber || "").slice(-8).toUpperCase() || (orderId || "").slice(-8).toUpperCase()}</div>
    <div class="center">${new Date().toLocaleTimeString("id-ID")}</div>
    ${customerName ? `<div class="center">Customer: ${customerName}</div>` : ""}
    <div class="divider"></div>

    ${!isKitchen && !isBar ? `
      <table>${itemsHtml}</table>
      <div class="divider"></div>
      ${discountAmount > 0 ? `<div class="row"><span>Diskon</span><span>-${formatCurrency(discountAmount)}</span></div>` : ""}
      ${taxAmount > 0 ? `<div class="row"><span>PPN</span><span>${formatCurrency(taxAmount)}</span></div>` : ""}
      <div class="row total"><span>TOTAL</span><span>${formatCurrency(total)}</span></div>
      <div class="row"><span>Bayar (${paymentMethod.toUpperCase()})</span><span>${formatCurrency(total + change)}</span></div>
      ${change > 0 ? `<div class="row"><span>Kembalian</span><span>${formatCurrency(change)}</span></div>` : ""}
    ` : `
      <table>${itemsHtml}</table>
    `}

    ${notes ? `<div class="divider"></div>
    <div><strong>Catatan:</strong> ${notes}</div>` : ""}
    <div class="divider"></div>
    <div class="center">--- ${label} COPY ---</div>
  </body>
</html>`);

  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 400);
}
