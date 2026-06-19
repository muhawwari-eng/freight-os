import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Login from "./Login";
import { supabase } from "./supabase";
import { DEFAULT_OPERATION_EMAIL, EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, REMINDER_EMAIL_ENDPOINT } from "./config/email";
import { defaultFxSettings, defaultShipments, defaultSuppliers, defaultWorldPorts, emptyBookingForm, emptyCustomerForm, emptyEditForm, emptyExpenseForm, emptyPaymentForm, emptyPortForm, emptyReceivableForm, emptySupplierForm, emptyTaskForm, emptyTransportForm, getLocalTodayDateKey, getNextCustomerId, getNextSupplierId } from "./data/defaults";
import { addDays, buildReminderMessage, calcExpensesUsd, calcGrossProfit, calcNetProfit, calcOceanSell, calcTotalCostUsd, dedupeShipments, getAgingReport, getCurrentMonthKey, getDateRangeLabel, getDaysLeft, getExpenses, getFinancialInvoices, getInvoicePaymentType, getMonthKey, getNextFinancialInvoiceNumber, getNextShipmentId, getPaymentSummary, getPayments, getRate, getReminderEventsForShipment, getReminderSentKey, getShipmentBillableQty, getShipmentDocuments, getShipmentFinancialLedger, getShipmentInternalNotes, getShipmentLoadDescription, getShipmentReportDate, getShipmentShareLinks, getShipmentUnitLabel, getTaskStatus, getTasks, getTransports, isAirShipment, isDateInRange, isFclShipment, isFullTruckShipment, isReminderAlreadySent, money, normalizeShipment, paymentAmountUsd, safeFileName, toDateKey } from "./utils/freight";
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
import { PublicShareScreen } from "./screens/PublicShareScreen";
import { AuditLogScreen } from "./screens/AuditLogScreen";

