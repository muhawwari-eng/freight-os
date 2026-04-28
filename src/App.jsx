import React, { useEffect, useMemo, useState } from "react";
import Login from "./Login";
import { supabase } from "./supabase";

const defaultShipments = [
  {
    id: "SHP-2026-001",
    customer: "Al Noor Trading",
    line: "CMA CGM",
    pol: "Shanghai",
    pod: "Mersin",
    containerType: "40HC",
    cargoType: "FCL",
    qty: 3,
    buyUsd: 2100,
    sellUsd: 2450,
    fx: 32.5,
    status: "Booked",
    bookingNo: "Not set",
    vessel: "Not set",
    cutOff: "",
    etd: "",
    eta: "2026-05-18",
    paymentStatus: "Unpaid",
    transports: [{ company: "Local Trucking A", from: "Mersin Port", to: "Warehouse", costTry: 18500, note: "Port to warehouse" }],
    expenses: [{ type: "Operation", description: "Operation handling", amountUsd: 50 }],
  },
  {
    id: "SHP-2026-002",
    customer: "Hawari Logistics",
    line: "MSC",
    pol: "Ningbo",
    pod: "Iskenderun",
    containerType: "20GP",
    cargoType: "FCL",
    qty: 5,
    buyUsd: 1350,
    sellUsd: 1600,
    fx: 32.5,
    status: "Draft",
    bookingNo: "Not set",
    vessel: "Not set",
    cutOff: "",
    etd: "",
    eta: "2026-05-27",
    paymentStatus: "Unpaid",
    transports: [{ company: "Transport Co B", from: "Iskenderun Port", to: "Client Warehouse", costTry: 24000, note: "Delivery" }],
    expenses: [],
  },
  {
    id: "SHP-2026-003",
    customer: "Damascus Import Co.",
    line: "Maersk",
    pol: "Shenzhen",
    pod: "Mersin",
    containerType: "40HC",
    cargoType: "FCL",
    qty: 1,
    buyUsd: 2250,
    sellUsd: 2700,
    fx: 32.5,
    status: "Arrived",
    bookingNo: "Not set",
    vessel: "Not set",
    cutOff: "",
    etd: "",
    eta: "2026-04-22",
    paymentStatus: "Fully Paid",
    transports: [{ company: "Fast Truck", from: "Mersin Port", to: "Warehouse", costTry: 9500, note: "Single move" }],
    expenses: [],
  },
];


const defaultCustomers = [
  { id: "CUS-001", name: "Al Noor Trading", contact: "", phone: "", email: "", country: "", note: "" },
  { id: "CUS-002", name: "Hawari Logistics", contact: "", phone: "", email: "", country: "", note: "" },
  { id: "CUS-003", name: "Damascus Import Co.", contact: "", phone: "", email: "", country: "", note: "" },
];

const defaultSuppliers = [
  { id: "SUP-001", name: "CMA CGM", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-002", name: "MSC", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-003", name: "Maersk", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-004", name: "Hapag-Lloyd", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-005", name: "COSCO Shipping", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-006", name: "OOCL", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-007", name: "Evergreen", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-008", name: "ONE", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-009", name: "Yang Ming", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-010", name: "HMM", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-011", name: "ZIM", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-012", name: "Turkon Line", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-013", name: "Arkas Line", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-014", name: "Akkon Lines", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-015", name: "Medkon Lines", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-016", name: "Tarros", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-017", name: "Sealand", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-018", name: "Hamburg Sud", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-019", name: "APL", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-020", name: "RCL", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-021", name: "ESL", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-022", name: "SeaLead", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-023", name: "Sinokor", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-024", name: "KMTC", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-025", name: "Wan Hai", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-026", name: "PIL", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-027", name: "WEC Lines", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-028", name: "UFS Line", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-029", name: "Admiral Container Lines", type: "Shipping Line", contact: "", phone: "", email: "", note: "" },
  { id: "SUP-030", name: "Global Feeder Shipping", type: "Shipping Line", contact: "", phone: "", email: "", note: "" }
];

const emptyCustomerForm = {
  name: "",
  contact: "",
  phone: "",
  email: "",
  country: "",
  note: "",
};

const emptySupplierForm = {
  name: "",
  type: "Shipping Line",
  contact: "",
  phone: "",
  email: "",
  note: "",
};

const emptyPortForm = {
  code: "",
  name: "",
  country: "",
};

const defaultWorldPorts = [
  { code: "CNSHA", name: "Shanghai", country: "China" },
  { code: "CNNGB", name: "Ningbo", country: "China" },
  { code: "CNSZX", name: "Shenzhen", country: "China" },
  { code: "CNQIN", name: "Qingdao", country: "China" },
  { code: "CNXMN", name: "Xiamen", country: "China" },
  { code: "CNTAO", name: "Qingdao", country: "China" },
  { code: "TRMER", name: "Mersin", country: "Türkiye" },
  { code: "TRISK", name: "Iskenderun", country: "Türkiye" },
  { code: "TRIZM", name: "Izmir", country: "Türkiye" },
  { code: "TRAMB", name: "Ambarli", country: "Türkiye" },
  { code: "TRIST", name: "Istanbul", country: "Türkiye" },
  { code: "TRGEB", name: "Gebze", country: "Türkiye" },
  { code: "AEJEA", name: "Jebel Ali", country: "UAE" },
  { code: "AEDXB", name: "Dubai", country: "UAE" },
  { code: "SAJED", name: "Jeddah", country: "Saudi Arabia" },
  { code: "SADMM", name: "Dammam", country: "Saudi Arabia" },
  { code: "QAHMD", name: "Hamad", country: "Qatar" },
  { code: "OMSOH", name: "Sohar", country: "Oman" },
  { code: "OMSLL", name: "Salalah", country: "Oman" },
  { code: "KWSWK", name: "Shuwaikh", country: "Kuwait" },
  { code: "BHBAH", name: "Bahrain", country: "Bahrain" },
  { code: "EGALY", name: "Alexandria", country: "Egypt" },
  { code: "EGPSD", name: "Port Said", country: "Egypt" },
  { code: "LBBEY", name: "Beirut", country: "Lebanon" },
  { code: "JODAQ", name: "Aqaba", country: "Jordan" },
  { code: "GRPIR", name: "Piraeus", country: "Greece" },
  { code: "ITGOA", name: "Genoa", country: "Italy" },
  { code: "ITLSP", name: "La Spezia", country: "Italy" },
  { code: "ESBCN", name: "Barcelona", country: "Spain" },
  { code: "ESVLC", name: "Valencia", country: "Spain" },
  { code: "NLRTM", name: "Rotterdam", country: "Netherlands" },
  { code: "DEHAM", name: "Hamburg", country: "Germany" },
  { code: "BEANR", name: "Antwerp", country: "Belgium" },
  { code: "GBFXT", name: "Felixstowe", country: "United Kingdom" },
  { code: "USLAX", name: "Los Angeles", country: "USA" },
  { code: "USNYC", name: "New York", country: "USA" },
  { code: "SGSIN", name: "Singapore", country: "Singapore" },
  { code: "MYTPP", name: "Tanjung Pelepas", country: "Malaysia" },
  { code: "KRPNC", name: "Busan", country: "South Korea" },
  { code: "JPYOK", name: "Yokohama", country: "Japan" },
  { code: "INNSA", name: "Nhava Sheva", country: "India" },
];

