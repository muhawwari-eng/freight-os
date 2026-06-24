import { useMemo, useState } from "react";
import { FormField } from "../components/freightComponents";
import { getPaymentSummary, getPayments, money, paymentAmountUsd } from "../utils/freight";

const paymentTypes = ["all", "Ocean Freight", "Local Transport", "Expense", "Other", "Customer Receipt"];

export function PaymentsScreen({ canManagePayments, addPaymentToShipment, paymentForm, updatePayment, shipments, suppliers, activeFxRate, deletePayment, openShipmentDetails, editingPayment, startEditPayment, cancelEditPayment }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [flowFilter, setFlowFilter] = useState("payables");
  const companyOptions = suppliers.filter((supplier) => {
    if (paymentForm.purchaseType === "Ocean Freight") return supplier.type === "Shipping Line";
    if (paymentForm.purchaseType === "Local Transport") return supplier.type === "Local Transport";
    return true;
  });
  const selectableCompanyOptions = paymentForm.company && !companyOptions.some((company) => company.name === paymentForm.company)
    ? [{ id: `legacy-${paymentForm.company}`, name: paymentForm.company, type: "Existing" }, ...companyOptions]
    : companyOptions;

  function updatePurchaseType(value) {
    updatePayment("purchaseType", value);
    updatePayment("company", "");
  }

  const paymentRows = useMemo(() => shipments.flatMap((shipment) => getPayments(shipment).map((payment) => ({
    shipment,
    payment,
    amountUsd: paymentAmountUsd(payment, shipment, activeFxRate),
    flow: payment.purchaseType === "Customer Receipt" ? "in" : "out",
  }))), [shipments, activeFxRate]);

  const filteredRows = paymentRows.filter(({ shipment, payment, flow }) => {
    const text = query.trim().toLowerCase();
    const matchesText = !text || [shipment.id, shipment.bookingNo, shipment.customer, shipment.line, payment.purchaseType, payment.company, payment.note]
      .some((value) => String(value || "").toLowerCase().includes(text));
    const matchesType = typeFilter === "all" || payment.purchaseType === typeFilter;
    const matchesFlow = flowFilter === "all" || (flowFilter === "collections" ? flow === "in" : flow === "out");
    return matchesText && matchesType && matchesFlow;
  }).sort((a, b) => String(b.payment.paidDate || b.payment.createdAt || "").localeCompare(String(a.payment.paidDate || a.payment.createdAt || "")));

  const summary = shipments.reduce((acc, shipment) => {
    const paymentSummary = getPaymentSummary(shipment, activeFxRate);
    acc.payableDue += paymentSummary.payableDue;
    acc.payablePaid += paymentSummary.payablePaid;
    acc.payableRemaining += paymentSummary.payableRemaining;
    acc.receivablePaid += paymentSummary.receivablePaid;
    return acc;
  }, { payableDue: 0, payablePaid: 0, payableRemaining: 0, receivablePaid: 0 });

  const filteredSummary = filteredRows.reduce((acc, row) => {
    if (row.flow === "in") acc.in += row.amountUsd;
    else acc.out += row.amountUsd;
    acc.count += 1;
    return acc;
  }, { in: 0, out: 0, count: 0 });

  return (
    <section className="panel operationalPage">
      <div className="panelHead">
        <div>
          <h2>Payments & Purchases</h2>
          <p className="smallText">Supplier payments, carrier purchases, local costs, expenses, and customer receipts in one workspace.</p>
        </div>
      </div>

      <section className="opsMetrics">
        <div><small>Payables Due</small><b>{money(summary.payableDue)}</b></div>
        <div><small>Paid Out</small><b>{money(summary.payablePaid)}</b></div>
        <div><small>Remaining</small><b>{money(summary.payableRemaining)}</b></div>
        <div><small>Collected</small><b>{money(summary.receivablePaid)}</b></div>
      </section>

      <div className="opsLayout">
        <div className="opsFormPanel">
          <h3>{editingPayment ? "Edit Payment" : "Record Payment"}</h3>
          {canManagePayments ? (
            <form onSubmit={addPaymentToShipment}>
              <div className="formGrid one">
                <FormField label="Shipment"><select value={paymentForm.shipmentId} onChange={(e) => updatePayment("shipmentId", e.target.value)} disabled={Boolean(editingPayment)}><option value="">Select Shipment</option>{shipments.map((shipment) => <option key={shipment.id} value={shipment.id}>{shipment.id} - {shipment.customer}</option>)}</select></FormField>
                <FormField label="Payment / Purchase Type"><select value={paymentForm.purchaseType} onChange={(e) => updatePurchaseType(e.target.value)}><option value="Ocean Freight">Ocean Freight</option><option value="Local Transport">Local Transport</option><option value="Expense">Expense</option><option value="Other">Other</option></select></FormField>
                <FormField label="Company / Party">
                  <select value={paymentForm.company} onChange={(e) => updatePayment("company", e.target.value)}>
                    <option value="">Select Company</option>
                    {selectableCompanyOptions.map((company) => <option key={company.id} value={company.name}>{company.name} - {company.type}</option>)}
                  </select>
                </FormField>
                <FormField label="Amount"><input type="number" step="0.01" value={paymentForm.amount} onChange={(e) => updatePayment("amount", e.target.value)} /></FormField>
                <FormField label="Currency"><select value={paymentForm.currency} onChange={(e) => updatePayment("currency", e.target.value)}><option value="USD">USD</option><option value="TRY">TRY</option><option value="EUR">EUR</option></select></FormField>
                <FormField label="FX Rate to USD"><input type="number" step="0.0001" value={paymentForm.fxRate || activeFxRate} onChange={(e) => updatePayment("fxRate", e.target.value)} /></FormField>
                <FormField label="Payment Date"><input type="date" value={paymentForm.paidDate} onChange={(e) => updatePayment("paidDate", e.target.value)} /></FormField>
                <FormField label="Note"><input value={paymentForm.note} onChange={(e) => updatePayment("note", e.target.value)} /></FormField>
              </div>
              <div className="actions">
                <button className="saveBtn" type="submit">{editingPayment ? "Save Payment Changes" : "Add Payment Record"}</button>
                {editingPayment && <button className="ghostBtn" type="button" onClick={cancelEditPayment}>Cancel Edit</button>}
              </div>
            </form>
          ) : (
            <div className="note"><p>You can view payments, but only admin can add, edit, or delete payment records.</p></div>
          )}
        </div>

        <div className="opsListPanel">
          <div className="opsToolbar paymentsToolbar">
            <FormField label="Search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Shipment, supplier, customer, note..." /></FormField>
            <FormField label="Flow">
              <select value={flowFilter} onChange={(event) => setFlowFilter(event.target.value)}>
                <option value="payables">Paid Out</option>
                <option value="collections">Collected In</option>
                <option value="all">All</option>
              </select>
            </FormField>
            <FormField label="Type">
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                {paymentTypes.map((type) => <option key={type} value={type}>{type === "all" ? "All Types" : type}</option>)}
              </select>
            </FormField>
          </div>

          <section className="opsMetrics compactOpsMetrics">
            <div><small>Filtered Records</small><b>{filteredSummary.count}</b></div>
            <div><small>Paid Out</small><b>{money(filteredSummary.out)}</b></div>
            <div><small>Collected In</small><b>{money(filteredSummary.in)}</b></div>
            <div><small>Net Cash</small><b>{money(filteredSummary.in - filteredSummary.out)}</b></div>
          </section>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Shipment</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Company / Party</th>
                  <th>Amount</th>
                  <th>USD Value</th>
                  <th>Note</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(({ shipment, payment, amountUsd, flow }) => (
                  <tr key={payment.id}>
                    <td>{payment.paidDate || "No date"}</td>
                    <td><button className="linkBtn" type="button" onClick={() => openShipmentDetails(shipment)}>{shipment.id}</button></td>
                    <td>{shipment.customer}</td>
                    <td><span className={flow === "in" ? "badge" : "paymentBadge"}>{payment.purchaseType}</span></td>
                    <td>{payment.company || "No company"}</td>
                    <td>{money(payment.amount, payment.currency || "USD")}</td>
                    <td><b>{money(amountUsd)}</b></td>
                    <td>{payment.note || ""}</td>
                    <td>
                      {canManagePayments && (
                        <div className="actions">
                          {payment.purchaseType !== "Customer Receipt" && <button className="ghostBtn" onClick={() => startEditPayment(shipment.id, payment)}>Edit</button>}
                          <button className="dangerBtn" onClick={() => deletePayment(shipment.id, payment.id)}>Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && <tr><td colSpan="9">No payment records found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
