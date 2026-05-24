import { ExpenseList, FormField, SupplierSelect } from "../components/freightComponents";

export function ExpensesScreen({ addExpenseToShipment, expenseForm, updateExpense, shipments, suppliers, deleteExpense, canEditCore }) {
  return (
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

  );
}
