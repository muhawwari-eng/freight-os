import { portLabel } from "../data/defaults";
import { generateReceiptPdf } from "../services/pdf";
import { calcExpensesUsd, calcMargin, calcNetProfit, calcOceanSell, calcSingleTransportTry, calcTotalCostUsd, calcTransportTry, formatMonthLabel, getDaysLeft, getExpenses, getPaidByTypeUsd, getPaymentStatusLabel, getPaymentSummary, getPayments, getProgress, getPurchaseDueUsd, getTransports, money } from "../utils/freight";

export function FormField({ label, children }) {
  return (
    <div className="formGroup">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function StatusSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="Draft">Draft</option>
      <option value="Booked">Booked</option>
      <option value="Loading">Loading</option>
      <option value="In Transit">In Transit</option>
      <option value="At Sea">At Sea</option>
      <option value="At Port">At Port</option>
      <option value="Arrived">Arrived</option>
      <option value="Completed">Completed</option>
    </select>
  );
}

export function PaymentSelect({ value, onChange, disabled = false }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="Unpaid">Unpaid</option>
      <option value="Partially Paid">Partially Paid</option>
      <option value="Fully Paid">Fully Paid</option>
    </select>
  );
}

export function CargoSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="FCL">FCL - Full Container Load</option>
      <option value="LCL">LCL - Less Container Load</option>
      <option value="Road">Road Transport / النقل البري</option>
      <option value="Air">Air Freight / الشحن الجوي</option>
      <option value="Cross">Cross Trade / Cross Booking</option>
    </select>
  );
}

export function ContainerSelect({ value, onChange }) {
  const containerTypes = [
    ["20GP", "20GP - Standard"],
    ["40GP", "40GP - Standard"],
    ["40HC", "40HC - High Cube"],
    ["45HC", "45HC - High Cube"],
    ["20OT", "20OT - Open Top"],
    ["40OT", "40OT - Open Top"],
    ["20FR", "20FR - Flat Rack"],
    ["40FR", "40FR - Flat Rack"],
    ["20RF", "20RF - Reefer"],
    ["40RF", "40RF - Reefer"],
    ["20TK", "20TK - Tank"],
    ["40NOR", "40NOR - Non Operating Reefer"],
  ];
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {containerTypes.map(([code, label]) => (
        <option key={code} value={code}>{label}</option>
      ))}
    </select>
  );
}

export function PortSelect({ value, ports, onChange, disabled = false }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="">Select Port</option>
      {ports.map((port) => (
        <option key={port.code} value={port.name}>{portLabel(port)}</option>
      ))}
    </select>
  );
}

export function CustomerSelect({ value, customers, onChange, disabled = false }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="">Select Customer</option>
      {customers.map((customer) => (
        <option key={customer.id} value={customer.name}>{customer.name}</option>
      ))}
    </select>
  );
}

export function SupplierSelect({ value, suppliers, onChange, disabled = false }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="">Select Company</option>
      {suppliers.map((supplier) => (
        <option key={supplier.id} value={supplier.name}>{supplier.name} - {supplier.type}</option>
      ))}
    </select>
  );
}

export function Card({ icon, title, value }) {
  return (
    <div className="card">
      <span className="cardIcon">{icon}</span>
      <p>{title}</p>
      <h2>{value}</h2>
    </div>
  );
}


export function DashboardCharts({ charts }) {
  return (
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 18 }}>
      <SimpleBarChart title="📈 Monthly Profit" rows={charts.monthlyProfit} emptyText="No profit data yet" />
      <SimpleBarChart title="💰 Monthly Collections" rows={charts.monthlyCollections} emptyText="No collections yet" />
      <HorizontalBarList title="🏆 Top Customers" rows={charts.topCustomers} emptyText="No customer revenue yet" />
      <HorizontalBarList title="💸 Expenses by Company" rows={charts.expensesByCompany} emptyText="No expenses yet" />
    </section>
  );
}

