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

export function calcOceanBuy(shipment) {
  return Number(shipment.buyUsd || 0) * Number(shipment.qty || 0);
}

export function calcOceanSell(shipment) {
  // Customer sale / revenue only. Expenses must NOT be added here.
  return Number(shipment.sellUsd || 0) * Number(shipment.qty || 0);
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
  if ((payment.currency || "USD") === "TRY") return amount / getPaymentRate(payment, shipment, exchangeRate);
  return amount;
}

export function financialInvoiceAmountUsd(invoice, shipment, exchangeRate) {
  const amount = Number(invoice.amount || 0);
  if ((invoice.currency || "USD") === "TRY") return amount / getRate({ fx: invoice.fxRate || shipment?.fx }, exchangeRate);
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
    const paidUsd = appliedPayments.reduce((sum, payment) => sum + paymentAmountUsd(payment, shipment, exchangeRate), 0);
    const remainingUsd = Math.max(totalUsd - paidUsd, 0);
    return {
      ...invoice,
      paymentType,
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
    tasks: getTasks(shipment),
    emailReminderSent: shipment.emailReminderSent || {},
  };
}
