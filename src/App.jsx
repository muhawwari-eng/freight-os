import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Login from "./Login";
import { supabase } from "./supabase";
import { DEFAULT_OPERATION_EMAIL, EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, REMINDER_EMAIL_ENDPOINT } from "./config/email";
import { defaultFxSettings, defaultShipments, defaultSuppliers, defaultWorldPorts, emptyBookingForm, emptyCustomerForm, emptyEditForm, emptyExpenseForm, emptyPaymentForm, emptyPortForm, emptyReceivableForm, emptySupplierForm, emptyTaskForm, emptyTransportForm, getLocalTodayDateKey, getNextCustomerId, getNextSupplierId } from "./data/defaults";
import { addDays, buildReminderMessage, calcExpensesUsd, calcGrossProfit, calcNetProfit, calcOceanSell, calcTotalCostUsd, dedupeShipments, getDateRangeLabel, getExpenses, getFinancialInvoices, getInvoicePaymentType, getMonthKey, getNextFinancialInvoiceNumber, getNextShipmentId, getPaymentSummary, getPayments, getRate, getReminderEventsForShipment, getReminderSentKey, getShipmentReportDate, getTaskStatus, getTasks, getTransports, isDateInRange, isReminderAlreadySent, money, normalizeShipment, paymentAmountUsd, safeFileName, toDateKey } from "./utils/freight";
import { ownedTables, readOwnedRows, saveOwnedRows } from "./services/ownedStorage";
import { getTitle } from "./utils/titles";
import { DashboardScreen } from "./screens/DashboardScreen";
import { ShipmentDetailsScreen } from "./screens/ShipmentDetailsScreen";
import { ShipmentsScreen } from "./screens/ShipmentsScreen";
import { BookingScreen } from "./screens/BookingScreen";
import { TransportScreen } from "./screens/TransportScreen";
import { ExpensesScreen } from "./screens/ExpensesScreen";
import { PaymentsScreen } from "./screens/PaymentsScreen";
import { ReceivablesScreen } from "./screens/ReceivablesScreen";
import { FinancialManagementScreen } from "./screens/FinancialManagementScreen";
import { TasksScreen } from "./screens/TasksScreen";
import { ExchangeScreen } from "./screens/ExchangeScreen";
import { CustomersScreen } from "./screens/CustomersScreen";
import { SuppliersScreen } from "./screens/SuppliersScreen";
import { PortsScreen } from "./screens/PortsScreen";
import { ReportsScreen } from "./screens/ReportsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ApiScreen } from "./screens/ApiScreen";
export default function App() {
  const [shipments, setShipments] = useState([]);

  const [fxSettings, setFxSettings] = useState(() => {
    const saved = localStorage.getItem("freight_fx_settings");
    return saved ? { ...defaultFxSettings, ...JSON.parse(saved) } : defaultFxSettings;
  });


  const [customers, setCustomers] = useState([]);

  const [suppliers, setSuppliers] = useState(defaultSuppliers);

  const [ports, setPorts] = useState(defaultWorldPorts);

  const [query, setQuery] = useState("");
  const [shipmentFilters, setShipmentFilters] = useState({
    customer: "all",
    line: "all",
    pol: "all",
    pod: "all",
    status: "all",
    cargoType: "all",
    paymentStatus: "all",
  });
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [lineFilter, setLineFilter] = useState("all");
  const [tab, setTab] = useState("dashboard");
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [bookingForm, setBookingForm] = useState(emptyBookingForm);
  const [transportForm, setTransportForm] = useState(emptyTransportForm);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [editingPayment, setEditingPayment] = useState(null);
  const [receivableForm, setReceivableForm] = useState(emptyReceivableForm);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [taskFilter, setTaskFilter] = useState("open");
  const [notifications, setNotifications] = useState([]);
  const [reminderRunning, setReminderRunning] = useState(false);
  const reminderAutoCheckRef = useRef(false);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Saved automatically");
  const [fxLoading, setFxLoading] = useState(false);
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm);
  const [portForm, setPortForm] = useState(emptyPortForm);
  const [onlineDataLoaded, setOnlineDataLoaded] = useState(false);
  const [reportFromDate, setReportFromDate] = useState("");
  const [reportToDate, setReportToDate] = useState("");
  const [clientReportCustomer, setClientReportCustomer] = useState("all");
  const [appSettings, setAppSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("freight_app_settings");
      return saved
        ? { operationEmail: DEFAULT_OPERATION_EMAIL, companyEmail: "info@fsclojistik.com", autoEmailReminders: true, ...JSON.parse(saved) }
        : { operationEmail: DEFAULT_OPERATION_EMAIL, companyEmail: "info@fsclojistik.com", autoEmailReminders: true };
    } catch {
      return { operationEmail: DEFAULT_OPERATION_EMAIL, companyEmail: "info@fsclojistik.com", autoEmailReminders: true };
    }
  });

  const role = profile?.role || "viewer";
  const canSeeFinance = role === "admin" || role === "partner";
  const canEditCore = role === "admin" || role === "partner";
  const canManagePayments = role === "admin";
  const canEditOperation = canEditCore || role === "operation";
  const activeFxRate = Number(fxSettings.mode === "auto" ? fxSettings.autoRate : fxSettings.manualRate) || 1;

  useEffect(() => {
    if (user?.id) localStorage.setItem(`freight_shipments_${user.id}`, JSON.stringify(shipments));
    const timer = setTimeout(() => {
      setSaveStatus(onlineDataLoaded ? "Saved online" : "Saved locally");
    }, 0);
    return () => clearTimeout(timer);
  }, [shipments, onlineDataLoaded, user?.id]);

  useEffect(() => {
    localStorage.setItem("freight_fx_settings", JSON.stringify(fxSettings));
  }, [fxSettings]);

  useEffect(() => {
    localStorage.setItem("freight_app_settings", JSON.stringify(appSettings));
  }, [appSettings]);

  useEffect(() => {
    if (user?.id) localStorage.setItem(`freight_customers_${user.id}`, JSON.stringify(customers));
  }, [customers, user?.id]);

  useEffect(() => {
    if (user?.id) localStorage.setItem(`freight_suppliers_${user.id}`, JSON.stringify(suppliers));
  }, [suppliers, user?.id]);

  useEffect(() => {
    if (user?.id) localStorage.setItem(`freight_ports_${user.id}`, JSON.stringify(ports));
  }, [ports, user?.id]);

  async function loadOwnedData(ownerId) {
    setSaveStatus("Loading online data...");
    setOnlineDataLoaded(false);

    try {
      const [shipmentsResult, customersResult, suppliersResult, portsResult] = await Promise.all([
        supabase.from(ownedTables.shipments).select("item_id,data").eq("owner_id", ownerId),
        supabase.from(ownedTables.customers).select("item_id,data").eq("owner_id", ownerId),
        supabase.from(ownedTables.suppliers).select("item_id,data").eq("owner_id", ownerId),
        supabase.from(ownedTables.ports).select("item_id,data").eq("owner_id", ownerId),
      ]);

      const onlineShipments = readOwnedRows(shipmentsResult, normalizeShipment);
      const onlineCustomers = readOwnedRows(customersResult);
      const onlineSuppliers = readOwnedRows(suppliersResult);
      const onlinePorts = readOwnedRows(portsResult);

      if (onlineShipments.length) setShipments(dedupeShipments(onlineShipments));
      else setShipments([]);

      if (onlineCustomers.length) setCustomers(onlineCustomers);
      else setCustomers([]);

      if (onlineSuppliers.length) setSuppliers(onlineSuppliers);
      else {
        setSuppliers(defaultSuppliers);
        await saveOwnedRows(ownedTables.suppliers, ownerId, defaultSuppliers, "SUP");
      }

      if (onlinePorts.length) setPorts(onlinePorts);
      else {
        setPorts(defaultWorldPorts);
        await saveOwnedRows(ownedTables.ports, ownerId, defaultWorldPorts.map((p) => ({ ...p, id: p.code })), "PORT");
      }

      setOnlineDataLoaded(true);
      setSaveStatus("Saved online");
    } catch (error) {
      console.error("Could not load online data:", error);
      setSaveStatus("Local mode - run Supabase SQL setup");
      setOnlineDataLoaded(false);
    }
  }

  useEffect(() => {
    const getUserAndProfile = async () => {
      const { data } = await supabase.auth.getSession();
      const currentUser = data.session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        setShipments([]);
        setCustomers([]);
        setSuppliers(defaultSuppliers);
        setPorts(defaultWorldPorts);
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        setProfile(profileData);
        await loadOwnedData(currentUser.id);
      }
    };

    getUserAndProfile();
  }, []);

  useEffect(() => {
    if (!user?.id || !onlineDataLoaded) return;

    const timer = setTimeout(async () => {
      setSaveStatus("Syncing online...");
      try {
        await Promise.all([
          saveOwnedRows(ownedTables.shipments, user.id, dedupeShipments(shipments), "SHP"),
          saveOwnedRows(ownedTables.customers, user.id, customers, "CUS"),
          saveOwnedRows(ownedTables.suppliers, user.id, suppliers, "SUP"),
          saveOwnedRows(ownedTables.ports, user.id, ports.map((p) => ({ ...p, id: p.code })), "PORT"),
        ]);
        setSaveStatus("Saved online");
      } catch (error) {
        console.error("Could not sync online data:", error);
        setSaveStatus("Saved locally - online sync failed");
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [shipments, customers, suppliers, ports, user?.id, onlineDataLoaded]);

  function updateShipmentFilter(field, value) {
    setShipmentFilters((prev) => ({ ...prev, [field]: value }));
  }

  function resetShipmentFilters() {
    setQuery("");
    setLineFilter("all");
    setShipmentFilters({
      customer: "all",
      line: "all",
      pol: "all",
      pod: "all",
      status: "all",
      cargoType: "all",
      paymentStatus: "all",
    });
  }

  const filtered = useMemo(() => {
    return shipments.filter((s) => {
      const text = `${s.id} ${s.customer} ${s.line} ${s.pol} ${s.pod} ${s.bookingNo} ${s.vessel} ${s.status} ${s.paymentStatus}`.toLowerCase();
      const matchesSearch = text.includes(query.toLowerCase());
      const matchesLegacyLine = lineFilter === "all" || s.line === lineFilter;
      const matchesFilters =
        (shipmentFilters.customer === "all" || s.customer === shipmentFilters.customer) &&
        (shipmentFilters.line === "all" || s.line === shipmentFilters.line) &&
        (shipmentFilters.pol === "all" || s.pol === shipmentFilters.pol) &&
        (shipmentFilters.pod === "all" || s.pod === shipmentFilters.pod) &&
        (shipmentFilters.status === "all" || s.status === shipmentFilters.status) &&
        (shipmentFilters.cargoType === "all" || s.cargoType === shipmentFilters.cargoType) &&
        (shipmentFilters.paymentStatus === "all" || s.paymentStatus === shipmentFilters.paymentStatus);

      return matchesSearch && matchesLegacyLine && matchesFilters;
    });
  }, [shipments, query, lineFilter, shipmentFilters]);

  const totals = useMemo(() => {
    return shipments.reduce(
      (acc, s) => {
        acc.shipments += 1;
        acc.containers += Number(s.qty || 0);
        acc.revenue += calcOceanSell(s);
        acc.costs += calcTotalCostUsd(s, activeFxRate);
        acc.grossProfit += calcGrossProfit(s, activeFxRate);
        acc.netProfit += calcNetProfit(s, activeFxRate);
        acc.expenses += calcExpensesUsd(s);
        if ((s.cargoType || "FCL") === "LCL") acc.lcl += 1;
        else acc.fcl += Number(s.qty || 0);
        if ((s.paymentStatus || "").toLowerCase().includes("unpaid")) acc.unpaid += 1;
        if ((s.status || "").toLowerCase().includes("arrived")) acc.arrived += 1;
        if ((s.status || "").toLowerCase().includes("sea") || (s.status || "").toLowerCase().includes("transit")) acc.atSea += 1;
        return acc;
      },
      { shipments: 0, containers: 0, revenue: 0, costs: 0, grossProfit: 0, netProfit: 0, expenses: 0, fcl: 0, lcl: 0, unpaid: 0, arrived: 0, atSea: 0 }
    );
  }, [shipments, activeFxRate]);


  const financialDashboard = useMemo(() => {
    return shipments.reduce(
      (acc, shipment) => {
        const summary = getPaymentSummary(shipment, activeFxRate);
        acc.invoiceTotal += summary.receivableDue;
        acc.customerCollected += summary.receivablePaid;
        acc.customerRemaining += summary.receivableRemaining;
        acc.supplierPayables += summary.payableDue;
        acc.supplierPaid += summary.payablePaid;
        acc.supplierRemaining += summary.payableRemaining;
        return acc;
      },
      {
        invoiceTotal: 0,
        customerCollected: 0,
        customerRemaining: 0,
        supplierPayables: 0,
        supplierPaid: 0,
        supplierRemaining: 0,
      }
    );
  }, [shipments, activeFxRate]);

  const cashPosition = financialDashboard.customerCollected - financialDashboard.supplierPaid;

  const taskDashboard = useMemo(() => {
    const acc = { total: 0, pending: 0, done: 0, overdue: 0, dueSoon: 0 };
    shipments.forEach((shipment) => {
      getTasks(shipment).forEach((task) => {
        acc.total += 1;
        const status = getTaskStatus(task);
        if (status === "Done") acc.done += 1;
        else {
          acc.pending += 1;
          if (status === "Overdue") acc.overdue += 1;
          if (status === "Due Soon") acc.dueSoon += 1;
        }
      });
    });
    return acc;
  }, [shipments]);

  const allTasks = useMemo(() => {
    return shipments
      .flatMap((shipment) =>
        getTasks(shipment).map((task) => ({
          ...task,
          shipmentId: shipment.id,
          shipmentCustomer: shipment.customer,
          bookingNo: shipment.bookingNo,
          route: `${shipment.pol || ""} → ${shipment.pod || ""}`,
          taskStatus: getTaskStatus(task),
        }))
      )
      .filter((task) => {
        if (taskFilter === "open") return task.taskStatus !== "Done";
        if (taskFilter === "done") return task.taskStatus === "Done";
        if (taskFilter === "overdue") return task.taskStatus === "Overdue";
        if (taskFilter === "dueSoon") return task.taskStatus === "Due Soon";
        return true;
      })
      .sort((a, b) => String(a.dueDate || "9999-12-31").localeCompare(String(b.dueDate || "9999-12-31")));
  }, [shipments, taskFilter]);

  const selectedTaskShipment = useMemo(() => shipments.find((shipment) => shipment.id === taskForm.shipmentId) || null, [shipments, taskForm.shipmentId]);

  const dashboardCharts = useMemo(() => {
    const monthlyProfitMap = new Map();
    const monthlyCollectionsMap = new Map();
    const topCustomersMap = new Map();
    const expenseCompaniesMap = new Map();

    shipments.forEach((shipment) => {
      const shipmentMonth = getMonthKey(getShipmentReportDate(shipment)) || "No date";
      monthlyProfitMap.set(shipmentMonth, (monthlyProfitMap.get(shipmentMonth) || 0) + calcNetProfit(shipment, activeFxRate));

      const customer = shipment.customer || "Unknown Customer";
      topCustomersMap.set(customer, (topCustomersMap.get(customer) || 0) + calcOceanSell(shipment));

      getExpenses(shipment).forEach((expense) => {
        const company = expense.company || "Not set";
        expenseCompaniesMap.set(company, (expenseCompaniesMap.get(company) || 0) + Number(expense.amountUsd || 0));
      });

      getPayments(shipment)
        .filter((payment) => payment.purchaseType === "Customer Receipt")
        .forEach((payment) => {
          const collectionMonth = getMonthKey(payment.paidDate || payment.createdAt || getShipmentReportDate(shipment)) || "No date";
          monthlyCollectionsMap.set(collectionMonth, (monthlyCollectionsMap.get(collectionMonth) || 0) + paymentAmountUsd(payment, shipment, activeFxRate));
        });
    });

    const toRows = (map) => Array.from(map.entries()).map(([name, value]) => ({ name, value: Number(value || 0) }));
    const byMonth = (a, b) => String(a.name).localeCompare(String(b.name));
    const byValue = (a, b) => b.value - a.value;

    return {
      monthlyProfit: toRows(monthlyProfitMap).sort(byMonth).slice(-12),
      monthlyCollections: toRows(monthlyCollectionsMap).sort(byMonth).slice(-12),
      topCustomers: toRows(topCustomersMap).sort(byValue).slice(0, 8),
      expensesByCompany: toRows(expenseCompaniesMap).sort(byValue).slice(0, 8),
    };
  }, [shipments, activeFxRate]);

  const reportData = useMemo(() => {
    const selectedShipments = shipments.filter((s) => isDateInRange(getShipmentReportDate(s), reportFromDate, reportToDate));

    const summary = selectedShipments.reduce(
      (acc, s) => {
        acc.shipments += 1;
        acc.containers += Number(s.qty || 0);
        acc.revenue += calcOceanSell(s);
        acc.costs += calcTotalCostUsd(s, activeFxRate);
        acc.grossProfit += calcGrossProfit(s, activeFxRate);
        acc.expenses += calcExpensesUsd(s);
        acc.netProfit += calcNetProfit(s, activeFxRate);
        return acc;
      },
      { shipments: 0, containers: 0, revenue: 0, costs: 0, grossProfit: 0, expenses: 0, netProfit: 0 }
    );

    const customersMap = new Map();
    const expenseCompaniesMap = new Map();

    selectedShipments.forEach((s) => {
      const customerKey = s.customer || "Unknown Customer";
      const customerRow = customersMap.get(customerKey) || { name: customerKey, shipments: 0, revenue: 0, netProfit: 0 };
      customerRow.shipments += 1;
      customerRow.revenue += calcOceanSell(s);
      customerRow.netProfit += calcNetProfit(s, activeFxRate);
      customersMap.set(customerKey, customerRow);

      getExpenses(s).forEach((expense) => {
        const companyKey = expense.company || "Not set";
        const companyRow = expenseCompaniesMap.get(companyKey) || { company: companyKey, count: 0, amountUsd: 0 };
        companyRow.count += 1;
        companyRow.amountUsd += Number(expense.amountUsd || 0);
        expenseCompaniesMap.set(companyKey, companyRow);
      });
    });

    return {
      shipments: selectedShipments,
      summary,
      customers: Array.from(customersMap.values()).sort((a, b) => b.netProfit - a.netProfit),
      expenseCompanies: Array.from(expenseCompaniesMap.values()).sort((a, b) => b.amountUsd - a.amountUsd),
    };
  }, [shipments, reportFromDate, reportToDate, activeFxRate]);

  function reportShipmentRows(rows = reportData.shipments) {
    return rows.map((s) => ({
      Date: getShipmentReportDate(s) ? new Date(getShipmentReportDate(s)).toISOString().slice(0, 10) : "Not set",
      "Shipment ID": s.id,
      Customer: s.customer || "",
      Company: s.line || "",
      POL: s.pol || "",
      POD: s.pod || "",
      Route: `${s.pol || ""} → ${s.pod || ""}`,
      "Cargo Type": s.cargoType || "",
      "Container Type": s.containerType || "",
      Quantity: Number(s.qty || 0),
      "Booking No": s.bookingNo || "Not set",
      Vessel: s.vessel || "Not set",
      "Cut-Off": s.cutOff || "",
      ETD: s.etd || "",
      ETA: s.eta || "",
      Status: s.status || "",
      Payment: s.paymentStatus || "",
      "Revenue USD": Number(calcOceanSell(s).toFixed(2)),
      "Costs USD": Number(calcTotalCostUsd(s, activeFxRate).toFixed(2)),
      "Gross Profit USD": Number(calcGrossProfit(s, activeFxRate).toFixed(2)),
      "Expenses USD": Number(calcExpensesUsd(s).toFixed(2)),
      "Net Profit USD": Number(calcNetProfit(s, activeFxRate).toFixed(2)),
      "Payables Paid USD": Number(getPaymentSummary(s, activeFxRate).payablePaid.toFixed(2)),
      "Payables Remaining USD": Number(getPaymentSummary(s, activeFxRate).payableRemaining.toFixed(2)),
      "Receivables Collected USD": Number(getPaymentSummary(s, activeFxRate).receivablePaid.toFixed(2)),
      "Receivables Remaining USD": Number(getPaymentSummary(s, activeFxRate).receivableRemaining.toFixed(2)),
      "FX Rate": Number(getRate(s, activeFxRate).toFixed(4)),
    }));
  }

  function customerShipmentRows(rows) {
    return rows.map((s) => ({
      Date: getShipmentReportDate(s) ? new Date(getShipmentReportDate(s)).toISOString().slice(0, 10) : "Not set",
      "Shipment ID": s.id,
      Customer: s.customer || "",
      Carrier: s.line || "",
      POL: s.pol || "",
      POD: s.pod || "",
      Route: `${s.pol || ""} → ${s.pod || ""}`,
      "Cargo Type": s.cargoType || "",
      "Container Type": s.containerType || "",
      Quantity: Number(s.qty || 0),
      "Booking No": s.bookingNo || "Not set",
      Vessel: s.vessel || "Not set",
      "Cut-Off": s.cutOff || "",
      ETD: s.etd || "",
      ETA: s.eta || "",
      Status: s.status || "",
      Payment: s.paymentStatus || "",
      "Customer Amount USD": Number(calcOceanSell(s).toFixed(2)),
    }));
  }

  function exportDetailedReportExcel() {
    const wb = XLSX.utils.book_new();
    const summaryRows = [
      { Metric: "Date Range", Value: getDateRangeLabel(reportFromDate, reportToDate) },
      { Metric: "Shipments", Value: reportData.summary.shipments },
      { Metric: "Units / Containers", Value: reportData.summary.containers },
      { Metric: "Revenue USD", Value: Number(reportData.summary.revenue.toFixed(2)) },
      { Metric: "Total Costs USD", Value: Number(reportData.summary.costs.toFixed(2)) },
      { Metric: "Gross Profit USD", Value: Number(reportData.summary.grossProfit.toFixed(2)) },
      { Metric: "Total Expenses USD", Value: Number(reportData.summary.expenses.toFixed(2)) },
      { Metric: "Net Profit USD", Value: Number(reportData.summary.netProfit.toFixed(2)) },
    ];
    const customerRows = reportData.customers.map((row) => ({
      Customer: row.name,
      Shipments: row.shipments,
      "Revenue USD": Number(row.revenue.toFixed(2)),
      "Net Profit USD": Number(row.netProfit.toFixed(2)),
    }));
    const expenseRows = reportData.expenseCompanies.map((row) => ({
      Company: row.company,
      "Expense Count": row.count,
      "Amount USD": Number(row.amountUsd.toFixed(2)),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reportShipmentRows()), "Shipments");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customerRows), "Profit by Customer");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseRows), "Expenses by Company");
    XLSX.writeFile(wb, `freight-os-detailed-report-${safeFileName(getDateRangeLabel(reportFromDate, reportToDate))}.xlsx`);
  }

  function exportDetailedReportPdf() {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Freight OS - Detailed Report", 14, 16);
    doc.setFontSize(10);
    doc.text(`Date Range: ${getDateRangeLabel(reportFromDate, reportToDate)} | Exported: ${new Date().toLocaleString()}`, 14, 24);
    autoTable(doc, {
      startY: 30,
      head: [["Shipments", "Units", "Revenue", "Costs", "Gross", "Expenses", "Net"]],
      body: [[
        reportData.summary.shipments,
        reportData.summary.containers,
        money(reportData.summary.revenue),
        money(reportData.summary.costs),
        money(reportData.summary.grossProfit),
        money(reportData.summary.expenses),
        money(reportData.summary.netProfit),
      ]],
    });
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Date", "Shipment", "Customer", "Company", "Route", "Status", "Revenue", "Costs", "Net"]],
      body: reportData.shipments.map((s) => [
        getShipmentReportDate(s) ? new Date(getShipmentReportDate(s)).toISOString().slice(0, 10) : "Not set",
        s.id,
        s.customer,
        s.line,
        `${s.pol} → ${s.pod}`,
        s.status,
        money(calcOceanSell(s)),
        money(calcTotalCostUsd(s, activeFxRate)),
        money(calcNetProfit(s, activeFxRate)),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fontSize: 8 },
    });
    doc.save(`freight-os-detailed-report-${safeFileName(getDateRangeLabel(reportFromDate, reportToDate))}.pdf`);
  }

  function getClientReportShipments() {
    return reportData.shipments.filter((s) => clientReportCustomer === "all" || s.customer === clientReportCustomer);
  }

  function exportClientReportExcel() {
    const rows = customerShipmentRows(getClientReportShipments());
    if (!rows.length) {
      alert("No shipments found for this client and selected date range.");
      return;
    }
    const customerName = clientReportCustomer === "all" ? "All Customers" : clientReportCustomer;
    const summary = [
      { Metric: "Customer", Value: customerName },
      { Metric: "Date Range", Value: getDateRangeLabel(reportFromDate, reportToDate) },
      { Metric: "Shipments", Value: rows.length },
      { Metric: "Total Customer Amount USD", Value: rows.reduce((sum, r) => sum + Number(r["Customer Amount USD"] || 0), 0) },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Client Shipments");
    const safeName = safeFileName(customerName);
    XLSX.writeFile(wb, `freight-os-client-report-${safeName}-${safeFileName(getDateRangeLabel(reportFromDate, reportToDate))}.xlsx`);
  }

  function exportClientReportPdf() {
    const rows = getClientReportShipments();
    if (!rows.length) {
      alert("No shipments found for this client and selected date range.");
      return;
    }
    const customerName = clientReportCustomer === "all" ? "All Customers" : clientReportCustomer;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text(`Shipment Report - ${customerName}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Date Range: ${getDateRangeLabel(reportFromDate, reportToDate)} | Exported: ${new Date().toLocaleString()}`, 14, 24);
    autoTable(doc, {
      startY: 30,
      head: [["Date", "Shipment", "Carrier", "Route", "Cargo", "Qty", "Booking", "Vessel", "Cut-Off", "ETD", "ETA", "Status", "Payment", "Amount"]],
      body: rows.map((s) => [
        getShipmentReportDate(s) ? new Date(getShipmentReportDate(s)).toISOString().slice(0, 10) : "Not set",
        s.id,
        s.line || "",
        `${s.pol || ""} → ${s.pod || ""}`,
        `${s.cargoType || ""} / ${s.containerType || ""}`,
        Number(s.qty || 0),
        s.bookingNo || "Not set",
        s.vessel || "Not set",
        s.cutOff || "",
        s.etd || "",
        s.eta || "",
        s.status || "",
        s.paymentStatus || "",
        money(calcOceanSell(s)),
      ]),
      styles: { fontSize: 7 },
      headStyles: { fontSize: 7 },
    });
    const safeName = safeFileName(customerName);
    doc.save(`freight-os-client-report-${safeName}-${safeFileName(getDateRangeLabel(reportFromDate, reportToDate))}.pdf`);
  }

  function updateBooking(field, value) {
    setBookingForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateTransport(field, value) {
    setTransportForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateExpense(field, value) {
    setExpenseForm((prev) => ({ ...prev, [field]: value }));
  }

  function updatePayment(field, value) {
    setPaymentForm((prev) => ({ ...prev, [field]: value }));
  }

  function startEditPayment(shipmentId, payment) {
    if (!canManagePayments) return;
    setEditingPayment({ shipmentId, paymentId: payment.id });
    setPaymentForm({
      shipmentId,
      purchaseType: payment.purchaseType || "Ocean Freight",
      company: payment.company || "",
      amount: String(payment.amount || ""),
      currency: payment.currency || "USD",
      fxRate: String(payment.fxRate || activeFxRate),
      paidDate: payment.paidDate || new Date().toISOString().slice(0, 10),
      note: payment.note || "",
    });
  }

  function cancelEditPayment() {
    setEditingPayment(null);
    setPaymentForm({ ...emptyPaymentForm, fxRate: String(activeFxRate) });
  }

  function updateReceivable(field, value) {
    setReceivableForm((prev) => ({ ...prev, [field]: value }));
  }

  function getTaskAutoData(shipment, taskType = "General") {
    const today = new Date().toISOString().slice(0, 10);
    if (!shipment) {
      return { dueDate: today, title: "", note: "" };
    }

    const booking = shipment.bookingNo || shipment.booking || shipment.id || "Not set";
    const customer = shipment.customer || shipment.customerName || "Not set";
    const route = `${shipment.pol || ""} → ${shipment.pod || ""}`;

    const dateByType = {
      "Cut-Off": shipment.cutOff || today,
      ETD: shipment.etd || shipment.loadingDate || today,
      ETA: shipment.eta || shipment.arrivalDate || today,
      Documents: shipment.eta || shipment.arrivalDate || today,
      Payment: today,
      "Customer Follow-up": today,
      General: today,
    };

    const titleByType = {
      "Cut-Off": `Cut-Off reminder - ${booking}`,
      ETD: `ETD / Departure reminder - ${booking}`,
      ETA: `ETA / Arrival reminder - ${booking}`,
      Documents: `Documents follow-up - ${booking}`,
      Payment: `Payment follow-up - ${booking}`,
      "Customer Follow-up": `Customer follow-up - ${customer}`,
      General: `Follow-up - ${booking}`,
    };

    const dueDate = dateByType[taskType] || today;
    const title = titleByType[taskType] || titleByType.General;
    const note = `${taskType} task for ${customer} | Booking: ${booking} | Route: ${route}${dueDate ? ` | Date: ${dueDate}` : ""}`;

    return { dueDate, title, note };
  }

  function updateTask(field, value) {
    if (field === "shipmentId" || field === "taskType") {
      setTaskForm((prev) => {
        const next = { ...prev, [field]: value };
        const selectedShipment = shipments.find((shipment) => shipment.id === next.shipmentId);
        const autoData = getTaskAutoData(selectedShipment, next.taskType || "General");
        return { ...next, ...autoData };
      });
      return;
    }

    setTaskForm((prev) => ({ ...prev, [field]: value }));
  }

  function pushNotification(notification) {
    setNotifications((prev) => [
      {
        id: `NOT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        read: false,
        createdAt: new Date().toISOString(),
        ...notification,
      },
      ...prev,
    ].slice(0, 50));
  }

  function markNotificationRead(id) {
    setNotifications((prev) => prev.map((item) => item.id === id ? { ...item, read: true } : item));
  }

  function clearNotifications() {
    setNotifications([]);
  }

  function getCustomerRecordForShipment(shipment) {
    return customers.find((customer) => String(customer.name || "").trim().toLowerCase() === String(shipment.customer || "").trim().toLowerCase()) || null;
  }

  function getCustomerEmailForShipment(shipment) {
    const customerRecord = getCustomerRecordForShipment(shipment);
    return shipment.customerEmail || customerRecord?.email || "";
  }

  async function sendEmailJsReminder(toEmail, params) {
    if (!toEmail) return { ok: false, error: "Missing recipient email" };

    const response = await fetch(REMINDER_EMAIL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: toEmail,
          recipient_email: toEmail,
          ...params,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `EmailJS error ${response.status}`);
    }

    return { ok: true };
  }

  function buildReminderCandidates() {
    const tomorrow = toDateKey(addDays(new Date(), 1));
    return shipments.flatMap((shipment) => {
      const sent = shipment.emailReminderSent || {};
      return getReminderEventsForShipment(shipment)
        .filter((event) => toDateKey(event.eventDate) === tomorrow)
        .filter((event) => !isReminderAlreadySent(sent, event))
        .map((event) => ({ shipment, event }));
    });
  }

  function markReminderAsSent(shipmentId, eventKey, eventDate) {
    let updatedSelected = null;
    setShipments((prev) => prev.map((shipment) => {
      if (shipment.id !== shipmentId) return shipment;
      const updated = normalizeShipment({
        ...shipment,
        emailReminderSent: {
          ...(shipment.emailReminderSent || {}),
          [getReminderSentKey(eventKey, eventDate)]: new Date().toISOString(),
        },
      });
      if (selectedShipment?.id === shipment.id) updatedSelected = updated;
      return updated;
    }));
    if (updatedSelected) setSelectedShipment(updatedSelected);
  }

  async function sendReminderForCandidate(candidate) {
    const { shipment, event } = candidate;
    const clientEmail = getCustomerEmailForShipment(shipment);
    const booking = shipment.bookingNo || shipment.booking || shipment.id || "Not set";
    const route = `${shipment.pol || ""} → ${shipment.pod || ""}`;
    const eventDate = toDateKey(event.eventDate);

    const formattedEventDate = eventDate
      ? new Date(`${eventDate}T12:00:00`).toLocaleDateString("en-GB", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "2-digit",
        })
      : "Not set";

    const baseParams = {
      company_name: "FSC Lojistik",
      company_phone: "+905526302162",
      company_address: "Istanbul - Turkey",
      customer_name: shipment.customer || "Customer",
      booking_no: booking,
      shipment_id: shipment.id,
      route,
      vessel: shipment.vessel || "Not set",
      task_type: event.label,
      event_date: eventDate,
      date: formattedEventDate,
      due_date: formattedEventDate,
      task_date: formattedEventDate,
      reminder_date: new Date().toISOString().slice(0, 10),
      subject: `${event.label} - ${booking}`,
      from_email: appSettings.companyEmail || "info@fsclojistik.com",
      operation_email: appSettings.operationEmail || DEFAULT_OPERATION_EMAIL,
    };

    const recipients = [
      { type: "operation", email: appSettings.operationEmail || DEFAULT_OPERATION_EMAIL, name: "Operation Team" },
    ];
    if (clientEmail) recipients.push({ type: "client", email: clientEmail, name: shipment.customer || "Customer" });

    let successCount = 0;
    const errors = [];

    for (const recipient of recipients) {
      try {
        await sendEmailJsReminder(recipient.email, {
          ...baseParams,
          recipient_type: recipient.type,
          recipient_name: recipient.name,
          message: buildReminderMessage({ shipment, event, recipientType: recipient.type, clientEmail }),
        });
        successCount += 1;
      } catch (error) {
        errors.push(`${recipient.type}: ${error.message}`);
      }
    }

    if (successCount > 0) {
      markReminderAsSent(shipment.id, event.key, event.eventDate);
      pushNotification({
        type: errors.length ? "warning" : "success",
        title: `${event.label} sent - ${booking}`,
        message: `${successCount} email(s) sent${clientEmail ? " to operation/client" : " to operation only. Client email missing."}`,
        shipmentId: shipment.id,
      });
    } else {
      pushNotification({
        type: "error",
        title: `${event.label} failed - ${booking}`,
        message: errors.join(" | ") || "Email could not be sent.",
        shipmentId: shipment.id,
      });
    }
  }

  async function checkAndSendReminders(source = "manual") {
    if (!canEditOperation) {
      if (source === "manual") alert("You do not have permission to send reminders.");
      return;
    }

    const candidates = buildReminderCandidates();
    if (!candidates.length) {
      if (source === "manual") {
        pushNotification({ type: "info", title: "No reminders to send", message: "No Cut-Off, Departure, or Arrival reminders due tomorrow. Only shipments with tomorrow's Cut-Off/ETD/ETA are sent." });
      }
      return;
    }

    setReminderRunning(true);
    try {
      for (const candidate of candidates) {
        await sendReminderForCandidate(candidate);
      }
    } finally {
      setReminderRunning(false);
    }
  }

  useEffect(() => {
    if (!user?.id || !onlineDataLoaded || !canEditOperation || !appSettings.autoEmailReminders) return;
    const autoKey = `freight_auto_reminder_${user.id}_${toDateKey(new Date())}`;
    if (reminderAutoCheckRef.current || localStorage.getItem(autoKey) === "done") return;

    reminderAutoCheckRef.current = true;
    const timer = setTimeout(async () => {
      try {
        await checkAndSendReminders("auto");
        localStorage.setItem(autoKey, "done");
      } catch (error) {
        console.error("Automatic reminder check failed:", error);
        reminderAutoCheckRef.current = false;
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [user?.id, onlineDataLoaded, canEditOperation, appSettings.autoEmailReminders, shipments.length, customers.length]);

  function updateSettings(field, value) {
    setAppSettings((prev) => ({ ...prev, [field]: value }));
  }

  function updateEdit(field, value) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }


  function updateCustomer(field, value) {
    setCustomerForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateSupplier(field, value) {
    setSupplierForm((prev) => ({ ...prev, [field]: value }));
  }

  function updatePort(field, value) {
    setPortForm((prev) => ({ ...prev, [field]: value }));
  }

  function addCustomer(e) {
    e.preventDefault();
    if (!customerForm.name.trim()) {
      alert("Please enter customer name.");
      return;
    }

    if (editingCustomerId) {
      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === editingCustomerId ? { ...customer, ...customerForm, id: editingCustomerId } : customer
        )
      );
      setEditingCustomerId(null);
    } else {
      setCustomers((prev) => [{ id: getNextCustomerId(), ...customerForm }, ...prev]);
    }

    setCustomerForm(emptyCustomerForm);
  }

  function startEditCustomer(customer) {
    setEditingCustomerId(customer.id);
    setCustomerForm({ ...emptyCustomerForm, ...customer });
    setTab("customers");
  }

  function cancelEditCustomer() {
    setEditingCustomerId(null);
    setCustomerForm(emptyCustomerForm);
  }

  function deleteCustomer(id) {
    if (!confirm("Delete this customer?")) return;
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }

  function addSupplier(e) {
    e.preventDefault();
    if (!supplierForm.name.trim()) {
      alert("Please enter company name.");
      return;
    }
    setSuppliers((prev) => [{ id: getNextSupplierId(), ...supplierForm }, ...prev]);
    setSupplierForm(emptySupplierForm);
  }

  function deleteSupplier(id) {
    if (!confirm("Delete this company?")) return;
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  }

  function addPort(e) {
    e.preventDefault();
    if (!portForm.code.trim() || !portForm.name.trim()) {
      alert("Please enter port code and port name.");
      return;
    }
    const newPort = {
      id: portForm.code.trim().toUpperCase(),
      code: portForm.code.trim().toUpperCase(),
      name: portForm.name.trim(),
      country: portForm.country.trim() || "Not set",
    };
    const exists = ports.some((p) => p.code.toUpperCase() === newPort.code);
    if (exists) {
      alert("This port code already exists.");
      return;
    }
    setPorts((prev) => [newPort, ...prev]);
    setPortForm(emptyPortForm);
  }

  function deletePort(code) {
    if (!confirm("Delete this port from the list?")) return;
    setPorts((prev) => prev.filter((p) => p.code !== code));
  }

  function openShipmentDetails(shipment) {
    const normalized = normalizeShipment(shipment);
    setSelectedShipment(normalized);
    setIsEditing(false);
    setTab("details");
  }

  function startEditShipment() {
    if (!selectedShipment) return;
    setEditForm({
      ...emptyEditForm,
      ...selectedShipment,
      qty: String(selectedShipment.qty || ""),
      buyUsd: String(selectedShipment.buyUsd || ""),
      sellUsd: String(selectedShipment.sellUsd || ""),
      bookingNo: selectedShipment.bookingNo === "Not set" ? "" : selectedShipment.bookingNo,
      vessel: selectedShipment.vessel === "Not set" ? "" : selectedShipment.vessel,
    });
    setIsEditing(true);
  }

function saveEditShipment(e) {
  e.preventDefault();
  if (!selectedShipment?.id) return;

  const updatedShipment = normalizeShipment({
    ...selectedShipment,
    ...editForm,
    id: selectedShipment.id, // Never change shipment ID during editing.
    qty: Number(editForm.qty || 0),
    buyUsd: Number(editForm.buyUsd || 0),
    sellUsd: Number(editForm.sellUsd || 0),
    bookingNo: editForm.bookingNo || "Not set",
    vessel: editForm.vessel || "Not set",
  });

  setShipments((prev) =>
    dedupeShipments(prev.map((s) => (s.id === selectedShipment.id ? updatedShipment : s)))
  );
  setSelectedShipment(updatedShipment);
  setIsEditing(false);
}

function addShipmentFromForm(e) {
    e.preventDefault();
    if (!bookingForm.customer || !bookingForm.line || !bookingForm.pol || !bookingForm.pod || !bookingForm.qty || !bookingForm.buyUsd || !bookingForm.sellUsd) {
      alert("Please fill customer, line, route, quantity, buy price, and sell price.");
      return;
    }

    const newShipment = normalizeShipment({
      id: getNextShipmentId(shipments),
      createdAt: new Date().toISOString(),
      entryDate: bookingForm.entryDate || getLocalTodayDateKey(),
      customer: bookingForm.customer,
      line: bookingForm.line,
      pol: bookingForm.pol,
      pod: bookingForm.pod,
      containerType: bookingForm.containerType,
      cargoType: bookingForm.cargoType,
      qty: Number(bookingForm.qty),
      buyUsd: Number(bookingForm.buyUsd),
      sellUsd: Number(bookingForm.sellUsd),
      fx: activeFxRate,
      status: bookingForm.status,
      bookingNo: bookingForm.bookingNo || "Not set",
      vessel: bookingForm.vessel || "Not set",
      cutOff: bookingForm.cutOff,
      etd: bookingForm.etd,
      eta: bookingForm.eta,
      paymentStatus: bookingForm.paymentStatus,
      transports: [],
      expenses: [],
      payments: [],
      tasks: [],
    });

    setShipments((prev) => dedupeShipments([newShipment, ...prev]));
    setBookingForm({ ...emptyBookingForm, entryDate: getLocalTodayDateKey() });
    setTab("shipments");
  }

  function addTransportToShipment(e) {
    e.preventDefault();
    if (!transportForm.shipmentId || !transportForm.company || !transportForm.costTry) {
      alert("Please select shipment, transport company, and cost in TRY.");
      return;
    }

    const newTransport = {
      company: transportForm.company,
      from: transportForm.from,
      to: transportForm.to,
      truckQty: Number(transportForm.truckQty || 1),
      costTry: Number(transportForm.costTry),
      taxRate: Number(transportForm.taxRate || 0),
      note: transportForm.note,
    };

    setShipments((prev) =>
      prev.map((s) =>
        s.id === transportForm.shipmentId ? normalizeShipment({ ...s, transports: [...getTransports(s), newTransport] }) : s
      )
    );

    setTransportForm(emptyTransportForm);
  }

  function addExpenseToShipment(e) {
    e.preventDefault();
    if (!canEditCore) {
      alert("You do not have permission to add expenses.");
      return;
    }
    if (!expenseForm.shipmentId || !expenseForm.amountUsd) {
      alert("Please select shipment and enter expense amount.");
      return;
    }

    const newExpense = {
      company: expenseForm.company || "Not set",
      type: expenseForm.type,
      description: expenseForm.description,
      amountUsd: Number(expenseForm.amountUsd),
    };

    setShipments((prev) =>
      prev.map((s) =>
        s.id === expenseForm.shipmentId ? normalizeShipment({ ...s, expenses: [...getExpenses(s), newExpense] }) : s
      )
    );

    setExpenseForm(emptyExpenseForm);
  }

  function addPaymentToShipment(e) {
    e.preventDefault();
    if (!canManagePayments) {
      alert("Only admin can add payments.");
      return;
    }
    if (!paymentForm.shipmentId || !paymentForm.purchaseType || !paymentForm.amount || !paymentForm.currency) {
      alert("Please select shipment, payment type, currency, and amount.");
      return;
    }

    const targetShipment = shipments.find((s) => s.id === paymentForm.shipmentId);
    const existingPayment = editingPayment
      ? getPayments(targetShipment).find((payment) => payment.id === editingPayment.paymentId)
      : null;
    const newPayment = {
      id: existingPayment?.id || `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      invoiceId: existingPayment?.invoiceId || "",
      purchaseType: paymentForm.purchaseType,
      company: paymentForm.company || (paymentForm.purchaseType === "Customer Receipt" ? targetShipment?.customer : targetShipment?.line) || "Not set",
      amount: Number(paymentForm.amount || 0),
      currency: paymentForm.currency || "USD",
      fxRate: Number(paymentForm.fxRate || targetShipment?.fx || activeFxRate || 1),
      paidDate: paymentForm.paidDate || new Date().toISOString().slice(0, 10),
      note: paymentForm.note,
      createdAt: existingPayment?.createdAt || new Date().toISOString(),
      createdBy: existingPayment?.createdBy || user?.email || "unknown",
      updatedAt: editingPayment ? new Date().toISOString() : undefined,
      updatedBy: editingPayment ? user?.email || "unknown" : undefined,
    };

    let updatedSelected = null;
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== paymentForm.shipmentId) return s;
        const payments = editingPayment
          ? getPayments(s).map((payment) => (payment.id === editingPayment.paymentId ? newPayment : payment))
          : [newPayment, ...getPayments(s)];
        const updated = normalizeShipment({ ...s, payments });
        if (selectedShipment?.id === s.id) updatedSelected = updated;
        return updated;
      })
    );
    if (updatedSelected) setSelectedShipment(updatedSelected);
    setEditingPayment(null);
    setPaymentForm({ ...emptyPaymentForm, fxRate: String(activeFxRate) });
  }

  function addReceivableToShipment(e) {
    e.preventDefault();
    if (!canManagePayments) {
      alert("Only admin can add customer collections.");
      return;
    }
    if (!receivableForm.shipmentId || !receivableForm.amount || !receivableForm.currency) {
      alert("Please select shipment, currency, and amount.");
      return;
    }

    const targetShipment = shipments.find((s) => s.id === receivableForm.shipmentId);
    const newPayment = {
      id: `REC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      purchaseType: "Customer Receipt",
      company: targetShipment?.customer || "Customer",
      amount: Number(receivableForm.amount || 0),
      currency: receivableForm.currency || "USD",
      fxRate: Number(receivableForm.fxRate || targetShipment?.fx || activeFxRate || 1),
      paidDate: receivableForm.paidDate || new Date().toISOString().slice(0, 10),
      note: receivableForm.note,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "unknown",
    };

    let updatedSelected = null;
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== receivableForm.shipmentId) return s;
        const updated = normalizeShipment({ ...s, payments: [newPayment, ...getPayments(s)] });
        if (selectedShipment?.id === s.id) updatedSelected = updated;
        return updated;
      })
    );
    if (updatedSelected) setSelectedShipment(updatedSelected);
    setReceivableForm({ ...emptyReceivableForm, fxRate: String(activeFxRate) });
  }

  function saveFinancialInvoice(shipmentId, invoiceForm, editingInvoiceId) {
    if (!canManagePayments) {
      alert("Only admin can manage invoices.");
      return;
    }

    setShipments((previous) => previous.map((shipment) => {
      if (shipment.id !== shipmentId) return shipment;
      const prior = getFinancialInvoices(shipment).find((row) => row.id === editingInvoiceId);
      const invoiceNo = editingInvoiceId ? prior?.invoiceNo : getNextFinancialInvoiceNumber(shipment, invoiceForm.invoiceType);
      const invoice = {
        ...invoiceForm,
        id: editingInvoiceId || `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        invoiceNo,
        party: invoiceForm.party.trim(),
        amount: Number(invoiceForm.amount || 0),
        fxRate: Number(invoiceForm.fxRate || activeFxRate || 1),
        createdAt: editingInvoiceId ? undefined : new Date().toISOString(),
        updatedAt: editingInvoiceId ? new Date().toISOString() : undefined,
        createdBy: editingInvoiceId ? undefined : user?.email || "unknown",
        updatedBy: editingInvoiceId ? user?.email || "unknown" : undefined,
      };
      const savedInvoice = editingInvoiceId
        ? { ...prior, ...invoice, createdAt: prior?.createdAt, createdBy: prior?.createdBy }
        : invoice;
      const invoices = editingInvoiceId
        ? getFinancialInvoices(shipment).map((row) => (row.id === editingInvoiceId ? savedInvoice : row))
        : [savedInvoice, ...getFinancialInvoices(shipment)];
      const sequences = editingInvoiceId
        ? shipment.financialInvoiceSequences
        : {
          ...(shipment.financialInvoiceSequences || {}),
          [invoiceForm.invoiceType.toLowerCase()]: Number(invoiceNo.match(/(\d+)$/)?.[1] || 0),
        };
      return normalizeShipment({ ...shipment, financialInvoices: invoices, financialInvoiceSequences: sequences });
    }));
  }

  function deleteFinancialInvoice(shipmentId, invoiceId) {
    if (!canManagePayments) {
      alert("Only admin can delete invoices.");
      return;
    }
    if (!confirm("Delete this invoice? Linked payment records will remain as unallocated payments.")) return;
    setShipments((previous) => previous.map((shipment) => {
      if (shipment.id !== shipmentId) return shipment;
      const invoices = getFinancialInvoices(shipment).filter((invoice) => invoice.id !== invoiceId);
      const payments = getPayments(shipment).map((payment) => (
        payment.invoiceId === invoiceId ? { ...payment, invoiceId: "" } : payment
      ));
      return normalizeShipment({ ...shipment, financialInvoices: invoices, payments });
    }));
  }

  function addInvoicePayment(shipmentId, invoice, invoicePaymentForm) {
    if (!canManagePayments) {
      alert("Only admin can add payments.");
      return;
    }

    const newPayment = {
      id: `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      invoiceId: invoice.id,
      purchaseType: getInvoicePaymentType(invoice),
      company: invoice.party || "Not set",
      amount: Number(invoicePaymentForm.amount || 0),
      currency: invoicePaymentForm.currency || "USD",
      fxRate: Number(invoicePaymentForm.fxRate || activeFxRate || 1),
      paidDate: invoicePaymentForm.paidDate || getLocalTodayDateKey(),
      note: invoicePaymentForm.note,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "unknown",
    };

    setShipments((previous) => previous.map((shipment) => (
      shipment.id === shipmentId
        ? normalizeShipment({ ...shipment, payments: [newPayment, ...getPayments(shipment)] })
        : shipment
    )));
  }

  function assignInvoicePayment(shipmentId, paymentId, invoiceId) {
    if (!canManagePayments) {
      alert("Only admin can allocate payments.");
      return;
    }
    setShipments((previous) => previous.map((shipment) => (
      shipment.id === shipmentId
        ? normalizeShipment({
          ...shipment,
          payments: getPayments(shipment).map((payment) => (
            payment.id === paymentId ? { ...payment, invoiceId, updatedAt: new Date().toISOString(), updatedBy: user?.email || "unknown" } : payment
          )),
        })
        : shipment
    )));
  }

  function addTaskToShipment(e) {
    e.preventDefault();
    if (!canEditOperation) {
      alert("You do not have permission to add tasks.");
      return;
    }
    if (!taskForm.shipmentId || !taskForm.title.trim() || !taskForm.dueDate) {
      alert("Please select shipment, task title, and due date.");
      return;
    }

    const newTask = {
      id: `TASK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: taskForm.title.trim(),
      taskType: taskForm.taskType || "General",
      dueDate: taskForm.dueDate,
      priority: taskForm.priority || "Normal",
      note: taskForm.note,
      status: "Pending",
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "unknown",
    };

    let updatedSelected = null;
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== taskForm.shipmentId) return s;
        const updated = normalizeShipment({ ...s, tasks: [newTask, ...getTasks(s)] });
        if (selectedShipment?.id === s.id) updatedSelected = updated;
        return updated;
      })
    );
    if (updatedSelected) setSelectedShipment(updatedSelected);
    setTaskForm(emptyTaskForm);
  }

  function createAutoTasksForShipment(shipment) {
    if (!canEditOperation) {
      alert("You do not have permission to create tasks.");
      return;
    }
    const existingTitles = new Set(getTasks(shipment).map((task) => task.title));
    const autoTasks = [];
    if (shipment.cutOff && !existingTitles.has("Cut-Off reminder")) {
      const due = new Date(shipment.cutOff);
      due.setDate(due.getDate() - 1);
      autoTasks.push({
        id: `TASK-${Date.now()}-cutoff`,
        title: "Cut-Off reminder",
        taskType: "Cut-Off",
        dueDate: due.toISOString().slice(0, 10),
        priority: "High",
        note: `Follow up before cut-off date: ${shipment.cutOff}`,
        status: "Pending",
        createdAt: new Date().toISOString(),
        createdBy: user?.email || "unknown",
      });
    }
    if (shipment.etd && !existingTitles.has("ETD / loading reminder")) {
      const due = new Date(shipment.etd);
      due.setDate(due.getDate() - 1);
      autoTasks.push({
        id: `TASK-${Date.now()}-etd`,
        title: "ETD / loading reminder",
        taskType: "ETD",
        dueDate: due.toISOString().slice(0, 10),
        priority: "High",
        note: `Follow up one day before ETD/loading: ${shipment.etd}`,
        status: "Pending",
        createdAt: new Date().toISOString(),
        createdBy: user?.email || "unknown",
      });
    }
    if (shipment.eta && !existingTitles.has("ETA / arrival reminder")) {
      const due = new Date(shipment.eta);
      due.setDate(due.getDate() - 1);
      autoTasks.push({
        id: `TASK-${Date.now()}-eta`,
        title: "ETA / arrival reminder",
        taskType: "ETA",
        dueDate: due.toISOString().slice(0, 10),
        priority: "High",
        note: `Follow up one day before ETA/arrival: ${shipment.eta}`,
        status: "Pending",
        createdAt: new Date().toISOString(),
        createdBy: user?.email || "unknown",
      });
    }
    if (!autoTasks.length) {
      alert("No Cut-Off/ETD/ETA date found, or auto reminder tasks already exist.");
      return;
    }

    let updatedSelected = null;
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== shipment.id) return s;
        const updated = normalizeShipment({ ...s, tasks: [...autoTasks, ...getTasks(s)] });
        if (selectedShipment?.id === s.id) updatedSelected = updated;
        return updated;
      })
    );
    if (updatedSelected) setSelectedShipment(updatedSelected);
  }

  function toggleTaskStatus(shipmentId, taskId) {
    if (!canEditOperation) {
      alert("You do not have permission to update tasks.");
      return;
    }
    let updatedSelected = null;
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== shipmentId) return s;
        const updated = normalizeShipment({
          ...s,
          tasks: getTasks(s).map((task) =>
            task.id === taskId
              ? { ...task, status: task.status === "Done" ? "Pending" : "Done", completedAt: task.status === "Done" ? "" : new Date().toISOString() }
              : task
          ),
        });
        if (selectedShipment?.id === s.id) updatedSelected = updated;
        return updated;
      })
    );
    if (updatedSelected) setSelectedShipment(updatedSelected);
  }

  function deleteTask(shipmentId, taskId) {
    if (role !== "admin") {
      alert("Only admin can delete tasks.");
      return;
    }
    if (!confirm("Delete this task?")) return;
    let updatedSelected = null;
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== shipmentId) return s;
        const updated = normalizeShipment({ ...s, tasks: getTasks(s).filter((task) => task.id !== taskId) });
        if (selectedShipment?.id === s.id) updatedSelected = updated;
        return updated;
      })
    );
    if (updatedSelected) setSelectedShipment(updatedSelected);
  }

  function deletePayment(shipmentId, paymentId) {
    if (!canManagePayments) {
      alert("Only admin can delete payments.");
      return;
    }
    if (!confirm("Delete this payment record?")) return;

    let updatedSelected = null;
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== shipmentId) return s;
        const updated = normalizeShipment({ ...s, payments: getPayments(s).filter((payment) => payment.id !== paymentId) });
        if (selectedShipment?.id === s.id) updatedSelected = updated;
        return updated;
      })
    );
    if (updatedSelected) setSelectedShipment(updatedSelected);
  }

  function deleteShipment(id) {
    if (!confirm("Delete this shipment?")) return;
    setShipments((prev) => prev.filter((s) => s.id !== id));
    if (selectedShipment?.id === id) {
      setSelectedShipment(null);
      setTab("shipments");
    }
  }

  function deleteTransport(shipmentId, index) {
    if (!confirm("Delete this local transport cost?")) return;
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== shipmentId) return s;
        return normalizeShipment({ ...s, transports: getTransports(s).filter((_, i) => i !== index) });
      })
    );
  }

  function deleteExpense(shipmentId, index) {
    if (!canEditCore) {
      alert("You do not have permission to delete expenses.");
      return;
    }
    if (!confirm("Delete this expense?")) return;
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== shipmentId) return s;
        return normalizeShipment({ ...s, expenses: getExpenses(s).filter((_, i) => i !== index) });
      })
    );
  }

  function resetDemoData() {
    if (!confirm("Reset all data to demo shipments?")) return;
    setShipments(dedupeShipments(defaultShipments));
    setSelectedShipment(null);
    setTab("dashboard");
  }

  async function createBackup(manual = false) {
    if (!user?.id) return;

    const today = new Date().toISOString().slice(0, 10);
    const backupPayload = {
      createdAt: new Date().toISOString(),
      shipments,
      customers,
      suppliers,
      ports,
      fxSettings,
    };

    try {
      const { error } = await supabase.from(ownedTables.backups).upsert(
        [{
          owner_id: user.id,
          backup_date: today,
          data: backupPayload,
          updated_at: new Date().toISOString(),
        }],
        { onConflict: "owner_id,backup_date" }
      );

      if (error) throw error;
      localStorage.setItem(`freight_last_backup_${user.id}`, today);
      setSaveStatus(manual ? "Backup saved today" : "Daily backup saved");
      if (manual) alert("Backup saved successfully.");
    } catch (error) {
      console.error("Backup failed:", error);
      if (manual) alert("Backup failed. Please check Supabase backup table setup.");
    }
  }

