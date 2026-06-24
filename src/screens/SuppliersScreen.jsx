import { useState } from "react";
import { FormField } from "../components/freightComponents";
import { calcTotalCostUsd, getExpenses, getTransports, money } from "../utils/freight";

const companyTabs = [
  { key: "Shipping Line", label: "Shipping Lines", types: ["Shipping Line"] },
  { key: "Airline", label: "Airlines", types: ["Airline"] },
  { key: "Road Transport", label: "Road Carriers", types: ["Road Transport"] },
  { key: "Local Transport", label: "Local Transport", types: ["Local Transport"] },
  { key: "Agent", label: "Agents", types: ["Agent"] },
  { key: "Operation Supplier", label: "Suppliers", types: ["Operation Supplier", "Supplier", "Other"] },
];

export function SuppliersScreen({ canEditCore, addSupplier, supplierForm, updateSupplier, suppliers, role, deleteSupplier, shipments = [], activeFxRate, openShipmentDetails }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Shipping Line");
  const activeTab = companyTabs.find((tab) => tab.key === activeCategory) || companyTabs[0];

  function getSupplierProfile(supplier) {
    const name = supplier.name || "";
    const carrierShipments = shipments.filter((shipment) => shipment.line === name);
    const expenseRows = shipments.flatMap((shipment) => getExpenses(shipment).filter((expense) => expense.company === name).map((expense) => ({ shipment, expense })));
    const transportRows = shipments.flatMap((shipment) => getTransports(shipment).filter((transport) => transport.company === name).map((transport) => ({ shipment, transport })));
    const carrierCost = carrierShipments.reduce((sum, shipment) => sum + calcTotalCostUsd(shipment, activeFxRate), 0);
    const expenseCost = expenseRows.reduce((sum, row) => sum + Number(row.expense.amountUsd || 0), 0);
    return { carrierShipments, expenseRows, transportRows, carrierCost, expenseCost, totalActivity: carrierShipments.length + expenseRows.length + transportRows.length };
  }

  const categoryCompanies = suppliers.filter((supplier) => activeTab.types.includes(supplier.type || "Other"));
  const rows = categoryCompanies.map((supplier) => ({ supplier, profile: getSupplierProfile(supplier) }))
    .filter(({ supplier }) => {
      const text = query.trim().toLowerCase();
      return !text || [supplier.name, supplier.contact, supplier.phone, supplier.email, supplier.note].some((value) => String(value || "").toLowerCase().includes(text));
    })
    .sort((a, b) => b.profile.totalActivity - a.profile.totalActivity || String(a.supplier.name).localeCompare(String(b.supplier.name)));

  const summary = rows.reduce((acc, row) => {
    acc.active += row.profile.totalActivity > 0 ? 1 : 0;
    acc.cost += row.profile.carrierCost + row.profile.expenseCost;
    return acc;
  }, { active: 0, cost: 0 });

  function selectCategory(key) {
    const category = companyTabs.find((tab) => tab.types.includes(key));
    setActiveCategory(category?.key || "Operation Supplier");
    updateSupplier("type", key);
  }

  return (
    <section className="panel operationalPage">
      <div className="panelHead">
        <div>
          <h2>Companies</h2>
          <p className="smallText">Carrier, agent, and supplier directory organized by business type.</p>
        </div>
      </div>

      <div className="directoryTabs companyTabs" role="tablist" aria-label="Company type">
        {companyTabs.map((tab) => (
          <button key={tab.key} type="button" className={activeCategory === tab.key ? "active" : ""} onClick={() => selectCategory(tab.key)}>
            <span>{tab.label}</span>
            <b>{suppliers.filter((supplier) => tab.types.includes(supplier.type || "Other")).length}</b>
          </button>
        ))}
      </div>

      <section className="opsMetrics compactMetrics">
        <div><small>{activeTab.label}</small><b>{rows.length}</b></div>
        <div><small>Active</small><b>{summary.active}</b></div>
        <div><small>Recorded Cost</small><b>{money(summary.cost)}</b></div>
      </section>

      <div className="opsLayout">
        <div className="opsFormPanel">
          <h3>Add Company</h3>
          {canEditCore ? (
            <form onSubmit={addSupplier}>
              <div className="formGrid one">
                <FormField label="Company Name"><input value={supplierForm.name} onChange={(event) => updateSupplier("name", event.target.value)} /></FormField>
                <FormField label="Company Type">
                  <select value={supplierForm.type} onChange={(event) => selectCategory(event.target.value)}>
                    <option value="Shipping Line">Shipping Line</option>
                    <option value="Airline">Airline</option>
                    <option value="Road Transport">Road Transport</option>
                    <option value="Local Transport">Local Transport</option>
                    <option value="Agent">Agent</option>
                    <option value="Operation Supplier">Supplier</option>
                    <option value="Other">Other</option>
                  </select>
                </FormField>
                <FormField label="Contact Person"><input value={supplierForm.contact} onChange={(event) => updateSupplier("contact", event.target.value)} /></FormField>
                <FormField label="Phone"><input value={supplierForm.phone} onChange={(event) => updateSupplier("phone", event.target.value)} /></FormField>
                <FormField label="Email"><input type="email" value={supplierForm.email} onChange={(event) => updateSupplier("email", event.target.value)} /></FormField>
                <FormField label="Note"><input value={supplierForm.note} onChange={(event) => updateSupplier("note", event.target.value)} /></FormField>
              </div>
              <button className="saveBtn mt" type="submit">Add Company</button>
            </form>
          ) : <p className="smallText">You have read-only access to this directory.</p>}
        </div>

        <div className="opsListPanel">
          <div className="opsToolbar singleSearch">
            <FormField label={`Search ${activeTab.label}`}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Company, contact, email..." /></FormField>
          </div>
          <div className="opsCardGrid">
            {rows.map(({ supplier, profile }) => (
              <div className="opsCard" key={supplier.id}>
                <div className="opsCardHead">
                  <div><b>{supplier.name}</b><p>{supplier.type || "Other"}{supplier.contact ? ` | ${supplier.contact}` : ""}</p></div>
                  <span className="badge">{profile.totalActivity} activity</span>
                </div>
                <p>{supplier.email || "No email"}{supplier.phone ? ` | ${supplier.phone}` : ""}</p>
                {supplier.note && <p>{supplier.note}</p>}
                <div className="customer360Metrics">
                  <span><small>Carrier Files</small><b>{profile.carrierShipments.length}</b></span>
                  <span><small>Transport</small><b>{profile.transportRows.length}</b></span>
                  <span><small>Cost</small><b>{money(profile.carrierCost + profile.expenseCost)}</b></span>
                </div>
                <div className="customerShipments">
                  {profile.carrierShipments.slice(0, 3).map((shipment) => <button key={shipment.id} type="button" onClick={() => openShipmentDetails?.(shipment)}>{shipment.id} | {shipment.customer} | {shipment.status}</button>)}
                </div>
                {role === "admin" && <button className="dangerBtn mt" onClick={() => deleteSupplier(supplier.id)}>Delete</button>}
              </div>
            ))}
            {rows.length === 0 && <div className="emptyState"><b>No companies found.</b><p>Add a company or try another search.</p></div>}
          </div>
        </div>
      </div>
    </section>
  );
}
