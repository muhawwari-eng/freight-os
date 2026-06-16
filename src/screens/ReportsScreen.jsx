import { Card, CustomerSelect, FormField } from "../components/freightComponents";
import { calcNetProfit, calcOceanSell, calcTotalCostUsd, getDateRangeLabel, getShipmentReportDate, money } from "../utils/freight";

export function ReportsScreen({ reportFromDate, setReportFromDate, reportToDate, setReportToDate, canSeeFinance, exportDetailedReportExcel, exportDetailedReportPdf, reportData, clientReportCustomer, customers, setClientReportCustomer, customerStatement, agingReport, partnerStats, exportClientReportExcel, exportClientReportPdf, openShipmentDetails, activeFxRate, createBackup, downloadLocalBackup, importLocalBackup, role, resetDemoData }) {
  return (
    <section className="panel">
      <div className="panelHead">
        <div>
          <h2>Detailed Reports</h2>
          <p>Reports are based on shipment entry date. Select From / To dates, or leave them empty for all dates.</p>
        </div>
        <div className="actions">
          <FormField label="From Date"><input type="date" value={reportFromDate} onChange={(e) => setReportFromDate(e.target.value)} /></FormField>
          <FormField label="To Date"><input type="date" value={reportToDate} onChange={(e) => setReportToDate(e.target.value)} /></FormField>
          <button className="ghostBtn" onClick={() => { setReportFromDate(""); setReportToDate(""); }}>All Dates</button>
          {canSeeFinance && <button className="saveBtn" onClick={exportDetailedReportExcel}>Export Detailed Excel</button>}
          {canSeeFinance && <button className="ghostBtn" onClick={exportDetailedReportPdf}>Export Detailed PDF</button>}
        </div>
      </div>

      <h3>{getDateRangeLabel(reportFromDate, reportToDate)} Summary</h3>
      <section className="stats">
        <Card icon="S" title="Shipments" value={reportData.summary.shipments} />
        <Card icon="U" title="Units / Containers" value={reportData.summary.containers} />
        <Card icon="$" title="Revenue" value={canSeeFinance ? money(reportData.summary.revenue) : "-"} />
        <Card icon="P" title="Net Profit" value={canSeeFinance ? money(reportData.summary.netProfit) : "-"} />
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
          <h3>Customer Statistics</h3>
          {(partnerStats?.customers || []).length === 0 && <p>No customer data for this date range.</p>}
          {(partnerStats?.customers || []).map((row) => (
            <div className="transportLine" key={row.name}>
              <span>{row.name} - {row.shipments} shipments | Sales {money(row.revenue)}</span>
              <b>{canSeeFinance ? money(row.profit) : "-"}</b>
            </div>
          ))}
        </div>

        <div className="note">
          <h3>Supplier Statistics</h3>
          {(partnerStats?.suppliers || []).length === 0 && <p>No supplier data for this date range.</p>}
          {(partnerStats?.suppliers || []).map((row) => (
            <div className="transportLine" key={row.name}>
              <span>{row.name} - {row.shipments} shipments</span>
              <b>{money(row.cost)}</b>
            </div>
          ))}
        </div>
      </div>

      {canSeeFinance && agingReport && (
        <div className="note mt">
          <h3>Aging Report</h3>
          <div className="agingGrid">
            {["receivables", "payables"].map((section) => (
              <div className="agingBox" key={section}>
                <h4>{section === "receivables" ? "Customer Receivables" : "Supplier Payables"}</h4>
                {["0-30", "31-60", "61-90", "90+"].map((bucket) => (
                  <p key={bucket}><b>{bucket} days:</b> {money(agingReport[section][bucket])}</p>
                ))}
                <p><b>Total:</b> {money(agingReport[section].total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="note mt">
        <div className="panelHead">
          <div>
            <h3>Customer Statement</h3>
            <p className="smallText">Customer-facing statement with shipment totals, invoices, collected amounts, and balances.</p>
          </div>
          <div className="actions">
            <FormField label="Client">
              <CustomerSelect value={clientReportCustomer} customers={[{ id: "all", name: "all" }, ...customers]} onChange={setClientReportCustomer} />
            </FormField>
            <button className="saveBtn" onClick={exportClientReportExcel}>Export Statement Excel</button>
            <button className="ghostBtn" onClick={exportClientReportPdf}>Export Statement PDF</button>
          </div>
        </div>
        <section className="stats compactStats">
          <Card icon="#" title="Statement Shipments" value={customerStatement.shipments} />
          <Card icon="$" title="Invoice Total" value={money(customerStatement.invoiceUsd)} />
          <Card icon="$" title="Collected" value={money(customerStatement.collectedUsd)} />
          <Card icon="$" title="Remaining" value={money(customerStatement.remainingUsd)} />
        </section>
        <div className="tableWrap mt">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Shipment</th>
                <th>Customer</th>
                <th>Route</th>
                <th>Status</th>
                <th>Invoice</th>
                <th>Collected</th>
                <th>Remaining</th>
                <th>Invoices / Payments</th>
              </tr>
            </thead>
            <tbody>
              {customerStatement.rows.map(({ shipment, invoiceUsd, collectedUsd, remainingUsd, status, invoices, payments }) => (
                <tr key={shipment.id} onClick={() => openShipmentDetails(shipment)}>
                  <td>{getShipmentReportDate(shipment) ? new Date(getShipmentReportDate(shipment)).toISOString().slice(0, 10) : "Not set"}</td>
                  <td>{shipment.id}</td>
                  <td>{shipment.customer}</td>
                  <td>{shipment.pol} - {shipment.pod}</td>
                  <td><span className="badge">{status}</span></td>
                  <td>{money(invoiceUsd)}</td>
                  <td>{money(collectedUsd)}</td>
                  <td><b>{money(remainingUsd)}</b></td>
                  <td>{invoices.length} invoice(s), {payments.length} payment(s)</td>
                </tr>
              ))}
              {customerStatement.rows.length === 0 && <tr><td colSpan="9">No shipments found for this customer and date range.</td></tr>}
            </tbody>
          </table>
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
            {reportData.shipments.map((shipment) => (
              <tr key={shipment.id} onClick={() => openShipmentDetails(shipment)}>
                <td>{getShipmentReportDate(shipment) ? new Date(getShipmentReportDate(shipment)).toISOString().slice(0, 10) : "Not set"}</td>
                <td>{shipment.id}</td>
                <td>{shipment.customer}</td>
                <td>{shipment.line}</td>
                <td>{shipment.pol} - {shipment.pod}</td>
                <td><span className="badge">{shipment.status}</span></td>
                {canSeeFinance && <td>{money(calcOceanSell(shipment))}</td>}
                {canSeeFinance && <td>{money(calcTotalCostUsd(shipment, activeFxRate))}</td>}
                {canSeeFinance && <td><b>{money(calcNetProfit(shipment, activeFxRate))}</b></td>}
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
