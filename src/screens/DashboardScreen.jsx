import { Card, DashboardCharts, ProfitCard, ShipmentCard } from "../components/freightComponents";
import { money } from "../utils/freight";

export function DashboardScreen({ totals, taskDashboard, canSeeFinance, notifications, clearNotifications, markNotificationRead, financialDashboard, cashPosition, dashboardCharts, shipments, activeFxRate, openShipmentDetails }) {
  return (
          <>
            <section className="stats">
              <Card icon="📋" title="Total Shipments" value={totals.shipments} />
              <Card icon="🟦" title="FCL Containers" value={totals.fcl} />
              <Card icon="🟨" title="Partial Shipments" value={totals.lcl} />
              <Card icon="⏰" title="Pending Tasks" value={taskDashboard.pending} />
              <Card icon="⚠️" title="Due Soon / Overdue" value={`${taskDashboard.dueSoon} / ${taskDashboard.overdue}`} />
              <Card icon="💵" title="Net Profit After Expenses" value={canSeeFinance ? money(totals.netProfit) : "—"} />
            </section>

            {notifications.length > 0 && (
              <section className="panel">
                <div className="panelHead">
                  <div>
                    <h2>🔔 Notifications</h2>
                    <p>Recent reminders and email delivery results.</p>
                  </div>
                  <div className="actions">
                    <button className="ghostBtn" onClick={clearNotifications}>Clear</button>
                  </div>
                </div>
                <div className="stackList">
                  {notifications.slice(0, 5).map((item) => (
                    <div className="miniCard" key={item.id}>
                      <b>{item.type === "error" ? "🚨" : item.type === "warning" ? "⚠️" : item.type === "success" ? "✅" : "ℹ️"} {item.title}</b>
                      <p>{item.message}</p>
                      <small>{new Date(item.createdAt).toLocaleString()}</small>
                      {!item.read && <div className="actions mt"><button className="ghostBtn" onClick={() => markNotificationRead(item.id)}>Mark read</button></div>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {canSeeFinance && (
              <>
                <section className="stats">
                  <Card icon="🧾" title="Customer Receivables" value={money(financialDashboard.customerRemaining)} />
                  <Card icon="💰" title="Collected From Clients" value={money(financialDashboard.customerCollected)} />
                  <Card icon="🏢" title="Supplier Payables" value={money(financialDashboard.supplierPayables)} />
                  <Card icon="✅" title="Paid To Suppliers" value={money(financialDashboard.supplierPaid)} />
                  <Card icon="🧮" title="Cash Position" value={money(cashPosition)} />
                </section>
                <DashboardCharts charts={dashboardCharts} />
              </>
            )}

            <section className="dashboardGrid">
              <div className="panel">
                <h2>🚢 Active Shipments</h2>
                <div className="stackList">
                  {shipments.map((s) => (
                    <ShipmentCard key={s.id} shipment={s} exchangeRate={activeFxRate} canSeeFinance={canSeeFinance} onOpen={() => openShipmentDetails(s)} />
                  ))}
                </div>
              </div>

              {canSeeFinance && (
                <div className="panel">
                  <h2>💰 Profit Summary</h2>
                  <div className="stackList">
                    {shipments.map((s) => (
                      <ProfitCard key={s.id} shipment={s} exchangeRate={activeFxRate} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>

  );
}
