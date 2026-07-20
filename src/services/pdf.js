import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY_INFO, FSC_LOGO_DATA_URL } from "../data/defaults";
import { calcSalesUsd, financialInvoiceAmountUsd, getPaymentSummary, getShipmentBillableQty, getShipmentFinancialLedger, getShipmentLoadDescription, getShipmentUnitLabel, isAirShipment, isFclShipment, money, paymentAmountUsd, safeFileName } from "../utils/freight";

export function getInvoiceNumber(shipment) {
  const year = new Date().getFullYear();
  const match = String(shipment?.id || "").match(/^SHP-\d{4}-(\d+)$/);
  const number = match ? match[1] : String(Date.now()).slice(-6);
  return `INV-${year}-${String(number).padStart(3, "0")}`;
}

export function getContainerDescription(shipment) {
  if (isFclShipment(shipment)) return `${Number(shipment?.qty || 0)} x ${shipment?.containerType || "Container"}`;
  return getShipmentLoadDescription(shipment);
}

export function generateInvoicePdf(shipment, exchangeRate) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const invoiceNo = getInvoiceNumber(shipment);
  const invoiceDate = new Date().toISOString().slice(0, 10);
  const paymentSummary = getPaymentSummary(shipment, exchangeRate);
  const customerAmount = calcSalesUsd(shipment, exchangeRate);
  const billableQty = getShipmentBillableQty(shipment);
  const unitPrice = billableQty ? customerAmount / billableQty : customerAmount;
  const paidAmount = paymentSummary.receivablePaid;
  const remainingAmount = Math.max(customerAmount - paidAmount, 0);
  const paymentStatus = remainingAmount <= 0 ? "Paid" : paidAmount > 0 ? "Partially Paid" : "Unpaid";
  const bookingNo = shipment.bookingNo && shipment.bookingNo !== "Not set" ? shipment.bookingNo : "Not set";
  const routeText = `${shipment.pol || ""} to ${shipment.pod || ""}`;
  const containerText = getContainerDescription(shipment);

  const dark = [14, 18, 22];
  const text = [20, 24, 31];
  const muted = [90, 100, 112];
  const line = [210, 216, 224];
  const light = [248, 250, 252];

  const setRgb = (kind, color) => {
    if (kind === "fill") doc.setFillColor(color[0], color[1], color[2]);
    if (kind === "draw") doc.setDrawColor(color[0], color[1], color[2]);
    if (kind === "text") doc.setTextColor(color[0], color[1], color[2]);
  };

  // Page background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");

  // Header
  try {
    doc.addImage(FSC_LOGO_DATA_URL, "PNG", 13, 11, 36, 30);
  } catch (error) {
    console.warn("Logo could not be added to invoice:", error);
  }

  setRgb("draw", line);
  doc.setLineWidth(0.4);
  doc.line(55, 12, 55, 43);

  setRgb("text", text);
  doc.setFont(undefined, "bold");
  doc.setFontSize(24);
  doc.text(COMPANY_INFO.name, 61, 21);
  doc.setFont(undefined, "normal");
  doc.setFontSize(10);
  doc.text(COMPANY_INFO.address, 61, 29);
  doc.text(COMPANY_INFO.phone, 61, 36);

  doc.setFont(undefined, "bold");
  doc.setFontSize(28);
  doc.text("INVOICE", 195, 23, { align: "right" });
  setRgb("draw", line);
  setRgb("fill", [255, 255, 255]);
  doc.roundedRect(154, 29, 41, 10, 3, 3, "S");
  doc.setFontSize(11);
  doc.text(invoiceNo, 174.5, 36, { align: "center" });

  setRgb("draw", dark);
  doc.setLineWidth(0.45);
  doc.line(12, 52, 198, 52);

  // Bill to + invoice details
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  setRgb("text", text);
  doc.text("BILL TO", 20, 66);
  doc.setFontSize(15);
  doc.text(shipment.customer || "Customer", 20, 78);
  setRgb("draw", line);
  doc.setLineWidth(0.3);
  doc.line(20, 82, 84, 82);
  doc.setFont(undefined, "normal");
  doc.setFontSize(10);
  setRgb("text", muted);
  doc.text("Phone: -", 20, 94);
  doc.text("Email: -", 20, 103);
  doc.text("Address: -", 20, 112);

  setRgb("text", text);
  doc.setFont(undefined, "bold");
  doc.setFontSize(12);
  doc.text("INVOICE DETAILS", 122, 66);

  const details = [
    ["Invoice No.", invoiceNo],
    ["Invoice Date", invoiceDate],
    ["Booking No.", bookingNo],
    !isAirShipment(shipment) && ["Vessel", shipment.vessel || "Not set"],
    ["ETD", shipment.etd || "Not set"],
    ["ETA", shipment.eta || "Not set"],
  ].filter(Boolean);

  doc.setFont(undefined, "normal");
  doc.setFontSize(10);
  let detailY = 76;
  details.forEach(([label, value], index) => {
    if (label === "Booking No.") doc.setFont(undefined, "bold");
    else doc.setFont(undefined, "normal");
    doc.text(label, 122, detailY + index * 8);
    doc.text(":", 153, detailY + index * 8);
    doc.text(String(value), 160, detailY + index * 8);
  });

  doc.setFont(undefined, "normal");
  doc.text("Payment Status", 122, detailY + details.length * 8);
  doc.text(":", 153, detailY + details.length * 8);
  if (paymentStatus === "Unpaid") {
    setRgb("fill", dark);
    doc.roundedRect(160, detailY + details.length * 8 - 5, 20, 7, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, "bold");
    doc.setFontSize(8);
    doc.text("Unpaid", 170, detailY + details.length * 8, { align: "center" });
    setRgb("text", text);
    doc.setFontSize(10);
  } else {
    doc.setFont(undefined, "bold");
    doc.text(paymentStatus, 160, detailY + details.length * 8);
  }

  // Shipment summary cards
  const cardY = 128;
  setRgb("draw", line);
  setRgb("fill", [255, 255, 255]);
  doc.roundedRect(12, cardY, 186, 34, 3, 3, "S");
  const columns = [
    ["Cargo Type", shipment.cargoType || "FCL"],
    ["Route", `${shipment.pol || ""} - ${shipment.pod || ""}`],
    ["Load", containerText],
    !isAirShipment(shipment) && ["Vessel", shipment.vessel || "Not set"],
    ["Booking No", bookingNo],
  ].filter(Boolean);
  const colW = 186 / columns.length;
  columns.forEach(([label, value], i) => {
    const x = 12 + i * colW;
    if (i > 0) {
      setRgb("draw", line);
      doc.line(x, cardY + 5, x, cardY + 29);
    }
    setRgb("text", text);
    doc.setFont(undefined, "bold");
    doc.setFontSize(10);
    doc.text(label, x + colW / 2, cardY + 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(String(value), x + colW / 2, cardY + 25, { align: "center", maxWidth: colW - 4 });
  });

  // Item table
  autoTable(doc, {
    startY: 172,
    theme: "grid",
    margin: { left: 12, right: 12 },
    head: [["Description", "Qty", "Unit Price (USD)", "Total (USD)"]],
    body: [[
      `Freight service - ${routeText} port`,
      `${billableQty} ${getShipmentUnitLabel(shipment)}`,
      money(unitPrice),
      money(customerAmount),
    ]],
    columnStyles: {
      0: { cellWidth: 100 },
      1: { halign: "center", cellWidth: 26 },
      2: { halign: "right", cellWidth: 35 },
      3: { halign: "right", cellWidth: 35 },
    },
    styles: { fontSize: 10, cellPadding: 4, lineColor: [220, 226, 232], lineWidth: 0.25 },
    headStyles: { fillColor: dark, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 10 },
    bodyStyles: { fillColor: [255, 255, 255], textColor: text },
  });

  // Notes box
  const notesY = 225;
  setRgb("draw", line);
  setRgb("fill", [255, 255, 255]);
  doc.roundedRect(12, notesY, 88, 38, 2.5, 2.5, "S");
  setRgb("text", text);
  doc.setFont(undefined, "bold");
  doc.setFontSize(11);
  doc.text("Notes", 20, notesY + 9);
  setRgb("draw", line);
  doc.line(20, notesY + 14, 92, notesY + 14);
  doc.setFont(undefined, "normal");
  doc.setFontSize(9);
  doc.text("- All amounts are in USD", 20, notesY + 22);
  doc.text("- Payment is due upon receipt of this invoice", 20, notesY + 29);
  doc.text("- Thank you for your business", 20, notesY + 36);

  // Totals
  const totalX = 112;
  const totalY = 217;
  setRgb("draw", line);
  doc.line(totalX, totalY, 198, totalY);
  doc.setFont(undefined, "normal");
  doc.setFontSize(12);
  setRgb("text", text);
  doc.text("Subtotal", totalX + 4, totalY + 10);
  doc.text(money(customerAmount), 196, totalY + 10, { align: "right" });
  doc.text("Paid", totalX + 4, totalY + 21);
  doc.text(money(paidAmount), 196, totalY + 21, { align: "right" });
  setRgb("draw", dark);
  doc.setLineWidth(0.5);
  doc.line(totalX, totalY + 29, 198, totalY + 29);
  doc.setFont(undefined, "bold");
  doc.setFontSize(15);
  doc.text("Balance Due", totalX + 4, totalY + 40);
  doc.text(money(remainingAmount), 196, totalY + 40, { align: "right" });

  // Footer
  setRgb("draw", line);
  doc.setLineWidth(0.35);
  doc.line(12, 277, 198, 277);
  setRgb("fill", light);
  doc.roundedRect(12, 280, 186, 10, 1.5, 1.5, "F");
  setRgb("text", text);
  doc.setFont(undefined, "bold");
  doc.setFontSize(9);
  doc.text(COMPANY_INFO.name, 62, 287, { align: "center" });
  doc.text(COMPANY_INFO.phone, 105, 287, { align: "center" });
  doc.text(COMPANY_INFO.address, 155, 287, { align: "center" });

  doc.save(`${invoiceNo}-${safeFileName(shipment.customer)}.pdf`);
}


