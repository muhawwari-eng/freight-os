import { CargoSelect, CustomerSelect, FormField, PaymentSelect, PaymentSummaryBox, PortSelect, StatusSelect, SupplierSelect } from "../components/freightComponents";
import { generateInvoicePdf } from "../services/pdf";
import { calcExpensesUsd, calcGrossProfit, calcNetProfit, calcOceanBuy, calcOceanSell, calcTotalCostUsd, calcTransportTry, getExpenses, getPayments, getTaskStatus, getTasks, getTransports, money } from "../utils/freight";

export function ShipmentDetailsScreen({ selectedShipment, activeFxRate, canSeeFinance, canEditOperation, startEditShipment, setTab, isEditing, saveEditShipment, editForm, customers, updateEdit, canEditCore, suppliers, ports, setIsEditing, createAutoTasksForShipment, toggleTaskStatus, role, deleteTask }) {
  return (
          <section className="panel">
            <div className="panelHead">
              <h2>Shipment Details - {selectedShipment.id}</h2>
              <div className="actions">
                {canSeeFinance && <button className="saveBtn" onClick={() => generateInvoicePdf(selectedShipment, activeFxRate)}>Generate Invoice</button>}
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
                  <p><b>Containers:</b> {(selectedShipment.cargoType || "FCL") === "LCL" ? "LCL" : `${Number(selectedShipment.qty || 0)} × ${selectedShipment.containerType || ""}`}</p>
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
                    <PaymentSummaryBox shipment={selectedShipment} exchangeRate={activeFxRate} />
                  </>
                )}

                <h3>Local Transport</h3>
                {getTransports(selectedShipment).length === 0 && <p>No local transport records.</p>}
                {getTransports(selectedShipment).map((t, i) => (
                  <p key={i}>{t.company} - {canSeeFinance ? money(t.costTry, "TRY") : "Cost hidden"}</p>
                ))}

                <h3>Tasks / Reminders</h3>
                <div className="actions mt">
                  {canEditOperation && <button className="ghostBtn" onClick={() => createAutoTasksForShipment(selectedShipment)}>Create Cut-Off / ETD / ETA Reminders</button>}
                </div>
                {getTasks(selectedShipment).length === 0 && <p>No tasks yet.</p>}
                <div className="miniList">
                  {getTasks(selectedShipment).map((task) => (
                    <div className="miniCard" key={task.id}>
                      <b>{task.title}</b>
                      <p>{task.taskType || "General"} • Due: {task.dueDate || "No date"} • Priority: {task.priority || "Normal"} • Status: {getTaskStatus(task)}</p>
                      {task.note && <p>{task.note}</p>}
                      {canEditOperation && (
                        <div className="actions mt">
                          <button className="saveBtn" onClick={() => toggleTaskStatus(selectedShipment.id, task.id)}>{task.status === "Done" ? "Mark Pending" : "Mark Done"}</button>
                          {role === "admin" && <button className="dangerBtn" onClick={() => deleteTask(selectedShipment.id, task.id)}>Delete</button>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {canSeeFinance && (
                  <>
                    <h3>Expenses</h3>
                    {getExpenses(selectedShipment).length === 0 && <p>No extra expenses.</p>}
                    {getExpenses(selectedShipment).map((e, i) => (
                      <p key={i}>{e.company || "No company"} - {e.type} - {e.description || "No description"} - {money(e.amountUsd)}</p>
                    ))}

                    <h3>Payment Records</h3>
                    {getPayments(selectedShipment).length === 0 && <p>No payment records yet.</p>}
                    {getPayments(selectedShipment).map((payment) => (
                      <p key={payment.id}>
                        {payment.paidDate || "No date"} - {payment.purchaseType} - {payment.company || "No company"} - {money(payment.amount, payment.currency || "USD")}
                      </p>
                    ))}
                  </>
                )}
              </>
            )}
          </section>

  );
}