function portLabel(port) {
  if (!port) return "";
  return `${port.name} (${port.code}) - ${port.country}`;
}

function getNextCustomerId() {
  return `CUS-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getNextSupplierId() {
  return `SUP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const emptyBookingForm = {
  customer: "",
  line: "",
  pol: "",
  pod: "",
  containerType: "40HC",
  cargoType: "FCL",
  qty: "",
  buyUsd: "",
  sellUsd: "",
  status: "Draft",
  bookingNo: "",
  vessel: "",
  cutOff: "",
  etd: "",
  eta: "",
  paymentStatus: "Unpaid",
};

const emptyTransportForm = {
  shipmentId: "",
  company: "",
  from: "",
  to: "",
  truckQty: "1",
  costTry: "",
  taxRate: "0",
  note: "",
};

const emptyExpenseForm = {
  shipmentId: "",
  company: "",
  type: "Operation",
  description: "",
  amountUsd: "",
};

const emptyEditForm = {
  id: "",
  customer: "",
  line: "",
  pol: "",
  pod: "",
  containerType: "40HC",
  cargoType: "FCL",
  qty: "",
  buyUsd: "",
  sellUsd: "",
  status: "Draft",
  bookingNo: "",
  vessel: "",
  cutOff: "",
  etd: "",
  eta: "",
  paymentStatus: "Unpaid",
};

const defaultFxSettings = {
  mode: "manual",
  manualRate: 32.5,
  autoRate: 32.5,
  updatedAt: "Not updated yet",
};

function money(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function getTransports(shipment) {
  if (Array.isArray(shipment.transports)) return shipment.transports;
  if (shipment.localTry) {
    return [{ company: "Old local transport", from: "", to: "", costTry: Number(shipment.localTry), note: "Imported old cost" }];
  }
  return [];
}

function getExpenses(shipment) {
  return Array.isArray(shipment.expenses) ? shipment.expenses : [];
}

function calcOceanBuy(shipment) {
  return Number(shipment.buyUsd || 0) * Number(shipment.qty || 0);
}

function calcOceanSell(shipment) {
  // Customer sale / revenue only. Expenses must NOT be added here.
  return Number(shipment.sellUsd || 0) * Number(shipment.qty || 0);
}

function calcSingleTransportTry(transport) {
  const truckQty = Number(transport.truckQty || 1) || 1;
  const baseCost = Number(transport.costTry || 0) * truckQty;
  const taxRate = Number(transport.taxRate || 0) || 0;
  return baseCost + (baseCost * taxRate / 100);
}

function calcTransportTry(shipment) {
  return getTransports(shipment).reduce((sum, t) => sum + calcSingleTransportTry(t), 0);
}

function calcExpensesUsd(shipment) {
  return getExpenses(shipment).reduce((sum, e) => sum + Number(e.amountUsd || 0), 0);
}

function getRate(shipment, exchangeRate) {
  // Historical shipments keep their own saved FX rate. The active rate is a fallback only.
  return Number(shipment.fx || exchangeRate || 1) || 1;
}

function calcTotalCostUsd(shipment, exchangeRate) {
  // Total cost = ocean buy + local transport converted to USD + extra expenses.
  const transportUsd = calcTransportTry(shipment) / getRate(shipment, exchangeRate);
  return calcOceanBuy(shipment) + transportUsd + calcExpensesUsd(shipment);
}

function calcGrossProfit(shipment, exchangeRate) {
  const transportUsd = calcTransportTry(shipment) / getRate(shipment, exchangeRate);
  return calcOceanSell(shipment) - calcOceanBuy(shipment) - transportUsd;
}

function calcNetProfit(shipment, exchangeRate) {
  // Net profit deducts extra expenses from gross profit.
  return calcGrossProfit(shipment, exchangeRate) - calcExpensesUsd(shipment);
}

function calcMargin(shipment, exchangeRate) {
  const sale = calcOceanSell(shipment);
  if (!sale) return 0;
  return (calcNetProfit(shipment, exchangeRate) / sale) * 100;
}

function getProgress(shipment) {
  const status = (shipment.status || "").toLowerCase();
  if (status.includes("arrived") || status.includes("completed")) return 100;
  if (status.includes("port")) return 85;
  if (status.includes("sea") || status.includes("transit")) return 65;
  if (status.includes("loading")) return 45;
  if (status.includes("booked")) return 25;
  return 10;
}

function getShipmentReportDate(shipment) {
  return shipment?.createdAt || shipment?.eta || shipment?.etd || shipment?.cutOff || "";
}

function getMonthKey(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 7);
}

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function formatMonthLabel(monthKey) {
  if (!monthKey) return "All dates";
  const [year, month] = monthKey.split("-");
  return month + "/" + year;
}

function getDaysLeft(dateValue) {
  if (!dateValue) return null;
  const today = new Date();
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date - today) / (1000 * 60 * 60 * 24));
}

