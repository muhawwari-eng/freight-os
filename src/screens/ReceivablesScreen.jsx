import { FormField, ReceivablesList } from "../components/freightComponents";
import { calcOceanSell, money } from "../utils/freight";

export function ReceivablesScreen({ canManagePayments, addReceivableToShipment, receivableForm, updateReceivable, shipments, activeFxRate, deletePayment, openShipmentDetails }) {
  return (
          <section className="panel twoCols">
            <div>
              <h2>Receivables / Customer Collections</h2>
              <p className="smallText">Track money collected from customers for each shipment. Only admin can add or delete collection records.</p>
              {canManagePayments ? (
                <form onSubmit={addReceivableToShipment}>
                  <div className="formGrid one">
                    <FormField label="Shipment"><select value={receivableForm.shipmentId} onChange={(e) => updateReceivable("shipmentId", e.target.value)}><option value="">Select Shipment</option>{shipments.map((s) => <option key={s.id} value={s.id}>{s.bookingNo && s.bookingNo !== "Not set" ? s.bookingNo : s.id} - {s.customer}</option>)}</select></FormField>
                    <FormField label="Customer"><input value={shipments.find((s) => s.id === receivableForm.shipmentId)?.customer || ""} disabled /></FormField>
                    <FormField label="Invoice Amount USD"><input value={receivableForm.shipmentId ? money(calcOceanSell(shipments.find((s) => s.id === receivableForm.shipmentId) || {})) : ""} disabled /></FormField>
                    <FormField label="Collected Amount"><input type="number" step="0.01" value={receivableForm.amount} onChange={(e) => updateReceivable("amount", e.target.value)} /></FormField>
                    <FormField label="Currency"><select value={receivableForm.currency} onChange={(e) => updateReceivable("currency", e.target.value)}><option value="USD">USD</option><option value="TRY">TRY</option></select></FormField>
                    <FormField label="FX Rate TRY/USD"><input type="number" step="0.0001" value={receivableForm.fxRate || activeFxRate} onChange={(e) => updateReceivable("fxRate", e.target.value)} /></FormField>
                    <FormField label="Collection Date"><input type="date" value={receivableForm.paidDate} onChange={(e) => updateReceivable("paidDate", e.target.value)} /></FormField>
                    <FormField label="Note"><input value={receivableForm.note} onChange={(e) => updateReceivable("note", e.target.value)} /></FormField>
                  </div>
                  <button className="saveBtn" type="submit">Add Customer Collection</button>
                </form>
              ) : (
                <div className="note"><p>You can view customer collections, but only admin can add or delete collection records.</p></div>
              )}
            </div>
            <ReceivablesList shipments={shipments} exchangeRate={activeFxRate} canManagePayments={canManagePayments} deletePayment={deletePayment} onOpen={openShipmentDetails} />
          </section>

  );
}
