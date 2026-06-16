import { useMemo, useState } from "react";
import { FormField } from "../components/freightComponents";
import { getShipmentAuditEvents } from "../utils/freight";

export function AuditLogScreen({ shipments, openShipmentDetails }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const events = useMemo(() => {
    const text = query.trim().toLowerCase();
    return getShipmentAuditEvents(shipments)
      .filter((event) => type === "all" || event.type === type)
      .filter((event) => {
        if (!text) return true;
        return [event.title, event.note, event.user, event.shipmentId, event.shipmentCustomer, event.route, event.type]
          .some((value) => String(value || "").toLowerCase().includes(text));
      })
      .slice(0, 300);
  }, [shipments, query, type]);
  const types = ["all", ...new Set(getShipmentAuditEvents(shipments).map((event) => event.type || "Event"))];

  return (
    <section className="panel">
      <div className="panelHead">
        <div>
          <h2>Audit Log</h2>
          <p>All operational, finance, document, share, and task activity in one management log.</p>
        </div>
      </div>
      <div className="filtersGrid">
        <FormField label="Search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="User, shipment, customer, action..." /></FormField>
        <FormField label="Type">
          <select value={type} onChange={(event) => setType(event.target.value)}>
            {types.map((item) => <option key={item} value={item}>{item === "all" ? "All Types" : item}</option>)}
          </select>
        </FormField>
      </div>
      <div className="tableWrap mt">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Shipment</th>
              <th>Customer</th>
              <th>User</th>
              <th>Action</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} onClick={() => {
                const shipment = shipments.find((item) => item.id === event.shipmentId);
                if (shipment) openShipmentDetails(shipment);
              }}>
                <td>{event.date ? new Date(event.date).toLocaleString() : "Not set"}</td>
                <td><span className="badge">{event.type || "Event"}</span></td>
                <td>{event.shipmentId}</td>
                <td>{event.shipmentCustomer || "Not set"}</td>
                <td>{event.user || "unknown"}</td>
                <td><b>{event.title}</b></td>
                <td>{event.note || ""}</td>
              </tr>
            ))}
            {events.length === 0 && <tr><td colSpan="7">No audit events found.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