function decodeSharePayload(value) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(value))));
  } catch {
    return null;
  }
}

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
    entryMonth: "",
    status: "all",
    cargoType: "all",
    paymentStatus: "all",
  });
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [lineFilter, setLineFilter] = useState("all");
  const [tab, setTab] = useState("dashboard");
  const [globalSearch, setGlobalSearch] = useState("");
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
  const [supplierReportSupplier, setSupplierReportSupplier] = useState("all");
  const [financialMonth, setFinancialMonth] = useState(getCurrentMonthKey());
  const defaultAppSettings = {
    operationEmail: DEFAULT_OPERATION_EMAIL,
    companyEmail: "info@fsclojistik.com",
    autoEmailReminders: true,
    etaReminderDays: 1,
    etdReminderDays: 1,
    cutOffReminderDays: 1,
    invoiceDueReminderDays: 3,
    storageBucket: "shipment-documents",
  };
  const [appSettings, setAppSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("freight_app_settings");
      return saved ? { ...defaultAppSettings, ...JSON.parse(saved) } : defaultAppSettings;
    } catch {
      return defaultAppSettings;
    }
  });
  const [publicShare, setPublicShare] = useState(() => {
    const snapshotShare = new URLSearchParams(window.location.search).get("share");
    return snapshotShare ? decodeSharePayload(snapshotShare) : null;
  });
  const [publicShareStatus, setPublicShareStatus] = useState("ready");

  const role = profile?.role || "viewer";
  const canSeeFinance = role === "admin" || role === "partner";
  const canEditCore = role === "admin" || role === "partner";
  const canManagePayments = role === "admin";
  const canEditOperation = canEditCore || role === "operation";
  const activeFxRate = Number(fxSettings.mode === "auto" ? fxSettings.autoRate : fxSettings.manualRate) || 1;
  const globalSearchResults = useMemo(() => {
    const term = globalSearch.trim().toLowerCase();
    if (term.length < 2) return [];
    return shipments.flatMap((shipment) => {
      const matches = [];
      const fields = [
        ["Shipment", shipment.id],
        ["Booking", shipment.bookingNo],
        ["Customer", shipment.customer],
        ["Carrier", shipment.line],
        ["Route", `${shipment.pol || ""} ${shipment.pod || ""}`],
      ];
      fields.forEach(([type, value]) => {
        if (String(value || "").toLowerCase().includes(term)) matches.push({ type, label: value, shipment });
      });
      getFinancialInvoices(shipment).forEach((invoice) => {
        if ([invoice.invoiceNo, invoice.party, invoice.category].some((value) => String(value || "").toLowerCase().includes(term))) {
          matches.push({ type: "Invoice", label: `${invoice.invoiceNo || "Invoice"} | ${invoice.party || ""}`, shipment });
        }
      });
      getShipmentDocuments(shipment).forEach((document) => {
        if ([document.name, document.type].some((value) => String(value || "").toLowerCase().includes(term))) {
          matches.push({ type: "Document", label: `${document.type || "Document"} | ${document.name}`, shipment });
        }
      });
      return matches;
    }).slice(0, 8);
  }, [globalSearch, shipments]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const snapshotShare = params.get("share");
    const tokenShare = params.get("shareToken");

    if (snapshotShare) return;

    if (!tokenShare) return;

    let cancelled = false;
    async function loadPublicShare() {
      setPublicShareStatus("loading");
      try {
        const { data, error } = await supabase.from(ownedTables.shipments).select("item_id,data");
        if (error) throw error;
        const match = (data || [])
          .map((row) => normalizeShipment({ ...row.data, id: row.data?.id || row.item_id }))
          .find((shipment) => getShipmentShareLinks(shipment).some((link) => link.token === tokenShare));
        const link = match ? getShipmentShareLinks(match).find((item) => item.token === tokenShare) : null;
        if (!match || !link) throw new Error("Share link was not found.");
        if (link.disabled) throw new Error("This share link is disabled.");
        if (!cancelled) {
          setPublicShare(buildPublicSharePayload(match, link.permissions || {}, link.token, link.createdAt));
          setPublicShareStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setPublicShare({ error: error.message || "Share link is not available." });
          setPublicShareStatus("error");
        }
      }
    }

    loadPublicShare();
    return () => {
      cancelled = true;
    };
  }, []);

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
      entryMonth: "",
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
        (!shipmentFilters.entryMonth || getMonthKey(getShipmentReportDate(s)) === shipmentFilters.entryMonth) &&
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
        acc.containers += getShipmentBillableQty(s);
        acc.revenue += calcOceanSell(s);
        acc.costs += calcTotalCostUsd(s, activeFxRate);
        acc.grossProfit += calcGrossProfit(s, activeFxRate);
        acc.netProfit += calcNetProfit(s, activeFxRate);
        acc.expenses += calcExpensesUsd(s);
        if (isFclShipment(s)) acc.fcl += Number(s.qty || 0);
        else acc.lcl += 1;
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

  const monthlyFinancialDashboard = useMemo(() => {
    const selectedShipments = shipments.filter((shipment) => getMonthKey(getShipmentReportDate(shipment)) === financialMonth);
    return selectedShipments.reduce(
      (acc, shipment) => {
        const ledger = getShipmentFinancialLedger(shipment, activeFxRate);
        acc.shipments += 1;
        acc.sales += ledger.salesTotal;
        acc.purchases += ledger.purchasesTotal;
        acc.expectedProfit += ledger.expectedProfit;
        acc.cashIn += ledger.cashIn;
        acc.cashOut += ledger.cashOut;
        acc.receivableRemaining += ledger.salesRemaining;
        acc.payableRemaining += ledger.purchasesRemaining;
        return acc;
      },
      {
        month: financialMonth,
        shipments: 0,
        sales: 0,
        purchases: 0,
        expectedProfit: 0,
        cashIn: 0,
        cashOut: 0,
        receivableRemaining: 0,
        payableRemaining: 0,
      }
    );
  }, [shipments, activeFxRate, financialMonth]);

  const actionCenter = useMemo(() => {
    const severityRank = { high: 0, warning: 1, info: 2 };
    const items = [];

    shipments.forEach((shipment) => {
      const route = `${shipment.pol || ""} -> ${shipment.pod || ""}`;
      const statusText = String(shipment.status || "").toLowerCase();
      const ledger = getShipmentFinancialLedger(shipment, activeFxRate);

      if (canSeeFinance) {
        ledger.saleRows
          .filter((row) => row.remainingUsd > 0.01 && row.dueDate)
          .forEach((row) => {
            const daysLeft = getDaysLeft(row.dueDate);
            if (daysLeft === null || daysLeft > 3) return;
            items.push({
              id: `sale-${shipment.id}-${row.id}`,
              severity: daysLeft < 0 ? "high" : "warning",
              type: "Customer Collection",
              title: daysLeft < 0 ? "Customer invoice overdue" : "Customer invoice due soon",
              detail: `${shipment.customer || "Customer"} owes ${money(row.remainingUsd)} for ${row.invoiceNo || shipment.id}. Due ${row.dueDate}.`,
              meta: `${shipment.id} | ${route}`,
              daysLeft,
              shipment,
            });
          });

        ledger.purchaseRows
          .filter((row) => row.remainingUsd > 0.01 && row.dueDate)
          .forEach((row) => {
            const daysLeft = getDaysLeft(row.dueDate);
            if (daysLeft === null || daysLeft > 3) return;
            items.push({
              id: `purchase-${shipment.id}-${row.id}`,
              severity: daysLeft < 0 ? "high" : "warning",
              type: "Supplier Payment",
              title: daysLeft < 0 ? "Supplier invoice overdue" : "Supplier invoice due soon",
              detail: `${row.party || "Supplier"} balance ${money(row.remainingUsd)} for ${row.invoiceNo || shipment.id}. Due ${row.dueDate}.`,
              meta: `${shipment.id} | ${route}`,
              daysLeft,
              shipment,
            });
          });
      }

      const etaDays = getDaysLeft(shipment.eta);
      if (etaDays !== null && etaDays <= 2 && !statusText.includes("completed")) {
        items.push({
          id: `eta-${shipment.id}`,
          severity: etaDays < 0 ? "high" : "warning",
          type: "Arrival Follow-up",
          title: etaDays < 0 ? "ETA passed" : "ETA is close",
          detail: `${shipment.customer || "Customer"} shipment ETA ${shipment.eta}. Confirm arrival status and customer update.`,
          meta: `${shipment.id} | ${route}`,
          daysLeft: etaDays,
          shipment,
        });
      }

      if (statusText.includes("arrived") && !statusText.includes("completed")) {
        items.push({
          id: `arrived-${shipment.id}`,
          severity: "info",
          type: "Operations",
          title: "Arrived shipment not completed",
          detail: "Shipment is marked Arrived. Review documents, payments, and close it when ready.",
          meta: `${shipment.id} | ${route}`,
          daysLeft: 4,
          shipment,
        });
      }

      const netProfit = canSeeFinance ? calcNetProfit(shipment, activeFxRate) : 0;
      if (canSeeFinance && netProfit < 0) {
        items.push({
          id: `loss-${shipment.id}`,
          severity: "high",
          type: "Profit Risk",
          title: "Negative profit shipment",
          detail: `Current net profit is ${money(netProfit)}. Review sale, purchase, expenses, and tax.`,
          meta: `${shipment.id} | ${route}`,
          daysLeft: -1,
          shipment,
        });
      }
    });

    return items
      .sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9) || a.daysLeft - b.daysLeft)
      .slice(0, 18);
  }, [shipments, activeFxRate, canSeeFinance]);

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
        acc.containers += getShipmentBillableQty(s);
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
      "Load Details": getShipmentLoadDescription(s),
      "Billing Unit": getShipmentUnitLabel(s),
      Quantity: getShipmentBillableQty(s),
      CBM: Number(s.cbm || 0),
      "Actual Weight KG": Number(s.actualWeightKg || 0),
      "Volumetric Weight KG": Number(s.volumetricWeightKg || 0),
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
      "Load Details": getShipmentLoadDescription(s),
      "Billing Unit": getShipmentUnitLabel(s),
      Quantity: getShipmentBillableQty(s),
      CBM: Number(s.cbm || 0),
      "Actual Weight KG": Number(s.actualWeightKg || 0),
      "Volumetric Weight KG": Number(s.volumetricWeightKg || 0),
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

  const customerStatement = useMemo(() => {
    const selectedShipments = reportData.shipments.filter((shipment) => clientReportCustomer === "all" || shipment.customer === clientReportCustomer);
    const rows = selectedShipments.map((shipment) => {
      const ledger = getShipmentFinancialLedger(shipment, activeFxRate);
      const payments = getPayments(shipment).filter((payment) => payment.purchaseType === "Customer Receipt");
      return {
        shipment,
        invoiceUsd: ledger.salesTotal,
        collectedUsd: ledger.salesPaid,
        remainingUsd: ledger.salesRemaining,
        status: ledger.salesRemaining <= 0.01 ? "Paid" : ledger.salesPaid > 0 ? "Partially Paid" : "Unpaid",
        invoices: ledger.saleRows,
        payments,
      };
    });
    return rows.reduce(
      (acc, row) => {
        acc.rows.push(row);
        row.invoices.forEach((invoice) => acc.invoices.push({ shipment: row.shipment, invoice }));
        row.payments.forEach((payment) => acc.payments.push({ shipment: row.shipment, payment, amountUsd: paymentAmountUsd(payment, row.shipment, activeFxRate) }));
        acc.shipments += 1;
        acc.invoiceUsd += row.invoiceUsd;
        acc.collectedUsd += row.collectedUsd;
        acc.remainingUsd += row.remainingUsd;
        return acc;
      },
      { rows: [], invoices: [], payments: [], shipments: 0, invoiceUsd: 0, collectedUsd: 0, remainingUsd: 0 }
    );
  }, [reportData.shipments, clientReportCustomer, activeFxRate]);

  const supplierStatement = useMemo(() => {
    const matchesSupplier = (shipment, row) => {
      if (supplierReportSupplier === "all") return true;
      return [row.party, shipment.line, row.category].some((value) => String(value || "").toLowerCase() === supplierReportSupplier.toLowerCase());
    };

    const rows = [];
    reportData.shipments.forEach((shipment) => {
      const ledger = getShipmentFinancialLedger(shipment, activeFxRate);
      ledger.purchaseRows
        .filter((row) => matchesSupplier(shipment, row))
        .forEach((invoice) => {
          rows.push({
            shipment,
            invoice,
            supplier: invoice.party || shipment.line || invoice.category || "Unknown Supplier",
            invoiceUsd: invoice.totalUsd,
            paidUsd: invoice.paidUsd,
            remainingUsd: invoice.remainingUsd,
            status: invoice.status,
            payments: invoice.payments,
          });
        });
    });

    const suppliersMap = new Map();
    rows.forEach((row) => {
      const key = row.supplier || "Unknown Supplier";
      const supplier = suppliersMap.get(key) || { name: key, invoices: 0, shipments: new Set(), invoiceUsd: 0, paidUsd: 0, remainingUsd: 0 };
      supplier.invoices += 1;
      supplier.shipments.add(row.shipment.id);
      supplier.invoiceUsd += row.invoiceUsd;
      supplier.paidUsd += row.paidUsd;
      supplier.remainingUsd += row.remainingUsd;
      suppliersMap.set(key, supplier);
    });

    const payments = rows.flatMap((row) => row.payments.map((payment) => ({
      shipment: row.shipment,
      invoice: row.invoice,
      supplier: row.supplier,
      payment,
      amountUsd: paymentAmountUsd(payment, row.shipment, activeFxRate),
    })));

    return {
      rows,
      suppliers: Array.from(suppliersMap.values()).map((row) => ({ ...row, shipments: row.shipments.size })).sort((a, b) => b.remainingUsd - a.remainingUsd),
      payments,
      shipments: new Set(rows.map((row) => row.shipment.id)).size,
      invoiceUsd: rows.reduce((sum, row) => sum + row.invoiceUsd, 0),
      paidUsd: rows.reduce((sum, row) => sum + row.paidUsd, 0),
      remainingUsd: rows.reduce((sum, row) => sum + row.remainingUsd, 0),
    };
  }, [reportData.shipments, supplierReportSupplier, activeFxRate]);

  const agingReport = useMemo(() => getAgingReport(reportData.shipments, activeFxRate), [reportData.shipments, activeFxRate]);

  const partnerStats = useMemo(() => {
    const customersMap = new Map();
    const suppliersMap = new Map();
    reportData.shipments.forEach((shipment) => {
      const customerKey = shipment.customer || "Unknown Customer";
      const customer = customersMap.get(customerKey) || { name: customerKey, shipments: 0, revenue: 0, profit: 0 };
      customer.shipments += 1;
      customer.revenue += calcOceanSell(shipment);
      customer.profit += calcNetProfit(shipment, activeFxRate);
      customersMap.set(customerKey, customer);

      const supplierKey = shipment.line || "Unknown Supplier";
      const supplier = suppliersMap.get(supplierKey) || { name: supplierKey, shipments: 0, cost: 0 };
      supplier.shipments += 1;
      supplier.cost += calcTotalCostUsd(shipment, activeFxRate);
      suppliersMap.set(supplierKey, supplier);
    });
    return {
      customers: Array.from(customersMap.values()).sort((a, b) => b.profit - a.profit).slice(0, 10),
      suppliers: Array.from(suppliersMap.values()).sort((a, b) => b.cost - a.cost).slice(0, 10),
    };
  }, [reportData.shipments, activeFxRate]);

  function exportClientReportExcel() {
    const rows = customerStatement.rows.map(({ shipment, invoiceUsd, collectedUsd, remainingUsd, status }) => ({
      ...customerShipmentRows([shipment])[0],
      "Invoice Total USD": Number(invoiceUsd.toFixed(2)),
      "Collected USD": Number(collectedUsd.toFixed(2)),
      "Remaining USD": Number(remainingUsd.toFixed(2)),
      "Statement Status": status,
    }));
    if (!rows.length) {
      alert("No shipments found for this client and selected date range.");
      return;
    }
    const customerName = clientReportCustomer === "all" ? "All Customers" : clientReportCustomer;
    const summary = [
      { Metric: "Customer", Value: customerName },
      { Metric: "Date Range", Value: getDateRangeLabel(reportFromDate, reportToDate) },
      { Metric: "Shipments", Value: customerStatement.shipments },
      { Metric: "Invoice Total USD", Value: Number(customerStatement.invoiceUsd.toFixed(2)) },
      { Metric: "Collected USD", Value: Number(customerStatement.collectedUsd.toFixed(2)) },
      { Metric: "Remaining USD", Value: Number(customerStatement.remainingUsd.toFixed(2)) },
    ];
    const invoiceRows = customerStatement.invoices.map(({ shipment, invoice }) => ({
      Date: invoice.invoiceDate || getShipmentReportDate(shipment) || "",
      "Shipment ID": shipment.id,
      Customer: shipment.customer || "",
      "Invoice No": invoice.invoiceNo || "",
      Category: invoice.category || "",
      "Invoice Total USD": Number(invoice.totalUsd.toFixed(2)),
      "Paid USD": Number(invoice.paidUsd.toFixed(2)),
      "Remaining USD": Number(invoice.remainingUsd.toFixed(2)),
      Status: invoice.status,
    }));
    const paymentRows = customerStatement.payments.map(({ shipment, payment, amountUsd }) => ({
      Date: payment.paidDate || "",
      "Shipment ID": shipment.id,
      Customer: shipment.customer || "",
      "Payment Type": payment.purchaseType || "",
      "Payment Amount": Number(payment.amount || 0),
      Currency: payment.currency || "USD",
      "Amount USD": Number(amountUsd.toFixed(2)),
      Note: payment.note || "",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Client Shipments");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoiceRows), "Invoices");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentRows), "Payments");
    const safeName = safeFileName(customerName);
    XLSX.writeFile(wb, `freight-os-client-report-${safeName}-${safeFileName(getDateRangeLabel(reportFromDate, reportToDate))}.xlsx`);
  }

  function exportClientReportPdf() {
    if (!customerStatement.rows.length) {
      alert("No shipments found for this client and selected date range.");
      return;
    }
    const customerName = clientReportCustomer === "all" ? "All Customers" : clientReportCustomer;
    const rows = customerStatement.rows.map((row) => row.shipment);
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text(`Customer Statement - ${customerName}`, 14, 16);
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
        `${s.cargoType || ""} / ${getShipmentLoadDescription(s)}`,
        getShipmentBillableQty(s),
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
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Date", "Shipment", "Payment Type", "Amount", "USD Value", "Note"]],
      body: customerStatement.payments.map(({ shipment, payment, amountUsd }) => [
        payment.paidDate || "",
        shipment.id,
        payment.purchaseType || "",
        money(Number(payment.amount || 0), payment.currency || "USD"),
        money(amountUsd),
        payment.note || "",
      ]),
      styles: { fontSize: 7 },
      headStyles: { fontSize: 7 },
    });
    const safeName = safeFileName(customerName);
    doc.save(`freight-os-client-report-${safeName}-${safeFileName(getDateRangeLabel(reportFromDate, reportToDate))}.pdf`);
  }

  function exportSupplierReportExcel() {
    if (!supplierStatement.rows.length) {
      alert("No supplier movement found for the selected date range.");
      return;
    }
    const supplierName = supplierReportSupplier === "all" ? "All Suppliers" : supplierReportSupplier;
    const summary = [
      { Metric: "Supplier", Value: supplierName },
      { Metric: "Date Range", Value: getDateRangeLabel(reportFromDate, reportToDate) },
      { Metric: "Shipments", Value: supplierStatement.shipments },
      { Metric: "Invoice Total USD", Value: Number(supplierStatement.invoiceUsd.toFixed(2)) },
      { Metric: "Paid USD", Value: Number(supplierStatement.paidUsd.toFixed(2)) },
      { Metric: "Remaining USD", Value: Number(supplierStatement.remainingUsd.toFixed(2)) },
    ];
    const supplierRows = supplierStatement.suppliers.map((row) => ({
      Supplier: row.name,
      Shipments: row.shipments,
      Invoices: row.invoices,
      "Invoice Total USD": Number(row.invoiceUsd.toFixed(2)),
      "Paid USD": Number(row.paidUsd.toFixed(2)),
      "Remaining USD": Number(row.remainingUsd.toFixed(2)),
    }));
    const invoiceRows = supplierStatement.rows.map(({ shipment, invoice, supplier, invoiceUsd, paidUsd, remainingUsd, status }) => ({
      Date: invoice.invoiceDate || getShipmentReportDate(shipment) || "",
      Supplier: supplier,
      "Shipment ID": shipment.id,
      Route: `${shipment.pol || ""} -> ${shipment.pod || ""}`,
      "Invoice No": invoice.invoiceNo || "",
      Category: invoice.category || "",
      "Invoice Total USD": Number(invoiceUsd.toFixed(2)),
      "Paid USD": Number(paidUsd.toFixed(2)),
      "Remaining USD": Number(remainingUsd.toFixed(2)),
      Status: status,
    }));
    const paymentRows = supplierStatement.payments.map(({ shipment, invoice, supplier, payment, amountUsd }) => ({
      Date: payment.paidDate || "",
      Supplier: supplier,
      "Shipment ID": shipment.id,
      "Invoice No": invoice.invoiceNo || "",
      "Payment Type": payment.purchaseType || "",
      "Payment Amount": Number(payment.amount || 0),
      Currency: payment.currency || "USD",
      "Amount USD": Number(amountUsd.toFixed(2)),
      Note: payment.note || "",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(supplierRows), "Suppliers");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoiceRows), "Supplier Invoices");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentRows), "Supplier Payments");
    XLSX.writeFile(wb, `freight-os-supplier-report-${safeFileName(supplierName)}-${safeFileName(getDateRangeLabel(reportFromDate, reportToDate))}.xlsx`);
  }

  function exportSupplierReportPdf() {
    if (!supplierStatement.rows.length) {
      alert("No supplier movement found for the selected date range.");
      return;
    }
    const supplierName = supplierReportSupplier === "all" ? "All Suppliers" : supplierReportSupplier;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text(`Supplier Statement - ${supplierName}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Date Range: ${getDateRangeLabel(reportFromDate, reportToDate)} | Exported: ${new Date().toLocaleString()}`, 14, 24);
    autoTable(doc, {
      startY: 30,
      head: [["Shipments", "Invoice Total", "Paid", "Remaining"]],
      body: [[supplierStatement.shipments, money(supplierStatement.invoiceUsd), money(supplierStatement.paidUsd), money(supplierStatement.remainingUsd)]],
    });
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Date", "Supplier", "Shipment", "Category", "Invoice", "Paid", "Remaining", "Status"]],
      body: supplierStatement.rows.map(({ shipment, invoice, supplier, invoiceUsd, paidUsd, remainingUsd, status }) => [
        invoice.invoiceDate || getShipmentReportDate(shipment) || "",
        supplier,
        shipment.id,
        invoice.category || "",
        money(invoiceUsd),
        money(paidUsd),
        money(remainingUsd),
        status,
      ]),
      styles: { fontSize: 7 },
      headStyles: { fontSize: 7 },
    });
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Date", "Supplier", "Shipment", "Payment Type", "Amount", "USD"]],
      body: supplierStatement.payments.map(({ shipment, supplier, payment, amountUsd }) => [
        payment.paidDate || "",
        supplier,
        shipment.id,
        payment.purchaseType || "",
        money(Number(payment.amount || 0), payment.currency || "USD"),
        money(amountUsd),
      ]),
      styles: { fontSize: 7 },
      headStyles: { fontSize: 7 },
    });
    doc.save(`freight-os-supplier-report-${safeFileName(supplierName)}-${safeFileName(getDateRangeLabel(reportFromDate, reportToDate))}.pdf`);
  }

  function updateBooking(field, value) {
    setBookingForm((prev) => {
      if (field !== "cargoType") return { ...prev, [field]: value };
      return {
        ...prev,
        cargoType: value,
        qty: ["FCL", "CrossFCL", "RoadFull"].includes(value) ? prev.qty : "",
        containerType: ["FCL", "CrossFCL"].includes(value) ? prev.containerType || "40HC" : "",
        cbm: ["Air", "FCL", "CrossFCL", "RoadFull"].includes(value) ? "" : prev.cbm,
        vessel: value === "Air" ? "" : prev.vessel,
        volumetricWeightKg: value === "Air" ? prev.volumetricWeightKg : "",
      };
    });
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
    const daysByEvent = {
      cutOff: Number(appSettings.cutOffReminderDays ?? 1),
      etd: Number(appSettings.etdReminderDays ?? 1),
      eta: Number(appSettings.etaReminderDays ?? 1),
    };
    return shipments.flatMap((shipment) => {
      const sent = shipment.emailReminderSent || {};
      const scheduleEvents = getReminderEventsForShipment(shipment)
        .filter((event) => toDateKey(event.eventDate) === toDateKey(addDays(new Date(), daysByEvent[event.key] ?? 1)))
        .filter((event) => !isReminderAlreadySent(sent, event));
      const invoiceEvents = getShipmentFinancialLedger(shipment, activeFxRate).rows
        .filter((invoice) => invoice.remainingUsd > 0.01 && invoice.dueDate)
        .map((invoice) => ({
          key: `invoice-${invoice.id}`,
          label: "Invoice Due Reminder",
          taskType: "Payment",
          eventDate: invoice.dueDate,
          title: `Invoice due - ${invoice.invoiceNo}`,
          invoice,
        }))
        .filter((event) => toDateKey(event.eventDate) === toDateKey(addDays(new Date(), Number(appSettings.invoiceDueReminderDays ?? 3))))
        .filter((event) => !isReminderAlreadySent(sent, event));
      return [...scheduleEvents, ...invoiceEvents].map((event) => ({ shipment, event }));
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
        pushNotification({ type: "info", title: "No reminders to send", message: "No Cut-Off, Departure, Arrival, or invoice due reminders match the current notification settings." });
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
  }, [user?.id, onlineDataLoaded, canEditOperation, appSettings.autoEmailReminders, appSettings.cutOffReminderDays, appSettings.etdReminderDays, appSettings.etaReminderDays, appSettings.invoiceDueReminderDays, shipments.length, customers.length]);

  function updateSettings(field, value) {
    setAppSettings((prev) => ({ ...prev, [field]: value }));
  }

  async function subscribeShipmentTracking({ shipmentId, trackingNumber, notifyCustomerEmail }) {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error("Your session expired. Please log in again.");

    const response = await fetch("/api/findteu-subscribe", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ shipmentId, trackingNumber, notifyCustomerEmail }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Could not start tracking.");
    }

    setShipments((previous) => previous.map((shipment) => (
      shipment.id === shipmentId
        ? normalizeShipment({ ...shipment, tracking: payload.tracking })
        : shipment
    )));
    return payload;
  }

  async function refreshTrackingUpdates() {
    if (!user?.id) throw new Error("Your session expired. Please log in again.");
    const result = await supabase.from(ownedTables.shipments).select("item_id,data").eq("owner_id", user.id);
    const refreshedShipments = dedupeShipments(readOwnedRows(result, normalizeShipment));
    setShipments(refreshedShipments);
    if (selectedShipment) {
      const refreshedSelection = refreshedShipments.find((shipment) => shipment.id === selectedShipment.id);
      if (refreshedSelection) setSelectedShipment(refreshedSelection);
    }
    return refreshedShipments;
  }

  function updateEdit(field, value) {
    if (field === "cargoType") {
      setEditForm((prev) => ({
        ...prev,
        cargoType: value,
        qty: ["FCL", "CrossFCL", "RoadFull"].includes(value) ? prev.qty : "",
        containerType: ["FCL", "CrossFCL"].includes(value) ? prev.containerType || "40HC" : "",
        cbm: ["Air", "FCL", "CrossFCL", "RoadFull"].includes(value) ? "" : prev.cbm,
        vessel: value === "Air" ? "" : prev.vessel,
        volumetricWeightKg: value === "Air" ? prev.volumetricWeightKg : "",
      }));
      return;
    }
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

  function buildPublicSharePayload(shipment, options = {}, token = "", sharedAt = new Date().toISOString()) {
    const normalized = normalizeShipment(shipment);
    const shareOptions = {
      includePaymentStatus: true,
      includeDocuments: true,
      includeInvoiceAmount: false,
      ...options,
    };
    return {
      version: 2,
      token,
      permissions: shareOptions,
      id: normalized.id,
      customer: normalized.customer,
      pol: normalized.pol,
      pod: normalized.pod,
      bookingNo: normalized.bookingNo,
      cargoType: normalized.cargoType,
      loadDescription: getShipmentLoadDescription(normalized),
      status: normalized.status,
      paymentStatus: shareOptions.includePaymentStatus ? normalized.paymentStatus : "",
      customerAmount: shareOptions.includeInvoiceAmount ? calcOceanSell(normalized) : null,
      cutOff: normalized.cutOff,
      etd: normalized.etd,
      eta: normalized.eta,
      sharedAt,
      documents: shareOptions.includeDocuments
        ? getShipmentDocuments(normalized).map((document) => ({
          id: document.id,
          name: document.name,
          type: document.type,
          uploadedAt: document.uploadedAt,
          customerCanDownload: Boolean(document.customerCanDownload),
          downloadUrl: document.customerCanDownload ? (document.publicUrl || document.dataUrl || "") : "",
        }))
        : [],
    };
  }

  async function shareShipmentWithCustomer(shipment, options = {}) {
    const normalized = normalizeShipment(shipment);
    const shareOptions = {
      includePaymentStatus: true,
      includeDocuments: true,
      includeInvoiceAmount: false,
      ...options,
    };
    const token = `shr_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    const newLink = {
      id: `SHARE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      token,
      permissions: shareOptions,
      disabled: false,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "unknown",
    };
    const url = `${window.location.origin}${window.location.pathname}?shareToken=${encodeURIComponent(token)}`;

    let updatedSelected = null;
    setShipments((previous) => previous.map((item) => {
      if (item.id !== normalized.id) return item;
      const updated = normalizeShipment(withTimeline({
        ...item,
        shareLinks: [newLink, ...getShipmentShareLinks(item)],
      }, createTimelineEvent("Share", "Customer share link generated", `Token: ${token}`)));
      updatedSelected = updated;
      return updated;
    }));
    if (updatedSelected) setSelectedShipment(updatedSelected);

    try {
      await navigator.clipboard.writeText(url);
      alert("Customer share link copied.");
    } catch {
      window.prompt("Copy customer share link:", url);
    }
  }

  function disableShipmentShareLink(shipmentId, linkId) {
    let updatedSelected = null;
    setShipments((previous) => previous.map((shipment) => {
      if (shipment.id !== shipmentId) return shipment;
      const link = getShipmentShareLinks(shipment).find((item) => item.id === linkId);
      const updated = normalizeShipment(withTimeline({
        ...shipment,
        shareLinks: getShipmentShareLinks(shipment).map((item) => item.id === linkId ? { ...item, disabled: true, disabledAt: new Date().toISOString(), disabledBy: user?.email || "unknown" } : item),
      }, createTimelineEvent("Share", "Customer share link disabled", link?.token || linkId)));
      if (selectedShipment?.id === shipmentId) updatedSelected = updated;
      return updated;
    }));
    if (updatedSelected) setSelectedShipment(updatedSelected);
  }

  function startEditShipment() {
    if (!selectedShipment) return;
    setEditForm({
      ...emptyEditForm,
      ...selectedShipment,
      qty: String(selectedShipment.qty || ""),
      cbm: String(selectedShipment.cbm || ""),
      actualWeightKg: String(selectedShipment.actualWeightKg || ""),
      volumetricWeightKg: String(selectedShipment.volumetricWeightKg || ""),
      packageCount: String(selectedShipment.packageCount || ""),
      buyUsd: String(selectedShipment.buyUsd || ""),
      sellUsd: String(selectedShipment.sellUsd || ""),
      bookingNo: selectedShipment.bookingNo === "Not set" ? "" : selectedShipment.bookingNo,
      vessel: selectedShipment.vessel === "Not set" ? "" : selectedShipment.vessel,
    });
    setIsEditing(true);
  }

  function createTimelineEvent(type, title, note = "") {
    return {
      id: `TL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      title,
      note,
      date: new Date().toISOString(),
      user: user?.email || "unknown",
    };
  }

  function withTimeline(shipment, event) {
    return {
      ...shipment,
      timeline: event ? [event, ...(shipment.timeline || [])] : (shipment.timeline || []),
    };
  }

  function duplicateShipment(sourceShipment) {
    if (!canEditCore) return;
    const source = normalizeShipment(sourceShipment);
    const newId = getNextShipmentId(shipments);
    const duplicate = normalizeShipment(withTimeline({
      ...source,
      id: newId,
      createdAt: new Date().toISOString(),
      entryDate: getLocalTodayDateKey(),
      status: "Draft",
      paymentStatus: "Unpaid",
      bookingNo: "Not set",
      documents: [],
      payments: [],
      financialInvoices: [],
      financialInvoiceSequences: { sale: 0, purchase: 0 },
      tasks: [],
      timeline: [],
      internalNotes: [],
      tracking: {},
    }, createTimelineEvent("Shipment", "Shipment duplicated", `Copied from ${source.id}`)));
    setShipments((previous) => dedupeShipments([duplicate, ...previous]));
    setSelectedShipment(duplicate);
    setTab("details");
  }

  function addInternalNoteToShipment(shipmentId, noteText) {
    const note = noteText.trim();
    if (!note) return;
    let updatedSelected = null;
    setShipments((previous) => previous.map((shipment) => {
      if (shipment.id !== shipmentId) return shipment;
      const newNote = {
        id: `NOTE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        note,
        createdAt: new Date().toISOString(),
        createdBy: user?.email || "unknown",
      };
      const updated = normalizeShipment(withTimeline({
        ...shipment,
        internalNotes: [newNote, ...getShipmentInternalNotes(shipment)],
      }, createTimelineEvent("Note", "Internal note added", note)));
      if (selectedShipment?.id === shipmentId) updatedSelected = updated;
      return updated;
    }));
    if (updatedSelected) setSelectedShipment(updatedSelected);
  }

  function bulkUpdateShipments(ids, updates) {
    if (!canEditCore || !ids.length) return;
    setShipments((previous) => previous.map((shipment) => {
      if (!ids.includes(shipment.id)) return shipment;
      return normalizeShipment(withTimeline({
        ...shipment,
        ...updates,
        updatedAt: new Date().toISOString(),
      }, createTimelineEvent("Shipment", "Bulk update applied", Object.entries(updates).map(([key, value]) => `${key}: ${value}`).join(", "))));
    }));
  }

  async function uploadShipmentDocumentToStorage(shipmentId, file) {
    if (!user?.id || !appSettings.storageBucket) return null;
    const extension = file.name.includes(".") ? file.name.split(".").pop() : "file";
    const path = `${user.id}/${shipmentId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const { error } = await supabase.storage
      .from(appSettings.storageBucket)
      .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(appSettings.storageBucket).getPublicUrl(path);
    return { storageBucket: appSettings.storageBucket, storagePath: path, publicUrl: data?.publicUrl || "" };
  }

  function saveShipmentDocument(shipmentId, file, documentType = "Other") {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("File is too large. Please upload files up to 4 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      let storageData = null;
      try {
        storageData = await uploadShipmentDocumentToStorage(shipmentId, file);
      } catch {
        pushNotification({
          type: "warning",
          title: "Storage upload fallback",
          message: `Supabase Storage was not available for ${file.name}. The file was saved inside shipment data.`,
          shipmentId,
        });
      }
      const newDocument = {
        id: `DOC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        type: documentType || "Other",
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        uploadedAt: new Date().toISOString(),
        dataUrl: reader.result,
        customerCanDownload: false,
        ...storageData,
      };

      let updatedSelected = null;
      setShipments((previous) => previous.map((shipment) => {
        if (shipment.id !== shipmentId) return shipment;
        const updated = normalizeShipment(withTimeline(
          { ...shipment, documents: [newDocument, ...getShipmentDocuments(shipment)] },
          createTimelineEvent("Document", "Document uploaded", `${documentType}: ${file.name}`)
        ));
        updatedSelected = updated;
        return updated;
      }));
      if (updatedSelected) setSelectedShipment(updatedSelected);
    };
    reader.readAsDataURL(file);
  }

  function toggleShipmentDocumentCustomerDownload(shipmentId, documentId) {
    let updatedSelected = null;
    setShipments((previous) => previous.map((shipment) => {
      if (shipment.id !== shipmentId) return shipment;
      const document = getShipmentDocuments(shipment).find((item) => item.id === documentId);
      const enabled = !document?.customerCanDownload;
      const updated = normalizeShipment(withTimeline({
        ...shipment,
        documents: getShipmentDocuments(shipment).map((item) => item.id === documentId ? { ...item, customerCanDownload: enabled } : item),
      }, createTimelineEvent("Document", enabled ? "Document download enabled for customer" : "Document download disabled for customer", document?.name || documentId)));
      if (selectedShipment?.id === shipmentId) updatedSelected = updated;
      return updated;
    }));
    if (updatedSelected) setSelectedShipment(updatedSelected);
  }

  function deleteShipmentDocument(shipmentId, documentId) {
    if (!confirm("Delete this document?")) return;
    let updatedSelected = null;
    setShipments((previous) => previous.map((shipment) => {
      if (shipment.id !== shipmentId) return shipment;
      const removedDocument = getShipmentDocuments(shipment).find((document) => document.id === documentId);
      const updated = normalizeShipment(withTimeline({
        ...shipment,
        documents: getShipmentDocuments(shipment).filter((document) => document.id !== documentId),
      }, createTimelineEvent("Document", "Document deleted", removedDocument?.name || "Shipment document")));
      updatedSelected = updated;
      return updated;
    }));
    if (updatedSelected) setSelectedShipment(updatedSelected);
  }

