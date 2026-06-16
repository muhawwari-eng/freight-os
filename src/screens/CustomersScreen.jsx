import { FormField } from "../components/freightComponents";
import { getShipmentFinancialLedger, money } from "../utils/freight";

export function CustomersScreen({ canEditCore, addCustomer, customerForm, updateCustomer, editingCustomerId, cancelEditCustomer, customers, startEditCustomer, role, deleteCustomer, shipments = [], activeFxRate, openShipmentDetails }) {
  function getCustomerProfile(customerName) {
    const customerShipments = shipments.filter((shipment) => shipment.customer === customerName);
    const totals = customerShipments.reduce((summary, shipment) => {
      const ledger = getShipmentFinancialLedger(shipment, activeFxRate);
      return {
        sales: summary.sales + ledger.salesTotal,
        remaining: summary.remaining + ledger.salesRemaining,
        profit: summary.profit + ledger.expectedProfit,
      };
    }, { sales: 0, remaining: 0, profit: 0 });
    return { shipments: customerShipments, ...totals };
  }

  return (
          <section className="panel twoCols">
            <div>
              <h2>Customers</h2>
              <p className="smallText">Add and manage your clients for bookings and reports.</p>
              {canEditCore && (
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
              )}
            </div>
            <div className="note">
              <h3>Customer List</h3>
              <div className="miniList">
                {customers.map((customer) => (
                  <div className="miniCard customer360Card" key={customer.id}>
                    <b>{customer.name}</b>
                    <p>{customer.contact || "No contact"} {customer.phone ? `• ${customer.phone}` : ""}</p>
                    <p>{customer.email || "No email"} {customer.country ? `• ${customer.country}` : ""}</p>
                    {customer.note && <p>{customer.note}</p>}
                    {(() => {
                      const profile = getCustomerProfile(customer.name);
                      return (
                        <>
                          <div className="customer360Metrics">
                            <span><small>Files</small><b>{profile.shipments.length}</b></span>
                            <span><small>Sales</small><b>{money(profile.sales)}</b></span>
                            <span><small>Open</small><b>{money(profile.remaining)}</b></span>
                            <span><small>Profit</small><b>{money(profile.profit)}</b></span>
                          </div>
                          <div className="customerShipments">
                            {profile.shipments.slice(0, 3).map((shipment) => (
                              <button key={shipment.id} type="button" onClick={() => openShipmentDetails(shipment)}>
                                {shipment.id} | {shipment.status} | ETA {shipment.eta || "Not set"}
                              </button>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                    {canEditCore && (
                      <div className="actions mt">
                        <button className="ghostBtn" onClick={() => startEditCustomer(customer)}>Edit</button>
                        {role === "admin" && <button className="dangerBtn" onClick={() => deleteCustomer(customer.id)}>Delete</button>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

  );
}