export function getReceiptNumber(payment) {
  const year = new Date(payment?.paidDate || payment?.createdAt || Date.now()).getFullYear();
  const raw = String(payment?.id || Date.now());
  const match = raw.match(/PAY-(\d+)/);
  const number = match ? match[1].slice(-6) : raw.replace(/\D/g, "").slice(-6) || String(Date.now()).slice(-6);
  return `RCPT-${year}-${number.padStart(6, "0")}`;
}

export function generateReceiptPdf(shipment, payment, exchangeRate) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const receiptNo = getReceiptNumber(payment);
  const receiptDate = payment?.paidDate || new Date().toISOString().slice(0, 10);
  const bookingNo = shipment?.bookingNo && shipment.bookingNo !== "Not set" ? shipment.bookingNo : shipment?.id || "Not set";
  const routeText = `${shipment?.pol || ""} to ${shipment?.pod || ""}`;
  const paymentSummary = getPaymentSummary(shipment, exchangeRate);
  const collectedUsd = paymentAmountUsd(payment, shipment, exchangeRate);
  const invoiceAmount = calcSalesUsd(shipment, exchangeRate);
  const totalCollected = paymentSummary.receivablePaid;
  const remainingAmount = paymentSummary.receivableRemaining;

  const dark = [14, 18, 22];
  const text = [20, 24, 31];
  const muted = [90, 100, 112];
  const line = [210, 216, 224];
  const light = [248, 250, 252];

  const setRgb = (kind, color) => {
    if (kind === "fill") doc.setFillColor(color[0], color[1], color[2]);
    if (kind === "draw") doc.setDrawColor(color[0], color[1], color[2]);
    if (kind === "text") doc.setTextColor(color[0], color[1], color[2]);
  };

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");

  try {
    doc.addImage(FSC_LOGO_DATA_URL, "PNG", 13, 11, 36, 30);
  } catch (error) {
    console.warn("Logo could not be added to receipt:", error);
  }

  setRgb("draw", line);
  doc.setLineWidth(0.4);
  doc.line(55, 12, 55, 43);

  setRgb("text", text);
  doc.setFont(undefined, "bold");
  doc.setFontSize(24);
  doc.text(COMPANY_INFO.name, 61, 21);
  doc.setFont(undefined, "normal");
  doc.setFontSize(10);
  doc.text(COMPANY_INFO.address, 61, 29);
  doc.text(COMPANY_INFO.phone, 61, 36);

  doc.setFont(undefined, "bold");
  doc.setFontSize(25);
  doc.text("RECEIPT", 195, 23, { align: "right" });
  setRgb("draw", line);
  doc.roundedRect(151, 29, 44, 10, 3, 3, "S");
  doc.setFontSize(9);
  doc.text(receiptNo, 173, 36, { align: "center" });

  setRgb("draw", dark);
  doc.setLineWidth(0.45);
  doc.line(12, 52, 198, 52);

  doc.setFont(undefined, "bold");
  doc.setFontSize(12);
  setRgb("text", text);
  doc.text("RECEIVED FROM", 20, 66);
  doc.setFontSize(15);
  doc.text(shipment?.customer || "Customer", 20, 78);
  setRgb("draw", line);
  doc.setLineWidth(0.3);
  doc.line(20, 82, 92, 82);
  doc.setFont(undefined, "normal");
  doc.setFontSize(10);
  setRgb("text", muted);
  doc.text(`Booking No: ${bookingNo}`, 20, 94);
  doc.text(`Route: ${routeText}`, 20, 103);
  doc.text(`Shipment: ${shipment?.id || "Not set"}`, 20, 112);

  setRgb("text", text);
  doc.setFont(undefined, "bold");
  doc.setFontSize(12);
  doc.text("RECEIPT DETAILS", 122, 66);

  const details = [
    ["Receipt No.", receiptNo],
    ["Receipt Date", receiptDate],
    ["Currency", payment?.currency || "USD"],
    ["FX Rate", String(payment?.fxRate || shipment?.fx || exchangeRate || 1)],
    ["Method / Note", payment?.note || "Not set"],
  ];

  doc.setFont(undefined, "normal");
  doc.setFontSize(10);
  let detailY = 76;
  details.forEach(([label, value], index) => {
    doc.text(label, 122, detailY + index * 8);
    doc.text(":", 153, detailY + index * 8);
    doc.text(String(value), 160, detailY + index * 8, { maxWidth: 36 });
  });

  setRgb("fill", dark);
  doc.roundedRect(12, 128, 186, 38, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, "bold");
  doc.setFontSize(12);
  doc.text("Amount Received", 22, 143);
  doc.setFontSize(24);
  doc.text(money(payment?.amount || 0, payment?.currency || "USD"), 188, 146, { align: "right" });
  doc.setFont(undefined, "normal");
  doc.setFontSize(9);
  doc.text(`Equivalent USD: ${money(collectedUsd)}`, 188, 156, { align: "right" });

  autoTable(doc, {
    startY: 182,
    theme: "grid",
    margin: { left: 12, right: 12 },
    head: [["Description", "Booking No", "Date", "Amount"]],
    body: [[
      `Customer payment received for ${routeText}`,
      bookingNo,
      receiptDate,
      money(payment?.amount || 0, payment?.currency || "USD"),
    ]],
    columnStyles: {
      0: { cellWidth: 88 },
      1: { cellWidth: 36 },
      2: { cellWidth: 30, halign: "center" },
      3: { cellWidth: 32, halign: "right" },
    },
    styles: { fontSize: 10, cellPadding: 4, lineColor: [220, 226, 232], lineWidth: 0.25 },
    headStyles: { fillColor: dark, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 10 },
    bodyStyles: { fillColor: [255, 255, 255], textColor: text },
  });

  const summaryY = 220;
  setRgb("draw", line);
  setRgb("fill", [255, 255, 255]);
  doc.roundedRect(112, summaryY, 86, 42, 2.5, 2.5, "S");
  setRgb("text", text);
  doc.setFont(undefined, "normal");
  doc.setFontSize(11);
  doc.text("Invoice Amount", 120, summaryY + 11);
  doc.text(money(invoiceAmount), 192, summaryY + 11, { align: "right" });
  doc.text("Total Collected", 120, summaryY + 22);
  doc.text(money(totalCollected), 192, summaryY + 22, { align: "right" });
  setRgb("draw", dark);
  doc.line(120, summaryY + 28, 192, summaryY + 28);
  doc.setFont(undefined, "bold");
  doc.setFontSize(13);
  doc.text("Remaining", 120, summaryY + 37);
  doc.text(money(remainingAmount), 192, summaryY + 37, { align: "right" });

  setRgb("draw", line);
  setRgb("fill", [255, 255, 255]);
  doc.roundedRect(12, summaryY, 88, 42, 2.5, 2.5, "S");
  setRgb("text", text);
  doc.setFont(undefined, "bold");
  doc.setFontSize(11);
  doc.text("Received By", 20, summaryY + 12);
  doc.setFont(undefined, "normal");
  doc.setFontSize(10);
  doc.text(COMPANY_INFO.name, 20, summaryY + 24);
  setRgb("draw", line);
  doc.line(20, summaryY + 34, 86, summaryY + 34);

  setRgb("draw", line);
  doc.setLineWidth(0.35);
  doc.line(12, 277, 198, 277);
  setRgb("fill", light);
  doc.roundedRect(12, 280, 186, 10, 1.5, 1.5, "F");
  setRgb("text", text);
  doc.setFont(undefined, "bold");
  doc.setFontSize(9);
  doc.text(COMPANY_INFO.name, 62, 287, { align: "center" });
  doc.text(COMPANY_INFO.phone, 105, 287, { align: "center" });
  doc.text(COMPANY_INFO.address, 155, 287, { align: "center" });

  doc.save(`${receiptNo}-${safeFileName(shipment?.customer)}.pdf`);
}

