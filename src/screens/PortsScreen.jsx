import { FormField } from "../components/freightComponents";
import { portLabel } from "../data/defaults";

export function PortsScreen({ canEditCore, addPort, portForm, updatePort, ports, role, deletePort }) {
  return (
          <section className="panel twoCols">
            <div>
              <h2>Ports</h2>
              <p className="smallText">Add a port if it is not available in the POL / POD lists.</p>
              {canEditCore && (
                <form onSubmit={addPort}>
                  <div className="formGrid one">
                    <FormField label="UN/LOCODE / Port Code"><input value={portForm.code} onChange={(e) => updatePort("code", e.target.value)} placeholder="Example: TRMER" /></FormField>
                    <FormField label="Port Name"><input value={portForm.name} onChange={(e) => updatePort("name", e.target.value)} placeholder="Example: Mersin" /></FormField>
                    <FormField label="Country"><input value={portForm.country} onChange={(e) => updatePort("country", e.target.value)} placeholder="Example: Türkiye" /></FormField>
                  </div>
                  <button className="saveBtn mt" type="submit">Add Port</button>
                </form>
              )}
            </div>
            <div className="note">
              <h3>Port List</h3>
              <div className="miniList">
                {ports.map((port) => (
                  <div className="miniCard" key={port.code}>
                    <b>{portLabel(port)}</b>
                    <p>Code: {port.code} {port.country ? `• ${port.country}` : ""}</p>
                    {role === "admin" && <button className="dangerBtn" onClick={() => deletePort(port.code)}>Delete</button>}
                  </div>
                ))}
              </div>
            </div>
          </section>

  );
}
