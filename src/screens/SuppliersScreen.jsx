import { useState } from "react";
import { FormField } from "../components/freightComponents";
import { calcTotalCostUsd, getExpenses, getTransports, money } from "../utils/freight";

export function SuppliersScreen({ canEditCore, addSupplier, supplierForm, updateSupplier, suppliers, role, deleteSupplier, shipments = [], activeFxRate, openShipmentDetails }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  function getSupplierProfile(supplier) {
    const name = supplier.name || "";
    const carrierShipments = shipments.filter((shipment) => shipment.line === name);
    const expenseRows = shipments.flatMap((shipment) => getExpenses(shipment).filter((expense) => expense.company === name).map((expense) => ({ shipment, expense })));
    const transportRows = shipments.flatMap((shipment) => getTransports(shipment).filter((transport) => transport.company === name).map((transport) => ({ shipment, transport })));
    const carrierCost = carrierShipments.reduce((sum, shipment) => sum + calcTotalCostUsd(shipment, activeFxRate), 0);
    const expenseCost = expenseRows.reduce((sum, row) => sum + Number(row.expense.amountUsd || 0), 0);
    const transportCount = transportRows.length;
    return { carrierShipments, expenseRows, transportRows, carrierCost, expenseCost, transportCount, totalActivity: carrierShipments.length + expenseRows.length + transportRows.length };
  }

  const rows = suppliers.map((supplier) => ({ supplier, profile: getSupplierProfile(supplier) }))
    .filter(({ supplier, profile }) => {
      const text = query.trim().toLowerCase();
      const matchesText = !text || [supplier.name, supplier.type, supplier.contact, supplier.phone, supplier.email, supplier.note]
        .some((value) => String(value || "").toLowerCase().includes(text));
      const matchesType = typeFilter === "all" || supplier.type === typeFilter;
      return matchesText && matchesType && (typeFilter !== "active" || profile.totalActivity > 0);
    })
    .sort((a, b) => b.profile.totalActivity - a.profile.totalActivity || String(a.supplier.name).localeCompare(String(b.supplier.name)));

  const supplierTypes = ["all", ...new Set(suppliers.map((supplier) => supplier.type || "Other"))];
  const summary = rows.reduce((acc, row) => {
    acc.companies += 1;
    acc.active += row.profile.totalActivity > 0 ? 1 : 0;
    acc.carrierCost += row.profile.carrierCost;
    acc.expenseCost += row.profile.expenseCost;
    return acc;
  }, { companies: 0, active: 0, carrierCost: 0, expenseCost: 0 });

  return (
    <section className="panel operationalPage">
      <div className="panelHead">
        <div>
          <h2>Companies / Suppliers</h2>
          <p className="smallText">Supplier directory with carrier, expense, and transport activity.</p>
        </div>
      </div>

      <section className="opsMetrics">
        <div><small>Companies</small><b>{summary.companies}</b></div>
        <div><small>Active</small><b>{summary.active}</b></div>
        <div><small>Carrier Cost</small><b>{money(summary.carrierCost)}</b></div>
        <div><small>Expenses</small><b>{money(summary.expenseCost)}</b></div>
      </section>

      <div className="opsLayout">
        <div className="opsFormPanel">
          <h3>Add Company</h3>
          {canEditCore && (
            <form onSubmit={addSupplier}>
              <div className="formGrid one">
                <FormField label="Company Name"><input value={supplierForm.name} onChange={(e) => updateSupplier("name", e.target.value)} /></FormField>
                <FormField label="Company Type">
                  <select value={supplierForm.type} onChange={(e) => updateSupplier("type", e.target.value)}>
                    <option value="Shipping Line">Shipping Line</option>
                    <option value="Airline">Airline</option>
                    <option value="Road Transport">Road Transport</option>
                    <option value="Local Transport">Local Transport</option>
                    <option value="Agent">Agent</option>
                    <option value="Operation Supplier">Operation Supplier</option>
                    <option value="Other">Other</option>
                  </select>
                </FormField>
                <FormField label="Contact Person"><input value={supplierForm.contact} onChange={(e) => updateSupplier("contact", e.target.value)} /></FormField>
                <FormField label="Phone"><input value={supplierForm.phone} onChange={(e) => updateSupplier("phone", e.target.value)} /></FormField>
                <FormField label="Email"><input type="email" value={supplierForm.email} onChange={(e) => updateSupplier("email", e.target.value)} /></FormField>
                <FormField label="Note"><input value={supplierForm.note} onChange={(e) => updateSupplier("note", e.target.value)} /></FormField>
              </div>
              <button className="saveBtn mt" type="submit">Add Company</button>
            </form>
          )}
        </div>

        <div className="opsListPanel">
          <div className="opsToolbar">
            <FormField label="Search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Company, contact, email..." /></FormField>
            <FormField label="Type">
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                {supplierTypes.map((type) => <option key={type} value={type}>{type === "all" ? "All Types" : type}</option>)}
                <option value="active">Active Only</option>
              </select>
            </FormField>
          </div>

          <div className="opsCardGrid">
            {rows.map(({ supplier, profile }) => (
              <div className="opsCard" key={supplier.id}>
                <div className="opsCardHead">
                  <div>
                    <b>{supplier.name}</b>
                    <p>{supplier.type || "Other"} {supplier.contact ? `| ${supplier.contact}` : ""}</p>
                  </div>
                  <span className="badge">{profile.totalActivity} activity</span>
                </div>
                <p>{supplier.email || "No email"} {supplier.phone ? `| ${supplier.phone}` : ""}</p>
                {supplier.note && <p>{supplier.note}</p>}
                <div className="customer360Metrics">
                  <span><small>Carrier Files</small><b>{profile.carrierShipments.length}</b></span>
                  <span><small>Transport</small><b>{profile.transportCount}</b></span>
                  <span><small>Carrier Cost</small><b>{money(profile.carrierCost)}</b></span>
                  <span><small>Expenses</small><b>{money(profile.expenseCost)}</b></span>
                </div>
                <div className="customerShipments">
                  {profile.carrierShipments.slice(0, 3).map((shipment) => (
                    <button key={shipment.id} type="button" onClick={() => openShipmentDetails?.(shipment)}>
                      {shipment.id} | {shipment.customer} | {shipment.status}
                    </button>
                  ))}
                </div>
                {role === "admin" && <button className="dangerBtn mt" onClick={() => deleteSupplier(supplier.id)}>Delete</button>}
              </div>
            ))}
            {rows.length === 0 && <div className="emptyState"><b>No companies found.</b><p>Try another search or type filter.</p></div>}
          </div>
        </div>
      </div>
    </section>
  );
}
