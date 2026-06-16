import { useState } from "react";
import { Card, DashboardCharts, FormField, ProfitCard, ShipmentCard } from "../components/freightComponents";
import { getDaysLeft, getMissingDocumentTypes, getShipmentFinancialLedger, money } from "../utils/freight";

function MetricIcon({ type }) {
  const common = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2" };
  const icons = {
    shipment: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M4 15h16l-2 4H6l-2-4Z" />
        <path {...common} d="M7 15V8h10v7" />
        <path {...common} d="M9 8V5h6v3" />
        <path {...common} d="M8 12h2M12 12h2M16 12h1" />
      </svg>
    ),
    container: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M3 7h18v11H3z" />
        <path {...common} d="M7 7v11M11 7v11M15 7v11M19 7v11" />
        <path {...common} d="M5 5h14" />
      </svg>
    ),
    partial: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M4 8h7v7H4zM13 5h7v7h-7zM13 14h5v5h-5z" />
      </svg>
    ),
    task: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M8 6h12M8 12h12M8 18h12" />
        <path {...common} d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2" />
      </svg>
    ),
    alert: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M12 3 2.8 19h18.4L12 3Z" />
        <path {...common} d="M12 9v4M12 17h.01" />
      </svg>
    ),
    profit: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M4 17 9 12l4 4 7-8" />
        <path {...common} d="M15 8h5v5" />
        <path {...common} d="M5 21h14" />
      </svg>
    ),
    receivable: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M4 6h16v12H4z" />
        <path {...common} d="M4 9h16" />
        <path {...common} d="M8 14h5" />
      </svg>
    ),
    collected: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M12 3v18" />
        <path {...common} d="M16 7.5c-.7-1-2-1.5-3.5-1.5-2 0-3.5 1-3.5 2.5s1.2 2.1 3.7 2.7c2.4.6 3.8 1.3 3.8 3S15 18 12.6 18c-1.8 0-3.3-.6-4.2-1.8" />
      </svg>
    ),
    payable: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M4 7h16v13H4z" />
        <path {...common} d="M8 7V4h8v3" />
        <path {...common} d="M9 13h6M9 17h4" />
      </svg>
    ),
    paid: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M20 7 10 17l-5-5" />
        <path {...common} d="M4 20h16" />
      </svg>
    ),
    cash: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M4 8h16v10H4z" />
        <path {...common} d="M8 8V6h8v2" />
        <path {...common} d="M12 11v4M10 13h4" />
      </svg>
    ),
    invoice: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M7 3h10l2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5l2-2Z" />
        <path {...common} d="M9 8h6M9 12h6M9 16h4" />
      </svg>
    ),
  };

  return <span className="metricIcon">{icons[type] || icons.shipment}</span>;
}

function ActionList({ items, openShipmentDetails, limit }) {
  const visibleItems = typeof limit === "number" ? items.slice(0, limit) : items;

  return (
    <div className="actionList">
      {visibleItems.map((item) => (
        <button className={`actionItem ${item.severity}`} key={item.id} onClick={() => openShipmentDetails(item.shipment)}>
          <span className="actionSeverity">{item.severity.toUpperCase()}</span>
          <span className="actionBody">
            <span className="actionTopline">
              <b>{item.title}</b>
              <small>{item.type} | {item.meta}</small>
            </span>
            <span className="actionDetail">{item.detail}</span>
          </span>
          <span className="actionOpen">Open</span>
        </button>
      ))}
      {visibleItems.length === 0 && (
        <div className="emptyState">
          <b>No urgent actions right now.</b>
          <p>Overdue invoices, ETA follow-ups, arrived shipments, and loss alerts will appear here.</p>
        </div>
      )}
    </div>
  );
}