export function SimpleBarChart({ title, rows, emptyText }) {
  const max = Math.max(...(rows || []).map((row) => Math.abs(Number(row.value || 0))), 1);
  return (
    <div className="panel" style={{ minHeight: 260 }}>
      <h2>{title}</h2>
      {(!rows || rows.length === 0) ? (
        <p>{emptyText}</p>
      ) : (
        <div style={{ display: "flex", alignItems: "end", gap: 10, height: 170, paddingTop: 16, borderBottom: "1px solid rgba(148, 163, 184, 0.35)" }}>
          {rows.map((row) => {
            const height = Math.max((Math.abs(Number(row.value || 0)) / max) * 145, 6);
            return (
              <div key={row.name} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 28 }} title={`${row.name}: ${money(row.value)}`}>
                <small style={{ fontSize: 10, opacity: 0.75 }}>{money(row.value)}</small>
                <div style={{ width: "100%", maxWidth: 34, height, borderRadius: "10px 10px 2px 2px", background: Number(row.value || 0) < 0 ? "#ef4444" : "#16a34a" }} />
                <small style={{ fontSize: 10, transform: "rotate(-25deg)", whiteSpace: "nowrap", marginTop: 10 }}>{formatMonthLabel(row.name)}</small>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function HorizontalBarList({ title, rows, emptyText }) {
  const max = Math.max(...(rows || []).map((row) => Math.abs(Number(row.value || 0))), 1);
  return (
    <div className="panel" style={{ minHeight: 260 }}>
      <h2>{title}</h2>
      {(!rows || rows.length === 0) ? (
        <p>{emptyText}</p>
      ) : (
        <div className="stackList">
          {rows.map((row) => {
            const width = Math.max((Math.abs(Number(row.value || 0)) / max) * 100, 4);
            return (
              <div key={row.name} className="miniCard">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <b>{row.name}</b>
                  <span>{money(row.value)}</span>
                </div>
                <div className="progress"><div style={{ width: `${width}%` }} /></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ShipmentCard({ shipment, exchangeRate, canSeeFinance, onOpen }) {
  const daysLeft = getDaysLeft(shipment.cutOff);
  return (
    <button className="shipmentCard" onClick={onOpen}>
      <div>
        <b>{shipment.customer}</b>
        <h3>{shipment.vessel || shipment.line}</h3>
        <p>{shipment.pol} → {shipment.pod}</p>
        <p>✂ Cut-Off: {daysLeft === null ? "Not set" : `${shipment.cutOff} (${daysLeft} days left)`}</p>
      </div>
      <span className="badge">{shipment.status}</span>
      <div className="progress"><div style={{ width: `${getProgress(shipment)}%` }} /></div>
      {canSeeFinance && <strong>{money(calcNetProfit(shipment, exchangeRate))}</strong>}
    </button>
  );
}

export function ProfitCard({ shipment, exchangeRate }) {
  const margin = calcMargin(shipment, exchangeRate);
  return (
    <div className="profitCard">
      <b>{shipment.id} — {shipment.customer}</b>
      <p>Sale: {money(calcOceanSell(shipment))} | Cost: {money(calcTotalCostUsd(shipment, exchangeRate))} | Margin: {margin.toFixed(1)}%</p>
      <strong>{money(calcNetProfit(shipment, exchangeRate))}</strong>
      <div className="progress"><div style={{ width: `${Math.min(Math.max(margin, 3), 100)}%` }} /></div>
    </div>
  );
}


export function PaymentSummaryBox({ shipment, exchangeRate }) {
  const summary = getPaymentSummary(shipment, exchangeRate);
  const rows = [
    { type: "Customer Receipt", label: "Customer Collection", due: summary.receivableDue, paid: summary.receivablePaid, remaining: summary.receivableRemaining },
    { type: "Ocean Freight", label: "Ocean Freight", due: getPurchaseDueUsd(shipment, "Ocean Freight", exchangeRate), paid: getPaidByTypeUsd(shipment, "Ocean Freight", exchangeRate), remaining: Math.max(getPurchaseDueUsd(shipment, "Ocean Freight", exchangeRate) - getPaidByTypeUsd(shipment, "Ocean Freight", exchangeRate), 0) },
    { type: "Local Transport", label: "Local Transport", due: getPurchaseDueUsd(shipment, "Local Transport", exchangeRate), paid: getPaidByTypeUsd(shipment, "Local Transport", exchangeRate), remaining: Math.max(getPurchaseDueUsd(shipment, "Local Transport", exchangeRate) - getPaidByTypeUsd(shipment, "Local Transport", exchangeRate), 0) },
    { type: "Expense", label: "Expenses", due: getPurchaseDueUsd(shipment, "Expense", exchangeRate), paid: getPaidByTypeUsd(shipment, "Expense", exchangeRate), remaining: Math.max(getPurchaseDueUsd(shipment, "Expense", exchangeRate) - getPaidByTypeUsd(shipment, "Expense", exchangeRate), 0) },
  ];

  return (
    <div className="note mt">
      <h3>Payments Status</h3>
      <div className="detailGrid">
        <p><b>Total Payables Paid:</b> {money(summary.payablePaid)}</p>
        <p><b>Total Payables Remaining:</b> {money(summary.payableRemaining)}</p>
        <p><b>Customer Collected:</b> {money(summary.receivablePaid)}</p>
        <p><b>Customer Remaining:</b> {money(summary.receivableRemaining)}</p>
      </div>
      {rows.map((row) => (
        <div className="transportLine" key={row.type}>
          <span>{row.label} — Due {money(row.due)} / Paid {money(row.paid)} / Remaining {money(row.remaining)}</span>
          <b>{getPaymentStatusLabel(shipment, row.type, exchangeRate)}</b>
        </div>
      ))}
    </div>
  );
}

export function ReceivablesList({ shipments, exchangeRate, canManagePayments, deletePayment, onOpen }) {
  const rows = shipments.map((shipment) => ({
    shipment,
    summary: getPaymentSummary(shipment, exchangeRate),
    receipts: getPayments(shipment).filter((payment) => payment.purchaseType === "Customer Receipt"),
  }));

  const totals = rows.reduce(
    (acc, row) => {
      acc.invoice += row.summary.receivableDue;
      acc.collected += row.summary.receivablePaid;
      acc.remaining += row.summary.receivableRemaining;
      return acc;
    },
    { invoice: 0, collected: 0, remaining: 0 }
  );

  return (
    <div className="stackList">
      <h3>Customer Receivables</h3>
      <div className="detailGrid">
        <p><b>Invoice Total:</b> {money(totals.invoice)}</p>
        <p><b>Collected:</b> {money(totals.collected)}</p>
        <p><b>Remaining:</b> {money(totals.remaining)}</p>
      </div>
      {rows.map(({ shipment, summary, receipts }) => (
        <div className="note" key={`receivable-${shipment.id}`}>
          <div className="panelHead">
            <div>
              <h3>{shipment.bookingNo && shipment.bookingNo !== "Not set" ? shipment.bookingNo : shipment.id}</h3>
              <p>{shipment.customer} — {shipment.pol} → {shipment.pod}</p>
            </div>
            <button className="ghostBtn" onClick={() => onOpen(shipment)}>Open</button>
          </div>
          <div className="detailGrid">
            <p><b>Invoice Amount:</b> {money(summary.receivableDue)}</p>
            <p><b>Collected:</b> {money(summary.receivablePaid)}</p>
            <p><b>Remaining:</b> {money(summary.receivableRemaining)}</p>
            <p><b>Status:</b> {getPaymentStatusLabel(shipment, "Customer Receipt", exchangeRate)}</p>
          </div>
          {receipts.length === 0 && <p>No customer collections yet.</p>}
          {receipts.map((payment) => (
            <div className="transportLine" key={payment.id}>
              <span>{payment.paidDate} — {money(payment.amount, payment.currency)} — {payment.note || "No note"}</span>
              <div className="actions">
                <button className="ghostBtn" onClick={() => generateReceiptPdf(shipment, payment, exchangeRate)}>Generate Receipt</button>
                {canManagePayments && <button className="dangerBtn" onClick={() => deletePayment(shipment.id, payment.id)}>Delete</button>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function PaymentsList({ shipments, exchangeRate, canManagePayments, deletePayment, onEdit, onOpen }) {
  return (
    <div className="note">
      <h3>Payments Overview</h3>
      <div className="miniList">
        {shipments.map((shipment) => {
          const summary = getPaymentSummary(shipment, exchangeRate);
          return (
            <div className="miniCard" key={shipment.id}>
              <b>{shipment.id} - {shipment.customer}</b>
              <p>Payables paid: {money(summary.payablePaid)} / remaining: {money(summary.payableRemaining)}</p>
              <p>Customer collected: {money(summary.receivablePaid)} / remaining: {money(summary.receivableRemaining)}</p>
              <div className="actions mt">
                <button className="ghostBtn" onClick={() => onOpen(shipment)}>Open Shipment</button>
              </div>
              {getPayments(shipment).length === 0 && <p>No payment records.</p>}
              {getPayments(shipment).map((payment) => (
                <div className="transportLine" key={payment.id}>
                  <span>{payment.paidDate} - {payment.purchaseType} - {payment.company || "No company"} - {money(payment.amount, payment.currency || "USD")}</span>
                  {canManagePayments && (
                    <div className="actions">
                      {payment.purchaseType !== "Customer Receipt" && <button className="ghostBtn" onClick={() => onEdit(shipment.id, payment)}>Edit</button>}
                      <button className="dangerBtn" onClick={() => deletePayment(shipment.id, payment.id)}>Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TransportList({ shipments, deleteTransport, canSeeFinance }) {
  return (
    <div className="note">
      <h3>Transport Costs by Shipment</h3>
      <div className="miniList">
        {shipments.map((s) => (
          <div className="miniCard" key={s.id}>
            <b>{s.id} - {s.customer}</b>
            <p>Total: {canSeeFinance ? money(calcTransportTry(s), "TRY") : "Hidden"} / {getTransports(s).length} records</p>
            {getTransports(s).map((t, index) => (
              <div className="transportLine" key={`${s.id}-transport-${index}`}>
                <span>{t.company} - Trucks: {t.truckQty || 1} - VAT: {t.taxRate || 0}% - {canSeeFinance ? money(calcSingleTransportTry(t), "TRY") : "Hidden"}</span>
                <button className="dangerBtn" onClick={() => deleteTransport(s.id, index)}>Delete</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExpenseList({ shipments, deleteExpense, canEditCore }) {
  return (
    <div className="note">
      <h3>Expenses by Shipment</h3>
      <div className="miniList">
        {shipments.map((s) => (
          <div className="miniCard" key={s.id}>
            <b>{s.id} - {s.customer}</b>
            <p>Total expenses: {money(calcExpensesUsd(s))}</p>
            {getExpenses(s).map((e, index) => (
              <div className="transportLine" key={`${s.id}-expense-${index}`}>
                <span>{e.company || "No company"} - {e.type}: {e.description || "No description"} - {money(e.amountUsd)}</span>
                {canEditCore && <button className="dangerBtn" onClick={() => deleteExpense(s.id, index)}>Delete</button>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