function saveEditShipment(e) {
  e.preventDefault();
  if (!selectedShipment?.id) return;
  const draftShipment = { ...editForm };
  const billableQty = getShipmentBillableQty(draftShipment);
  const isFcl = isFclShipment(draftShipment);
  const isAir = isAirShipment(draftShipment);
  const isFullTruck = isFullTruckShipment(draftShipment);

  const updatedShipment = normalizeShipment(withTimeline({
    ...selectedShipment,
    ...editForm,
    id: selectedShipment.id, // Never change shipment ID during editing.
    containerType: isFcl ? editForm.containerType || selectedShipment.containerType || "40HC" : "",
    qty: (isFcl || isFullTruck) ? Number(editForm.qty || 0) : billableQty,
    cbm: (isAir || isFcl || isFullTruck) ? "" : editForm.cbm,
    actualWeightKg: editForm.actualWeightKg,
    volumetricWeightKg: editForm.volumetricWeightKg,
    packageCount: editForm.packageCount,
    buyUsd: Number(editForm.buyUsd || 0),
    sellUsd: Number(editForm.sellUsd || 0),
    bookingNo: editForm.bookingNo || "Not set",
    vessel: isAir ? "Not set" : editForm.vessel || "Not set",
    updatedAt: new Date().toISOString(),
  }, createTimelineEvent("Shipment", "Shipment updated", `Status: ${selectedShipment.status || "Not set"} -> ${editForm.status || "Not set"}`)));

  setShipments((prev) =>
    dedupeShipments(prev.map((s) => (s.id === selectedShipment.id ? updatedShipment : s)))
  );
  setSelectedShipment(updatedShipment);
  setIsEditing(false);
}

