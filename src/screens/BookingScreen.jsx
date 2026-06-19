import { ContainerSelect, CustomerSelect, FormField, PaymentSelect, PortSelect, StatusSelect, SupplierSelect } from "../components/freightComponents";
import { getLocationType } from "../data/defaults";
import { getShipmentUnitLabel, isAirShipment, isFclShipment, isFullTruckShipment } from "../utils/freight";

const shipmentModes = [
  { key: "Sea", title: "Sea", description: "FCL containers or LCL sea cargo", cargoType: "FCL" },
  { key: "Road", title: "Road", description: "Full truck or partial road freight", cargoType: "Road" },
  { key: "Air", title: "Air", description: "Chargeable weight by actual or volumetric KG", cargoType: "Air" },
  { key: "Cross", title: "Cross", description: "Cross trade / cross operation file", cargoType: "Cross" },
];

function getModeFromCargo(cargoType) {
  if (cargoType === "Air") return "Air";
  if (["Road", "RoadFull"].includes(cargoType)) return "Road";
  if (["Cross", "CrossFCL"].includes(cargoType)) return "Cross";
  return "Sea";
}

function BookingSection({ title, children }) {
  return (
    <div className="bookingSection">
      <h3>{title}</h3>
      <div className="formGrid">{children}</div>
    </div>
  );
}

