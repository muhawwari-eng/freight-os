import { getShipmentFinancialLedger } from "./freight.js";

export function supplierKey(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("tr");
}

export function supplierOpenInvoices(shipments, rate, party) {
  return shipments.flatMap((shipment) => getShipmentFinancialLedger(shipment, rate).purchaseRows
    .filter((invoice) => invoice.remainingUsd > 0.01 && (!party || supplierKey(invoice.party) === supplierKey(party)))
    .map((invoice) => ({ shipment, invoice, key: JSON.stringify([shipment.id, invoice.id]) })))
    .sort((a, b) => String(a.invoice.invoiceDate || a.shipment.entryDate || "").localeCompare(String(b.invoice.invoiceDate || b.shipment.entryDate || "")) || a.key.localeCompare(b.key));
}

export function allocateSupplierSettlement(rows, amountUsd) {
  let remaining = Math.round(amountUsd * 100);
  return rows.flatMap((row) => {
    const cents = Math.min(remaining, Math.round(row.invoice.remainingUsd * 100));
    if (cents <= 0) return [];
    remaining -= cents;
    return [{ ...row, amountUsd: cents / 100 }];
  });
}
