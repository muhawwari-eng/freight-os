import { CargoSelect, ContainerSelect, CustomerSelect, FormField, PaymentSelect, PortSelect, StatusSelect, SupplierSelect } from "../components/freightComponents";

export function BookingScreen({ addShipmentFromForm, bookingForm, customers, updateBooking, suppliers, ports, activeFxRate }) {
  return (
          <section className="panel">
            <h2>New Booking</h2>
            <form onSubmit={addShipmentFromForm}>
              <div className="formGrid">
                <FormField label="Entry Date"><input type="date" value={bookingForm.entryDate} onChange={(e) => updateBooking("entryDate", e.target.value)} required /></FormField>
                <FormField label="Client Name"><CustomerSelect value={bookingForm.customer} customers={customers} onChange={(value) => updateBooking("customer", value)} /></FormField>
                <FormField label="Carrier / Supplier Company"><SupplierSelect value={bookingForm.line} suppliers={suppliers} onChange={(value) => updateBooking("line", value)} /></FormField>
                <FormField label="POL / Origin Port"><PortSelect value={bookingForm.pol} ports={ports} onChange={(value) => updateBooking("pol", value)} /></FormField>
                <FormField label="POD / Destination Port"><PortSelect value={bookingForm.pod} ports={ports} onChange={(value) => updateBooking("pod", value)} /></FormField>
                <FormField label="Booking No"><input value={bookingForm.bookingNo} onChange={(e) => updateBooking("bookingNo", e.target.value)} /></FormField>
                <FormField label="Vessel Name"><input value={bookingForm.vessel} onChange={(e) => updateBooking("vessel", e.target.value)} /></FormField>
                <FormField label="Container Type"><ContainerSelect value={bookingForm.containerType} onChange={(value) => updateBooking("containerType", value)} /></FormField>
                <FormField label="Cargo Type"><CargoSelect value={bookingForm.cargoType} onChange={(value) => updateBooking("cargoType", value)} /></FormField>
                <FormField label="Container Quantity"><input type="number" value={bookingForm.qty} onChange={(e) => updateBooking("qty", e.target.value)} /></FormField>
                <FormField label="Buy Price / Container USD"><input type="number" value={bookingForm.buyUsd} onChange={(e) => updateBooking("buyUsd", e.target.value)} /></FormField>
                <FormField label="Sell Price / Container USD"><input type="number" value={bookingForm.sellUsd} onChange={(e) => updateBooking("sellUsd", e.target.value)} /></FormField>
                <FormField label="Active FX Rate TRY/USD"><input value={activeFxRate} disabled /></FormField>
                <FormField label="Cut-Off Date"><input type="date" value={bookingForm.cutOff} onChange={(e) => updateBooking("cutOff", e.target.value)} /></FormField>
                <FormField label="ETD"><input type="date" value={bookingForm.etd} onChange={(e) => updateBooking("etd", e.target.value)} /></FormField>
                <FormField label="ETA"><input type="date" value={bookingForm.eta} onChange={(e) => updateBooking("eta", e.target.value)} /></FormField>
                <FormField label="Shipment Status"><StatusSelect value={bookingForm.status} onChange={(value) => updateBooking("status", value)} /></FormField>
                <FormField label="Payment Status"><PaymentSelect value={bookingForm.paymentStatus} onChange={(value) => updateBooking("paymentStatus", value)} /></FormField>
              </div>
              <button className="saveBtn" type="submit">Save Booking</button>
            </form>
          </section>

  );
}
