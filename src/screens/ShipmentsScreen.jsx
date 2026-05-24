import { CustomerSelect, FormField, PortSelect } from "../components/freightComponents";
import { calcNetProfit, calcOceanBuy, calcOceanSell, money } from "../utils/freight";

export function ShipmentsScreen({ resetShipmentFilters, query, setQuery, shipmentFilters, customers, updateShipmentFilter, suppliers, setLineFilter, ports, canSeeFinance, role, filtered, openShipmentDetails, activeFxRate, deleteShipment }) {
  return (
          <section className="panel">
            <div className="panelHead">
              <div>
                <h2>Shipment List</h2>
                <p>Search and filter all shipment records.</p>
              </div>
              <div className="actions">
                <button className="ghostBtn" onClick={resetShipmentFilters}>Clear Filters</button>
              </div>
            </div>

            <div className="filtersGrid">
              <FormField label="Search"><input placeholder="Shipment, customer, vessel..." value={query} onChange={(e) => setQuery(e.target.value)} /></FormField>
              <FormField label="Customer"><CustomerSelect value={shipmentFilters.customer} customers={[{ id: "all", name: "all" }, ...customers]} onChange={(value) => updateShipmentFilter("customer", value)} /></FormField>
              <FormField label="Company / Line"><select value={shipmentFilters.line} onChange={(e) => { updateShipmentFilter("line", e.target.value); setLineFilter(e.target.value); }}><option value="all">All Lines</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.name}>{supplier.name}</option>)}</select></FormField>
              <FormField label="POL"><PortSelect value={shipmentFilters.pol} ports={[{ code: "all", name: "All Ports", country: "" }, ...ports]} onChange={(value) => updateShipmentFilter("pol", value)} /></FormField>
              <FormField label="POD"><PortSelect value={shipmentFilters.pod} ports={[{ code: "all", name: "All Ports", country: "" }, ...ports]} onChange={(value) => updateShipmentFilter("pod", value)} /></FormField>
              <FormField label="Status"><select value={shipmentFilters.status} onChange={(e) => updateShipmentFilter("status", e.target.value)}><option value="all">All Statuses</option><option value="Draft">Draft</option><option value="Booked">Booked</option><option value="Loading">Loading</option><option value="In Transit">In Transit</option><option value="At Sea">At Sea</option><option value="At Port">At Port</option><option value="Arrived">Arrived</option><option value="Completed">Completed</option></select></FormField>
              <FormField label="Cargo Type"><select value={shipmentFilters.cargoType} onChange={(e) => updateShipmentFilter("cargoType", e.target.value)}><option value="all">All Types</option><option value="FCL">FCL</option><option value="LCL">LCL</option><option value="Road">Road</option><option value="Air">Air</option><option value="Cross">Cross</option></select></FormField>
              <FormField label="Payment"><select value={shipmentFilters.paymentStatus} onChange={(e) => updateShipmentFilter("paymentStatus", e.target.value)}><option value="all">All Payments</option><option value="Unpaid">Unpaid</option><option value="Partially Paid">Partially Paid</option><option value="Fully Paid">Fully Paid</option></select></FormField>
            </div>

            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Shipment</th>
                    <th>Type</th>
                    <th>Containers</th>
                    <th>Vessel</th>
                    <th>Customer</th>
                    <th>Route</th>
                    <th>Cut-Off</th>
                    <th>ETD</th>
                    <th>ETA</th>
                    <th>Status</th>
                    {canSeeFinance && <th>Buy</th>}
                    {canSeeFinance && <th>Sell</th>}
                    {canSeeFinance && <th>Profit</th>}
                    <th>Payment</th>
                    {role === "admin" && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} onClick={() => openShipmentDetails(s)}>
                      <td>{s.id}</td>
                      <td><span className={`typeBadge ${(s.cargoType || "FCL").toLowerCase()}`}>{s.cargoType || "FCL"}</span></td>
                      <td>{(s.cargoType || "FCL") === "LCL" ? "LCL" : `${Number(s.qty || 0)} × ${s.containerType || ""}`}</td>
                      <td>{s.vessel || "Not set"}</td>
                      <td>{s.customer}</td>
                      <td>{s.pol} → {s.pod}</td>
                      <td>{s.cutOff || "Not set"}</td>
                      <td>{s.etd || "Not set"}</td>
                      <td>{s.eta || "Not set"}</td>
                      <td><span className="badge">{s.status}</span></td>
                      {canSeeFinance && <td>{money(calcOceanBuy(s))}</td>}
                      {canSeeFinance && <td>{money(calcOceanSell(s))}</td>}
                      {canSeeFinance && <td><b>{money(calcNetProfit(s, activeFxRate))}</b></td>}
                      <td><span className="paymentBadge">{s.paymentStatus}</span></td>
                      {role === "admin" && (
                        <td><button className="dangerBtn" onClick={(e) => { e.stopPropagation(); deleteShipment(s.id); }}>Delete</button></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

  );
}
