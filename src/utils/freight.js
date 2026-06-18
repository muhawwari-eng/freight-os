export function money(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function getTransports(shipment) {
  if (Array.isArray(shipment.transports)) return shipment.transports;
  if (shipment.localTry) {
    return [{ company: "Old local transport", from: "", to: "", costTry: Number(shipment.localTry), note: "Imported old cost" }];
  }
  return [];
}

export function getExpenses(shipment) {
  return Array.isArray(shipment.expenses) ? shipment.expenses : [];
}

export function getPayments(shipment) {
  return Array.isArray(shipment.payments) ? shipment.payments : [];
}

export function getFinancialInvoices(shipment) {
  return Array.isArray(shipment.financialInvoices) ? shipment.financialInvoices : [];
}

export function getShipmentDocuments(shipment) {
  return Array.isArray(shipment.documents) ? shipment.documents : [];
}

export function getShipmentShareLinks(shipment) {
  return Array.isArray(shipment.shareLinks) ? shipment.shareLinks : [];
}

export const requiredShipmentDocumentTypes = ["Bill of Lading", "Commercial Invoice", "Packing List"];

export function getShipmentInternalNotes(shipment) {
  return Array.isArray(shipment.internalNotes) ? shipment.internalNotes : [];
}

export function getMissingDocumentTypes(shipment) {
  const uploadedTypes = new Set(getShipmentDocuments(shipment).map((document) => document.type || "Other"));
  return requiredShipmentDocumentTypes.filter((type) => !uploadedTypes.has(type));
}

export function getTimelineEvents(shipment) {
  const savedEvents = Array.isArray(shipment.timeline) ? shipment.timeline : [];
  const baselineEvents = [
    {
      id: `BASE-CREATED-${shipment?.id || "shipment"}`,
      type: "Shipment",
      title: "Shipment created",
      date: shipment?.entryDate || shipment?.createdAt || "",
      note: "File opened in Freight OS.",
      system: true,
    },
    {
      id: `BASE-CUTOFF-${shipment?.id || "shipment"}`,
      type: "Schedule",
      title: "Cut-Off",
      date: shipment?.cutOff || "",
      note: "Document and cargo deadline.",
      system: true,
    },
    {
      id: `BASE-ETD-${shipment?.id || "shipment"}`,
      type: "Schedule",
      title: "ETD",
      date: shipment?.etd || "",
      note: "Expected departure.",
      system: true,
    },
    {
      id: `BASE-ETA-${shipment?.id || "shipment"}`,
      type: "Schedule",
      title: "ETA",
      date: shipment?.eta || "",
      note: "Expected arrival.",
      system: true,
    },
    {
      id: `BASE-STATUS-${shipment?.id || "shipment"}`,
      type: "Status",
      title: `Current status: ${shipment?.status || "Not set"}`,
      date: shipment?.updatedAt || shipment?.createdAt || shipment?.entryDate || "",
      note: `Payment status: ${shipment?.paymentStatus || "Not set"}`,
      system: true,
    },
  ].filter((event) => event.date || event.title.startsWith("Current status"));

  return [...savedEvents, ...baselineEvents].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

export function getNextFinancialInvoiceNumber(shipment, invoiceType) {
  const code = invoiceType === "Sale" ? "SI" : "PI";
  const savedSequence = Number(shipment?.financialInvoiceSequences?.[invoiceType.toLowerCase()] || 0);
  const pattern = new RegExp(`-${code}-(\\d+)$`);
  const usedSequence = getFinancialInvoices(shipment).reduce((highest, invoice) => {
    if (invoice.invoiceType !== invoiceType) return highest;
    const match = String(invoice.invoiceNo || "").match(pattern);
    return match ? Math.max(highest, Number(match[1]) || 0) : highest;
  }, 0);
  const next = Math.max(savedSequence, usedSequence) + 1;
  return `${shipment.id}-${code}-${String(next).padStart(3, "0")}`;
}

export function getTasks(shipment) {
  return Array.isArray(shipment.tasks) ? shipment.tasks : [];
}

export function getTaskStatus(task) {
  if ((task.status || "Pending") === "Done") return "Done";
  const days = getDaysLeft(task.dueDate);
  if (days === null) return "Pending";
  if (days < 0) return "Overdue";
  if (days <= 2) return "Due Soon";
  return "Pending";
}

export function addDays(date, days) {
  const base = new Date(date);
  base.setDate(base.getDate() + days);
  return base;
}

export function toDateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function toLocalDateKey(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

export function getReminderEventsForShipment(shipment) {
  return [
    { key: "cutOff", label: "Cut-Off Reminder", taskType: "Cut-Off", eventDate: shipment.cutOff, title: "Cut-Off reminder" },
    { key: "etd", label: "Departure Reminder", taskType: "ETD / Departure", eventDate: shipment.etd, title: "Departure / ETD reminder" },
    { key: "eta", label: "Arrival Reminder", taskType: "ETA / Arrival", eventDate: shipment.eta, title: "Arrival / ETA reminder" },
  ].filter((event) => event.eventDate);
}

export function buildReminderMessage({ shipment, event, recipientType, clientEmail }) {
  const booking = shipment.bookingNo || shipment.booking || shipment.id || "Not set";
  const customer = shipment.customer || "Customer";
  const route = `${shipment.pol || ""} → ${shipment.pod || ""}`;
  const vessel = shipment.vessel || "Not set";

  if (recipientType === "operation") {
    return `Operation reminder for ${event.label}. Customer: ${customer}. Booking: ${booking}. Route: ${route}. Vessel: ${vessel}. Event date: ${toDateKey(event.eventDate)}.${clientEmail ? ` Client email: ${clientEmail}.` : " Client email is missing in customer profile."}`;
  }

  return `Dear ${customer},\n\nThis is a friendly reminder regarding your shipment.\n\nBooking No: ${booking}\nRoute: ${route}\nVessel: ${vessel}\nReminder Type: ${event.label}\nDate: ${toDateKey(event.eventDate)}\n\nPlease make sure all required actions are completed on time.\n\nBest regards,\nFSC Lojistik`;
}

export function getReminderSentKey(eventKey, eventDate) {
  return `${eventKey}_${toDateKey(eventDate)}`;
}

export function isReminderAlreadySent(sent, event) {
  const eventDate = toDateKey(event.eventDate);
  return Boolean(sent?.[getReminderSentKey(event.key, event.eventDate)] || sent?.[event.key] === eventDate);
}

export function isFclShipment(shipment) {
  return ["FCL", "CrossFCL"].includes(shipment?.cargoType || "FCL");
}

export function isAirShipment(shipment) {
  return (shipment?.cargoType || "FCL") === "Air";
}

export function isFullTruckShipment(shipment) {
  return (shipment?.cargoType || "FCL") === "RoadFull";
}

export function getChargeableWeightKg(shipment) {
  return Math.max(Number(shipment?.actualWeightKg || 0), Number(shipment?.volumetricWeightKg || 0));
}

export function getShipmentBillableQty(shipment) {
  if (isFclShipment(shipment)) return Number(shipment?.qty || 0);
  if (isFullTruckShipment(shipment)) return Number(shipment?.qty || 0);
  if (isAirShipment(shipment)) return getChargeableWeightKg(shipment);
  return Number(shipment?.cbm || shipment?.qty || 0);
}

export function getShipmentUnitLabel(shipment) {
  if (isFclShipment(shipment)) return "Container";
  if (isFullTruckShipment(shipment)) return "Truck";
  if (isAirShipment(shipment)) return "Chargeable KG";
  return "CBM";
}

export function getShipmentLoadDescription(shipment) {
  if (isFclShipment(shipment)) return `${Number(shipment?.qty || 0)} x ${shipment?.containerType || "Container"}`;
  if (isFullTruckShipment(shipment)) return `${Number(shipment?.qty || 0)} full truck(s)`;
  const pieces = Number(shipment?.packageCount || 0) ? `${Number(shipment.packageCount)} pkg` : "Packages not set";
  const cbm = Number(shipment?.cbm || 0) ? `${Number(shipment.cbm)} CBM` : "CBM not set";
  const actual = Number(shipment?.actualWeightKg || 0) ? `${Number(shipment.actualWeightKg)} KG actual` : "Actual KG not set";
  const volumetric = Number(shipment?.volumetricWeightKg || 0) ? `${Number(shipment.volumetricWeightKg)} KG volumetric` : "Volumetric KG not set";
  if (isAirShipment(shipment)) return `${pieces} / ${actual} / ${volumetric} / Chargeable ${getChargeableWeightKg(shipment)} KG`;
  return `${pieces} / ${cbm} / ${actual}`;
}

export function calcOceanBuy(shipment) {
  return Number(shipment.buyUsd || 0) * getShipmentBillableQty(shipment);
}

export function calcOceanSell(shipment) {
  // Customer sale / revenue only. Expenses must NOT be added here.
  return Number(shipment.sellUsd || 0) * getShipmentBillableQty(shipment);
}

export function calcSingleTransportTry(transport) {
  const truckQty = Number(transport.truckQty || 1) || 1;
  const baseCost = Number(transport.costTry || 0) * truckQty;
  const taxRate = Number(transport.taxRate || 0) || 0;
  return baseCost + (baseCost * taxRate / 100);
}

export function calcTransportTry(shipment) {
  return getTransports(shipment).reduce((sum, t) => sum + calcSingleTransportTry(t), 0);
}

export function calcExpensesUsd(shipment) {
  return getExpenses(shipment).reduce((sum, e) => sum + Number(e.amountUsd || 0), 0);
}

export function getPaymentRate(payment, shipment, exchangeRate) {
  return Number(payment.fxRate || shipment?.fx || exchangeRate || 1) || 1;
}

export function paymentAmountUsd(payment, shipment, exchangeRate) {
  const amount = Number(payment.amount || 0);
  if ((payment.currency || "USD") !== "USD") return amount / getPaymentRate(payment, shipment, exchangeRate);
  return amount;
}

export function invoiceTaxAmount(invoice) {
  const amount = Number(invoice.amount || 0);
  const taxRate = Number(invoice.taxRate || 0);
  return amount * taxRate / 100;
}

export function financialInvoiceAmountUsd(invoice, shipment, exchangeRate) {
  const amount = Number(invoice.amount || 0) + invoiceTaxAmount(invoice);
  if ((invoice.currency || "USD") !== "USD") return amount / getRate({ fx: invoice.fxRate || shipment?.fx }, exchangeRate);
  return amount;
}

export function getInvoicePaymentType(invoice) {
  if (invoice.invoiceType === "Sale") return "Customer Receipt";
  if (invoice.category === "Local Transport") return "Local Transport";
  if (invoice.category === "Expense") return "Expense";
  if (invoice.category === "Ocean Freight") return "Ocean Freight";
  return "Other";
}

function getBaselineFinancialInvoices(shipment, exchangeRate) {
  const rows = [
    {
      id: `AUTO-SALE-${shipment.id}`,
      autoGenerated: true,
      invoiceType: "Sale",
      category: "Freight Sale",
      invoiceNo: `SALE-${shipment.id}`,
      invoiceDate: shipment.entryDate || "",
      party: shipment.customer || "Customer",
      amount: calcOceanSell(shipment),
      currency: "USD",
    },
    {
      id: `AUTO-OCEAN-${shipment.id}`,
      autoGenerated: true,
      invoiceType: "Purchase",
      category: "Ocean Freight",
      invoiceNo: `COST-OCEAN-${shipment.id}`,
      invoiceDate: shipment.entryDate || "",
      party: shipment.line || "Carrier",
      amount: calcOceanBuy(shipment),
      currency: "USD",
    },
    {
      id: `AUTO-TRANSPORT-${shipment.id}`,
      autoGenerated: true,
      invoiceType: "Purchase",
      category: "Local Transport",
      invoiceNo: `COST-TRANSPORT-${shipment.id}`,
      invoiceDate: shipment.entryDate || "",
      party: "Local Transport",
      amount: calcTransportTry(shipment) / getRate(shipment, exchangeRate),
      currency: "USD",
    },
    {
      id: `AUTO-EXPENSE-${shipment.id}`,
      autoGenerated: true,
      invoiceType: "Purchase",
      category: "Expense",
      invoiceNo: `COST-EXPENSE-${shipment.id}`,
      invoiceDate: shipment.entryDate || "",
      party: "Expenses",
      amount: calcExpensesUsd(shipment),
      currency: "USD",
    },
  ];
  return rows.filter((row) => Number(row.amount || 0) > 0);
}

export function getShipmentFinancialLedger(shipment, exchangeRate) {
  const recordedInvoices = getFinancialInvoices(shipment);
  const recordedKeys = new Set(recordedInvoices.map((invoice) => `${invoice.invoiceType}:${invoice.category}`));
  const baselineInvoices = getBaselineFinancialInvoices(shipment, exchangeRate)
    .filter((invoice) => !recordedKeys.has(`${invoice.invoiceType}:${invoice.category}`));
  const invoices = [...recordedInvoices, ...baselineInvoices];
  const payments = getPayments(shipment);
  const rowsByPaymentType = new Map();

  invoices.forEach((invoice) => {
    const type = getInvoicePaymentType(invoice);
    rowsByPaymentType.set(type, [...(rowsByPaymentType.get(type) || []), invoice]);
  });

  const rows = invoices.map((invoice) => {
    const paymentType = getInvoicePaymentType(invoice);
    const linked = payments.filter((payment) => payment.invoiceId === invoice.id);
    const compatibleUnlinked = (rowsByPaymentType.get(paymentType) || []).length === 1
      ? payments.filter((payment) => !payment.invoiceId && payment.purchaseType === paymentType)
      : [];
    const appliedPayments = [...linked, ...compatibleUnlinked];
    const totalUsd = financialInvoiceAmountUsd(invoice, shipment, exchangeRate);
    const taxUsd = financialInvoiceAmountUsd({ ...invoice, amount: invoiceTaxAmount(invoice), taxRate: 0 }, shipment, exchangeRate);
    const paidUsd = appliedPayments.reduce((sum, payment) => sum + paymentAmountUsd(payment, shipment, exchangeRate), 0);
    const remainingUsd = Math.max(totalUsd - paidUsd, 0);
    return {
      ...invoice,
      paymentType,
      taxUsd,
      totalUsd,
      paidUsd,
      remainingUsd,
      status: remainingUsd <= 0.01 ? "Paid" : paidUsd > 0 ? "Partially Paid" : "Unpaid",
      payments: appliedPayments,
    };
  });

  const appliedPaymentIds = new Set(rows.flatMap((row) => row.payments.map((payment) => payment.id)));
  const unallocatedPayments = payments.filter((payment) => !appliedPaymentIds.has(payment.id));
  const saleRows = rows.filter((row) => row.invoiceType === "Sale");
  const purchaseRows = rows.filter((row) => row.invoiceType === "Purchase");
  const total = (items, field) => items.reduce((sum, row) => sum + row[field], 0);
  const salesTotal = total(saleRows, "totalUsd");
  const purchasesTotal = total(purchaseRows, "totalUsd");
  const cashIn = payments
    .filter((payment) => payment.purchaseType === "Customer Receipt")
    .reduce((sum, payment) => sum + paymentAmountUsd(payment, shipment, exchangeRate), 0);
  const cashOut = payments
    .filter((payment) => payment.purchaseType !== "Customer Receipt")
    .reduce((sum, payment) => sum + paymentAmountUsd(payment, shipment, exchangeRate), 0);

  return {
    rows,
    saleRows,
    purchaseRows,
    unallocatedPayments,
    salesTotal,
    salesPaid: total(saleRows, "paidUsd"),
    salesRemaining: total(saleRows, "remainingUsd"),
    purchasesTotal,
    purchasesPaid: total(purchaseRows, "paidUsd"),
    purchasesRemaining: total(purchaseRows, "remainingUsd"),
    expectedProfit: salesTotal - purchasesTotal,
    cashIn,
    cashOut,
    cashPosition: cashIn - cashOut,
  };
}

export function getPurchaseDueUsd(shipment, purchaseType, exchangeRate) {
  if (purchaseType === "Customer Receipt") return calcOceanSell(shipment);
  if (purchaseType === "Ocean Freight") return calcOceanBuy(shipment);
  if (purchaseType === "Local Transport") return calcTransportTry(shipment) / getRate(shipment, exchangeRate);
  if (purchaseType === "Expense") return calcExpensesUsd(shipment);
  return 0;
}

export function getPaidByTypeUsd(shipment, purchaseType, exchangeRate) {
  return getPayments(shipment)
    .filter((payment) => payment.purchaseType === purchaseType)
    .reduce((sum, payment) => sum + paymentAmountUsd(payment, shipment, exchangeRate), 0);
}

export function getPaymentStatusLabel(shipment, purchaseType, exchangeRate) {
  const due = getPurchaseDueUsd(shipment, purchaseType, exchangeRate);
  const paid = getPaidByTypeUsd(shipment, purchaseType, exchangeRate);
  if (!due) return paid ? "Paid" : "No Due";
  if (paid <= 0) return "Unpaid";
  if (paid + 0.01 >= due) return "Paid";
  return "Partially Paid";
}

export function getPaymentSummary(shipment, exchangeRate) {
  const payableTypes = ["Ocean Freight", "Local Transport", "Expense"];
  const payableDue = payableTypes.reduce((sum, type) => sum + getPurchaseDueUsd(shipment, type, exchangeRate), 0);
  const payablePaid = payableTypes.reduce((sum, type) => sum + getPaidByTypeUsd(shipment, type, exchangeRate), 0);
  const receivableDue = getPurchaseDueUsd(shipment, "Customer Receipt", exchangeRate);
  const receivablePaid = getPaidByTypeUsd(shipment, "Customer Receipt", exchangeRate);

  return {
    payableDue,
    payablePaid,
    payableRemaining: Math.max(payableDue - payablePaid, 0),
    receivableDue,
    receivablePaid,
    receivableRemaining: Math.max(receivableDue - receivablePaid, 0),
  };
}

export function getShipmentHealth(shipment, exchangeRate) {
  const missingDocuments = getMissingDocumentTypes(shipment);
  const ledger = getShipmentFinancialLedger(shipment, exchangeRate);
  const tasks = getTasks(shipment);
  const overdueTasks = tasks.filter((task) => getTaskStatus(task) === "Overdue");
  const dueSoonTasks = tasks.filter((task) => getTaskStatus(task) === "Due Soon");
  const etaDays = getDaysLeft(shipment?.eta);
  const profit = calcNetProfit(shipment, exchangeRate);
  const reasons = [];
  let score = 100;

  if (profit < 0) {
    score -= 35;
    reasons.push("Negative profit");
  }
  if (etaDays !== null && etaDays < 0 && !["Arrived", "Completed"].includes(shipment?.status)) {
    score -= 25;
    reasons.push("ETA passed");
  }
  if (missingDocuments.length) {
    score -= Math.min(25, missingDocuments.length * 8);
    reasons.push(`${missingDocuments.length} missing document(s)`);
  }
  if (overdueTasks.length) {
    score -= Math.min(20, overdueTasks.length * 10);
    reasons.push(`${overdueTasks.length} overdue task(s)`);
  } else if (dueSoonTasks.length) {
    score -= Math.min(10, dueSoonTasks.length * 5);
    reasons.push(`${dueSoonTasks.length} due soon task(s)`);
  }
  if (ledger.salesRemaining > 0.01) {
    score -= 10;
    reasons.push("Receivable open");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const status = score < 55 ? "Critical" : score < 80 ? "Attention" : "Good";
  return {
    score,
    status,
    reasons: reasons.length ? reasons : ["On track"],
    missingDocuments,
    overdueTasks,
    dueSoonTasks,
  };
}

export function getShipmentCalendarEvents(shipments) {
  return (shipments || [])
    .flatMap((shipment) => [
      shipment.cutOff && { id: `${shipment.id}-cutoff`, date: shipment.cutOff, type: "Cut-Off", shipment },
      shipment.etd && { id: `${shipment.id}-etd`, date: shipment.etd, type: "ETD", shipment },
      shipment.eta && { id: `${shipment.id}-eta`, date: shipment.eta, type: "ETA", shipment },
      ...getTasks(shipment).filter((task) => task.dueDate).map((task) => ({ id: `${shipment.id}-${task.id}`, date: task.dueDate, type: task.taskType || "Task", title: task.title, shipment })),
    ])
    .filter(Boolean)
    .sort((left, right) => String(left.date).localeCompare(String(right.date)));
}

export function getShipmentAuditEvents(shipments) {
  return (shipments || [])
    .flatMap((shipment) => [
      ...getTimelineEvents(shipment).map((event) => ({
        ...event,
        shipmentId: shipment.id,
        shipmentCustomer: shipment.customer,
        route: `${shipment.pol || ""} - ${shipment.pod || ""}`,
      })),
      ...getPayments(shipment).map((payment) => ({
        id: `AUD-PAY-${shipment.id}-${payment.id}`,
        type: "Payment",
        title: `${payment.purchaseType || "Payment"} recorded`,
        note: `${money(payment.amount, payment.currency || "USD")} | ${payment.company || "No company"}`,
        date: payment.updatedAt || payment.createdAt || payment.paidDate || "",
        user: payment.updatedBy || payment.createdBy || "unknown",
        shipmentId: shipment.id,
        shipmentCustomer: shipment.customer,
        route: `${shipment.pol || ""} - ${shipment.pod || ""}`,
      })),
      ...getFinancialInvoices(shipment).map((invoice) => ({
        id: `AUD-INV-${shipment.id}-${invoice.id}`,
        type: "Invoice",
        title: `${invoice.invoiceType || "Invoice"} ${invoice.invoiceNo || ""}`,
        note: `${invoice.category || "No category"} | ${money(invoice.amount, invoice.currency || "USD")}`,
        date: invoice.updatedAt || invoice.createdAt || invoice.invoiceDate || "",
        user: invoice.updatedBy || invoice.createdBy || "unknown",
        shipmentId: shipment.id,
        shipmentCustomer: shipment.customer,
        route: `${shipment.pol || ""} - ${shipment.pod || ""}`,
      })),
    ])
    .filter((event) => event.date || event.title)
    .sort((left, right) => String(right.date || "").localeCompare(String(left.date || "")));
}

export function getAgingBucket(daysOverdue) {
  if (daysOverdue <= 30) return "0-30";
  if (daysOverdue <= 60) return "31-60";
  if (daysOverdue <= 90) return "61-90";
  return "90+";
}

export function getAgingReport(shipments, exchangeRate) {
  const empty = () => ({ "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0, total: 0, rows: [] });
  const report = { receivables: empty(), payables: empty() };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  (shipments || []).forEach((shipment) => {
    getShipmentFinancialLedger(shipment, exchangeRate).rows.forEach((row) => {
      if (row.remainingUsd <= 0.01) return;
      const dueDate = row.dueDate || row.invoiceDate || shipment.eta || shipment.entryDate || shipment.createdAt;
      const due = new Date(dueDate);
      if (Number.isNaN(due.getTime())) return;
      due.setHours(0, 0, 0, 0);
      const daysOverdue = Math.max(0, Math.floor((today - due) / (1000 * 60 * 60 * 24)));
      const bucket = getAgingBucket(daysOverdue);
      const target = row.invoiceType === "Sale" ? report.receivables : report.payables;
      target[bucket] += row.remainingUsd;
      target.total += row.remainingUsd;
      target.rows.push({ shipment, invoice: row, dueDate: toDateKey(dueDate), daysOverdue, bucket, amountUsd: row.remainingUsd });
    });
  });

  return report;
}

export function getRate(shipment, exchangeRate) {
  // Historical shipments keep their own saved FX rate. The active rate is a fallback only.
  return Number(shipment.fx || exchangeRate || 1) || 1;
}

export function calcTotalCostUsd(shipment, exchangeRate) {
  // Total cost = ocean buy + local transport converted to USD + extra expenses.
  const transportUsd = calcTransportTry(shipment) / getRate(shipment, exchangeRate);
  return calcOceanBuy(shipment) + transportUsd + calcExpensesUsd(shipment);
}

export function calcGrossProfit(shipment, exchangeRate) {
  const transportUsd = calcTransportTry(shipment) / getRate(shipment, exchangeRate);
  return calcOceanSell(shipment) - calcOceanBuy(shipment) - transportUsd;
}

export function calcNetProfit(shipment, exchangeRate) {
  // Net profit deducts extra expenses from gross profit.
  return calcGrossProfit(shipment, exchangeRate) - calcExpensesUsd(shipment);
}

export function calcMargin(shipment, exchangeRate) {
  const sale = calcOceanSell(shipment);
  if (!sale) return 0;
  return (calcNetProfit(shipment, exchangeRate) / sale) * 100;
}

export function getProgress(shipment) {
  const status = (shipment.status || "").toLowerCase();
  if (status.includes("arrived") || status.includes("completed")) return 100;
  if (status.includes("port")) return 85;
  if (status.includes("sea") || status.includes("transit")) return 65;
  if (status.includes("loading")) return 45;
  if (status.includes("booked")) return 25;
  return 10;
}

export function getShipmentReportDate(shipment) {
  return shipment?.entryDate || shipment?.createdAt || shipment?.eta || shipment?.etd || shipment?.cutOff || "";
}

export function getMonthKey(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 7);
}

export function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export function formatMonthLabel(monthKey) {
  if (!monthKey) return "All dates";
  const [year, month] = monthKey.split("-");
  return month + "/" + year;
}

export function dateOnly(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function isDateInRange(dateValue, fromDate, toDate) {
  const day = dateOnly(dateValue);
  if (!day) return false;
  if (fromDate && day < fromDate) return false;
  if (toDate && day > toDate) return false;
  return true;
}

export function getDateRangeLabel(fromDate, toDate) {
  if (fromDate && toDate) return `${fromDate} to ${toDate}`;
  if (fromDate) return `From ${fromDate}`;
  if (toDate) return `Until ${toDate}`;
  return "All dates";
}

export function safeFileName(value) {
  return String(value || "all")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "all";
}

export function getDaysLeft(dateValue) {
  if (!dateValue) return null;
  const today = new Date();
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date - today) / (1000 * 60 * 60 * 24));
}

export function getNextShipmentId(shipments) {
  const year = new Date().getFullYear();
  const numbers = (shipments || [])
    .map((s) => {
      const match = String(s?.id || "").match(/^SHP-\d{4}-(\d+)$/);
      return match ? Number(match[1]) : 0;
    })
    .filter((n) => Number.isFinite(n) && n > 0);

  const next = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `SHP-${year}-${String(next).padStart(3, "0")}`;
}

export function dedupeShipments(rows) {
  const used = new Set();
  let maxNumber = 0;

  (rows || []).forEach((row) => {
    const match = String(row?.id || "").match(/^SHP-\d{4}-(\d+)$/);
    if (match) maxNumber = Math.max(maxNumber, Number(match[1]) || 0);
  });

  return (rows || []).map((row) => {
    const normalized = normalizeShipment(row);
    let id = String(normalized.id || "").trim();

    if (!id || used.has(id)) {
      do {
        maxNumber += 1;
        id = `SHP-${new Date().getFullYear()}-${String(maxNumber).padStart(3, "0")}`;
      } while (used.has(id));
    }

    used.add(id);
    return { ...normalized, id };
  });
}

export function normalizeShipment(shipment) {
  const createdAt = shipment.createdAt || shipment.created_at || shipment.eta || shipment.etd || shipment.cutOff || new Date().toISOString();

  return {
    ...shipment,
    createdAt,
    entryDate: shipment.entryDate || toLocalDateKey(createdAt),
    cargoType: shipment.cargoType || "FCL",
    cbm: shipment.cbm || "",
    actualWeightKg: shipment.actualWeightKg || "",
    volumetricWeightKg: shipment.volumetricWeightKg || "",
    packageCount: shipment.packageCount || "",
    bookingNo: shipment.bookingNo || "Not set",
    vessel: shipment.vessel || "Not set",
    cutOff: shipment.cutOff || "",
    etd: shipment.etd || "",
    eta: shipment.eta || "",
    paymentStatus: shipment.paymentStatus || "Unpaid",
    transports: getTransports(shipment),
    expenses: getExpenses(shipment),
    payments: getPayments(shipment),
    financialInvoices: getFinancialInvoices(shipment),
    financialInvoiceSequences: shipment.financialInvoiceSequences || { sale: 0, purchase: 0 },
    documents: getShipmentDocuments(shipment),
    shareLinks: getShipmentShareLinks(shipment),
    internalNotes: getShipmentInternalNotes(shipment),
    timeline: Array.isArray(shipment.timeline) ? shipment.timeline : [],
    tasks: getTasks(shipment),
    emailReminderSent: shipment.emailReminderSent || {},
    tracking: shipment.tracking || {},
  };
}
