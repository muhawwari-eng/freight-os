import { useMemo, useState } from "react";
import { FormField } from "../components/freightComponents";
import { calcSingleTransportTry, getTransports, money } from "../utils/freight";

export function TransportScreen({ addTransportToShipment, transportForm, updateTransport, shipments, suppliers, deleteTransport, canSeeFinance }) {
  const [query, setQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const companyOptionsId = "local-transport-company-options";

  const transportRows = useMemo(() => shipments.flatMap((shipment) => getTransports(shipment).map((transport, index) => ({
    shipment,
    transport,
    index,
    totalTry: calcSingleTransportTry(transport),
  }))), [shipments]);
  const localTransportCompanies = suppliers.filter((supplier) => supplier.type === "Local Transport");

  const companies = ["all", ...new Set([
    ...localTransportCompanies.map((supplier) => supplier.name),
    ...transportRows.map((row) => row.transport.company || "No company"),
  ])];
  const filteredRows = transportRows.filter(({ shipment, transport }) => {
    const text = query.trim().toLowerCase();
    const matchesText = !text || [shipment.id, shipment.customer, shipment.bookingNo, transport.company, transport.from, transport.to, transport.note]
      .some((value) => String(value || "").toLowerCase().includes(text));
    const matchesCompany = companyFilter === "all" || (transport.company || "No company") === companyFilter;
    return matchesText && matchesCompany;
  });
  const summary = filteredRows.reduce((acc, row) => {
    acc.records += 1;
    acc.trucks += Number(row.transport.truckQty || 1);
    acc.total += row.totalTry;
    return acc;
  }, { records: 0, trucks: 0, total: 0 });

  return (
    <section className="panel operationalPage">
      <div className="panelHead">
        <div>
          <h2>Local Transport</h2>
          <p className="smallText">Plan and review local trucking costs by shipment, company, route, and tax.</p>
        </div>
      </div>

      <section className="opsMetrics">
        <div><small>Records</small><b>{summary.records}</b></div>
        <div><small>Trucks</small><b>{summary.trucks}</b></div>
        <div><small>Total TRY</small><b>{canSeeFinance ? money(summary.total, "TRY") : "Hidden"}</b></div>
        <div><small>Shipments</small><b>{new Set(filteredRows.map((row) => row.shipment.id)).size}</b></div>
      </section>

      <div className="opsLayout">
        <div className="opsFormPanel">
          <h3>Add Transport Cost</h3>
          <form onSubmit={addTransportToShipment}>
            <div className="formGrid one">
              <FormField label="Shipment"><select value={transportForm.shipmentId} onChange={(e) => updateTransport("shipmentId", e.target.value)}><option value="">Select Shipment</option>{shipments.map((shipment) => <option key={shipment.id} value={shipment.id}>{shipment.id} - {shipment.customer}</option>)}</select></FormField>
              <FormField label="Transport Company">
                <input list={companyOptionsId} value={transportForm.company} onChange={(e) => updateTransport("company", e.target.value)} placeholder="Select or type company" />
                <datalist id={companyOptionsId}>
                  {localTransportCompanies.map((company) => <option key={company.id} value={company.name} />)}
                </datalist>
              </FormField>
              <p className="smallText">New names are added automatically under Companies &gt; Local Transport.</p>
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

        <div className="opsListPanel">
          <div className="opsToolbar">
            <FormField label="Search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Shipment, company, route..." /></FormField>
            <FormField label="Company">
              <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
                {companies.map((company) => <option key={company} value={company}>{company === "all" ? "All Companies" : company}</option>)}
              </select>
            </FormField>
          </div>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Shipment</th>
                  <th>Customer</th>
                  <th>Company</th>
                  <th>Route</th>
                  <th>Trucks</th>
                  <th>VAT</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(({ shipment, transport, index, totalTry }) => (
                  <tr key={`${shipment.id}-${index}`}>
                    <td><b>{shipment.id}</b></td>
                    <td>{shipment.customer}</td>
                    <td>{transport.company || "No company"}</td>
                    <td>{transport.from || "Origin"} - {transport.to || "Destination"}</td>
                    <td>{transport.truckQty || 1}</td>
                    <td>{transport.taxRate || 0}%</td>
                    <td>{canSeeFinance ? money(totalTry, "TRY") : "Hidden"}</td>
                    <td><button className="dangerBtn" onClick={() => deleteTransport(shipment.id, index)}>Delete</button></td>
                  </tr>
                ))}
                {filteredRows.length === 0 && <tr><td colSpan="8">No transport records found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