function addShipmentFromForm(e) {
    e.preventDefault();
    const isFcl = isFclShipment(bookingForm);
    const isAir = isAirShipment(bookingForm);
    const isFullTruck = isFullTruckShipment(bookingForm);
    const billableQty = getShipmentBillableQty(bookingForm);
    if (!bookingForm.customer || !bookingForm.line || !bookingForm.pol || !bookingForm.pod || !bookingForm.buyUsd || !bookingForm.sellUsd) {
      alert("Please fill customer, line, route, buy price, and sell price.");
      return;
    }
    if (!billableQty || ((isFcl || isFullTruck) && !bookingForm.qty) || (!isFcl && !isFullTruck && !isAir && !bookingForm.cbm) || (isAir && !billableQty)) {
      alert(`Please fill a valid ${getShipmentUnitLabel(bookingForm)} quantity for this shipment.`);
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
      containerType: isFcl ? bookingForm.containerType : "",
      cargoType: bookingForm.cargoType,
      qty: (isFcl || isFullTruck) ? Number(bookingForm.qty) : billableQty,
      cbm: (isAir || isFcl || isFullTruck) ? "" : bookingForm.cbm,
      actualWeightKg: bookingForm.actualWeightKg,
      volumetricWeightKg: bookingForm.volumetricWeightKg,
      packageCount: bookingForm.packageCount,
      buyUsd: Number(bookingForm.buyUsd),
      sellUsd: Number(bookingForm.sellUsd),
      fx: activeFxRate,
      status: bookingForm.status,
      bookingNo: bookingForm.bookingNo || "Not set",
      vessel: isAir ? "Not set" : bookingForm.vessel || "Not set",
      cutOff: bookingForm.cutOff,
      etd: bookingForm.etd,
      eta: bookingForm.eta,
      paymentStatus: bookingForm.paymentStatus,
      transports: [],
      expenses: [],
      payments: [],
      tasks: [],
      timeline: [createTimelineEvent("Shipment", "Shipment created", `${bookingForm.customer} | ${bookingForm.pol} -> ${bookingForm.pod}`)],
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
        s.id === transportForm.shipmentId
          ? normalizeShipment(withTimeline({ ...s, transports: [...getTransports(s), newTransport] }, createTimelineEvent("Transport", "Local transport added", `${newTransport.company} | ${newTransport.from || "Origin"} -> ${newTransport.to || "Destination"}`)))
          : s
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
        s.id === expenseForm.shipmentId
          ? normalizeShipment(withTimeline({ ...s, expenses: [...getExpenses(s), newExpense] }, createTimelineEvent("Expense", "Expense added", `${newExpense.type} | ${money(newExpense.amountUsd)}`)))
          : s
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
        const updated = normalizeShipment(withTimeline(
          { ...s, payments },
          createTimelineEvent("Payment", editingPayment ? "Payment updated" : "Payment recorded", `${newPayment.purchaseType} | ${money(newPayment.amount, newPayment.currency)}`)
        ));
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
        const updated = normalizeShipment(withTimeline(
          { ...s, payments: [newPayment, ...getPayments(s)] },
          createTimelineEvent("Payment", "Customer collection recorded", `${money(newPayment.amount, newPayment.currency)} from ${newPayment.company}`)
        ));
        if (selectedShipment?.id === s.id) updatedSelected = updated;
        return updated;
      })
    );
    if (updatedSelected) setSelectedShipment(updatedSelected);
    setReceivableForm({ ...emptyReceivableForm, fxRate: String(activeFxRate) });
  }

  function saveFinancialInvoice(shipmentId, invoiceForm, editingInvoiceId, calculatedInvoiceId) {
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
        taxRate: Number(invoiceForm.taxRate || 0),
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
      const payments = calculatedInvoiceId
        ? getPayments(shipment).map((payment) => (
          payment.invoiceId === calculatedInvoiceId ? { ...payment, invoiceId: savedInvoice.id } : payment
        ))
        : getPayments(shipment);
      const sequences = editingInvoiceId
        ? shipment.financialInvoiceSequences
        : {
          ...(shipment.financialInvoiceSequences || {}),
          [invoiceForm.invoiceType.toLowerCase()]: Number(invoiceNo.match(/(\d+)$/)?.[1] || 0),
        };
      return normalizeShipment(withTimeline(
        { ...shipment, financialInvoices: invoices, financialInvoiceSequences: sequences, payments },
        createTimelineEvent("Invoice", editingInvoiceId ? "Invoice updated" : "Invoice added", `${savedInvoice.invoiceNo} | ${savedInvoice.invoiceType} | ${money(savedInvoice.amount, savedInvoice.currency)}`)
      ));
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
      return normalizeShipment(withTimeline(
        { ...shipment, financialInvoices: invoices, payments },
        createTimelineEvent("Invoice", "Invoice deleted", invoiceId)
      ));
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
      taxRate: Number(invoicePaymentForm.taxRate || 0),
      currency: invoicePaymentForm.currency || "USD",
      fxRate: Number(invoicePaymentForm.fxRate || activeFxRate || 1),
      paidDate: invoicePaymentForm.paidDate || getLocalTodayDateKey(),
      note: invoicePaymentForm.note,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "unknown",
    };

    setShipments((previous) => previous.map((shipment) => (
      shipment.id === shipmentId
        ? normalizeShipment(withTimeline(
          { ...shipment, payments: [newPayment, ...getPayments(shipment)] },
          createTimelineEvent("Payment", "Invoice payment recorded", `${invoice.invoiceNo} | ${money(newPayment.amount, newPayment.currency)}`)
        ))
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
        ? normalizeShipment(withTimeline({
          ...shipment,
          payments: getPayments(shipment).map((payment) => (
            payment.id === paymentId ? { ...payment, invoiceId, updatedAt: new Date().toISOString(), updatedBy: user?.email || "unknown" } : payment
          )),
        }, createTimelineEvent("Payment", "Payment allocated to invoice", invoiceId || "Unallocated")))
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
        const updated = normalizeShipment(withTimeline(
          { ...s, tasks: [newTask, ...getTasks(s)] },
          createTimelineEvent("Task", "Task added", `${newTask.title} | Due ${newTask.dueDate}`)
        ));
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
        const updated = normalizeShipment(withTimeline(
          { ...s, tasks: [...autoTasks, ...getTasks(s)] },
          createTimelineEvent("Task", "Auto reminder tasks created", `${autoTasks.length} reminder task(s) added`)
        ));
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
        const previousTask = getTasks(s).find((task) => task.id === taskId);
        const nextStatus = previousTask?.status === "Done" ? "Pending" : "Done";
        const updated = normalizeShipment(withTimeline({
          ...s,
          tasks: getTasks(s).map((task) =>
            task.id === taskId
              ? { ...task, status: task.status === "Done" ? "Pending" : "Done", completedAt: task.status === "Done" ? "" : new Date().toISOString() }
              : task
          ),
        }, createTimelineEvent("Task", `Task marked ${nextStatus}`, previousTask?.title || taskId)));
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
        const deletedTask = getTasks(s).find((task) => task.id === taskId);
        const updated = normalizeShipment(withTimeline(
          { ...s, tasks: getTasks(s).filter((task) => task.id !== taskId) },
          createTimelineEvent("Task", "Task deleted", deletedTask?.title || taskId)
        ));
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
        const deletedPayment = getPayments(s).find((payment) => payment.id === paymentId);
        const updated = normalizeShipment(withTimeline(
          { ...s, payments: getPayments(s).filter((payment) => payment.id !== paymentId) },
          createTimelineEvent("Payment", "Payment deleted", deletedPayment ? `${deletedPayment.purchaseType} | ${money(deletedPayment.amount, deletedPayment.currency)}` : paymentId)
        ));
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
        const deletedTransport = getTransports(s)[index];
        return normalizeShipment(withTimeline(
          { ...s, transports: getTransports(s).filter((_, i) => i !== index) },
          createTimelineEvent("Transport", "Local transport deleted", deletedTransport?.company || "Transport record")
        ));
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
        const deletedExpense = getExpenses(s)[index];
        return normalizeShipment(withTimeline(
          { ...s, expenses: getExpenses(s).filter((_, i) => i !== index) },
          createTimelineEvent("Expense", "Expense deleted", deletedExpense ? `${deletedExpense.type} | ${money(deletedExpense.amountUsd)}` : "Expense record")
        ));
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

  if (publicShareStatus === "loading") {
    return <PublicShareScreen share={{ error: "Loading customer share link..." }} />;
  }

  if (publicShare) {
    return <PublicShareScreen share={publicShare} />;
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
          {role === "admin" && <button className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}>▤ Audit Log</button>}
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
          <div className="globalSearchBox">
            <input value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Search shipment, booking, customer, invoice, document..." />
            {globalSearchResults.length > 0 && (
              <div className="globalSearchResults">
                {globalSearchResults.map((result, index) => (
                  <button key={`${result.shipment.id}-${result.type}-${index}`} type="button" onClick={() => { openShipmentDetails(result.shipment); setGlobalSearch(""); }}>
                    <b>{result.type}</b>
                    <span>{result.label}</span>
                    <small>{result.shipment.id} | {result.shipment.customer || "No customer"}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
          {canEditCore && <button onClick={() => setTab("booking")}>+ New Shipment</button>}
        </header>

        {tab === "dashboard" && <DashboardScreen totals={totals} taskDashboard={taskDashboard} canSeeFinance={canSeeFinance} notifications={notifications} clearNotifications={clearNotifications} markNotificationRead={markNotificationRead} actionCenter={actionCenter} financialDashboard={financialDashboard} cashPosition={cashPosition} monthlyFinancialDashboard={monthlyFinancialDashboard} financialMonth={financialMonth} setFinancialMonth={setFinancialMonth} dashboardCharts={dashboardCharts} shipments={shipments} activeFxRate={activeFxRate} openShipmentDetails={openShipmentDetails} />}

        {tab === "details" && selectedShipment && <ShipmentDetailsScreen selectedShipment={selectedShipment} activeFxRate={activeFxRate} canSeeFinance={canSeeFinance} canEditOperation={canEditOperation} startEditShipment={startEditShipment} setTab={setTab} isEditing={isEditing} saveEditShipment={saveEditShipment} editForm={editForm} customers={customers} updateEdit={updateEdit} canEditCore={canEditCore} suppliers={suppliers} ports={ports} setIsEditing={setIsEditing} createAutoTasksForShipment={createAutoTasksForShipment} toggleTaskStatus={toggleTaskStatus} role={role} deleteTask={deleteTask} saveShipmentDocument={saveShipmentDocument} deleteShipmentDocument={deleteShipmentDocument} toggleShipmentDocumentCustomerDownload={toggleShipmentDocumentCustomerDownload} shareShipmentWithCustomer={shareShipmentWithCustomer} disableShipmentShareLink={disableShipmentShareLink} duplicateShipment={duplicateShipment} addInternalNoteToShipment={addInternalNoteToShipment} />}

        {tab === "shipments" && <ShipmentsScreen resetShipmentFilters={resetShipmentFilters} query={query} setQuery={setQuery} shipmentFilters={shipmentFilters} customers={customers} updateShipmentFilter={updateShipmentFilter} suppliers={suppliers} setLineFilter={setLineFilter} ports={ports} canSeeFinance={canSeeFinance} role={role} filtered={filtered} openShipmentDetails={openShipmentDetails} activeFxRate={activeFxRate} deleteShipment={deleteShipment} bulkUpdateShipments={bulkUpdateShipments} />}

        {tab === "booking" && <BookingScreen addShipmentFromForm={addShipmentFromForm} bookingForm={bookingForm} customers={customers} updateBooking={updateBooking} suppliers={suppliers} ports={ports} activeFxRate={activeFxRate} />}

        {tab === "transport" && <TransportScreen addTransportToShipment={addTransportToShipment} transportForm={transportForm} updateTransport={updateTransport} shipments={shipments} deleteTransport={deleteTransport} canSeeFinance={canSeeFinance} />}

        {tab === "expenses" && canSeeFinance && <ExpensesScreen addExpenseToShipment={addExpenseToShipment} expenseForm={expenseForm} updateExpense={updateExpense} shipments={shipments} suppliers={suppliers} deleteExpense={deleteExpense} canEditCore={canEditCore} />}

        {tab === "payments" && canSeeFinance && <PaymentsScreen canManagePayments={canManagePayments} addPaymentToShipment={addPaymentToShipment} paymentForm={paymentForm} updatePayment={updatePayment} shipments={shipments} activeFxRate={activeFxRate} deletePayment={deletePayment} openShipmentDetails={openShipmentDetails} editingPayment={editingPayment} startEditPayment={startEditPayment} cancelEditPayment={cancelEditPayment} />}

        {tab === "receivables" && canSeeFinance && <ReceivablesScreen canManagePayments={canManagePayments} addReceivableToShipment={addReceivableToShipment} receivableForm={receivableForm} updateReceivable={updateReceivable} shipments={shipments} activeFxRate={activeFxRate} deletePayment={deletePayment} openShipmentDetails={openShipmentDetails} />}

        {tab === "financialManagement" && canSeeFinance && <FinancialManagementScreen shipments={shipments} activeFxRate={activeFxRate} canManagePayments={canManagePayments} saveFinancialInvoice={saveFinancialInvoice} deleteFinancialInvoice={deleteFinancialInvoice} addInvoicePayment={addInvoicePayment} assignInvoicePayment={assignInvoicePayment} />}

        {tab === "tasks" && <TasksScreen canEditOperation={canEditOperation} checkAndSendReminders={checkAndSendReminders} reminderRunning={reminderRunning} taskFilter={taskFilter} setTaskFilter={setTaskFilter} taskDashboard={taskDashboard} addTaskToShipment={addTaskToShipment} taskForm={taskForm} updateTask={updateTask} shipments={shipments} selectedTaskShipment={selectedTaskShipment} notifications={notifications} clearNotifications={clearNotifications} allTasks={allTasks} toggleTaskStatus={toggleTaskStatus} role={role} deleteTask={deleteTask} />}

        {tab === "exchange" && canSeeFinance && <ExchangeScreen activeFxRate={activeFxRate} fxSettings={fxSettings} setFxSettings={setFxSettings} updateAutoRate={updateAutoRate} fxLoading={fxLoading} />}

        {tab === "customers" && <CustomersScreen canEditCore={canEditCore} addCustomer={addCustomer} customerForm={customerForm} updateCustomer={updateCustomer} editingCustomerId={editingCustomerId} cancelEditCustomer={cancelEditCustomer} customers={customers} startEditCustomer={startEditCustomer} role={role} deleteCustomer={deleteCustomer} shipments={shipments} activeFxRate={activeFxRate} openShipmentDetails={openShipmentDetails} />}

        {tab === "suppliers" && <SuppliersScreen canEditCore={canEditCore} addSupplier={addSupplier} supplierForm={supplierForm} updateSupplier={updateSupplier} suppliers={suppliers} role={role} deleteSupplier={deleteSupplier} shipments={shipments} activeFxRate={activeFxRate} openShipmentDetails={openShipmentDetails} />}

        {tab === "ports" && <PortsScreen canEditCore={canEditCore} addPort={addPort} portForm={portForm} updatePort={updatePort} ports={ports} role={role} deletePort={deletePort} />}

        {tab === "reports" && <ReportsScreen reportFromDate={reportFromDate} setReportFromDate={setReportFromDate} reportToDate={reportToDate} setReportToDate={setReportToDate} canSeeFinance={canSeeFinance} exportDetailedReportExcel={exportDetailedReportExcel} exportDetailedReportPdf={exportDetailedReportPdf} reportData={reportData} clientReportCustomer={clientReportCustomer} customers={customers} setClientReportCustomer={setClientReportCustomer} customerStatement={customerStatement} supplierReportSupplier={supplierReportSupplier} suppliers={suppliers} setSupplierReportSupplier={setSupplierReportSupplier} supplierStatement={supplierStatement} agingReport={agingReport} partnerStats={partnerStats} exportClientReportExcel={exportClientReportExcel} exportClientReportPdf={exportClientReportPdf} exportSupplierReportExcel={exportSupplierReportExcel} exportSupplierReportPdf={exportSupplierReportPdf} openShipmentDetails={openShipmentDetails} activeFxRate={activeFxRate} createBackup={createBackup} downloadLocalBackup={downloadLocalBackup} importLocalBackup={importLocalBackup} role={role} resetDemoData={resetDemoData} />}

        {tab === "audit" && role === "admin" && <AuditLogScreen shipments={shipments} openShipmentDetails={openShipmentDetails} />}

        {tab === "settings" && role === "admin" && <SettingsScreen appSettings={appSettings} updateSettings={updateSettings} />}

        {tab === "api" && <ApiScreen shipments={shipments} canEditOperation={canEditOperation} subscribeShipmentTracking={subscribeShipmentTracking} refreshTrackingUpdates={refreshTrackingUpdates} />}

      </main>
    </div>
  );
}
