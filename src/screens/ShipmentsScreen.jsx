import { useMemo, useState } from "react";
import { CustomerSelect, FormField, PortSelect } from "../components/freightComponents";
import { calcNetProfit, calcOceanBuy, calcOceanSell, getShipmentBillableQty, getShipmentLoadDescription, getShipmentUnitLabel, money } from "../utils/freight";

function SortHeader({ label, sortKey, sortConfig, onSort }) {
  const active = sortConfig.key === sortKey;
  const direction = active ? sortConfig.direction : null;

  return (
    <th aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}>
      <button className={`sortHeader ${active ? "active" : ""}`} type="button" onClick={() => onSort(sortKey)}>
        <span>{label}</span>
        <span className="sortArrow" aria-hidden="true">{active ? (direction === "asc" ? "^" : "v") : "-"}</span>
      </button>
    </th>
  );
}

function getSortValue(shipment, key, activeFxRate) {
  if (key === "route") return `${shipment.pol || ""} ${shipment.pod || ""}`;
  if (key === "containers") return getShipmentBillableQty(shipment);
  if (key === "buy") return calcOceanBuy(shipment);
  if (key === "sell") return calcOceanSell(shipment);
  if (key === "profit") return calcNetProfit(shipment, activeFxRate);
  return shipment[key] || "";
}

export function ShipmentsScreen({ resetShipmentFilters, query, setQuery, shipmentFilters, customers, updateShipmentFilter, suppliers, setLineFilter, ports, canSeeFinance, role, filtered, openShipmentDetails, activeFxRate, deleteShipment }) {
  const [sortConfig, setSortConfig] = useState({ key: "entryDate", direction: "desc" });

  function sortBy(key) {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  const sortedShipments = useMemo(() => {
    const direction = sortConfig.direction === "asc" ? 1 : -1;
    return [...filtered].sort((left, right) => {
      const leftValue = getSortValue(left, sortConfig.key, activeFxRate);
      const rightValue = getSortValue(right, sortConfig.key, activeFxRate);
      const leftEmpty = leftValue === "" || leftValue === null || leftValue === undefined;
      const rightEmpty = rightValue === "" || rightValue === null || rightValue === undefined;

      if (leftEmpty !== rightEmpty) return leftEmpty ? 1 : -1;
      if (typeof leftValue === "number" && typeof rightValue === "number") return (leftValue - rightValue) * direction;
      return String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: "base" }) * direction;
    });
  }, [activeFxRate, filtered, sortConfig]);

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
              <FormField label="Cargo Type"><select value={shipmentFilters.cargoType} onChange={(e) => updateShipmentFilter("cargoType", e.target.value)}><option value="all">All Types</option><option value="FCL">FCL</option><option value="LCL">LCL Sea</option><option value="Air">Air Freight</option><option value="Road">Road Partial</option><option value="Cross">Cross Trade</option></select></FormField>
              <FormField label="Payment"><select value={shipmentFilters.paymentStatus} onChange={(e) => updateShipmentFilter("paymentStatus", e.target.value)}><option value="all">All Payments</option><option value="Unpaid">Unpaid</option><option value="Partially Paid">Partially Paid</option><option value="Fully Paid">Fully Paid</option></select></FormField>
            </div>

            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <SortHeader label="Shipment" sortKey="id" sortConfig={sortConfig} onSort={sortBy} />
                    <SortHeader label="Entry Date" sortKey="entryDate" sortConfig={sortConfig} onSort={sortBy} />
                    <SortHeader label="Type" sortKey="cargoType" sortConfig={sortConfig} onSort={sortBy} />
                    <SortHeader label="Load / Units" sortKey="containers" sortConfig={sortConfig} onSort={sortBy} />
                    <SortHeader label="Vessel" sortKey="vessel" sortConfig={sortConfig} onSort={sortBy} />
                    <SortHeader label="Customer" sortKey="customer" sortConfig={sortConfig} onSort={sortBy} />
                    <SortHeader label="Route" sortKey="route" sortConfig={sortConfig} onSort={sortBy} />
                    <SortHeader label="Cut-Off" sortKey="cutOff" sortConfig={sortConfig} onSort={sortBy} />
                    <SortHeader label="ETD" sortKey="etd" sortConfig={sortConfig} onSort={sortBy} />
                    <SortHeader label="ETA" sortKey="eta" sortConfig={sortConfig} onSort={sortBy} />
                    <SortHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={sortBy} />
                    {canSeeFinance && <SortHeader label="Buy" sortKey="buy" sortConfig={sortConfig} onSort={sortBy} />}
                    {canSeeFinance && <SortHeader label="Sell" sortKey="sell" sortConfig={sortConfig} onSort={sortBy} />}
                    {canSeeFinance && <SortHeader label="Profit" sortKey="profit" sortConfig={sortConfig} onSort={sortBy} />}
                    <SortHeader label="Payment" sortKey="paymentStatus" sortConfig={sortConfig} onSort={sortBy} />
                    {role === "admin" && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedShipments.map((s) => (
                    <tr key={s.id} onClick={() => openShipmentDetails(s)}>
                      <td>{s.id}</td>
                      <td>{s.entryDate || "Not set"}</td>
                      <td><span className={`typeBadge ${(s.cargoType || "FCL").toLowerCase()}`}>{s.cargoType || "FCL"}</span></td>
                      <td>
                        {getShipmentLoadDescription(s)}
                        <br />
                        <small>{getShipmentBillableQty(s)} {getShipmentUnitLabel(s)}</small>
                      </td>
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
