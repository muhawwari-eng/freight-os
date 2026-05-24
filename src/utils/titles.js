export function getTitle(tab) {
  const titles = {
    dashboard: "Dashboard",
    shipments: "Shipments",
    customers: "Customers",
    suppliers: "Companies",
    booking: "New Booking",
    transport: "Local Transport",
    expenses: "Expenses",
    payments: "Payments & Purchases",
    receivables: "Receivables",
    tasks: "Tasks / Reminders",
    exchange: "Exchange Rate",
    ports: "Ports",
    reports: "Reports",
    settings: "Settings",
    api: "API Center",
    details: "Shipment Details",
  };
  return titles[tab] || "Freight OS";
}