export function BookingScreen({ addShipmentFromForm, bookingForm, customers, updateBooking, suppliers, ports, activeFxRate }) {
  const mode = getModeFromCargo(bookingForm.cargoType);
  const isFcl = isFclShipment(bookingForm);
  const isAir = isAirShipment(bookingForm);
  const isFullTruck = isFullTruckShipment(bookingForm);
  const isSea = mode === "Sea";
  const isRoad = mode === "Road";
  const isCross = mode === "Cross";
  const unitLabel = getShipmentUnitLabel(bookingForm);
  const routeLocations = ports.filter((location) => {
    const type = getLocationType(location);
    if (isAir) return type === "Airport";
    if (isSea || isCross) return type === "Seaport" || type === "Sea Destination";
    return type !== "Airport";
  });
  const carrierCompanies = suppliers.filter((supplier) => {
    if (isAir) return supplier.type === "Airline";
    if (isRoad) return ["Road Transport", "Local Transport"].includes(supplier.type);
    if (isSea) return supplier.type === "Shipping Line";
    return ["Shipping Line", "Agent", "Operation Supplier", "Supplier", "Other"].includes(supplier.type);
  });

  function selectMode(nextMode) {
    const selected = shipmentModes.find((item) => item.key === nextMode);
    updateBooking("cargoType", selected?.cargoType || "FCL");
    updateBooking("line", "");
    updateBooking("pol", "");
    updateBooking("pod", "");
  }

  return (
    <section className="panel bookingWorkspace">
      <div className="panelHead">
        <div>
          <h2>New Booking</h2>
          <p className="smallText">Choose the shipment operation first, then fill only the fields needed for that type.</p>
        </div>
      </div>

      <div className="shipmentModeGrid">
        {shipmentModes.map((item) => (
          <button key={item.key} type="button" className={mode === item.key ? "active" : ""} onClick={() => selectMode(item.key)}>
            <b>{item.title}</b>
            <span>{item.description}</span>
          </button>
        ))}
      </div>

      {isSea && (
        <div className="bookingTypeSwitch">
          <button type="button" className={bookingForm.cargoType === "FCL" ? "active" : ""} onClick={() => updateBooking("cargoType", "FCL")}>FCL Containers</button>
          <button type="button" className={bookingForm.cargoType === "LCL" ? "active" : ""} onClick={() => updateBooking("cargoType", "LCL")}>LCL Sea / CBM</button>
        </div>
      )}

      {isRoad && (
        <div className="bookingTypeSwitch">
          <button type="button" className={bookingForm.cargoType === "RoadFull" ? "active" : ""} onClick={() => updateBooking("cargoType", "RoadFull")}>Full Truck</button>
          <button type="button" className={bookingForm.cargoType === "Road" ? "active" : ""} onClick={() => updateBooking("cargoType", "Road")}>Partial Road / CBM</button>
        </div>
      )}

      {isCross && (
        <div className="bookingTypeSwitch">
          <button type="button" className={bookingForm.cargoType === "CrossFCL" ? "active" : ""} onClick={() => updateBooking("cargoType", "CrossFCL")}>Cross FCL</button>
          <button type="button" className={bookingForm.cargoType === "Cross" ? "active" : ""} onClick={() => updateBooking("cargoType", "Cross")}>Cross Partial / CBM</button>
        </div>
      )}

      <form onSubmit={addShipmentFromForm} className="bookingFlow">
        <BookingSection title="File & Parties">
          <FormField label="Entry Date"><input type="date" value={bookingForm.entryDate} onChange={(e) => updateBooking("entryDate", e.target.value)} required /></FormField>
          <FormField label="Client Name"><CustomerSelect value={bookingForm.customer} customers={customers} onChange={(value) => updateBooking("customer", value)} /></FormField>
          <FormField label={isAir ? "Airline / Supplier" : isRoad ? "Road Carrier / Supplier" : "Carrier / Supplier Company"}><SupplierSelect value={bookingForm.line} suppliers={carrierCompanies} onChange={(value) => updateBooking("line", value)} /></FormField>
          <FormField label="Booking / Reference No"><input value={bookingForm.bookingNo} onChange={(e) => updateBooking("bookingNo", e.target.value)} /></FormField>
        </BookingSection>

        <BookingSection title={isAir ? "Air Route" : isRoad ? "Road Route" : isCross ? "Cross Route" : "Sea Route"}>
          <FormField label={isAir ? "Origin Airport" : "POL / Origin"}><PortSelect value={bookingForm.pol} ports={routeLocations} onChange={(value) => updateBooking("pol", value)} /></FormField>
          <FormField label={isAir ? "Destination Airport" : "POD / Destination"}><PortSelect value={bookingForm.pod} ports={routeLocations} onChange={(value) => updateBooking("pod", value)} /></FormField>
          {isSea && <FormField label="Vessel Name"><input value={bookingForm.vessel} onChange={(e) => updateBooking("vessel", e.target.value)} /></FormField>}
          {isCross && <FormField label="Cross Operation Note"><input value={bookingForm.vessel} onChange={(e) => updateBooking("vessel", e.target.value)} placeholder="Optional reference or routing note" /></FormField>}
        </BookingSection>

        <BookingSection title="Cargo Details">
          <FormField label="Shipment Type"><input value={bookingForm.cargoType === "LCL" ? "Sea LCL" : bookingForm.cargoType === "RoadFull" ? "Road Full Truck" : bookingForm.cargoType === "CrossFCL" ? "Cross FCL" : bookingForm.cargoType} disabled /></FormField>
          {isFcl && <FormField label="Container Type"><ContainerSelect value={bookingForm.containerType} onChange={(value) => updateBooking("containerType", value)} /></FormField>}
          {isFcl && <FormField label="Container Quantity"><input type="number" min="0" step="1" value={bookingForm.qty} onChange={(e) => updateBooking("qty", e.target.value)} /></FormField>}
          {isFullTruck && <FormField label="Truck Quantity"><input type="number" min="0" step="1" value={bookingForm.qty} onChange={(e) => updateBooking("qty", e.target.value)} /></FormField>}
          {!isFcl && !isFullTruck && <FormField label="Package Count"><input type="number" min="0" step="1" value={bookingForm.packageCount} onChange={(e) => updateBooking("packageCount", e.target.value)} /></FormField>}
          {!isFcl && !isFullTruck && !isAir && <FormField label="CBM"><input type="number" min="0" step="0.001" value={bookingForm.cbm} onChange={(e) => updateBooking("cbm", e.target.value)} required /></FormField>}
          {!isFcl && !isFullTruck && <FormField label="Actual Weight KG"><input type="number" min="0" step="0.01" value={bookingForm.actualWeightKg} onChange={(e) => updateBooking("actualWeightKg", e.target.value)} /></FormField>}
          {isAir && <FormField label="Volumetric Weight KG"><input type="number" min="0" step="0.01" value={bookingForm.volumetricWeightKg} onChange={(e) => updateBooking("volumetricWeightKg", e.target.value)} /></FormField>}
        </BookingSection>

        <BookingSection title="Pricing">
          <FormField label={`Buy Price / ${unitLabel} USD`}><input type="number" min="0" step="0.01" value={bookingForm.buyUsd} onChange={(e) => updateBooking("buyUsd", e.target.value)} /></FormField>
          <FormField label={`Sell Price / ${unitLabel} USD`}><input type="number" min="0" step="0.01" value={bookingForm.sellUsd} onChange={(e) => updateBooking("sellUsd", e.target.value)} /></FormField>
          <FormField label="Active FX Rate TRY/USD"><input value={activeFxRate} disabled /></FormField>
        </BookingSection>

        <BookingSection title="Schedule & Status">
          {isSea && <FormField label="Cut-Off Date"><input type="date" value={bookingForm.cutOff} onChange={(e) => updateBooking("cutOff", e.target.value)} /></FormField>}
          {!isSea && <FormField label="Pickup / Ready Date"><input type="date" value={bookingForm.cutOff} onChange={(e) => updateBooking("cutOff", e.target.value)} /></FormField>}
          <FormField label={isAir ? "Flight / Departure Date" : "ETD"}><input type="date" value={bookingForm.etd} onChange={(e) => updateBooking("etd", e.target.value)} /></FormField>
          <FormField label={isAir ? "Arrival Date" : "ETA"}><input type="date" value={bookingForm.eta} onChange={(e) => updateBooking("eta", e.target.value)} /></FormField>
          <FormField label="Shipment Status"><StatusSelect value={bookingForm.status} onChange={(value) => updateBooking("status", value)} /></FormField>
          <FormField label="Payment Status"><PaymentSelect value={bookingForm.paymentStatus} onChange={(value) => updateBooking("paymentStatus", value)} /></FormField>
        </BookingSection>

        <div className="bookingSubmitBar">
          <div>
            <b>{mode} booking</b>
            <p>{isFcl ? "Full container files are billed per container." : isFullTruck ? "Full road files are billed per truck." : isAir ? "Air freight is billed by chargeable KG." : "Partial files are billed by CBM."}</p>
          </div>
          <button className="saveBtn" type="submit">Save Booking</button>
        </div>
      </form>
    </section>
  );
}
