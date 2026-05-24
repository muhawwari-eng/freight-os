import { FormField } from "../components/freightComponents";

export function SuppliersScreen({ canEditCore, addSupplier, supplierForm, updateSupplier, suppliers, role, deleteSupplier }) {
  return (
          <section className="panel twoCols">
            <div>
              <h2>Companies / Suppliers</h2>
              <p className="smallText">Add shipping lines, local transport companies, agents, or operation suppliers.</p>
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
            <div className="note">
              <h3>Company List</h3>
              <div className="miniList">
                {suppliers.map((supplier) => (
                  <div className="miniCard" key={supplier.id}>
                    <b>{supplier.name}</b>
                    <p>{supplier.type} {supplier.contact ? `• ${supplier.contact}` : ""}</p>
                    <p>{supplier.email || "No email"} {supplier.phone ? `• ${supplier.phone}` : ""}</p>
                    {supplier.note && <p>{supplier.note}</p>}
                    {role === "admin" && <button className="dangerBtn" onClick={() => deleteSupplier(supplier.id)}>Delete</button>}
                  </div>
                ))}
              </div>
            </div>
          </section>
  );
}