function downloadLocalBackup() {
  const backupPayload = {
    app: "Freight OS",
    exportedAt: new Date().toISOString(),
    userEmail: user?.email || "unknown",
    shipments: dedupeShipments(shipments),
    customers,
    suppliers,
    ports,
    fxSettings,
  };

  const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `freight-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importLocalBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || "{}"));
      const backupShipments = Array.isArray(data.shipments) ? data.shipments : [];
      const backupCustomers = Array.isArray(data.customers) ? data.customers : [];
      const backupSuppliers = Array.isArray(data.suppliers) ? data.suppliers : [];
      const backupPorts = Array.isArray(data.ports) ? data.ports : [];

      if (!backupShipments.length && !backupCustomers.length && !backupSuppliers.length && !backupPorts.length) {
        alert("This backup file does not contain Freight OS data.");
        return;
      }

      if (!confirm("Import this local backup? Current data will be replaced by the backup file.")) return;

      setShipments(dedupeShipments(backupShipments));
      setCustomers(backupCustomers);
      setSuppliers(backupSuppliers.length ? backupSuppliers : defaultSuppliers);
      setPorts(backupPorts.length ? backupPorts : defaultWorldPorts);
      if (data.fxSettings) setFxSettings((prev) => ({ ...prev, ...data.fxSettings }));
      setSelectedShipment(null);
      setTab("dashboard");
      setSaveStatus("Backup imported - syncing online...");
      alert("Backup imported successfully.");
    } catch (error) {
      console.error("Backup import failed:", error);
      alert("Could not import backup. Please select a valid Freight OS backup JSON file.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

  useEffect(() => {
    if (!user?.id || !onlineDataLoaded) return;
    const today = new Date().toISOString().slice(0, 10);
    const lastBackup = localStorage.getItem(`freight_last_backup_${user.id}`);
    if (lastBackup === today) return;
    const timer = setTimeout(() => {
      createBackup(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [user?.id, onlineDataLoaded]);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setShipments([]);
    setCustomers([]);
    setSuppliers(defaultSuppliers);
    setPorts(defaultWorldPorts);
    setOnlineDataLoaded(false);
    setSelectedShipment(null);
    setTab("dashboard");
  }

  async function updateAutoRate() {
    setFxLoading(true);
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/USD");
      const data = await response.json();
      const tryRate = data?.rates?.TRY;
      if (!tryRate) throw new Error("TRY rate not found");
      setFxSettings((prev) => ({
        ...prev,
        autoRate: Number(tryRate.toFixed(4)),
        mode: "auto",
        updatedAt: new Date().toLocaleString(),
      }));
    } catch (error) {
      console.error("Auto exchange update failed:", error);
      alert("Could not update automatically. Use manual rate for now.");
    } finally {
      setFxLoading(false);
    }
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandIcon">⚓</div>
          <div>
            <h2>Freight OS</h2>
            <p>Maritime Management</p>
          </div>
        </div>

        <nav className="menu">
          <button className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}>◇ Dashboard</button>
          <button className={tab === "shipments" ? "active" : ""} onClick={() => setTab("shipments")}>▣ Shipments</button>
          <button className={tab === "customers" ? "active" : ""} onClick={() => setTab("customers")}>👥 Customers</button>
          <button className={tab === "suppliers" ? "active" : ""} onClick={() => setTab("suppliers")}>🏢 Companies</button>
          {canEditCore && <button className={tab === "booking" ? "active" : ""} onClick={() => setTab("booking")}>+ Booking</button>}
          <button className={tab === "transport" ? "active" : ""} onClick={() => setTab("transport")}>🚚 Local Transport</button>
          {canSeeFinance && <button className={tab === "expenses" ? "active" : ""} onClick={() => setTab("expenses")}>💸 Expenses</button>}
          {canSeeFinance && <button className={tab === "payments" ? "active" : ""} onClick={() => setTab("payments")}>💳 Payments</button>}
          {canSeeFinance && <button className={tab === "receivables" ? "active" : ""} onClick={() => setTab("receivables")}>💰 Receivables</button>}
          {canSeeFinance && <button className={tab === "financialManagement" ? "active" : ""} onClick={() => setTab("financialManagement")}>▤ Financial Management</button>}
          <button className={tab === "tasks" ? "active" : ""} onClick={() => setTab("tasks")}>⏰ Tasks</button>
          {canSeeFinance && <button className={tab === "exchange" ? "active" : ""} onClick={() => setTab("exchange")}>💱 Exchange Rate</button>}
          <button className={tab === "ports" ? "active" : ""} onClick={() => setTab("ports")}>⚓ Ports</button>
          <button className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}>📊 Reports</button>
          {role === "admin" && <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>⚙️ Settings</button>}
          <button className={tab === "api" ? "active" : ""} onClick={() => setTab("api")}>🛰 API Center</button>
        </nav>

        {canSeeFinance && (
          <div className="sidebarSummary">
            <h4>Financial Summary</h4>
            <p>FX <b className="green">{activeFxRate}</b></p>
            <p>Revenue <b className="green">{money(totals.revenue)}</b></p>
            <p>Total Costs <b className="orange">{money(totals.costs)}</b></p>
            <p>Net <b className="green">{money(totals.netProfit)}</b></p>
            <span>⚠ Unpaid {totals.unpaid}</span>
            <span>🚢 At Sea {totals.atSea}</span>
            <span>✅ Arrived {totals.arrived}</span>
          </div>
        )}
        <button className="ghostBtn" onClick={downloadLocalBackup}>Download Local Backup</button>
        <button className="logoutBtn" onClick={signOut}>Logout</button>
      </aside>

      <main className="main">
        <header className="hero">
          <div>
            <p className="userLine">User: {user?.email} | Role: {role} | {saveStatus}</p>
            <h1>{getTitle(tab)}</h1>
            <p>Container shipment management system</p>
          </div>
          {canEditCore && <button onClick={() => setTab("booking")}>+ New Shipment</button>}
        </header>

        {tab === "dashboard" && <DashboardScreen totals={totals} taskDashboard={taskDashboard} canSeeFinance={canSeeFinance} notifications={notifications} clearNotifications={clearNotifications} markNotificationRead={markNotificationRead} financialDashboard={financialDashboard} cashPosition={cashPosition} dashboardCharts={dashboardCharts} shipments={shipments} activeFxRate={activeFxRate} openShipmentDetails={openShipmentDetails} />}

        {tab === "details" && selectedShipment && <ShipmentDetailsScreen selectedShipment={selectedShipment} activeFxRate={activeFxRate} canSeeFinance={canSeeFinance} canEditOperation={canEditOperation} startEditShipment={startEditShipment} setTab={setTab} isEditing={isEditing} saveEditShipment={saveEditShipment} editForm={editForm} customers={customers} updateEdit={updateEdit} canEditCore={canEditCore} suppliers={suppliers} ports={ports} setIsEditing={setIsEditing} createAutoTasksForShipment={createAutoTasksForShipment} toggleTaskStatus={toggleTaskStatus} role={role} deleteTask={deleteTask} />}

        {tab === "shipments" && <ShipmentsScreen resetShipmentFilters={resetShipmentFilters} query={query} setQuery={setQuery} shipmentFilters={shipmentFilters} customers={customers} updateShipmentFilter={updateShipmentFilter} suppliers={suppliers} setLineFilter={setLineFilter} ports={ports} canSeeFinance={canSeeFinance} role={role} filtered={filtered} openShipmentDetails={openShipmentDetails} activeFxRate={activeFxRate} deleteShipment={deleteShipment} />}

        {tab === "booking" && <BookingScreen addShipmentFromForm={addShipmentFromForm} bookingForm={bookingForm} customers={customers} updateBooking={updateBooking} suppliers={suppliers} ports={ports} activeFxRate={activeFxRate} />}

        {tab === "transport" && <TransportScreen addTransportToShipment={addTransportToShipment} transportForm={transportForm} updateTransport={updateTransport} shipments={shipments} deleteTransport={deleteTransport} canSeeFinance={canSeeFinance} />}

        {tab === "expenses" && canSeeFinance && <ExpensesScreen addExpenseToShipment={addExpenseToShipment} expenseForm={expenseForm} updateExpense={updateExpense} shipments={shipments} suppliers={suppliers} deleteExpense={deleteExpense} canEditCore={canEditCore} />}

        {tab === "payments" && canSeeFinance && <PaymentsScreen canManagePayments={canManagePayments} addPaymentToShipment={addPaymentToShipment} paymentForm={paymentForm} updatePayment={updatePayment} shipments={shipments} activeFxRate={activeFxRate} deletePayment={deletePayment} openShipmentDetails={openShipmentDetails} editingPayment={editingPayment} startEditPayment={startEditPayment} cancelEditPayment={cancelEditPayment} />}

        {tab === "receivables" && canSeeFinance && <ReceivablesScreen canManagePayments={canManagePayments} addReceivableToShipment={addReceivableToShipment} receivableForm={receivableForm} updateReceivable={updateReceivable} shipments={shipments} activeFxRate={activeFxRate} deletePayment={deletePayment} openShipmentDetails={openShipmentDetails} />}

        {tab === "financialManagement" && canSeeFinance && <FinancialManagementScreen shipments={shipments} activeFxRate={activeFxRate} canManagePayments={canManagePayments} saveFinancialInvoice={saveFinancialInvoice} deleteFinancialInvoice={deleteFinancialInvoice} addInvoicePayment={addInvoicePayment} assignInvoicePayment={assignInvoicePayment} />}

        {tab === "tasks" && <TasksScreen canEditOperation={canEditOperation} checkAndSendReminders={checkAndSendReminders} reminderRunning={reminderRunning} taskFilter={taskFilter} setTaskFilter={setTaskFilter} taskDashboard={taskDashboard} addTaskToShipment={addTaskToShipment} taskForm={taskForm} updateTask={updateTask} shipments={shipments} selectedTaskShipment={selectedTaskShipment} notifications={notifications} clearNotifications={clearNotifications} allTasks={allTasks} toggleTaskStatus={toggleTaskStatus} role={role} deleteTask={deleteTask} />}

        {tab === "exchange" && canSeeFinance && <ExchangeScreen activeFxRate={activeFxRate} fxSettings={fxSettings} setFxSettings={setFxSettings} updateAutoRate={updateAutoRate} fxLoading={fxLoading} />}

        {tab === "customers" && <CustomersScreen canEditCore={canEditCore} addCustomer={addCustomer} customerForm={customerForm} updateCustomer={updateCustomer} editingCustomerId={editingCustomerId} cancelEditCustomer={cancelEditCustomer} customers={customers} startEditCustomer={startEditCustomer} role={role} deleteCustomer={deleteCustomer} />}

        {tab === "suppliers" && <SuppliersScreen canEditCore={canEditCore} addSupplier={addSupplier} supplierForm={supplierForm} updateSupplier={updateSupplier} suppliers={suppliers} role={role} deleteSupplier={deleteSupplier} />}

        {tab === "ports" && <PortsScreen canEditCore={canEditCore} addPort={addPort} portForm={portForm} updatePort={updatePort} ports={ports} role={role} deletePort={deletePort} />}

        {tab === "reports" && <ReportsScreen reportFromDate={reportFromDate} setReportFromDate={setReportFromDate} reportToDate={reportToDate} setReportToDate={setReportToDate} canSeeFinance={canSeeFinance} exportDetailedReportExcel={exportDetailedReportExcel} exportDetailedReportPdf={exportDetailedReportPdf} reportData={reportData} clientReportCustomer={clientReportCustomer} customers={customers} setClientReportCustomer={setClientReportCustomer} exportClientReportExcel={exportClientReportExcel} exportClientReportPdf={exportClientReportPdf} openShipmentDetails={openShipmentDetails} activeFxRate={activeFxRate} createBackup={createBackup} downloadLocalBackup={downloadLocalBackup} importLocalBackup={importLocalBackup} role={role} resetDemoData={resetDemoData} />}

        {tab === "settings" && role === "admin" && <SettingsScreen appSettings={appSettings} updateSettings={updateSettings} />}

        {tab === "api" && <ApiScreen />}

      </main>
    </div>
  );
}
