import { FormField, PaymentsList } from "../components/freightComponents";

export function PaymentsScreen({ canManagePayments, addPaymentToShipment, paymentForm, updatePayment, shipments, activeFxRate, deletePayment, openShipmentDetails, editingPayment, startEditPayment, cancelEditPayment }) {
  return (
          <section className="panel twoCols">
            <div>
              <h2>Payments & Purchases</h2>
              <p className="smallText">Track what was paid to carriers, transport companies, suppliers, and what was collected from customers. Only admin can add or delete payment records.</p>
              {canManagePayments ? (
                <form onSubmit={addPaymentToShipment}>
                  <div className="formGrid one">
                    <FormField label="Shipment"><select value={paymentForm.shipmentId} onChange={(e) => updatePayment("shipmentId", e.target.value)} disabled={Boolean(editingPayment)}><option value="">Select Shipment</option>{shipments.map((s) => <option key={s.id} value={s.id}>{s.id} - {s.customer}</option>)}</select></FormField>
                    <FormField label="Payment / Purchase Type"><select value={paymentForm.purchaseType} onChange={(e) => updatePayment("purchaseType", e.target.value)}><option value="Ocean Freight">Ocean Freight</option><option value="Local Transport">Local Transport</option><option value="Expense">Expense</option><option value="Other">Other</option></select></FormField>
                    <FormField label="Company / Party"><input value={paymentForm.company} onChange={(e) => updatePayment("company", e.target.value)} placeholder="Carrier, transport company, supplier, or customer" /></FormField>
                    <FormField label="Amount"><input type="number" step="0.01" value={paymentForm.amount} onChange={(e) => updatePayment("amount", e.target.value)} /></FormField>
                    <FormField label="Currency"><select value={paymentForm.currency} onChange={(e) => updatePayment("currency", e.target.value)}><option value="USD">USD</option><option value="TRY">TRY</option></select></FormField>
                    <FormField label="FX Rate TRY/USD"><input type="number" step="0.0001" value={paymentForm.fxRate || activeFxRate} onChange={(e) => updatePayment("fxRate", e.target.value)} /></FormField>
                    <FormField label="Payment Date"><input type="date" value={paymentForm.paidDate} onChange={(e) => updatePayment("paidDate", e.target.value)} /></FormField>
                    <FormField label="Note"><input value={paymentForm.note} onChange={(e) => updatePayment("note", e.target.value)} /></FormField>
                  </div>
                  <div className="actions">
                    <button className="saveBtn" type="submit">{editingPayment ? "Save Payment Changes" : "Add Payment Record"}</button>
                    {editingPayment && <button className="ghostBtn" type="button" onClick={cancelEditPayment}>Cancel Edit</button>}
                  </div>
                </form>
              ) : (
                <div className="note"><p>You can view payments, but only admin can add or delete payment records.</p></div>
              )}
            </div>
            <PaymentsList shipments={shipments} exchangeRate={activeFxRate} canManagePayments={canManagePayments} deletePayment={deletePayment} onEdit={startEditPayment} onOpen={openShipmentDetails} />
          </section>

  );
}