export function generateProfitReportPdf(shipment, exchangeRate) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ledger = getShipmentFinancialLedger(shipment, exchangeRate);
  const booking = shipment.bookingNo && shipment.bookingNo !== "Not set" ? shipment.bookingNo : shipment.id;

  doc.setFont(undefined, "bold");
  doc.setFontSize(20);
  doc.text("SHIPMENT PROFIT REPORT", 14, 18);
  doc.setFontSize(12);
  doc.text(COMPANY_INFO.name, 14, 27);
  doc.setFont(undefined, "normal");
  doc.setFontSize(10);
  doc.text(`Shipment: ${shipment.id}   Booking: ${booking}`, 14, 37);
  doc.text(`Customer: ${shipment.customer || "Not set"}   Route: ${shipment.pol || ""} to ${shipment.pod || ""}`, 14, 44);

  autoTable(doc, {
    startY: 54,
    theme: "grid",
    head: [["Metric", "Amount USD"]],
    body: [
      ["Sales Invoices", money(ledger.salesTotal)],
      ["Purchase Invoices", money(ledger.purchasesTotal)],
      ["Expected Profit", money(ledger.expectedProfit)],
      ["Collected from Customer", money(ledger.cashIn)],
      ["Paid to Suppliers", money(ledger.cashOut)],
      ["Cash Position", money(ledger.cashPosition)],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [14, 18, 22], textColor: [255, 255, 255] },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 12,
    theme: "grid",
    head: [["Type", "Invoice", "Party / Category", "Total", "Paid", "Remaining", "Status"]],
    body: ledger.rows.map((row) => [
      row.invoiceType,
      row.invoiceNo || "Not set",
      `${row.party || "Not set"} / ${row.category || "Other"}`,
      money(row.totalUsd),
      money(row.paidUsd),
      money(row.remainingUsd),
      row.status,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [14, 18, 22], textColor: [255, 255, 255] },
  });

  doc.save(`profit-report-${safeFileName(shipment.id)}.pdf`);
}

