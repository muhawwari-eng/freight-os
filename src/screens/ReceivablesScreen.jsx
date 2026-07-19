import { useMemo, useState } from "react";
import { FormField } from "../components/freightComponents";
import { calcSalesUsd, getDaysLeft, getPaymentStatusLabel, getPaymentSummary, getPayments, money, paymentAmountUsd } from "../utils/freight";
import { generateReceiptPdf } from "../services/pdf";

function getReceivableStatus(summary) {
  if (summary.receivableRemaining <= 0.01) return "Paid";
  if (summary.receivablePaid > 0) return "Partial";
  return "Unpaid";
}

function getAgingLabel(shipment) {
  const days = getDaysLeft(shipment.eta || shipment.entryDate);
  if (days === null) return "No date";
  if (days >= 0) return "Not due";
  const overdue = Math.abs(days);
  if (overdue <= 30) return "0-30";
  if (overdue <= 60) return "31-60";
  if (overdue <= 90) return "61-90";
  return "90+";
}

export function ReceivablesScreen({ canManagePayments, addReceivableToShipment, receivableForm, updateReceivable, shipments, activeFxRate, deletePayment, openShipmentDetails }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");

  const rows = useMemo(() => shipments.map((shipment) => {
    const summary = getPaymentSummary(shipment, activeFxRate);
    const receipts = getPayments(shipment).filter((payment) => payment.purchaseType === "Customer Receipt");
    return { shipment, summary, receipts, status: getReceivableStatus(summary), aging: getAgingLabel(shipment) };
  }), [shipments, activeFxRate]);

  const filteredRows = rows.filter(({ shipment, status, aging }) => {
    const text = query.trim().toLowerCase();
    const matchesText = !text || [shipment.id, shipment.bookingNo, shipment.customer, shipment.pol, shipment.pod, shipment.status]
      .some((value) => String(value || "").toLowerCase().includes(text));
    if (!matchesText) return false;
    if (statusFilter === "open") return status !== "Paid";
    if (statusFilter === "paid") return status === "Paid";
    if (statusFilter === "partial") return status === "Partial";
    if (statusFilter === "unpaid") return status === "Unpaid";
    if (statusFilter === "overdue") return !["No date", "Not due"].includes(aging) && status !== "Paid";
    return true;
  });

  const summary = filteredRows.reduce((acc, row) => {
    acc.invoice += row.summary.receivableDue;
    acc.collected += row.summary.receivablePaid;
    acc.remaining += row.summary.receivableRemaining;
    if (row.aging !== "No date" && row.aging !== "Not due" && row.status !== "Paid") acc.overdue += row.summary.receivableRemaining;
    return acc;
  }, { invoice: 0, collected: 0, remaining: 0, overdue: 0 });

  return (
    <section className="panel operationalPage">
      <div className="panelHead">
        <div>
          <h2>Receivables / Customer Collections</h2>
          <p className="smallText">Customer balances, collections, aging, and receipt actions in one workspace.</p>
        </div>
      </div>

      <section className="opsMetrics">
        <div><small>Invoice Total</small><b>{money(summary.invoice)}</b></div>
        <div><small>Collected</small><b>{money(summary.collected)}</b></div>
        <div><small>Remaining</small><b>{money(summary.remaining)}</b></div>
        <div><small>Overdue</small><b>{money(summary.overdue)}</b></div>
      </section>

      <div className="opsLayout">
        <div className="opsFormPanel">
          <h3>Record Collection</h3>
          {canManagePayments ? (
            <form onSubmit={addReceivableToShipment}>
              <div className="formGrid one">
                <FormField label="Shipment"><select value={receivableForm.shipmentId} onChange={(e) => updateReceivable("shipmentId", e.target.value)}><option value="">Select Shipment</option>{shipments.map((shipment) => <option key={shipment.id} value={shipment.id}>{shipment.bookingNo && shipment.bookingNo !== "Not set" ? shipment.bookingNo : shipment.id} - {shipment.customer}</option>)}</select></FormField>
                <FormField label="Customer"><input value={shipments.find((shipment) => shipment.id === receivableForm.shipmentId)?.customer || ""} disabled /></FormField>
                <FormField label="Invoice Amount USD"><input value={receivableForm.shipmentId ? money(calcSalesUsd(shipments.find((shipment) => shipment.id === receivableForm.shipmentId) || {}, activeFxRate)) : ""} disabled /></FormField>
                <FormField label="Collected Amount"><input type="number" step="0.01" value={receivableForm.amount} onChange={(e) => updateReceivable("amount", e.target.value)} /></FormField>
                <FormField label="Currency"><select value={receivableForm.currency} onChange={(e) => updateReceivable("currency", e.target.value)}><option value="USD">USD</option><option value="TRY">TRY</option><option value="EUR">EUR</option></select></FormField>
                <FormField label="FX Rate to USD"><input type="number" step="0.0001" value={receivableForm.fxRate || activeFxRate} onChange={(e) => updateReceivable("fxRate", e.target.value)} /></FormField>
                <FormField label="Collection Date"><input type="date" value={receivableForm.paidDate} onChange={(e) => updateReceivable("paidDate", e.target.value)} /></FormField>
                <FormField label="Note"><input value={receivableForm.note} onChange={(e) => updateReceivable("note", e.target.value)} /></FormField>
              </div>
              <button className="saveBtn" type="submit">Add Customer Collection</button>
            </form>
          ) : (
            <div className="note"><p>You can view customer collections, but only admin can add or delete records.</p></div>
          )}
        </div>

        <div className="opsListPanel">
          <div className="opsToolbar">
            <FormField label="Search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Customer, shipment, booking..." /></FormField>
            <FormField label="Status">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="open">Open</option>
                <option value="overdue">Overdue</option>
                <option value="partial">Partial</option>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="all">All</option>
              </select>
            </FormField>
          </div>

          <div className="opsCardGrid">
            {filteredRows.map(({ shipment, summary: rowSummary, receipts, status, aging }) => (
              <div className="opsCard" key={shipment.id}>
                <div className="opsCardHead">
                  <div>
                    <b>{shipment.bookingNo && shipment.bookingNo !== "Not set" ? shipment.bookingNo : shipment.id}</b>
                    <p>{shipment.customer} | {shipment.pol} - {shipment.pod}</p>
                  </div>
                  <span className={status === "Paid" ? "badge" : "paymentBadge"}>{status}</span>
                </div>
                <div className="customer360Metrics">
                  <span><small>Invoice</small><b>{money(rowSummary.receivableDue)}</b></span>
                  <span><small>Collected</small><b>{money(rowSummary.receivablePaid)}</b></span>
                  <span><small>Remaining</small><b>{money(rowSummary.receivableRemaining)}</b></span>
                  <span><small>Aging</small><b>{aging}</b></span>
                </div>
                <p className="smallText">Payment label: {getPaymentStatusLabel(shipment, "Customer Receipt", activeFxRate)}</p>
                <div className="actions mt">
                  <button className="ghostBtn" onClick={() => openShipmentDetails(shipment)}>Open Shipment</button>
                </div>
                {receipts.length === 0 && <p>No customer collections yet.</p>}
                {receipts.map((payment) => (
                  <div className="transportLine" key={payment.id}>
                    <span>{payment.paidDate || "No date"} - {money(paymentAmountUsd(payment, shipment, activeFxRate))} USD - {payment.note || "No note"}</span>
                    <div className="actions">
                      <button className="ghostBtn" onClick={() => generateReceiptPdf(shipment, payment, activeFxRate)}>Receipt</button>
                      {canManagePayments && <button className="dangerBtn" onClick={() => deletePayment(shipment.id, payment.id)}>Delete</button>}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {filteredRows.length === 0 && <div className="emptyState"><b>No receivables found.</b><p>Try another status or search term.</p></div>}
          </div>
        </div>
      </div>
    </section>
  );
}
