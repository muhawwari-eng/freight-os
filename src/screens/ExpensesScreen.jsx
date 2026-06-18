import { useMemo, useState } from "react";
import { FormField, SupplierSelect } from "../components/freightComponents";
import { calcExpensesUsd, getExpenses, money } from "../utils/freight";

const expenseTypes = ["all", "Operation", "Commission", "Demurage", "Bill of Lading", "Storage", "Port Charges", "Lashing", "Other"];

export function ExpensesScreen({ addExpenseToShipment, expenseForm, updateExpense, shipments, suppliers, deleteExpense, canEditCore }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const expenseRows = useMemo(() => shipments.flatMap((shipment) => getExpenses(shipment).map((expense, index) => ({ shipment, expense, index }))), [shipments]);
  const filteredRows = expenseRows.filter(({ shipment, expense }) => {
    const text = query.trim().toLowerCase();
    const matchesText = !text || [shipment.id, shipment.customer, shipment.bookingNo, expense.company, expense.type, expense.description]
      .some((value) => String(value || "").toLowerCase().includes(text));
    const matchesType = typeFilter === "all" || expense.type === typeFilter;
    return matchesText && matchesType;
  });
  const summary = filteredRows.reduce((acc, row) => {
    acc.records += 1;
    acc.total += Number(row.expense.amountUsd || 0);
    acc.shipments.add(row.shipment.id);
    acc.companies.add(row.expense.company || "No company");
    return acc;
  }, { records: 0, total: 0, shipments: new Set(), companies: new Set() });

  return (
    <section className="panel operationalPage">
      <div className="panelHead">
        <div>
          <h2>Extra Expenses</h2>
          <p className="smallText">Operational costs deducted from net profit, with cleaner filters and totals.</p>
        </div>
      </div>

      <section className="opsMetrics">
        <div><small>Records</small><b>{summary.records}</b></div>
        <div><small>Total Expenses</small><b>{money(summary.total)}</b></div>
        <div><small>Shipments</small><b>{summary.shipments.size}</b></div>
        <div><small>Companies</small><b>{summary.companies.size}</b></div>
      </section>

      <div className="opsLayout">
        <div className="opsFormPanel">
          <h3>Add Expense</h3>
          <form onSubmit={addExpenseToShipment}>
            <div className="formGrid one">
              <FormField label="Shipment"><select value={expenseForm.shipmentId} onChange={(e) => updateExpense("shipmentId", e.target.value)}><option value="">Select Shipment</option>{shipments.map((shipment) => <option key={shipment.id} value={shipment.id}>{shipment.id} - {shipment.customer}</option>)}</select></FormField>
              <FormField label="Expense Company"><SupplierSelect value={expenseForm.company} suppliers={suppliers} onChange={(value) => updateExpense("company", value)} /></FormField>
              <FormField label="Expense Type">
                <select value={expenseForm.type} onChange={(e) => updateExpense("type", e.target.value)}>
                  {expenseTypes.filter((type) => type !== "all").map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </FormField>
              <FormField label="Description"><input value={expenseForm.description} onChange={(e) => updateExpense("description", e.target.value)} /></FormField>
              <FormField label="Amount USD"><input type="number" value={expenseForm.amountUsd} onChange={(e) => updateExpense("amountUsd", e.target.value)} /></FormField>
            </div>
            <button className="saveBtn" type="submit">Add Expense</button>
          </form>
        </div>

        <div className="opsListPanel">
          <div className="opsToolbar">
            <FormField label="Search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Shipment, company, type..." /></FormField>
            <FormField label="Type">
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                {expenseTypes.map((type) => <option key={type} value={type}>{type === "all" ? "All Types" : type}</option>)}
              </select>
            </FormField>
          </div>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Shipment</th>
                  <th>Customer</th>
                  <th>Company</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Shipment Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(({ shipment, expense, index }) => (
                  <tr key={`${shipment.id}-${index}`}>
                    <td><b>{shipment.id}</b></td>
                    <td>{shipment.customer}</td>
                    <td>{expense.company || "No company"}</td>
                    <td><span className="badge">{expense.type || "Other"}</span></td>
                    <td>{expense.description || "No description"}</td>
                    <td>{money(expense.amountUsd)}</td>
                    <td>{money(calcExpensesUsd(shipment))}</td>
                    <td>{canEditCore && <button className="dangerBtn" onClick={() => deleteExpense(shipment.id, index)}>Delete</button>}</td>
                  </tr>
                ))}
                {filteredRows.length === 0 && <tr><td colSpan="8">No expense records found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