export function generateFinancialInvoicePdf(shipment, invoice, exchangeRate) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const totalUsd = financialInvoiceAmountUsd(invoice, shipment, exchangeRate);
  const title = `${invoice.adjustmentKind || "Invoice"} - ${invoice.invoiceType || "Sale"}`.toUpperCase();

  doc.setFont(undefined, "bold");
  doc.setFontSize(20);
  doc.text(title, 14, 18);
  doc.setFontSize(12);
  doc.text(COMPANY_INFO.name, 14, 27);
  doc.setFont(undefined, "normal");
  doc.setFontSize(10);
  doc.text(`Invoice No: ${invoice.invoiceNo || "Not set"}`, 14, 40);
  doc.text(`Date: ${invoice.invoiceDate || "Not set"}   Due: ${invoice.dueDate || "Not set"}`, 14, 47);
  doc.text(`Shipment: ${shipment.id}   Booking: ${shipment.bookingNo || "Not set"}`, 14, 54);
  doc.text(`Route: ${shipment.pol || ""} to ${shipment.pod || ""}`, 14, 61);
  doc.text(`Party: ${invoice.party || "Not set"}`, 14, 68);

  autoTable(doc, {
    startY: 80,
    theme: "grid",
    head: [["Category", "Kind", "Amount", "Tax", "Currency", "FX", "Total USD", "Approval"]],
    body: [[
      invoice.category || "",
      invoice.adjustmentKind || "Invoice",
      money(invoice.amount || 0, invoice.currency || "USD"),
      `${Number(invoice.taxRate || 0)}%`,
      invoice.currency || "USD",
      String(invoice.fxRate || shipment.fx || exchangeRate || 1),
      money(totalUsd),
      invoice.approvalStatus || "Approved",
    ]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [14, 18, 22], textColor: [255, 255, 255] },
  });

  if (invoice.note) {
    doc.setFont(undefined, "bold");
    doc.text("Note", 14, doc.lastAutoTable.finalY + 14);
    doc.setFont(undefined, "normal");
    doc.text(String(invoice.note), 14, doc.lastAutoTable.finalY + 22, { maxWidth: 180 });
  }

  doc.save(`${safeFileName(invoice.invoiceNo || invoice.id)}.pdf`);
}
