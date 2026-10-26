import { useState } from "react";
import { FormField } from "../components/freightComponents";
import { money } from "../utils/freight";
import { buildPresentationRows, presentationPinHash, presentationStorageKey } from "../utils/presentation";

export function PresentationSetup({ ownerId, customers, shipments, rate, onActivate }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("customer");
  const [customer, setCustomer] = useState("");
  const [pin, setPin] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const names = [...new Set([...customers.map((item) => item.name), ...buildPresentationRows(shipments, rate, { mode: "partner", ownerId }).flatMap((row) => [row.customer]), ...shipments.flatMap((shipment) => (shipment.financialInvoices || []).filter((invoice) => invoice.invoiceType === "Sale").map((invoice) => invoice.party))])].filter(Boolean).sort();
  return <>
    <button type="button" className="ghostBtn" onClick={() => setOpen(true)}>Presentation Mode</button>
    {open && <div className="presentationOverlay"><form className="presentationDialog" onSubmit={async (event) => {
      event.preventDefault();
      if (!/^\d{4,12}$/.test(pin) || pin !== repeat || (mode === "customer" && !customer)) { setError("Choose a customer and enter matching PINs (4-12 digits)."); return; }
      setBusy(true);
      try {
        const salt = crypto.randomUUID();
        const config = { enabled: true, mode, customer: mode === "customer" ? customer : "", ownerId, salt, pinHash: await presentationPinHash(pin, salt) };
        localStorage.setItem(presentationStorageKey, JSON.stringify(config));
        setPin(""); setRepeat(""); onActivate(config);
      } catch { setError("Could not enable presentation mode. Please try again."); }
      finally { setBusy(false); }
    }}>
      <h2>Presentation Mode</h2>
      <div className="formGrid one">
        <FormField label="Audience"><select value={mode} onChange={(event) => setMode(event.target.value)}><option value="customer">Customer</option><option value="partner">Partner</option></select></FormField>
        {mode === "customer" && <FormField label="Customer"><select required value={customer} onChange={(event) => setCustomer(event.target.value)}><option value="">Select Customer</option>{names.map((name) => <option key={name}>{name}</option>)}</select></FormField>}
        <FormField label="Exit PIN"><input required type="password" inputMode="numeric" autoComplete="new-password" value={pin} onChange={(event) => setPin(event.target.value)} /></FormField>
        <FormField label="Confirm PIN"><input required type="password" inputMode="numeric" autoComplete="new-password" value={repeat} onChange={(event) => setRepeat(event.target.value)} /></FormField>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="actions mt"><button className="saveBtn" disabled={busy}>Start Presentation</button><button type="button" className="ghostBtn" onClick={() => { setOpen(false); setPin(""); setRepeat(""); }}>Cancel</button></div>
    </form></div>}
  </>;
}

export function PresentationScreen({ config, shipments, ownerId, rate, onExit }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [unlock, setUnlock] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const rows = config.ownerId === ownerId ? buildPresentationRows(shipments, rate, config) : [];
  const filtered = rows.filter((row) => [row.id, row.customer, row.booking, row.origin, row.destination].some((value) => String(value || "").toLowerCase().includes(query.toLowerCase())));
  const current = filtered.find((row) => row.id === selected);
  const invoices = (current ? [current] : filtered).flatMap((row) => row.invoices);
  function exportCsv() {
    const lines = [["Shipment", "Customer", "Booking", "Origin", "Destination", "Status", "ETD", "ETA"], ...filtered.map((row) => [row.id, row.customer, row.booking, row.origin, row.destination, row.status, row.etd, row.eta])];
    const csv = lines.map((line) => line.map((value) => '"' + String(value || "").replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"').join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "shipment-presentation.csv"; link.click(); URL.revokeObjectURL(url);
  }
  return <main className="presentationWorkspace">
    <header className="presentationBanner"><div><strong>Presentation Mode Active</strong><p>{config.mode === "customer" ? config.customer : "Partner"}</p></div><button type="button" className="ghostBtn" onClick={() => setUnlock(true)}>Exit Presentation</button></header>
    <section className="presentationBody">
      <div className="panelHead"><h2>Shipment Overview</h2><button type="button" className="ghostBtn" onClick={exportCsv}>Export CSV</button></div>
      <FormField label="Search"><input value={query} onChange={(event) => setQuery(event.target.value)} /></FormField>
      <div className="opsMetrics mt"><div><small>Shipments</small><b>{filtered.length}</b></div><div><small>Sales USD</small><b>{money(invoices.reduce((sum, item) => sum + item.total, 0))}</b></div><div><small>Collected USD</small><b>{money(invoices.reduce((sum, item) => sum + item.paid, 0))}</b></div><div><small>Remaining USD</small><b>{money(invoices.reduce((sum, item) => sum + item.remaining, 0))}</b></div></div>
      <div className="tableWrap"><table><thead><tr>{["Shipment", "Customer", "Booking", "Route", "Status", "ETD", "ETA"].map((title) => <th key={title}>{title}</th>)}</tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td><button type="button" className="linkBtn" onClick={() => setSelected(row.id)}>{row.id}</button></td><td>{row.customer}</td><td>{row.booking}</td><td>{row.origin} - {row.destination}</td><td>{row.status}</td><td>{row.etd}</td><td>{row.eta}</td></tr>)}{!filtered.length && <tr><td colSpan="7">No shipments found.</td></tr>}</tbody></table></div>
      {current && <section className="mt"><div className="panelHead"><h3>{current.id} / Sales Invoices</h3><button type="button" className="ghostBtn" onClick={() => setSelected("")}>Close</button></div><div className="tableWrap"><table><thead><tr>{["Invoice", "Date", "Category", "Total USD", "Collected USD", "Remaining USD"].map((title) => <th key={title}>{title}</th>)}</tr></thead><tbody>{current.invoices.map((invoice) => <tr key={invoice.id}><td>{invoice.number}</td><td>{invoice.date}</td><td>{invoice.category}</td><td>{money(invoice.total)}</td><td>{money(invoice.paid)}</td><td>{money(invoice.remaining)}</td></tr>)}</tbody></table></div></section>}
    </section>
    {unlock && <div className="presentationOverlay"><form className="presentationDialog" onSubmit={async (event) => {
      event.preventDefault(); setBusy(true);
      try {
        if (!config.pinHash || await presentationPinHash(pin, config.salt) !== config.pinHash) { setError("Incorrect PIN."); return; }
        localStorage.removeItem(presentationStorageKey); onExit();
      } catch { setError("Could not unlock presentation mode."); }
      finally { setBusy(false); setPin(""); }
    }}><h2>Exit Presentation</h2><FormField label="PIN"><input required type="password" autoComplete="off" inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value)} /></FormField>{error && <p role="alert">{error}</p>}<div className="actions mt"><button className="saveBtn" disabled={busy}>Unlock</button><button type="button" className="ghostBtn" onClick={() => { setUnlock(false); setPin(""); setError(""); }}>Cancel</button></div></form></div>}
  </main>;
}
