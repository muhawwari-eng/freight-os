import { useState } from "react";
import { FormField } from "../components/freightComponents";
import { getShipmentFinancialLedger, money } from "../utils/freight";

export function CustomersScreen({ canEditCore, addCustomer, customerForm, updateCustomer, editingCustomerId, cancelEditCustomer, customers, startEditCustomer, role, deleteCustomer, shipments = [], activeFxRate, openShipmentDetails }) {
  const [query, setQuery] = useState("");
  const [viewFilter, setViewFilter] = useState("all");

  function getCustomerProfile(customerName) {
    const customerShipments = shipments.filter((shipment) => shipment.customer === customerName);
    const totals = customerShipments.reduce((summary, shipment) => {
      const ledger = getShipmentFinancialLedger(shipment, activeFxRate);
      return {
        sales: summary.sales + ledger.salesTotal,
        remaining: summary.remaining + ledger.salesRemaining,
        collected: summary.collected + ledger.salesPaid,
        profit: summary.profit + ledger.expectedProfit,
      };
    }, { sales: 0, remaining: 0, collected: 0, profit: 0 });
    const latestShipment = [...customerShipments].sort((a, b) => String(b.entryDate || b.createdAt || "").localeCompare(String(a.entryDate || a.createdAt || "")))[0];
    return { shipments: customerShipments, latestShipment, ...totals };
  }

  const customerRows = customers.map((customer) => ({ customer, profile: getCustomerProfile(customer.name) }))
    .filter(({ customer, profile }) => {
      const text = query.trim().toLowerCase();
      const matchesText = !text || [customer.name, customer.contact, customer.phone, customer.email, customer.country, customer.note]
        .some((value) => String(value || "").toLowerCase().includes(text));
      if (!matchesText) return false;
      if (viewFilter === "active") return profile.shipments.length > 0;
      if (viewFilter === "balance") return profile.remaining > 0.01;
      if (viewFilter === "missingEmail") return !customer.email;
      if (viewFilter === "top") return profile.sales > 0;
      return true;
    })
    .sort((a, b) => {
      if (viewFilter === "top") return b.profile.sales - a.profile.sales;
      return String(a.customer.name).localeCompare(String(b.customer.name));
    });

  const summary = customerRows.reduce((acc, row) => {
    acc.customers += 1;
    acc.active += row.profile.shipments.length > 0 ? 1 : 0;
    acc.open += row.profile.remaining;
    acc.sales += row.profile.sales;
    return acc;
  }, { customers: 0, active: 0, open: 0, sales: 0 });

  return (
    <section className="panel operationalPage">
      <div className="panelHead">
        <div>
          <h2>Customers</h2>
          <p className="smallText">Client profiles, balances, activity, and quick shipment access.</p>
        </div>
      </div>

      <section className="opsMetrics">
        <div><small>Customers</small><b>{summary.customers}</b></div>
        <div><small>Active</small><b>{summary.active}</b></div>
        <div><small>Open Balance</small><b>{money(summary.open)}</b></div>
        <div><small>Total Sales</small><b>{money(summary.sales)}</b></div>
      </section>

      <div className="opsLayout">
        <div className="opsFormPanel">
          <h3>{editingCustomerId ? "Edit Customer" : "Add Customer"}</h3>
          {canEditCore ? (
            <form onSubmit={addCustomer}>
              <div className="formGrid one">
                <FormField label="Customer Name"><input value={customerForm.name} onChange={(e) => updateCustomer("name", e.target.value)} /></FormField>
                <FormField label="Contact Person"><input value={customerForm.contact} onChange={(e) => updateCustomer("contact", e.target.value)} /></FormField>
                <FormField label="Phone"><input value={customerForm.phone} onChange={(e) => updateCustomer("phone", e.target.value)} /></FormField>
                <FormField label="Email"><input type="email" value={customerForm.email} onChange={(e) => updateCustomer("email", e.target.value)} /></FormField>
                <FormField label="Country"><input value={customerForm.country} onChange={(e) => updateCustomer("country", e.target.value)} /></FormField>
                <FormField label="Note"><input value={customerForm.note} onChange={(e) => updateCustomer("note", e.target.value)} /></FormField>
              </div>
              <div className="actions mt">
                <button className="saveBtn" type="submit">{editingCustomerId ? "Save Customer" : "Add Customer"}</button>
                {editingCustomerId && <button className="ghostBtn" type="button" onClick={cancelEditCustomer}>Cancel</button>}
              </div>
            </form>
          ) : (
            <p className="smallText">You can view customers, but cannot edit them.</p>
          )}
        </div>

        <div className="opsListPanel">
          <div className="opsToolbar">
            <FormField label="Search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, phone..." /></FormField>
            <FormField label="View">
              <select value={viewFilter} onChange={(event) => setViewFilter(event.target.value)}>
                <option value="all">All Customers</option>
                <option value="active">Active</option>
                <option value="balance">Has Balance</option>
                <option value="missingEmail">Missing Email</option>
                <option value="top">Top Sales</option>
              </select>
            </FormField>
          </div>

          <div className="opsCardGrid">
            {customerRows.map(({ customer, profile }) => (
              <div className="opsCard" key={customer.id}>
                <div className="opsCardHead">
                  <div>
                    <b>{customer.name}</b>
                    <p>{customer.contact || "No contact"} {customer.phone ? `| ${customer.phone}` : ""}</p>
                  </div>
                  <span className={profile.remaining > 0.01 ? "paymentBadge" : "badge"}>{profile.remaining > 0.01 ? "Balance" : "Clear"}</span>
                </div>
                <p>{customer.email || "No email"} {customer.country ? `| ${customer.country}` : ""}</p>
                {customer.note && <p>{customer.note}</p>}
                <div className="customer360Metrics">
                  <span><small>Files</small><b>{profile.shipments.length}</b></span>
                  <span><small>Sales</small><b>{money(profile.sales)}</b></span>
                  <span><small>Open</small><b>{money(profile.remaining)}</b></span>
                  <span><small>Profit</small><b>{money(profile.profit)}</b></span>
                </div>
                {profile.latestShipment && <p className="smallText">Last file: {profile.latestShipment.id} | ETA {profile.latestShipment.eta || "Not set"}</p>}
                <div className="customerShipments">
                  {profile.shipments.slice(0, 3).map((shipment) => (
                    <button key={shipment.id} type="button" onClick={() => openShipmentDetails(shipment)}>
                      {shipment.id} | {shipment.status} | {shipment.pol} - {shipment.pod}
                    </button>
                  ))}
                </div>
                {canEditCore && (
                  <div className="actions mt">
                    <button className="ghostBtn" onClick={() => startEditCustomer(customer)}>Edit</button>
                    {role === "admin" && <button className="dangerBtn" onClick={() => deleteCustomer(customer.id)}>Delete</button>}
                  </div>
                )}
              </div>
            ))}
            {customerRows.length === 0 && <div className="emptyState"><b>No customers found.</b><p>Try a different search or view filter.</p></div>}
          </div>
        </div>
      </div>
    </section>
  );
}