export function DashboardScreen({ totals, taskDashboard, canSeeFinance, notifications, clearNotifications, markNotificationRead, actionCenter, financialDashboard, cashPosition, monthlyFinancialDashboard, financialMonth, setFinancialMonth, dashboardCharts, shipments, activeFxRate, openShipmentDetails }) {
  const [dashboardTab, setDashboardTab] = useState("overview");
  const latestShipments = shipments.slice(0, 8);
  const customerFollowUps = shipments
    .map((shipment) => {
      const ledger = getShipmentFinancialLedger(shipment, activeFxRate);
      const etaDays = getDaysLeft(shipment.eta);
      const missingDocs = getMissingDocumentTypes(shipment);
      const reasons = [
        ledger.salesRemaining > 0.01 && `Open ${money(ledger.salesRemaining)}`,
        etaDays !== null && etaDays >= 0 && etaDays <= 5 && `ETA in ${etaDays} day(s)`,
        missingDocs.length > 0 && `${missingDocs.length} document(s) missing`,
      ].filter(Boolean);
      return { shipment, reasons };
    })
    .filter((item) => item.reasons.length)
    .slice(0, 8);

  return (
    <>
      <section className="stats">
        <Card icon={<MetricIcon type="shipment" />} title="Total Shipments" value={totals.shipments} />
        <Card icon={<MetricIcon type="container" />} title="FCL Containers" value={totals.fcl} />
        <Card icon={<MetricIcon type="partial" />} title="Partial Shipments" value={totals.lcl} />
        <Card icon={<MetricIcon type="task" />} title="Pending Tasks" value={taskDashboard.pending} />
        <Card icon={<MetricIcon type="alert" />} title="Due Soon / Overdue" value={`${taskDashboard.dueSoon} / ${taskDashboard.overdue}`} />
        <Card icon={<MetricIcon type="profit" />} title="Net Profit After Expenses" value={canSeeFinance ? money(totals.netProfit) : "-"} />
      </section>

      <div className="dashboardSubtabs">
        <button className={dashboardTab === "overview" ? "active" : ""} onClick={() => setDashboardTab("overview")}>Overview</button>
        <button className={dashboardTab === "actions" ? "active" : ""} onClick={() => setDashboardTab("actions")}>Actions <span>{actionCenter.length}</span></button>
        {canSeeFinance && <button className={dashboardTab === "finance" ? "active" : ""} onClick={() => setDashboardTab("finance")}>Finance</button>}
        <button className={dashboardTab === "shipments" ? "active" : ""} onClick={() => setDashboardTab("shipments")}>Shipments</button>
      </div>

      {dashboardTab === "overview" && (
        <section className="dashboardGrid">
          <div className="panel">
            <div className="panelHead">
              <div>
                <h2>Today Focus</h2>
                <p>The most important open actions that need attention.</p>
              </div>
              <button className="ghostBtn" onClick={() => setDashboardTab("actions")}>View Actions</button>
            </div>
            <ActionList items={actionCenter} openShipmentDetails={openShipmentDetails} limit={4} />
          </div>

          <div className="panel">
            <div className="panelHead">
              <div>
                <h2>Active Shipments</h2>
                <p>Latest shipments requiring operational visibility.</p>
              </div>
              <button className="ghostBtn" onClick={() => setDashboardTab("shipments")}>View All</button>
            </div>
            <div className="stackList">
              {latestShipments.slice(0, 4).map((shipment) => (
                <ShipmentCard key={shipment.id} shipment={shipment} exchangeRate={activeFxRate} canSeeFinance={canSeeFinance} onOpen={() => openShipmentDetails(shipment)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {dashboardTab === "actions" && (
        <>
          {notifications.length > 0 && (
            <section className="panel">
              <div className="panelHead">
                <div>
                  <h2>Notifications</h2>
                  <p>Recent reminders and email delivery results.</p>
                </div>
                <div className="actions">
                  <button className="ghostBtn" onClick={clearNotifications}>Clear</button>
                </div>
              </div>
              <div className="stackList">
                {notifications.slice(0, 5).map((item) => (
                  <div className="miniCard" key={item.id}>
                    <b>{item.title}</b>
                    <p>{item.message}</p>
                    <small>{new Date(item.createdAt).toLocaleString()}</small>
                    {!item.read && <div className="actions mt"><button className="ghostBtn" onClick={() => markNotificationRead(item.id)}>Mark read</button></div>}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="panel">
            <div className="panelHead">
              <div>
                <h2>Action Center</h2>
                <p>Urgent financial and operation follow-ups that need attention today.</p>
              </div>
              <span className="badge">{actionCenter.length} open</span>
            </div>
            <ActionList items={actionCenter} openShipmentDetails={openShipmentDetails} />
          </section>

          <section className="panel">
            <div className="panelHead">
              <div>
                <h2>Customer Follow-up Queue</h2>
                <p>Customer-facing files that need a message or confirmation.</p>
              </div>
              <span className="badge">{customerFollowUps.length} open</span>
            </div>
            <div className="actionList">
              {customerFollowUps.map(({ shipment, reasons }) => (
                <button className="actionItem medium" key={shipment.id} onClick={() => openShipmentDetails(shipment)}>
                  <span className="actionSeverity">CLIENT</span>
                  <span className="actionBody">
                    <span className="actionTopline">
                      <b>{shipment.customer || "Customer"}</b>
                      <small>{shipment.id} | {shipment.pol} - {shipment.pod}</small>
                    </span>
                    <span className="actionDetail">{reasons.join(" | ")}</span>
                  </span>
                  <span className="actionOpen">Open</span>
                </button>
              ))}
              {customerFollowUps.length === 0 && <div className="emptyState"><b>No customer follow-ups.</b><p>Open payments, close ETA files, and missing documents will appear here.</p></div>}
            </div>
          </section>
        </>
      )}

      {dashboardTab === "finance" && canSeeFinance && (
        <>
          <section className="stats">
            <Card icon={<MetricIcon type="receivable" />} title="Customer Receivables" value={money(financialDashboard.customerRemaining)} />
            <Card icon={<MetricIcon type="collected" />} title="Collected From Clients" value={money(financialDashboard.customerCollected)} />
            <Card icon={<MetricIcon type="payable" />} title="Supplier Payables" value={money(financialDashboard.supplierPayables)} />
            <Card icon={<MetricIcon type="paid" />} title="Paid To Suppliers" value={money(financialDashboard.supplierPaid)} />
            <Card icon={<MetricIcon type="cash" />} title="Cash Position" value={money(cashPosition)} />
          </section>
          <section className="panel">
            <div className="panelHead">
              <div>
                <h2>Monthly Financial Dashboard</h2>
                <p>Sales, purchases, expected profit, and cash movement by shipment entry month.</p>
              </div>
              <FormField label="Month">
                <input type="month" value={financialMonth} onChange={(event) => setFinancialMonth(event.target.value)} />
              </FormField>
            </div>
            <section className="stats compactStats">
              <Card icon={<MetricIcon type="invoice" />} title="Sales Invoices" value={money(monthlyFinancialDashboard.sales)} />
              <Card icon={<MetricIcon type="payable" />} title="Purchase Invoices" value={money(monthlyFinancialDashboard.purchases)} />
              <Card icon={<MetricIcon type="profit" />} title="Expected Profit" value={money(monthlyFinancialDashboard.expectedProfit)} />
              <Card icon={<MetricIcon type="cash" />} title="Cash Position" value={money(monthlyFinancialDashboard.cashIn - monthlyFinancialDashboard.cashOut)} />
            </section>
            <div className="detailGrid">
              <p><b>Shipments:</b> {monthlyFinancialDashboard.shipments}</p>
              <p><b>Cash In:</b> {money(monthlyFinancialDashboard.cashIn)}</p>
              <p><b>Cash Out:</b> {money(monthlyFinancialDashboard.cashOut)}</p>
              <p><b>Customer Remaining:</b> {money(monthlyFinancialDashboard.receivableRemaining)}</p>
              <p><b>Supplier Remaining:</b> {money(monthlyFinancialDashboard.payableRemaining)}</p>
            </div>
          </section>
          <DashboardCharts charts={dashboardCharts} />
        </>
      )}

      {dashboardTab === "shipments" && (
        <section className="dashboardGrid">
          <div className="panel">
            <h2>Active Shipments</h2>
            <div className="stackList">
              {latestShipments.map((shipment) => (
                <ShipmentCard key={shipment.id} shipment={shipment} exchangeRate={activeFxRate} canSeeFinance={canSeeFinance} onOpen={() => openShipmentDetails(shipment)} />
              ))}
            </div>
          </div>

          {canSeeFinance && (
            <div className="panel">
              <h2>Profit Summary</h2>
              <div className="stackList">
                {latestShipments.map((shipment) => (
                  <ProfitCard key={shipment.id} shipment={shipment} exchangeRate={activeFxRate} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}
