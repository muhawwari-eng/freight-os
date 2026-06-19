import { useMemo, useState } from "react";
import { FormField } from "../components/freightComponents";
import { getLocationType, portLabel } from "../data/defaults";

const locationTabs = [
  { key: "Seaport", label: "Sea Ports", codeLabel: "UN/LOCODE", placeholder: "Example: TRMER" },
  { key: "Airport", label: "Airports", codeLabel: "IATA Code", placeholder: "Example: IST" },
  { key: "Sea Destination", label: "Sea Destinations", codeLabel: "Destination Code", placeholder: "Example: DEST-BEN" },
];

export function PortsScreen({ canEditCore, addPort, portForm, updatePort, ports, role, deletePort }) {
  const [activeType, setActiveType] = useState("Seaport");
  const [query, setQuery] = useState("");
  const activeTab = locationTabs.find((tab) => tab.key === activeType) || locationTabs[0];

  const rows = useMemo(() => ports
    .filter((location) => getLocationType(location) === activeType)
    .filter((location) => {
      const text = query.trim().toLowerCase();
      return !text || [location.code, location.name, location.country].some((value) => String(value || "").toLowerCase().includes(text));
    })
    .sort((a, b) => String(a.country).localeCompare(String(b.country)) || String(a.name).localeCompare(String(b.name))), [ports, activeType, query]);

  const countries = new Set(rows.map((location) => location.country).filter(Boolean)).size;

  function selectType(type) {
    setActiveType(type);
    updatePort("locationType", type);
  }

  return (
    <section className="panel operationalPage">
      <div className="panelHead">
        <div>
          <h2>Ports & Locations</h2>
          <p className="smallText">Manage sea ports, international airports, and final sea-freight destinations.</p>
        </div>
      </div>

      <div className="directoryTabs" role="tablist" aria-label="Location type">
        {locationTabs.map((tab) => (
          <button key={tab.key} type="button" className={activeType === tab.key ? "active" : ""} onClick={() => selectType(tab.key)}>
            <span>{tab.label}</span>
            <b>{ports.filter((location) => getLocationType(location) === tab.key).length}</b>
          </button>
        ))}
      </div>

      <section className="opsMetrics compactMetrics">
        <div><small>{activeTab.label}</small><b>{rows.length}</b></div>
        <div><small>Countries</small><b>{countries}</b></div>
      </section>

      <div className="opsLayout">
        <div className="opsFormPanel">
          <h3>Add {activeTab.label.replace(/s$/, "")}</h3>
          {canEditCore ? (
            <form onSubmit={addPort}>
              <div className="formGrid one">
                <FormField label="Location Type">
                  <select value={portForm.locationType || activeType} onChange={(event) => selectType(event.target.value)}>
                    {locationTabs.map((tab) => <option key={tab.key} value={tab.key}>{tab.label}</option>)}
                  </select>
                </FormField>
                <FormField label={activeTab.codeLabel}><input value={portForm.code} onChange={(event) => updatePort("code", event.target.value)} placeholder={activeTab.placeholder} /></FormField>
                <FormField label="Name"><input value={portForm.name} onChange={(event) => updatePort("name", event.target.value)} placeholder={activeType === "Airport" ? "Example: Istanbul Airport" : "Example: Mersin"} /></FormField>
                <FormField label="Country"><input value={portForm.country} onChange={(event) => updatePort("country", event.target.value)} placeholder="Example: Turkey" /></FormField>
              </div>
              <button className="saveBtn mt" type="submit">Add Location</button>
            </form>
          ) : <p className="smallText">You have read-only access to this directory.</p>}
        </div>

        <div className="opsListPanel">
          <div className="opsToolbar singleSearch">
            <FormField label={`Search ${activeTab.label}`}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, code, or country..." /></FormField>
          </div>
          <div className="locationTableWrap">
            <table>
              <thead><tr><th>Code</th><th>Name</th><th>Country</th>{role === "admin" && <th>Action</th>}</tr></thead>
              <tbody>
                {rows.map((location) => (
                  <tr key={location.code}>
                    <td><b>{location.code}</b></td>
                    <td title={portLabel(location)}>{location.name}</td>
                    <td>{location.country || "Not set"}</td>
                    {role === "admin" && <td><button className="dangerBtn" onClick={() => deletePort(location.code)}>Delete</button></td>}
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={role === "admin" ? 4 : 3}>No locations found in this section.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
