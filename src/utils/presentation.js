import { getShipmentFinancialLedger } from "./freight.js";

export const presentationStorageKey = "freight_presentation_mode_v1";
export function presentationPartyKey(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").trim().replace(/\s+/g, " ").toLowerCase();
}

export function readPresentationMode() {
  const saved = localStorage.getItem(presentationStorageKey);
  if (!saved) return null;
  try { return JSON.parse(saved); } catch { return { enabled: true }; }
}

export async function presentationPinHash(pin, salt) {
  const bytes = new TextEncoder().encode(salt + ":" + pin);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function buildPresentationRows(shipments, rate, config) {
  if (!config?.ownerId || !["customer", "partner", "supplier"].includes(config.mode)) return [];
  const isSupplier = config.mode === "supplier";
  const customerKey = presentationPartyKey(config.customer);
  if (config.mode === "customer" && !customerKey) return [];
  const supplierKey = presentationPartyKey(config.supplier);
  if (isSupplier && !supplierKey) return [];
  return shipments.flatMap((shipment) => {
    const ledger = getShipmentFinancialLedger(shipment, rate);
    const saleRows = isSupplier
      ? ledger.purchaseRows.filter((invoice) => presentationPartyKey(invoice.party) === supplierKey)
      : ledger.saleRows.filter((invoice) => config.mode === "partner" || presentationPartyKey(invoice.party || shipment.customer) === customerKey);
    if (isSupplier && !saleRows.length) return [];
    if (config.mode === "customer" && presentationPartyKey(shipment.customer) !== customerKey && !saleRows.length) return [];
    // Only these fields may enter the presentation UI or its export.
    return [{
      id: shipment.id, customer: isSupplier ? config.supplier : config.mode === "customer" ? config.customer : shipment.customer,
      booking: shipment.bookingNo || "", origin: shipment.pol || "", destination: shipment.pod || "",
      status: shipment.status || "", etd: shipment.etd || "", eta: shipment.eta || "",
      invoices: saleRows.map((invoice) => ({
        id: invoice.id, number: invoice.invoiceNo || "", date: invoice.invoiceDate || "",
        category: invoice.category || "", total: invoice.totalUsd, paid: invoice.paidUsd, remaining: invoice.remainingUsd,
      })),
    }];
  });
}