function getNextShipmentId(shipments) {
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

function dedupeShipments(rows) {
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

function normalizeShipment(shipment) {
  return {
    ...shipment,
    createdAt: shipment.createdAt || shipment.created_at || shipment.eta || shipment.etd || shipment.cutOff || new Date().toISOString(),
    cargoType: shipment.cargoType || "FCL",
    bookingNo: shipment.bookingNo || "Not set",
    vessel: shipment.vessel || "Not set",
    cutOff: shipment.cutOff || "",
    etd: shipment.etd || "",
    eta: shipment.eta || "",
    paymentStatus: shipment.paymentStatus || "Unpaid",
    transports: getTransports(shipment),
    expenses: getExpenses(shipment),
  };
}

const ownedTables = {
  shipments: "freight_shipments_owned",
  customers: "freight_customers_owned",
  suppliers: "freight_suppliers_owned",
  ports: "freight_ports_owned",
  backups: "freight_backups_owned",
};

function getOwnedItemId(item, fallbackPrefix = "ITEM") {
  return String(item?.id || item?.code || `${fallbackPrefix}-${Date.now()}`);
}

async function saveOwnedRows(tableName, ownerId, rows, fallbackPrefix) {
  const byId = new Map();

  rows.forEach((row, index) => {
    const baseId = getOwnedItemId(row, fallbackPrefix);
    let itemId = baseId;

    if (byId.has(itemId)) {
      itemId = `${baseId}-${index}-${Date.now()}`;
    }

    byId.set(itemId, {
      owner_id: ownerId,
      item_id: itemId,
      data: { ...row, id: row.id || itemId },
      updated_at: new Date().toISOString(),
    });
  });

  const cleanRows = Array.from(byId.values());

  // Replace current user rows safely.
  // Upsert prevents duplicate key errors when default rows already exist online.
  const { error: deleteError } = await supabase
    .from(tableName)
    .delete()
    .eq("owner_id", ownerId);

  if (deleteError) throw deleteError;
  if (cleanRows.length === 0) return;

  const { error: upsertError } = await supabase
    .from(tableName)
    .upsert(cleanRows, { onConflict: "owner_id,item_id" });

  if (upsertError) throw upsertError;
}

function readOwnedRows(result, normalizer = (x) => x) {
  if (result.error) throw result.error;
  return (result.data || []).map((row) => normalizer({ ...row.data, id: row.data?.id || row.item_id }));
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
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Saved automatically");
  const [fxLoading, setFxLoading] = useState(false);
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm);
  const [portForm, setPortForm] = useState(emptyPortForm);
  const [onlineDataLoaded, setOnlineDataLoaded] = useState(false);
  const [reportMonth, setReportMonth] = useState(getCurrentMonthKey());

  const role = profile?.role || "viewer";
  const canSeeFinance = role === "admin" || role === "partner";
  const canEditCore = role === "admin" || role === "partner";
  const canEditOperation = canEditCore || role === "operation";
  const activeFxRate = Number(fxSettings.mode === "auto" ? fxSettings.autoRate : fxSettings.manualRate) || 1;

  useEffect(() => {
    if (user?.id) localStorage.setItem(`freight_shipments_${user.id}`, JSON.stringify(shipments));
    setSaveStatus(onlineDataLoaded ? "Saved online" : "Saved locally");
  }, [shipments, onlineDataLoaded, user?.id]);

  useEffect(() => {
    localStorage.setItem("freight_fx_settings", JSON.stringify(fxSettings));
  }, [fxSettings]);

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

    setSaveStatus("Syncing online...");
    const timer = setTimeout(async () => {
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

  const reportData = useMemo(() => {
    const monthShipments = shipments.filter((s) => getMonthKey(getShipmentReportDate(s)) === reportMonth);

    const summary = monthShipments.reduce(
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

    monthShipments.forEach((s) => {
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
      shipments: monthShipments,
      summary,
      customers: Array.from(customersMap.values()).sort((a, b) => b.netProfit - a.netProfit),
      expenseCompanies: Array.from(expenseCompaniesMap.values()).sort((a, b) => b.amountUsd - a.amountUsd),
    };
  }, [shipments, reportMonth, activeFxRate]);

  function getDetailedReportRows() {
    return reportData.shipments.map((s) => {
      const transportTry = calcTransportTry(s);
      const expensesUsd = calcExpensesUsd(s);
      const costsUsd = calcTotalCostUsd(s, activeFxRate);
      const grossProfit = calcGrossProfit(s, activeFxRate);
      const netProfit = calcNetProfit(s, activeFxRate);
      const rate = getRate(s, activeFxRate);

      return {
        created: getShipmentReportDate(s) ? new Date(getShipmentReportDate(s)).toISOString().slice(0, 10) : "Not set",
        shipment: s.id || "",
        customer: s.customer || "",
        company: s.line || "",
        pol: s.pol || "",
        pod: s.pod || "",
        route: `${s.pol || ""} → ${s.pod || ""}`,
        cargoType: s.cargoType || "",
        containerType: s.containerType || "",
        qty: Number(s.qty || 0),
        status: s.status || "",
        paymentStatus: s.paymentStatus || "",
        bookingNo: s.bookingNo || "",
        vessel: s.vessel || "",
        cutOff: s.cutOff || "",
        etd: s.etd || "",
        eta: s.eta || "",
        fx: rate,
        buyUsd: calcOceanBuy(s),
        sellUsd: calcOceanSell(s),
        transportTry,
        expensesUsd,
        costsUsd,
        grossProfit,
        netProfit,
        margin: calcMargin(s, activeFxRate),
        transports: getTransports(s),
        expenses: getExpenses(s),
      };
    });
  }

  function exportMonthlyReportExcel() {
    if (!canSeeFinance) {
      alert("You do not have permission to export financial reports.");
      return;
    }

    const rows = getDetailedReportRows();
    const headers = [
      "Created", "Shipment", "Customer", "Company", "POL", "POD", "Cargo Type", "Container Type", "Qty",
      "Status", "Payment", "Booking No", "Vessel", "Cut-Off", "ETD", "ETA", "FX",
      "Buy USD", "Sell USD", "Transport TRY", "Expenses USD", "Total Cost USD", "Gross Profit USD", "Net Profit USD", "Margin %"
    ];

    const escapeCsv = (value) => {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    };

    const summaryRows = [
      ["Freight OS Detailed Monthly Report"],
      ["Month", formatMonthLabel(reportMonth)],
      ["Shipments", reportData.summary.shipments],
      ["Containers / Units", reportData.summary.containers],
      ["Revenue USD", reportData.summary.revenue],
      ["Total Costs USD", reportData.summary.costs],
      ["Gross Profit USD", reportData.summary.grossProfit],
      ["Expenses USD", reportData.summary.expenses],
      ["Net Profit USD", reportData.summary.netProfit],
      [],
    ];

    const shipmentRows = rows.map((row) => [
      row.created, row.shipment, row.customer, row.company, row.pol, row.pod, row.cargoType, row.containerType, row.qty,
      row.status, row.paymentStatus, row.bookingNo, row.vessel, row.cutOff, row.etd, row.eta, row.fx,
      row.buyUsd, row.sellUsd, row.transportTry, row.expensesUsd, row.costsUsd, row.grossProfit, row.netProfit, row.margin.toFixed(2),
    ]);

    const customerRows = [
      [],
      ["Profit by Customer"],
      ["Customer", "Shipments", "Revenue USD", "Net Profit USD"],
      ...reportData.customers.map((row) => [row.name, row.shipments, row.revenue, row.netProfit]),
    ];

    const expenseRows = [
      [],
      ["Expenses by Company"],
      ["Company", "Expense Count", "Amount USD"],
      ...reportData.expenseCompanies.map((row) => [row.company, row.count, row.amountUsd]),
    ];

    const csvContent = [
      ...summaryRows,
      headers,
      ...shipmentRows,
      ...customerRows,
      ...expenseRows,
    ].map((row) => row.map(escapeCsv).join(",")).join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `freight-os-detailed-report-${reportMonth || "all"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportMonthlyReportPdf() {
    if (!canSeeFinance) {
      alert("You do not have permission to export financial reports.");
      return;
    }

    const rows = getDetailedReportRows();
    const moneyText = (value, currency = "USD") => money(value, currency).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safe = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const shipmentsHtml = rows.map((row) => `
      <tr>
        <td>${safe(row.created)}</td>
        <td>${safe(row.shipment)}</td>
        <td>${safe(row.customer)}</td>
        <td>${safe(row.company)}</td>
        <td>${safe(row.route)}</td>
        <td>${safe(row.status)}</td>
        <td>${row.qty}</td>
        <td>${moneyText(row.sellUsd)}</td>
        <td>${moneyText(row.costsUsd)}</td>
        <td>${moneyText(row.netProfit)}</td>
      </tr>
    `).join("");

    const customersHtml = reportData.customers.map((row) => `
      <tr><td>${safe(row.name)}</td><td>${row.shipments}</td><td>${moneyText(row.revenue)}</td><td>${moneyText(row.netProfit)}</td></tr>
    `).join("");

    const expensesHtml = reportData.expenseCompanies.map((row) => `
      <tr><td>${safe(row.company)}</td><td>${row.count}</td><td>${moneyText(row.amountUsd)}</td></tr>
    `).join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <title>Freight OS Report ${safe(reportMonth)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
            h1, h2 { margin-bottom: 8px; }
            .meta { color: #4b5563; margin-bottom: 18px; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
            .box { border: 1px solid #d1d5db; border-radius: 10px; padding: 10px; }
            .box b { display: block; margin-top: 6px; font-size: 18px; }
            table { width: 100%; border-collapse: collapse; margin: 14px 0 24px; font-size: 11px; }
            th, td { border: 1px solid #d1d5db; padding: 7px; text-align: left; }
            th { background: #f3f4f6; }
            @media print { button { display: none; } body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Freight OS Detailed Monthly Report</h1>
          <div class="meta">Month: ${safe(formatMonthLabel(reportMonth))} | Exported: ${new Date().toLocaleString()}</div>

          <div class="summary">
            <div class="box">Shipments <b>${reportData.summary.shipments}</b></div>
            <div class="box">Revenue <b>${moneyText(reportData.summary.revenue)}</b></div>
            <div class="box">Total Costs <b>${moneyText(reportData.summary.costs)}</b></div>
            <div class="box">Net Profit <b>${moneyText(reportData.summary.netProfit)}</b></div>
          </div>

          <h2>Shipment Details</h2>
          <table>
            <thead>
              <tr><th>Created</th><th>Shipment</th><th>Customer</th><th>Company</th><th>Route</th><th>Status</th><th>Qty</th><th>Revenue</th><th>Costs</th><th>Net</th></tr>
            </thead>
            <tbody>${shipmentsHtml || '<tr><td colspan="10">No shipments for this month.</td></tr>'}</tbody>
          </table>

          <h2>Profit by Customer</h2>
          <table>
            <thead><tr><th>Customer</th><th>Shipments</th><th>Revenue</th><th>Net Profit</th></tr></thead>
            <tbody>${customersHtml || '<tr><td colspan="4">No customer data for this month.</td></tr>'}</tbody>
          </table>

          <h2>Expenses by Company</h2>
          <table>
            <thead><tr><th>Company</th><th>Expense Count</th><th>Amount USD</th></tr></thead>
            <tbody>${expensesHtml || '<tr><td colspan="3">No expenses for this month.</td></tr>'}</tbody>
          </table>

          <button onclick="window.print()">Print / Save as PDF</button>
          <script>window.onload = () => setTimeout(() => window.print(), 400);</script>
        </body>
      </html>
    `;

    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      alert("Please allow popups to export PDF.");
      return;
    }
    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
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
    });

    setShipments((prev) => dedupeShipments([newShipment, ...prev]));
    setBookingForm(emptyBookingForm);
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
    if (lastBackup !== today) createBackup(false);
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
          {canSeeFinance && <button className={tab === "exchange" ? "active" : ""} onClick={() => setTab("exchange")}>💱 Exchange Rate</button>}
          <button className={tab === "ports" ? "active" : ""} onClick={() => setTab("ports")}>⚓ Ports</button>
          <button className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}>📊 Reports</button>
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

        {tab === "dashboard" && (
          <>
            <section className="stats">
              <Card icon="📋" title="Total Shipments" value={totals.shipments} />
              <Card icon="🟦" title="FCL Containers" value={totals.fcl} />
              <Card icon="🟨" title="LCL Shipments" value={totals.lcl} />
              <Card icon="💵" title="Net Profit After Expenses" value={canSeeFinance ? money(totals.netProfit) : "—"} />
            </section>

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
        )}

        {tab === "details" && selectedShipment && (
          <section className="panel">
            <div className="panelHead">
              <h2>Shipment Details - {selectedShipment.id}</h2>
              <div className="actions">
                {canEditOperation && <button className="saveBtn" onClick={startEditShipment}>Edit Shipment</button>}
                <button className="ghostBtn" onClick={() => setTab("shipments")}>Back</button>
              </div>
            </div>

            {isEditing ? (
              <form onSubmit={saveEditShipment} className="editBox">
                <div className="formGrid">
                  <FormField label="Client Name"><CustomerSelect value={editForm.customer} customers={customers} onChange={(value) => updateEdit("customer", value)} disabled={!canEditCore} /></FormField>
                  <FormField label="Carrier / Supplier Company"><SupplierSelect value={editForm.line} suppliers={suppliers} onChange={(value) => updateEdit("line", value)} disabled={!canEditCore} /></FormField>
                  <FormField label="POL / Origin Port"><PortSelect value={editForm.pol} ports={ports} onChange={(value) => updateEdit("pol", value)} disabled={!canEditCore} /></FormField>
                  <FormField label="POD / Destination Port"><PortSelect value={editForm.pod} ports={ports} onChange={(value) => updateEdit("pod", value)} disabled={!canEditCore} /></FormField>
                  <FormField label="Booking No"><input value={editForm.bookingNo} onChange={(e) => updateEdit("bookingNo", e.target.value)} /></FormField>
                  <FormField label="Vessel Name"><input value={editForm.vessel} onChange={(e) => updateEdit("vessel", e.target.value)} /></FormField>
                  <FormField label="Cut-Off Date"><input type="date" value={editForm.cutOff} onChange={(e) => updateEdit("cutOff", e.target.value)} /></FormField>
                  <FormField label="ETD"><input type="date" value={editForm.etd} onChange={(e) => updateEdit("etd", e.target.value)} /></FormField>
                  <FormField label="ETA"><input type="date" value={editForm.eta} onChange={(e) => updateEdit("eta", e.target.value)} /></FormField>
                  <FormField label="Shipment Status"><StatusSelect value={editForm.status} onChange={(value) => updateEdit("status", value)} /></FormField>
                  <FormField label="Payment Status"><PaymentSelect value={editForm.paymentStatus} onChange={(value) => updateEdit("paymentStatus", value)} disabled={!canEditCore} /></FormField>
                  <FormField label="Cargo Type"><CargoSelect value={editForm.cargoType} onChange={(value) => updateEdit("cargoType", value)} /></FormField>
                  {canEditCore && <FormField label="Container Quantity"><input type="number" value={editForm.qty} onChange={(e) => updateEdit("qty", e.target.value)} /></FormField>}
                  {canEditCore && <FormField label="Buy Price / Container USD"><input type="number" value={editForm.buyUsd} onChange={(e) => updateEdit("buyUsd", e.target.value)} /></FormField>}
                  {canEditCore && <FormField label="Sell Price / Container USD"><input type="number" value={editForm.sellUsd} onChange={(e) => updateEdit("sellUsd", e.target.value)} /></FormField>}
                </div>
                <div className="actions mt">
                  <button className="saveBtn" type="submit">Save Changes</button>
                  <button className="ghostBtn" type="button" onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <div className="detailGrid">
                  <p><b>Customer:</b> {selectedShipment.customer}</p>
                  <p><b>Booking No:</b> {selectedShipment.bookingNo || "Not set"}</p>
                  <p><b>Vessel:</b> {selectedShipment.vessel || "Not set"}</p>
                  <p><b>Route:</b> {selectedShipment.pol} → {selectedShipment.pod}</p>
                  <p><b>Cut-Off:</b> {selectedShipment.cutOff || "Not set"}</p>
                  <p><b>ETD / ETA:</b> {selectedShipment.etd || "Not set"} / {selectedShipment.eta || "Not set"}</p>
                  <p><b>Status:</b> {selectedShipment.status}</p>
                  <p><b>Payment:</b> {selectedShipment.paymentStatus}</p>
                  <p><b>FX Rate:</b> {selectedShipment.fx || activeFxRate} TRY/USD</p>
                </div>

                {canSeeFinance && (
                  <>
                    <h3>Financials</h3>
                    <div className="financeNote">
                      <b>Calculation rule:</b> Sale is the amount charged to the customer. Extra expenses are not added to sales; they are deducted from net profit.
                    </div>
                    <div className="detailGrid">
                      <p><b>Customer Sale:</b> {money(calcOceanSell(selectedShipment))}</p>
                      <p><b>Ocean Buy Cost:</b> {money(calcOceanBuy(selectedShipment))}</p>
                      <p><b>Local Transport Cost:</b> {money(calcTransportTry(selectedShipment), "TRY")}</p>
                      <p><b>Extra Expenses:</b> {money(calcExpensesUsd(selectedShipment))}</p>
                      <p><b>Total Cost USD:</b> {money(calcTotalCostUsd(selectedShipment, activeFxRate))}</p>
                      <p><b>Gross Before Expenses:</b> {money(calcGrossProfit(selectedShipment, activeFxRate))}</p>
                      <p><b>Net After Expenses:</b> {money(calcNetProfit(selectedShipment, activeFxRate))}</p>
                    </div>
                  </>
                )}

                <h3>Local Transport</h3>
                {getTransports(selectedShipment).length === 0 && <p>No local transport records.</p>}
                {getTransports(selectedShipment).map((t, i) => (
                  <p key={i}>{t.company} - {canSeeFinance ? money(t.costTry, "TRY") : "Cost hidden"}</p>
                ))}

                {canSeeFinance && (
                  <>
                    <h3>Expenses</h3>
                    {getExpenses(selectedShipment).length === 0 && <p>No extra expenses.</p>}
                    {getExpenses(selectedShipment).map((e, i) => (
                      <p key={i}>{e.company || "No company"} - {e.type} - {e.description || "No description"} - {money(e.amountUsd)}</p>
                    ))}
                  </>
                )}
              </>
            )}
          </section>
        )}

        {tab === "shipments" && (
          <section className="panel">
            <div className="panelHead">
              <div>
                <h2>Shipment List</h2>
                <p>Search and filter all shipment records.</p>
              </div>
              <div className="actions">
                <button className="ghostBtn" onClick={resetShipmentFilters}>Clear Filters</button>
              </div>
            </div>

            <div className="filtersGrid">
              <FormField label="Search"><input placeholder="Shipment, customer, vessel..." value={query} onChange={(e) => setQuery(e.target.value)} /></FormField>
              <FormField label="Customer"><CustomerSelect value={shipmentFilters.customer} customers={[{ id: "all", name: "all" }, ...customers]} onChange={(value) => updateShipmentFilter("customer", value)} /></FormField>
              <FormField label="Company / Line"><select value={shipmentFilters.line} onChange={(e) => { updateShipmentFilter("line", e.target.value); setLineFilter(e.target.value); }}><option value="all">All Lines</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.name}>{supplier.name}</option>)}</select></FormField>
              <FormField label="POL"><PortSelect value={shipmentFilters.pol} ports={[{ code: "all", name: "All Ports", country: "" }, ...ports]} onChange={(value) => updateShipmentFilter("pol", value)} /></FormField>
              <FormField label="POD"><PortSelect value={shipmentFilters.pod} ports={[{ code: "all", name: "All Ports", country: "" }, ...ports]} onChange={(value) => updateShipmentFilter("pod", value)} /></FormField>
              <FormField label="Status"><select value={shipmentFilters.status} onChange={(e) => updateShipmentFilter("status", e.target.value)}><option value="all">All Statuses</option><option value="Draft">Draft</option><option value="Booked">Booked</option><option value="Loading">Loading</option><option value="In Transit">In Transit</option><option value="At Sea">At Sea</option><option value="At Port">At Port</option><option value="Arrived">Arrived</option><option value="Completed">Completed</option></select></FormField>
              <FormField label="Cargo Type"><select value={shipmentFilters.cargoType} onChange={(e) => updateShipmentFilter("cargoType", e.target.value)}><option value="all">All Types</option><option value="FCL">FCL</option><option value="LCL">LCL</option><option value="Road">Road</option><option value="Air">Air</option><option value="Cross">Cross</option></select></FormField>
              <FormField label="Payment"><select value={shipmentFilters.paymentStatus} onChange={(e) => updateShipmentFilter("paymentStatus", e.target.value)}><option value="all">All Payments</option><option value="Unpaid">Unpaid</option><option value="Partially Paid">Partially Paid</option><option value="Fully Paid">Fully Paid</option></select></FormField>
            </div>

            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Shipment</th>
                    <th>Type</th>
                    <th>Vessel</th>
                    <th>Customer</th>
                    <th>Route</th>
                    <th>Cut-Off</th>
                    <th>ETD</th>
                    <th>ETA</th>
                    <th>Status</th>
                    {canSeeFinance && <th>Buy</th>}
                    {canSeeFinance && <th>Sell</th>}
                    {canSeeFinance && <th>Profit</th>}
                    <th>Payment</th>
                    {role === "admin" && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} onClick={() => openShipmentDetails(s)}>
                      <td>{s.id}</td>
                      <td><span className={`typeBadge ${(s.cargoType || "FCL").toLowerCase()}`}>{s.cargoType || "FCL"}</span></td>
                      <td>{s.vessel || "Not set"}</td>
                      <td>{s.customer}</td>
                      <td>{s.pol} → {s.pod}</td>
                      <td>{s.cutOff || "Not set"}</td>
                      <td>{s.etd || "Not set"}</td>
                      <td>{s.eta || "Not set"}</td>
                      <td><span className="badge">{s.status}</span></td>
                      {canSeeFinance && <td>{money(calcOceanBuy(s))}</td>}
                      {canSeeFinance && <td>{money(calcOceanSell(s))}</td>}
                      {canSeeFinance && <td><b>{money(calcNetProfit(s, activeFxRate))}</b></td>}
                      <td><span className="paymentBadge">{s.paymentStatus}</span></td>
                      {role === "admin" && (
                        <td><button className="dangerBtn" onClick={(e) => { e.stopPropagation(); deleteShipment(s.id); }}>Delete</button></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "booking" && (
          <section className="panel">
            <h2>New Booking</h2>
            <form onSubmit={addShipmentFromForm}>
              <div className="formGrid">
                <FormField label="Client Name"><CustomerSelect value={bookingForm.customer} customers={customers} onChange={(value) => updateBooking("customer", value)} /></FormField>
                <FormField label="Carrier / Supplier Company"><SupplierSelect value={bookingForm.line} suppliers={suppliers} onChange={(value) => updateBooking("line", value)} /></FormField>
                <FormField label="POL / Origin Port"><PortSelect value={bookingForm.pol} ports={ports} onChange={(value) => updateBooking("pol", value)} /></FormField>
                <FormField label="POD / Destination Port"><PortSelect value={bookingForm.pod} ports={ports} onChange={(value) => updateBooking("pod", value)} /></FormField>
                <FormField label="Booking No"><input value={bookingForm.bookingNo} onChange={(e) => updateBooking("bookingNo", e.target.value)} /></FormField>
                <FormField label="Vessel Name"><input value={bookingForm.vessel} onChange={(e) => updateBooking("vessel", e.target.value)} /></FormField>
                <FormField label="Container Type"><ContainerSelect value={bookingForm.containerType} onChange={(value) => updateBooking("containerType", value)} /></FormField>
                <FormField label="Cargo Type"><CargoSelect value={bookingForm.cargoType} onChange={(value) => updateBooking("cargoType", value)} /></FormField>
                <FormField label="Container Quantity"><input type="number" value={bookingForm.qty} onChange={(e) => updateBooking("qty", e.target.value)} /></FormField>
                <FormField label="Buy Price / Container USD"><input type="number" value={bookingForm.buyUsd} onChange={(e) => updateBooking("buyUsd", e.target.value)} /></FormField>
                <FormField label="Sell Price / Container USD"><input type="number" value={bookingForm.sellUsd} onChange={(e) => updateBooking("sellUsd", e.target.value)} /></FormField>
                <FormField label="Active FX Rate TRY/USD"><input value={activeFxRate} disabled /></FormField>
                <FormField label="Cut-Off Date"><input type="date" value={bookingForm.cutOff} onChange={(e) => updateBooking("cutOff", e.target.value)} /></FormField>
                <FormField label="ETD"><input type="date" value={bookingForm.etd} onChange={(e) => updateBooking("etd", e.target.value)} /></FormField>
                <FormField label="ETA"><input type="date" value={bookingForm.eta} onChange={(e) => updateBooking("eta", e.target.value)} /></FormField>
                <FormField label="Shipment Status"><StatusSelect value={bookingForm.status} onChange={(value) => updateBooking("status", value)} /></FormField>
                <FormField label="Payment Status"><PaymentSelect value={bookingForm.paymentStatus} onChange={(value) => updateBooking("paymentStatus", value)} /></FormField>
              </div>
              <button className="saveBtn" type="submit">Save Booking</button>
            </form>
          </section>
        )}

        {tab === "transport" && (
          <section className="panel twoCols">
            <div>
              <h2>Local Transport</h2>
              <form onSubmit={addTransportToShipment}>
                <div className="formGrid one">
                  <FormField label="Shipment"><select value={transportForm.shipmentId} onChange={(e) => updateTransport("shipmentId", e.target.value)}><option value="">Select Shipment</option>{shipments.map((s) => <option key={s.id} value={s.id}>{s.id} - {s.customer}</option>)}</select></FormField>
                  <FormField label="Transport Company"><input value={transportForm.company} onChange={(e) => updateTransport("company", e.target.value)} /></FormField>
                  <FormField label="From"><input value={transportForm.from} onChange={(e) => updateTransport("from", e.target.value)} /></FormField>
                  <FormField label="To"><input value={transportForm.to} onChange={(e) => updateTransport("to", e.target.value)} /></FormField>
                  <FormField label="Truck Quantity"><input type="number" min="1" value={transportForm.truckQty} onChange={(e) => updateTransport("truckQty", e.target.value)} /></FormField>
                  <FormField label="Cost per Truck in TRY"><input type="number" value={transportForm.costTry} onChange={(e) => updateTransport("costTry", e.target.value)} /></FormField>
                  <FormField label="VAT / Tax Rate"><select value={transportForm.taxRate} onChange={(e) => updateTransport("taxRate", e.target.value)}><option value="0">0%</option><option value="20">20%</option></select></FormField>
                  <FormField label="Note"><input value={transportForm.note} onChange={(e) => updateTransport("note", e.target.value)} /></FormField>
                </div>
                <button className="saveBtn" type="submit">Add Transport Cost</button>
              </form>
            </div>
            <TransportList shipments={shipments} deleteTransport={deleteTransport} canSeeFinance={canSeeFinance} />
          </section>
        )}

        {tab === "expenses" && canSeeFinance && (
          <section className="panel twoCols">
            <div>
              <h2>Extra Expenses</h2>
              <p className="smallText">Expenses are paid by us and deducted from net profit. They are not added to customer sale/revenue.</p>
              <form onSubmit={addExpenseToShipment}>
                <div className="formGrid one">
                  <FormField label="Shipment"><select value={expenseForm.shipmentId} onChange={(e) => updateExpense("shipmentId", e.target.value)}><option value="">Select Shipment</option>{shipments.map((s) => <option key={s.id} value={s.id}>{s.id} - {s.customer}</option>)}</select></FormField>
                  <FormField label="Expense Company"><SupplierSelect value={expenseForm.company} suppliers={suppliers} onChange={(value) => updateExpense("company", value)} /></FormField>
                  <FormField label="Expense Type"><select value={expenseForm.type} onChange={(e) => updateExpense("type", e.target.value)}><option value="Operation">Operation</option><option value="Commission">Commission</option><option value="Other">Other</option></select></FormField>
                  <FormField label="Description"><input value={expenseForm.description} onChange={(e) => updateExpense("description", e.target.value)} /></FormField>
                  <FormField label="Amount USD"><input type="number" value={expenseForm.amountUsd} onChange={(e) => updateExpense("amountUsd", e.target.value)} /></FormField>
                </div>
                <button className="saveBtn" type="submit">Add Expense</button>
              </form>
            </div>
            <ExpenseList shipments={shipments} deleteExpense={deleteExpense} canEditCore={canEditCore} />
          </section>
        )}

        {tab === "exchange" && canSeeFinance && (
          <section className="panel">
            <div className="panelHead">
              <div>
                <h2>Exchange Rate Center</h2>
                <p>Manage TRY/USD rate used to convert local transport costs into USD profit calculations.</p>
              </div>
              <span className="badge">Active Rate: {activeFxRate} TRY/USD</span>
            </div>

            <div className="exchangeGrid">
              <div className="editBox">
                <h3>Manual Rate</h3>
                <FormField label="Manual TRY/USD Rate">
                  <input
                    type="number"
                    step="0.0001"
                    value={fxSettings.manualRate}
                    onChange={(e) => setFxSettings((prev) => ({ ...prev, manualRate: Number(e.target.value), mode: "manual", updatedAt: new Date().toLocaleString() }))}
                  />
                </FormField>
                <button className="saveBtn mt" onClick={() => setFxSettings((prev) => ({ ...prev, mode: "manual", updatedAt: new Date().toLocaleString() }))}>Use Manual Rate</button>
              </div>

              <div className="editBox">
                <h3>Automatic Rate</h3>
                <p>Current automatic rate: <b>{fxSettings.autoRate}</b></p>
                <p>Last update: {fxSettings.updatedAt}</p>
                <div className="actions mt">
                  <button className="saveBtn" onClick={updateAutoRate} disabled={fxLoading}>{fxLoading ? "Updating..." : "Update Automatically"}</button>
                  <button className="ghostBtn" onClick={() => setFxSettings((prev) => ({ ...prev, mode: "auto" }))}>Use Auto Rate</button>
                </div>
              </div>
            </div>

            <div className="note mt">
              <h3>Important FX Rule</h3>
              <p>The active exchange rate is used for new bookings only. Old shipments keep their own rate to protect historical profit accuracy.</p>
            </div>
          </section>
        )}

        {tab === "customers" && (
          <section className="panel twoCols">
            <div>
              <h2>Customers</h2>
              <p className="smallText">Add and manage your clients for bookings and reports.</p>
              {canEditCore && (
                <form onSubmit={addCustomer}>
                  <div className="formGrid one">
                    <FormField label="Customer Name"><input value={customerForm.name} onChange={(e) => updateCustomer("name", e.target.value)} /></FormField>
                    <FormField label="Contact Person"><input value={customerForm.contact} onChange={(e) => updateCustomer("contact", e.target.value)} /></FormField>
                    <FormField label="Phone"><input value={customerForm.phone} onChange={(e) => updateCustomer("phone", e.target.value)} /></FormField>
                    <FormField label="Email"><input type="email" value={customerForm.email} onChange={(e) => updateCustomer("email", e.target.value)} /></FormField>
                    <FormField label="Country"><input value={customerForm.country} onChange={(e) => updateCustomer("country", e.target.value)} /></FormField>
                    <FormField label="Note"><input value={customerForm.note} onChange={(e) => updateCustomer("note", e.target.value)} /></FormField>
                  </div>
                  <div className="actions mt">
                    <button className="saveBtn" type="submit">{editingCustomerId ? "Save Customer" : "Add Customer"}</button>
                    {editingCustomerId && <button className="ghostBtn" type="button" onClick={cancelEditCustomer}>Cancel</button>}
                  </div>
                </form>
              )}
            </div>
            <div className="note">
              <h3>Customer List</h3>
              <div className="miniList">
                {customers.map((customer) => (
                  <div className="miniCard" key={customer.id}>
                    <b>{customer.name}</b>
                    <p>{customer.contact || "No contact"} {customer.phone ? `• ${customer.phone}` : ""}</p>
                    <p>{customer.email || "No email"} {customer.country ? `• ${customer.country}` : ""}</p>
                    {customer.note && <p>{customer.note}</p>}
                    {canEditCore && (
                      <div className="actions mt">
                        <button className="ghostBtn" onClick={() => startEditCustomer(customer)}>Edit</button>
                        {role === "admin" && <button className="dangerBtn" onClick={() => deleteCustomer(customer.id)}>Delete</button>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === "suppliers" && (
          <section className="panel twoCols">
            <div>
              <h2>Companies / Suppliers</h2>
              <p className="smallText">Add shipping lines, local transport companies, agents, or operation suppliers.</p>
              {canEditCore && (
                <form onSubmit={addSupplier}>
                  <div className="formGrid one">
                    <FormField label="Company Name"><input value={supplierForm.name} onChange={(e) => updateSupplier("name", e.target.value)} /></FormField>
                    <FormField label="Company Type">
                      <select value={supplierForm.type} onChange={(e) => updateSupplier("type", e.target.value)}>
                        <option value="Shipping Line">Shipping Line</option>
                        <option value="Airline">Airline</option>
                        <option value="Road Transport">Road Transport</option>
                        <option value="Local Transport">Local Transport</option>
                        <option value="Agent">Agent</option>
                        <option value="Operation Supplier">Operation Supplier</option>
                        <option value="Other">Other</option>
                      </select>
                    </FormField>
                    <FormField label="Contact Person"><input value={supplierForm.contact} onChange={(e) => updateSupplier("contact", e.target.value)} /></FormField>
                    <FormField label="Phone"><input value={supplierForm.phone} onChange={(e) => updateSupplier("phone", e.target.value)} /></FormField>
                    <FormField label="Email"><input type="email" value={supplierForm.email} onChange={(e) => updateSupplier("email", e.target.value)} /></FormField>
                    <FormField label="Note"><input value={supplierForm.note} onChange={(e) => updateSupplier("note", e.target.value)} /></FormField>
                  </div>
                  <button className="saveBtn mt" type="submit">Add Company</button>
                </form>
              )}
            </div>
            <div className="note">
              <h3>Company List</h3>
              <div className="miniList">
                {suppliers.map((supplier) => (
                  <div className="miniCard" key={supplier.id}>
                    <b>{supplier.name}</b>
                    <p>{supplier.type} {supplier.contact ? `• ${supplier.contact}` : ""}</p>
                    <p>{supplier.email || "No email"} {supplier.phone ? `• ${supplier.phone}` : ""}</p>
                    {supplier.note && <p>{supplier.note}</p>}
                    {role === "admin" && <button className="dangerBtn" onClick={() => deleteSupplier(supplier.id)}>Delete</button>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}


        {tab === "ports" && (
          <section className="panel twoCols">
            <div>
              <h2>Ports</h2>
              <p className="smallText">Add a port if it is not available in the POL / POD lists.</p>
              {canEditCore && (
                <form onSubmit={addPort}>
                  <div className="formGrid one">
                    <FormField label="UN/LOCODE / Port Code"><input value={portForm.code} onChange={(e) => updatePort("code", e.target.value)} placeholder="Example: TRMER" /></FormField>
                    <FormField label="Port Name"><input value={portForm.name} onChange={(e) => updatePort("name", e.target.value)} placeholder="Example: Mersin" /></FormField>
                    <FormField label="Country"><input value={portForm.country} onChange={(e) => updatePort("country", e.target.value)} placeholder="Example: Türkiye" /></FormField>
                  </div>
                  <button className="saveBtn mt" type="submit">Add Port</button>
                </form>
              )}
            </div>
            <div className="note">
              <h3>Port List</h3>
              <div className="miniList">
                {ports.map((port) => (
                  <div className="miniCard" key={port.code}>
                    <b>{portLabel(port)}</b>
                    <p>Code: {port.code} {port.country ? `• ${port.country}` : ""}</p>
                    {role === "admin" && <button className="dangerBtn" onClick={() => deletePort(port.code)}>Delete</button>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === "reports" && (
          <section className="panel">
            <div className="panelHead">
              <div>
                <h2>Monthly Reports</h2>
                <p>Reports are based on the shipment creation date. Old shipments use ETA / ETD / Cut-Off as fallback.</p>
              </div>
              <div className="actions">
                <FormField label="Report Month">
                  <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
                </FormField>
                {canSeeFinance && <button className="saveBtn" onClick={exportMonthlyReportExcel}>Export Excel</button>}
                {canSeeFinance && <button className="ghostBtn" onClick={exportMonthlyReportPdf}>Export PDF</button>}
              </div>
            </div>

            <h3>{formatMonthLabel(reportMonth)} Summary</h3>
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
                {reportData.customers.length === 0 && <p>No customer data for this month.</p>}
                {reportData.customers.map((row) => (
                  <div className="transportLine" key={row.name}>
                    <span>{row.name} — {row.shipments} shipments</span>
                    <b>{canSeeFinance ? money(row.netProfit) : "—"}</b>
                  </div>
                ))}
              </div>

              <div className="note">
                <h3>Expenses by Company</h3>
                {reportData.expenseCompanies.length === 0 && <p>No expenses for this month.</p>}
                {reportData.expenseCompanies.map((row) => (
                  <div className="transportLine" key={row.company}>
                    <span>{row.company} — {row.count} expenses</span>
                    <b>{money(row.amountUsd)}</b>
                  </div>
                ))}
              </div>
            </div>

            <div className="tableWrap mt">
              <table>
                <thead>
                  <tr>
                    <th>Created</th>
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
        )}

        {tab === "api" && (
          <section className="panel">
            <h2>API Center</h2>
            <p>Next phase: connect carrier APIs for tracking, schedules, booking updates, and automatic exchange data.</p>
          </section>
        )}
      </main>
    </div>
  );
}

function getTitle(tab) {
  const titles = {
    dashboard: "Dashboard",
    shipments: "Shipments",
    customers: "Customers",
    suppliers: "Companies",
    booking: "New Booking",
    transport: "Local Transport",
    expenses: "Expenses",
    exchange: "Exchange Rate",
    ports: "Ports",
    reports: "Reports",
    api: "API Center",
    details: "Shipment Details",
  };
  return titles[tab] || "Freight OS";
}

function FormField({ label, children }) {
  return (
    <div className="formGroup">
      <label>{label}</label>
      {children}
    </div>
  );
}

function StatusSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="Draft">Draft</option>
      <option value="Booked">Booked</option>
      <option value="Loading">Loading</option>
      <option value="In Transit">In Transit</option>
      <option value="At Sea">At Sea</option>
      <option value="At Port">At Port</option>
      <option value="Arrived">Arrived</option>
      <option value="Completed">Completed</option>
    </select>
  );
}

function PaymentSelect({ value, onChange, disabled = false }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="Unpaid">Unpaid</option>
      <option value="Partially Paid">Partially Paid</option>
      <option value="Fully Paid">Fully Paid</option>
    </select>
  );
}

function CargoSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="FCL">FCL - Full Container Load</option>
      <option value="LCL">LCL - Less Container Load</option>
      <option value="Road">Road Transport / النقل البري</option>
      <option value="Air">Air Freight / الشحن الجوي</option>
      <option value="Cross">Cross Trade / Cross Booking</option>
    </select>
  );
}

function ContainerSelect({ value, onChange }) {
  const containerTypes = [
    ["20GP", "20GP - Standard"],
    ["40GP", "40GP - Standard"],
    ["40HC", "40HC - High Cube"],
    ["45HC", "45HC - High Cube"],
    ["20OT", "20OT - Open Top"],
    ["40OT", "40OT - Open Top"],
    ["20FR", "20FR - Flat Rack"],
    ["40FR", "40FR - Flat Rack"],
    ["20RF", "20RF - Reefer"],
    ["40RF", "40RF - Reefer"],
    ["20TK", "20TK - Tank"],
    ["40NOR", "40NOR - Non Operating Reefer"],
  ];
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {containerTypes.map(([code, label]) => (
        <option key={code} value={code}>{label}</option>
      ))}
    </select>
  );
}

function PortSelect({ value, ports, onChange, disabled = false }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="">Select Port</option>
      {ports.map((port) => (
        <option key={port.code} value={port.name}>{portLabel(port)}</option>
      ))}
    </select>
  );
}

function CustomerSelect({ value, customers, onChange, disabled = false }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="">Select Customer</option>
      {customers.map((customer) => (
        <option key={customer.id} value={customer.name}>{customer.name}</option>
      ))}
    </select>
  );
}

function SupplierSelect({ value, suppliers, onChange, disabled = false }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="">Select Company</option>
      {suppliers.map((supplier) => (
        <option key={supplier.id} value={supplier.name}>{supplier.name} - {supplier.type}</option>
      ))}
    </select>
  );
}

function Card({ icon, title, value }) {
  return (
    <div className="card">
      <span className="cardIcon">{icon}</span>
      <p>{title}</p>
      <h2>{value}</h2>
    </div>
  );
}

function ShipmentCard({ shipment, exchangeRate, canSeeFinance, onOpen }) {
  const daysLeft = getDaysLeft(shipment.cutOff);
  return (
    <button className="shipmentCard" onClick={onOpen}>
      <div>
        <b>{shipment.customer}</b>
        <h3>{shipment.vessel || shipment.line}</h3>
        <p>{shipment.pol} → {shipment.pod}</p>
        <p>✂ Cut-Off: {daysLeft === null ? "Not set" : `${shipment.cutOff} (${daysLeft} days left)`}</p>
      </div>
      <span className="badge">{shipment.status}</span>
      <div className="progress"><div style={{ width: `${getProgress(shipment)}%` }} /></div>
      {canSeeFinance && <strong>{money(calcNetProfit(shipment, exchangeRate))}</strong>}
    </button>
  );
}

function ProfitCard({ shipment, exchangeRate }) {
  const margin = calcMargin(shipment, exchangeRate);
  return (
    <div className="profitCard">
      <b>{shipment.id} — {shipment.customer}</b>
      <p>Sale: {money(calcOceanSell(shipment))} | Cost: {money(calcTotalCostUsd(shipment, exchangeRate))} | Margin: {margin.toFixed(1)}%</p>
      <strong>{money(calcNetProfit(shipment, exchangeRate))}</strong>
      <div className="progress"><div style={{ width: `${Math.min(Math.max(margin, 3), 100)}%` }} /></div>
    </div>
  );
}

function TransportList({ shipments, deleteTransport, canSeeFinance }) {
  return (
    <div className="note">
      <h3>Transport Costs by Shipment</h3>
      <div className="miniList">
        {shipments.map((s) => (
          <div className="miniCard" key={s.id}>
            <b>{s.id} - {s.customer}</b>
            <p>Total: {canSeeFinance ? money(calcTransportTry(s), "TRY") : "Hidden"} / {getTransports(s).length} records</p>
            {getTransports(s).map((t, index) => (
              <div className="transportLine" key={`${s.id}-transport-${index}`}>
                <span>{t.company} - Trucks: {t.truckQty || 1} - VAT: {t.taxRate || 0}% - {canSeeFinance ? money(calcSingleTransportTry(t), "TRY") : "Hidden"}</span>
                <button className="dangerBtn" onClick={() => deleteTransport(s.id, index)}>Delete</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpenseList({ shipments, deleteExpense, canEditCore }) {
  return (
    <div className="note">
      <h3>Expenses by Shipment</h3>
      <div className="miniList">
        {shipments.map((s) => (
          <div className="miniCard" key={s.id}>
            <b>{s.id} - {s.customer}</b>
            <p>Total expenses: {money(calcExpensesUsd(s))}</p>
            {getExpenses(s).map((e, index) => (
              <div className="transportLine" key={`${s.id}-expense-${index}`}>
                <span>{e.company || "No company"} - {e.type}: {e.description || "No description"} - {money(e.amountUsd)}</span>
                {canEditCore && <button className="dangerBtn" onClick={() => deleteExpense(s.id, index)}>Delete</button>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
