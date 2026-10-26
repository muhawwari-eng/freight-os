import { useState } from "react";
import { FormField } from "../components/freightComponents";
import { getLocalTodayDateKey } from "../data/defaults";
import { getPayments, money } from "../utils/freight";
import { allocateSupplierSettlement, supplierKey, supplierOpenInvoices } from "../utils/supplierSettlement";
import { generateSupplierSettlementPdf } from "../services/pdf";

export function SupplierSettlement({ shipments, activeFxRate, onSave, onCancel }) {
  const [party, setParty] = useState("");
  const [excluded, setExcluded] = useState([]);
  const [form, setForm] = useState({ amount: "", currency: "USD", fxRate: String(activeFxRate), paidDate: getLocalTodayDateKey(), method: "Bank Transfer", note: "" });
  const allRows = supplierOpenInvoices(shipments, activeFxRate);
  const historicalNames = shipments.flatMap((shipment) => getPayments(shipment).filter((payment) => payment.settlementId).map((payment) => payment.company));
  const names = [...new Map([...allRows.map((row) => row.invoice.party), ...historicalNames].map((name) => [supplierKey(name), name])).values()].filter(Boolean).sort();
  const rows = party ? supplierOpenInvoices(shipments, activeFxRate, party) : [];
  const eligible = rows.filter((row) => !row.shipment.financialClosed && !excluded.includes(row.key));
  const total = eligible.reduce((sum, row) => sum + row.invoice.remainingUsd, 0);
  const rate = form.currency === "USD" ? 1 : Number(form.fxRate);
  const usd = Number(form.amount) / rate;
  const plan = Number.isFinite(usd) && usd > 0 ? allocateSupplierSettlement(eligible, usd) : [];
  const update = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));
  const batches = new Map();
  shipments.forEach((shipment) => getPayments(shipment).forEach((payment) => {
    if (!payment.settlementId || supplierKey(payment.company) !== supplierKey(party)) return;
    const batch = batches.get(payment.settlementId) || { id: payment.settlementId, payment, rows: [] };
    batch.rows.push({ shipment, payment });
    batches.set(batch.id, batch);
  }));
  return <details className="financeLedger">
    <summary>Supplier Account Settlement</summary>
    <form onSubmit={(event) => {
      event.preventDefault();
      if (!party || !plan.length || !Number.isFinite(rate) || rate <= 0 || usd > total + 0.001) { alert("Enter an amount within the selected invoice balance."); return; }
      if (!confirm("Confirm supplier settlement: " + money(usd) + " across " + plan.length + " invoice(s)?")) return;
      if (onSave(party, form, plan)) { update("amount", ""); setExcluded([]); }
    }}>
      <div className="formGrid mt">
        <FormField label="Supplier"><select value={party} onChange={(event) => { setParty(event.target.value); setExcluded([]); update("amount", ""); }}><option value="">Select Supplier</option>{names.map((name) => <option key={supplierKey(name)}>{name}</option>)}</select></FormField>
        <FormField label="Outstanding USD"><input readOnly value={money(rows.reduce((sum, row) => sum + row.invoice.remainingUsd, 0))} /></FormField>
        <FormField label="Amount"><input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => update("amount", event.target.value)} /></FormField>
        <FormField label="Currency"><select value={form.currency} onChange={(event) => { update("currency", event.target.value); update("amount", ""); }}>{["USD", "TRY", "EUR"].map((value) => <option key={value}>{value}</option>)}</select></FormField>
        <FormField label="FX Rate to USD"><input required type="number" min="0.0001" step="0.0001" disabled={form.currency === "USD"} value={form.fxRate} onChange={(event) => update("fxRate", event.target.value)} /></FormField>
        <FormField label="Date"><input required type="date" value={form.paidDate} onChange={(event) => update("paidDate", event.target.value)} /></FormField>
        <FormField label="Payment Method"><select value={form.method} onChange={(event) => update("method", event.target.value)}>{["Bank Transfer", "Cash", "Cheque", "Other"].map((value) => <option key={value}>{value}</option>)}</select></FormField>
        <FormField label="Reference / Note"><input value={form.note} onChange={(event) => update("note", event.target.value)} /></FormField>
      </div>
      <div className="actions mt"><button type="button" className="ghostBtn" disabled={!eligible.length || !(rate > 0)} onClick={() => update("amount", (total * rate).toFixed(2))}>Pay Selected Balance</button><button className="saveBtn" disabled={!plan.length}>Confirm Settlement</button></div>
      <div className="tableWrap"><table><thead><tr><th>Select</th><th>Date</th><th>Shipment</th><th>Invoice</th><th>Balance USD</th><th>Payment USD</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.key}><td><input aria-label={"Select " + row.invoice.invoiceNo} type="checkbox" disabled={row.shipment.financialClosed} checked={!row.shipment.financialClosed && !excluded.includes(row.key)} onChange={(event) => setExcluded((previous) => event.target.checked ? previous.filter((key) => key !== row.key) : [...previous, row.key])} /></td><td>{row.invoice.invoiceDate}</td><td>{row.shipment.id}{row.shipment.financialClosed ? " (Closed)" : ""}</td><td>{row.invoice.invoiceNo}</td><td>{money(row.invoice.remainingUsd)}</td><td>{money(plan.find((item) => item.key === row.key)?.amountUsd || 0)}</td></tr>)}
        {!rows.length && <tr><td colSpan="6">No open invoices.</td></tr>}</tbody></table></div>
    </form>
    <h4>Settlement History</h4>
    {[...batches.values()].map((batch) => <div className="transportLine" key={batch.id}><span>{batch.id} | {batch.payment.paidDate} | {money(batch.rows.reduce((sum, row) => sum + row.payment.settlementAmountUsd, 0))}</span><div className="actions"><button type="button" className="ghostBtn" onClick={() => generateSupplierSettlementPdf(batch)}>Payment Voucher</button><button type="button" className="dangerBtn" onClick={() => onCancel(batch.id)}>Cancel Settlement</button></div></div>)}
  </details>;
}
