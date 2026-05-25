import { Card, CustomerSelect, FormField } from "../components/freightComponents";
import { calcNetProfit, calcOceanSell, calcTotalCostUsd, getDateRangeLabel, getShipmentReportDate, money } from "../utils/freight";

export function ReportsScreen({ reportFromDate, setReportFromDate, reportToDate, setReportToDate, canSeeFinance, exportDetailedReportExcel, exportDetailedReportPdf, reportData, clientReportCustomer, customers, setClientReportCustomer, exportClientReportExcel, exportClientReportPdf, openShipmentDetails, activeFxRate, createBackup, downloadLocalBackup, importLocalBackup, role, resetDemoData }) {
  return (
          <section className="panel">
            <div className="panelHead">
              <div>
                <h2>Detailed Reports</h2>
                <p>Reports are based on the shipment entry date. Select From / To dates, or leave them empty for all dates. Old shipments use their available saved date as fallback.</p>
              </div>
              <div className="actions">
                <FormField label="From Date">
                  <input type="date" value={reportFromDate} onChange={(e) => setReportFromDate(e.target.value)} />
                </FormField>
                <FormField label="To Date">
                  <input type="date" value={reportToDate} onChange={(e) => setReportToDate(e.target.value)} />
                </FormField>
                <button className="ghostBtn" onClick={() => { setReportFromDate(""); setReportToDate(""); }}>All Dates</button>
                {canSeeFinance && <button className="saveBtn" onClick={exportDetailedReportExcel}>Export Detailed Excel</button>}
                {canSeeFinance && <button className="ghostBtn" onClick={exportDetailedReportPdf}>Export Detailed PDF</button>}
              </div>
            </div>

            <h3>{getDateRangeLabel(reportFromDate, reportToDate)} Summary</h3>
            <section className="stats">
              <Card icon="📋" title="Shipments" value={reportData.summary.shipments} />
              <Card icon="📦" title="Units / Containers" value={reportData.summary.containers} />
              <Card icon="💵" title="Revenue" value={canSeeFinance ? money(reportData.summary.revenue) : "—"} />
              <Card icon="✅" title="Net Profit" value={canSeeFinance ? money(reportData.summary.netProfit) : "—"} />
            </section>

            {canSeeFinance && (
              <div className="detailGrid">
                <p><b>Total Costs:</b> {money(reportData.summary.costs)}</p>
                <p><b>Gross Profit:</b> {money(reportData.summary.grossProfit)}</p>
                <p><b>Total Expenses:</b> {money(reportData.summary.expenses)}</p>
                <p><b>Net Profit:</b> {money(reportData.summary.netProfit)}</p>
              </div>
            )}

            <div className="twoCols mt">
              <div className="note">
                <h3>Profit by Customer</h3>
                {reportData.customers.length === 0 && <p>No customer data for this date range.</p>}
                {reportData.customers.map((row) => (
                  <div className="transportLine" key={row.name}>
                    <span>{row.name} — {row.shipments} shipments</span>
                    <b>{canSeeFinance ? money(row.netProfit) : "—"}</b>
                  </div>
                ))}
              </div>

              <div className="note">
                <h3>Expenses by Company</h3>
                {reportData.expenseCompanies.length === 0 && <p>No expenses for this date range.</p>}
                {reportData.expenseCompanies.map((row) => (
                  <div className="transportLine" key={row.company}>
                    <span>{row.company} — {row.count} expenses</span>
                    <b>{money(row.amountUsd)}</b>
                  </div>
                ))}
              </div>
            </div>

            <div className="note mt">
              <div className="panelHead">
                <div>
                  <h3>Client Shipment Report</h3>
                  <p className="smallText">Customer-facing report: no buy costs, no internal expenses, and no profit.</p>
                </div>
                <div className="actions">
                  <FormField label="Client">
                    <CustomerSelect value={clientReportCustomer} customers={[{ id: "all", name: "all" }, ...customers]} onChange={setClientReportCustomer} />
                  </FormField>
                  <button className="saveBtn" onClick={exportClientReportExcel}>Export Client Excel</button>
                  <button className="ghostBtn" onClick={exportClientReportPdf}>Export Client PDF</button>
                </div>
              </div>
            </div>

            <div className="tableWrap mt">
              <table>
                <thead>
                  <tr>
                    <th>Entry Date</th>
                    <th>Shipment</th>
                    <th>Customer</th>
                    <th>Company</th>
                    <th>Route</th>
                    <th>Status</th>
                    {canSeeFinance && <th>Revenue</th>}
                    {canSeeFinance && <th>Costs</th>}
                    {canSeeFinance && <th>Net</th>}
                  </tr>
                </thead>
                <tbody>
                  {reportData.shipments.map((s) => (
                    <tr key={s.id} onClick={() => openShipmentDetails(s)}>
                      <td>{getShipmentReportDate(s) ? new Date(getShipmentReportDate(s)).toISOString().slice(0, 10) : "Not set"}</td>
                      <td>{s.id}</td>
                      <td>{s.customer}</td>
                      <td>{s.line}</td>
                      <td>{s.pol} → {s.pod}</td>
                      <td><span className="badge">{s.status}</span></td>
                      {canSeeFinance && <td>{money(calcOceanSell(s))}</td>}
                      {canSeeFinance && <td>{money(calcTotalCostUsd(s, activeFxRate))}</td>}
                      {canSeeFinance && <td><b>{money(calcNetProfit(s, activeFxRate))}</b></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="actions mt">
              {canSeeFinance && <button className="saveBtn" onClick={() => createBackup(true)}>Create Manual Backup</button>}
              <button className="ghostBtn" onClick={downloadLocalBackup}>Download Local Backup</button>
              <label className="ghostBtn" style={{ display: "inline-block" }}>
                Import Local Backup
                <input type="file" accept="application/json,.json" onChange={importLocalBackup} style={{ display: "none" }} />
              </label>
              {role === "admin" && <button className="dangerBtn" onClick={resetDemoData}>Reset Demo Data</button>}
            </div>
          </section>

  );
}
