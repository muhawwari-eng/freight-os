import { useState } from "react";
import { Card, DashboardCharts, FormField, ProfitCard, ShipmentCard } from "../components/freightComponents";
import { money } from "../utils/freight";

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

  return (
    <>
      <section className="stats">
        <Card icon="S" title="Total Shipments" value={totals.shipments} />
        <Card icon="F" title="FCL Containers" value={totals.fcl} />
        <Card icon="P" title="Partial Shipments" value={totals.lcl} />
        <Card icon="T" title="Pending Tasks" value={taskDashboard.pending} />
        <Card icon="!" title="Due Soon / Overdue" value={`${taskDashboard.dueSoon} / ${taskDashboard.overdue}`} />
        <Card icon="$" title="Net Profit After Expenses" value={canSeeFinance ? money(totals.netProfit) : "-"} />
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
        </>
      )}

      {dashboardTab === "finance" && canSeeFinance && (
        <>
          <section className="stats">
            <Card icon="$" title="Customer Receivables" value={money(financialDashboard.customerRemaining)} />
            <Card icon="$" title="Collected From Clients" value={money(financialDashboard.customerCollected)} />
            <Card icon="$" title="Supplier Payables" value={money(financialDashboard.supplierPayables)} />
            <Card icon="$" title="Paid To Suppliers" value={money(financialDashboard.supplierPaid)} />
            <Card icon="$" title="Cash Position" value={money(cashPosition)} />
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
              <Card icon="$" title="Sales Invoices" value={money(monthlyFinancialDashboard.sales)} />
              <Card icon="$" title="Purchase Invoices" value={money(monthlyFinancialDashboard.purchases)} />
              <Card icon="$" title="Expected Profit" value={money(monthlyFinancialDashboard.expectedProfit)} />
              <Card icon="$" title="Cash Position" value={money(monthlyFinancialDashboard.cashIn - monthlyFinancialDashboard.cashOut)} />
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
