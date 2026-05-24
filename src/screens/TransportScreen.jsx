import { FormField, TransportList } from "../components/freightComponents";

export function TransportScreen({ addTransportToShipment, transportForm, updateTransport, shipments, deleteTransport, canSeeFinance }) {
  return (
          <section className="panel twoCols">
            <div>
              <h2>Local Transport</h2>
              <form onSubmit={addTransportToShipment}>
                <div className="formGrid one">
                  <FormField label="Shipment"><select value={transportForm.shipmentId} onChange={(e) => updateTransport("shipmentId", e.target.value)}><option value="">Select Shipment</option>{shipments.map((s) => <option key={s.id} value={s.id}>{s.id} - {s.customer}</option>)}</select></FormField>
                  <FormField label="Transport Company"><input value={transportForm.company} onChange={(e) => updateTransport("company", e.target.value)} /></FormField>
                  <FormField label="From"><input value={transportForm.from} onChange={(e) => updateTransport("from", e.target.value)} /></FormField>
                  <FormField label="To"><input value={transportForm.to} onChange={(e) => updateTransport("to", e.target.value)} /></FormField>
                  <FormField label="Truck Quantity"><input type="number" min="1" value={transportForm.truckQty} onChange={(e) => updateTransport("truckQty", e.target.value)} /></FormField>
                  <FormField label="Cost per Truck in TRY"><input type="number" value={transportForm.costTry} onChange={(e) => updateTransport("costTry", e.target.value)} /></FormField>
                  <FormField label="VAT / Tax Rate"><select value={transportForm.taxRate} onChange={(e) => updateTransport("taxRate", e.target.value)}><option value="0">0%</option><option value="20">20%</option></select></FormField>
                  <FormField label="Note"><input value={transportForm.note} onChange={(e) => updateTransport("note", e.target.value)} /></FormField>
                </div>
                <button className="saveBtn" type="submit">Add Transport Cost</button>
              </form>
            </div>
            <TransportList shipments={shipments} deleteTransport={deleteTransport} canSeeFinance={canSeeFinance} />
          </section>

  );
}
