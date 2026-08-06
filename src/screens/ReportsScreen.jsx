import { useMemo, useState } from "react";
import { Card, CustomerSelect, FormField, SupplierSelect } from "../components/freightComponents";
import { calcNetProfit, calcSalesUsd, calcTotalCostUsd, getDateRangeLabel, getPayments, getShipmentFinancialLedger, getShipmentPaymentStatus, getShipmentReportDate, isDateInRange, money, paymentAmountUsd } from "../utils/freight";

function ReportTable({ columns, rows, emptyText, onRowClick }) {
  return (
    <div className="tableWrap reportTableWrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} onClick={() => onRowClick?.(row)}>
              {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={columns.length}>{emptyText}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function ReportSection({ title, children, actions }) {
  return (
    <div className="reportSection">
      <div className="reportSectionHead">
        <h3>{title}</h3>
        {actions && <div className="actions">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function ReportsScreen({ shipments, reportFromDate, setReportFromDate, reportToDate, setReportToDate, canSeeFinance, exportDetailedReportExcel, exportDetailedReportPdf, reportData, clientReportCustomer, customers, customerStatementOptions, setClientReportCustomer, customerStatement, supplierReportSupplier, suppliers, setSupplierReportSupplier, supplierStatement, agingReport, partnerStats, exportClientReportExcel, exportClientReportPdf, exportSupplierReportExcel, exportSupplierReportPdf, openShipmentDetails, activeFxRate, createBackup, downloadLocalBackup, importLocalBackup, role, resetDemoData }) {
  const [reportView, setReportView] = useState(canSeeFinance ? "customer" : "shipments");
  const rangeLabel = getDateRangeLabel(reportFromDate, reportToDate);

  const invoiceRows = useMemo(() => {
    return shipments.flatMap((shipment) => {
      const ledger = getShipmentFinancialLedger(shipment, activeFxRate);
      return ledger.rows
        .filter((invoice) => isDateInRange(invoice.invoiceDate || getShipmentReportDate(shipment), reportFromDate, reportToDate))
        .map((invoice) => ({
          id: `${shipment.id}-${invoice.id}`,
          shipment,
          invoice,
          flow: invoice.invoiceType === "Sale" ? "Customer" : "Supplier",
          party: invoice.party || (invoice.invoiceType === "Sale" ? shipment.customer : shipment.line) || "Not set",
          date: invoice.invoiceDate || getShipmentReportDate(shipment) || "Not set",
          route: `${shipment.pol || ""} - ${shipment.pod || ""}`,
        }));
    });
  }, [shipments, activeFxRate, reportFromDate, reportToDate]);

  const unpaidRows = useMemo(() => invoiceRows
    .filter((row) => row.invoice.remainingUsd > 0.01)
    .sort((left, right) => right.invoice.remainingUsd - left.invoice.remainingUsd), [invoiceRows]);

  const paymentRows = useMemo(() => {
    return shipments.flatMap((shipment) => getPayments(shipment)
      .filter((payment) => isDateInRange(payment.paidDate || getShipmentReportDate(shipment), reportFromDate, reportToDate))
      .map((payment) => {
        const amountUsd = paymentAmountUsd(payment, shipment, activeFxRate);
        const isCustomerReceipt = payment.purchaseType === "Customer Receipt";
        return {
          id: `${shipment.id}-${payment.id}`,
          shipment,
          payment,
          date: payment.paidDate || getShipmentReportDate(shipment) || "Not set",
          flow: isCustomerReceipt ? "In" : "Out",
          party: payment.company || (isCustomerReceipt ? shipment.customer : shipment.line) || "Not set",
          amountUsd,
        };
      }));
  }, [shipments, activeFxRate, reportFromDate, reportToDate]);

  const paymentSummary = useMemo(() => paymentRows.reduce((summary, row) => {
    if (row.flow === "In") summary.in += row.amountUsd;
    else summary.out += row.amountUsd;
    return summary;
  }, { in: 0, out: 0 }), [paymentRows]);

  const tabs = [
    canSeeFinance && { key: "customer", label: "Customer Statement", count: customerStatement.rows.length },
    canSeeFinance && { key: "supplier", label: "Supplier Statement", count: supplierStatement.rows.length },
    canSeeFinance && { key: "unpaid", label: "Unpaid", count: unpaidRows.length },
    canSeeFinance && { key: "payments", label: "Payments", count: paymentRows.length },
    canSeeFinance && { key: "profit", label: "Shipment Profit", count: reportData.shipments.length },
    { key: "shipments", label: "Shipment Details", count: reportData.shipments.length },
  ].filter(Boolean);

  const shipmentColumns = [
    { key: "date", label: "Date", render: ({ shipment }) => getShipmentReportDate(shipment) || "Not set" },
    { key: "shipment", label: "Shipment", render: ({ shipment }) => shipment.id },
    { key: "customer", label: "Customer", render: ({ shipment }) => shipment.customer || "Not set" },
    { key: "route", label: "Route", render: ({ shipment }) => `${shipment.pol || ""} - ${shipment.pod || ""}` },
    { key: "status", label: "Status", render: ({ shipment }) => <span className="badge">{shipment.status}</span> },
    { key: "payment", label: "Payment", render: ({ shipment }) => getShipmentPaymentStatus(shipment, activeFxRate) },
  ];

  const profitColumns = [
    ...shipmentColumns.slice(0, 5),
    { key: "revenue", label: "Sales", render: ({ shipment }) => money(calcSalesUsd(shipment, activeFxRate)) },
    { key: "costs", label: "Cost", render: ({ shipment }) => money(calcTotalCostUsd(shipment, activeFxRate)) },
    { key: "net", label: "Net Profit", render: ({ shipment }) => <b>{money(calcNetProfit(shipment, activeFxRate))}</b> },
  ];

  return (
    <section className="panel reportsWorkspace">
      <div className="reportsHeader">
        <div>
          <h2>Reports Center</h2>
          <p>{rangeLabel}</p>
        </div>
        <div className="reportsFilters">
          <FormField label="From"><input type="date" value={reportFromDate} onChange={(event) => setReportFromDate(event.target.value)} /></FormField>
          <FormField label="To"><input type="date" value={reportToDate} onChange={(event) => setReportToDate(event.target.value)} /></FormField>
          <button className="ghostBtn" onClick={() => { setReportFromDate(""); setReportToDate(""); }}>All Dates</button>
        </div>
      </div>

      {canSeeFinance && (
        <section className="stats compactStats">
          <Card icon="$" title="Customer Balance" value={money(customerStatement.remainingUsd)} />
          <Card icon="$" title="Supplier Payable" value={money(supplierStatement.remainingUsd)} />
          <Card icon="!" title="Unpaid Invoices" value={unpaidRows.length} />
          <Card icon="$" title="Net Profit" value={money(reportData.summary.netProfit)} />
        </section>
      )}

      <div className="reportTabs">
        {tabs.map((tab) => (
          <button key={tab.key} className={reportView === tab.key ? "active" : ""} onClick={() => setReportView(tab.key)}>
            <span>{tab.label}</span>
            <b>{tab.count}</b>
          </button>
        ))}
      </div>

      {reportView === "customer" && canSeeFinance && (
        <ReportSection
          title="Customer Statement"
          actions={<>
            <FormField label="Customer"><CustomerSelect value={clientReportCustomer} customers={[{ id: "all", name: "all" }, ...(customerStatementOptions || customers)]} onChange={setClientReportCustomer} /></FormField>
            <button className="saveBtn" onClick={exportClientReportExcel}>Excel</button>
            <button className="ghostBtn" onClick={exportClientReportPdf}>PDF</button>
          </>}
        >
          <section className="stats compactStats">
            <Card icon="#" title="Shipments" value={customerStatement.shipments} />
            <Card icon="$" title="Invoice Total" value={money(customerStatement.invoiceUsd)} />
            <Card icon="$" title="Collected" value={money(customerStatement.collectedUsd)} />
            <Card icon="$" title="Remaining" value={money(customerStatement.remainingUsd)} />
          </section>
          <ReportTable
            columns={[
              { key: "date", label: "Date", render: ({ shipment }) => getShipmentReportDate(shipment) || "Not set" },
              { key: "shipment", label: "Shipment", render: ({ shipment }) => shipment.id },
              { key: "customer", label: "Customer" },
              { key: "route", label: "Route", render: ({ shipment }) => `${shipment.pol || ""} - ${shipment.pod || ""}` },
              { key: "invoiceUsd", label: "Invoice", render: (row) => money(row.invoiceUsd) },
              { key: "collectedUsd", label: "Collected", render: (row) => money(row.collectedUsd) },
              { key: "remainingUsd", label: "Remaining", render: (row) => <b>{money(row.remainingUsd)}</b> },
              { key: "status", label: "Status", render: (row) => <span className="badge">{row.status}</span> },
            ]}
            rows={customerStatement.rows}
            emptyText="No customer statement movement found."
            onRowClick={(row) => openShipmentDetails(row.shipment)}
          />
        </ReportSection>
      )}

      {reportView === "supplier" && canSeeFinance && (
        <ReportSection
          title="Supplier Statement"
          actions={<>
            <FormField label="Supplier"><SupplierSelect value={supplierReportSupplier} suppliers={[{ id: "all", name: "all" }, ...suppliers]} onChange={setSupplierReportSupplier} /></FormField>
            <button className="saveBtn" onClick={exportSupplierReportExcel}>Excel</button>
            <button className="ghostBtn" onClick={exportSupplierReportPdf}>PDF</button>
          </>}
        >
          <section className="stats compactStats">
            <Card icon="#" title="Shipments" value={supplierStatement.shipments} />
            <Card icon="$" title="Purchase Total" value={money(supplierStatement.invoiceUsd)} />
            <Card icon="$" title="Paid" value={money(supplierStatement.paidUsd)} />
            <Card icon="$" title="Remaining" value={money(supplierStatement.remainingUsd)} />
          </section>
          <ReportTable
            columns={[
              { key: "date", label: "Date", render: (row) => row.invoice.invoiceDate || getShipmentReportDate(row.shipment) || "Not set" },
              { key: "supplier", label: "Supplier" },
              { key: "shipment", label: "Shipment", render: (row) => row.shipment.id },
              { key: "category", label: "Category", render: (row) => row.invoice.category || "Purchase" },
              { key: "invoiceUsd", label: "Invoice", render: (row) => money(row.invoiceUsd) },
              { key: "paidUsd", label: "Paid", render: (row) => money(row.paidUsd) },
              { key: "remainingUsd", label: "Remaining", render: (row) => <b>{money(row.remainingUsd)}</b> },
              { key: "status", label: "Status", render: (row) => <span className="badge">{row.status}</span> },
            ]}
            rows={supplierStatement.rows}
            emptyText="No supplier statement movement found."
            onRowClick={(row) => openShipmentDetails(row.shipment)}
          />
        </ReportSection>
      )}

      {reportView === "unpaid" && canSeeFinance && (
        <ReportSection title="Unpaid Invoices">
          <section className="stats compactStats">
            <Card icon="#" title="Open Invoices" value={unpaidRows.length} />
            <Card icon="$" title="Receivable" value={money(unpaidRows.filter((row) => row.invoice.invoiceType === "Sale").reduce((sum, row) => sum + row.invoice.remainingUsd, 0))} />
            <Card icon="$" title="Payable" value={money(unpaidRows.filter((row) => row.invoice.invoiceType === "Purchase").reduce((sum, row) => sum + row.invoice.remainingUsd, 0))} />
            <Card icon="$" title="Net Exposure" value={money(unpaidRows.reduce((sum, row) => sum + (row.invoice.invoiceType === "Sale" ? row.invoice.remainingUsd : -row.invoice.remainingUsd), 0))} />
          </section>
          <ReportTable
            columns={[
              { key: "date", label: "Invoice Date" },
              { key: "flow", label: "Type" },
              { key: "party", label: "Party" },
              { key: "shipment", label: "Shipment", render: (row) => row.shipment.id },
              { key: "invoiceNo", label: "Invoice No", render: (row) => row.invoice.invoiceNo || "Not set" },
              { key: "category", label: "Category", render: (row) => row.invoice.category || "-" },
              { key: "total", label: "Invoice", render: (row) => money(row.invoice.totalUsd) },
              { key: "paid", label: "Paid", render: (row) => money(row.invoice.paidUsd) },
              { key: "remaining", label: "Remaining", render: (row) => <b>{money(row.invoice.remainingUsd)}</b> },
            ]}
            rows={unpaidRows}
            emptyText="No unpaid invoices in this date range."
            onRowClick={(row) => openShipmentDetails(row.shipment)}
          />
        </ReportSection>
      )}

      {reportView === "payments" && canSeeFinance && (
        <ReportSection title="Payments">
          <section className="stats compactStats">
            <Card icon="$" title="Collected" value={money(paymentSummary.in)} />
            <Card icon="$" title="Paid Out" value={money(paymentSummary.out)} />
            <Card icon="$" title="Cash Net" value={money(paymentSummary.in - paymentSummary.out)} />
            <Card icon="#" title="Payments" value={paymentRows.length} />
          </section>
          <ReportTable
            columns={[
              { key: "date", label: "Date" },
              { key: "flow", label: "Flow", render: (row) => <span className={row.flow === "In" ? "badge" : "paymentBadge"}>{row.flow}</span> },
              { key: "party", label: "Party" },
              { key: "shipment", label: "Shipment", render: (row) => row.shipment.id },
              { key: "type", label: "Type", render: (row) => row.payment.purchaseType || "Payment" },
              { key: "amount", label: "Amount", render: (row) => money(Number(row.payment.amount || 0), row.payment.currency || "USD") },
              { key: "usd", label: "USD", render: (row) => <b>{money(row.amountUsd)}</b> },
              { key: "note", label: "Note", render: (row) => row.payment.note || "-" },
            ]}
            rows={paymentRows}
            emptyText="No payments in this date range."
            onRowClick={(row) => openShipmentDetails(row.shipment)}
          />
        </ReportSection>
      )}

      {reportView === "profit" && canSeeFinance && (
        <ReportSection
          title="Shipment Profit"
          actions={<><button className="saveBtn" onClick={exportDetailedReportExcel}>Excel</button><button className="ghostBtn" onClick={exportDetailedReportPdf}>PDF</button></>}
        >
          <section className="stats compactStats">
            <Card icon="#" title="Shipments" value={reportData.summary.shipments} />
            <Card icon="$" title="Sales" value={money(reportData.summary.revenue)} />
            <Card icon="$" title="Costs" value={money(reportData.summary.costs)} />
            <Card icon="$" title="Net Profit" value={money(reportData.summary.netProfit)} />
          </section>
          <ReportTable
            columns={profitColumns}
            rows={reportData.shipments.map((shipment) => ({ id: shipment.id, shipment }))}
            emptyText="No shipments in this date range."
            onRowClick={(row) => openShipmentDetails(row.shipment)}
          />
        </ReportSection>
      )}

      {reportView === "shipments" && (
        <ReportSection title="Shipment Details">
          <ReportTable
            columns={shipmentColumns}
            rows={reportData.shipments.map((shipment) => ({ id: shipment.id, shipment }))}
            emptyText="No shipments in this date range."
            onRowClick={(row) => openShipmentDetails(row.shipment)}
          />
        </ReportSection>
      )}

      {canSeeFinance && reportView === "customer" && (
        <div className="reportInsights">
          {(partnerStats?.customers || []).slice(0, 5).map((row) => <span key={row.name}>{row.name}: {money(row.revenue)}</span>)}
        </div>
      )}

      {canSeeFinance && reportView === "supplier" && agingReport && (
        <div className="reportInsights">
          <span>Receivables aging: {money(agingReport.receivables.total)}</span>
          <span>Payables aging: {money(agingReport.payables.total)}</span>
        </div>
      )}

      <div className="reportUtilityBar">
        {canSeeFinance && <button className="saveBtn" onClick={() => createBackup(true)}>Create Manual Backup</button>}
        <button className="ghostBtn" onClick={downloadLocalBackup}>Download Local Backup</button>
        <label className="ghostBtn reportUpload">
          Import Local Backup
          <input type="file" accept="application/json,.json" onChange={importLocalBackup} />
        </label>
        {role === "admin" && <button className="dangerBtn" onClick={resetDemoData}>Reset Demo Data</button>}
      </div>
    </section>
  );
}
