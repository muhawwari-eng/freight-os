import { useState } from "react";
import { CargoSelect, ContainerSelect, CustomerSelect, FormField, PaymentSelect, PaymentSummaryBox, PortSelect, StatusSelect, SupplierSelect } from "../components/freightComponents";
import { generateInvoicePdf } from "../services/pdf";
import { calcExpensesUsd, calcGrossProfit, calcNetProfit, calcOceanBuy, calcOceanSell, calcTotalCostUsd, calcTransportTry, getExpenses, getPayments, getShipmentBillableQty, getShipmentDocuments, getShipmentLoadDescription, getShipmentUnitLabel, getTaskStatus, getTasks, getTimelineEvents, getTransports, isAirShipment, isFclShipment, money } from "../utils/freight";

const documentTypes = ["Bill of Lading", "Commercial Invoice", "Packing List", "Freight Invoice", "Customs", "Other"];

function formatFileSize(size) {
  const value = Number(size || 0);
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

function downloadDocument(document) {
  const link = window.document.createElement("a");
  link.href = document.dataUrl;
  link.download = document.name || "shipment-document";
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
}

function DetailSubtabs({ activeTab, setActiveTab, canSeeFinance }) {
  const tabs = ["overview", canSeeFinance && "finance", "tasks", "documents", "timeline"].filter(Boolean);
  const labels = {
    overview: "Overview",
    finance: "Finance",
    tasks: "Tasks",
    documents: "Documents",
    timeline: "Timeline",
  };

  return (
    <div className="dashboardSubtabs detailSubtabs">
      {tabs.map((tab) => (
        <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
          {labels[tab]}
        </button>
      ))}
    </div>
  );
}

function ShipmentEditForm({ editForm, editIsFcl, editIsAir, editUnitLabel, saveEditShipment, customers, updateEdit, canEditCore, suppliers, ports, setIsEditing }) {
  return (
    <form onSubmit={saveEditShipment} className="editBox">
      <div className="formGrid">
        <FormField label="Entry Date"><input type="date" value={editForm.entryDate} onChange={(e) => updateEdit("entryDate", e.target.value)} required /></FormField>
        <FormField label="Client Name"><CustomerSelect value={editForm.customer} customers={customers} onChange={(value) => updateEdit("customer", value)} disabled={!canEditCore} /></FormField>
        <FormField label="Carrier / Supplier Company"><SupplierSelect value={editForm.line} suppliers={suppliers} onChange={(value) => updateEdit("line", value)} disabled={!canEditCore} /></FormField>
        <FormField label="POL / Origin Port"><PortSelect value={editForm.pol} ports={ports} onChange={(value) => updateEdit("pol", value)} disabled={!canEditCore} /></FormField>
        <FormField label="POD / Destination Port"><PortSelect value={editForm.pod} ports={ports} onChange={(value) => updateEdit("pod", value)} disabled={!canEditCore} /></FormField>
        <FormField label="Booking No"><input value={editForm.bookingNo} onChange={(e) => updateEdit("bookingNo", e.target.value)} /></FormField>
        {!editIsAir && <FormField label="Vessel Name"><input value={editForm.vessel} onChange={(e) => updateEdit("vessel", e.target.value)} /></FormField>}
        <FormField label="Cut-Off Date"><input type="date" value={editForm.cutOff} onChange={(e) => updateEdit("cutOff", e.target.value)} /></FormField>
        <FormField label="ETD"><input type="date" value={editForm.etd} onChange={(e) => updateEdit("etd", e.target.value)} /></FormField>
        <FormField label="ETA"><input type="date" value={editForm.eta} onChange={(e) => updateEdit("eta", e.target.value)} /></FormField>
        <FormField label="Shipment Status"><StatusSelect value={editForm.status} onChange={(value) => updateEdit("status", value)} /></FormField>
        <FormField label="Payment Status"><PaymentSelect value={editForm.paymentStatus} onChange={(value) => updateEdit("paymentStatus", value)} disabled={!canEditCore} /></FormField>
        <FormField label="Cargo Type"><CargoSelect value={editForm.cargoType} onChange={(value) => updateEdit("cargoType", value)} /></FormField>
        {canEditCore && editIsFcl && <FormField label="Container Type"><ContainerSelect value={editForm.containerType} onChange={(value) => updateEdit("containerType", value)} /></FormField>}
        {canEditCore && editIsFcl && <FormField label="Container Quantity"><input type="number" min="0" step="1" value={editForm.qty} onChange={(e) => updateEdit("qty", e.target.value)} /></FormField>}
        {canEditCore && !editIsFcl && <FormField label="Package Count"><input type="number" min="0" step="1" value={editForm.packageCount} onChange={(e) => updateEdit("packageCount", e.target.value)} /></FormField>}
        {canEditCore && !editIsFcl && !editIsAir && <FormField label="CBM"><input type="number" min="0" step="0.001" value={editForm.cbm} onChange={(e) => updateEdit("cbm", e.target.value)} /></FormField>}
        {canEditCore && !editIsFcl && <FormField label="Actual Weight KG"><input type="number" min="0" step="0.01" value={editForm.actualWeightKg} onChange={(e) => updateEdit("actualWeightKg", e.target.value)} /></FormField>}
        {canEditCore && editIsAir && <FormField label="Volumetric Weight KG"><input type="number" min="0" step="0.01" value={editForm.volumetricWeightKg} onChange={(e) => updateEdit("volumetricWeightKg", e.target.value)} /></FormField>}
        {canEditCore && <FormField label={`Buy Price / ${editUnitLabel} USD`}><input type="number" min="0" step="0.01" value={editForm.buyUsd} onChange={(e) => updateEdit("buyUsd", e.target.value)} /></FormField>}
        {canEditCore && <FormField label={`Sell Price / ${editUnitLabel} USD`}><input type="number" min="0" step="0.01" value={editForm.sellUsd} onChange={(e) => updateEdit("sellUsd", e.target.value)} /></FormField>}
      </div>
      <div className="actions mt">
        <button className="saveBtn" type="submit">Save Changes</button>
        <button className="ghostBtn" type="button" onClick={() => setIsEditing(false)}>Cancel</button>
      </div>
    </form>
  );
}

function TimelineItem({ event }) {
  return (
    <div className="timelineItem">
      <span className="timelineDot" />
      <div>
        <b>{event.title}</b>
        <p>{event.date ? new Date(event.date).toLocaleString() : "Not set"}</p>
        <small>{event.type || "Event"}{event.user ? ` | ${event.user}` : ""}</small>
        {event.note && <small>{event.note}</small>}
      </div>
    </div>
  );
}

export function ShipmentDetailsScreen({ selectedShipment, activeFxRate, canSeeFinance, canEditOperation, startEditShipment, setTab, isEditing, saveEditShipment, editForm, customers, updateEdit, canEditCore, suppliers, ports, setIsEditing, createAutoTasksForShipment, toggleTaskStatus, role, deleteTask, saveShipmentDocument, deleteShipmentDocument, shareShipmentWithCustomer }) {
  const [detailTab, setDetailTab] = useState("overview");
  const [documentType, setDocumentType] = useState("Bill of Lading");
  const editIsFcl = isFclShipment(editForm);
  const editIsAir = isAirShipment(editForm);
  const editUnitLabel = getShipmentUnitLabel(editForm);
  const tasks = getTasks(selectedShipment);
  const transports = getTransports(selectedShipment);
  const expenses = getExpenses(selectedShipment);
  const payments = getPayments(selectedShipment);
  const documents = getShipmentDocuments(selectedShipment);
  const timelineEvents = getTimelineEvents(selectedShipment);

  return (
    <section className="panel shipmentDetailsPanel">
      <div className="panelHead">
        <div>
          <h2>Shipment Details - {selectedShipment.id}</h2>
          <p>{selectedShipment.customer || "No customer"} | {selectedShipment.pol || "POL"} - {selectedShipment.pod || "POD"}</p>
        </div>
        <div className="actions">
          {canEditOperation && <button className="ghostBtn" onClick={() => shareShipmentWithCustomer(selectedShipment)}>Share with Customer</button>}
          {canSeeFinance && <button className="saveBtn" onClick={() => generateInvoicePdf(selectedShipment, activeFxRate)}>Generate Invoice</button>}
          {canEditOperation && <button className="saveBtn" onClick={startEditShipment}>Edit Shipment</button>}
          <button className="ghostBtn" onClick={() => setTab("shipments")}>Back</button>
        </div>
      </div>

      {isEditing ? (
        <ShipmentEditForm editForm={editForm} editIsFcl={editIsFcl} editIsAir={editIsAir} editUnitLabel={editUnitLabel} saveEditShipment={saveEditShipment} customers={customers} updateEdit={updateEdit} canEditCore={canEditCore} suppliers={suppliers} ports={ports} setIsEditing={setIsEditing} />
      ) : (
        <>
          <DetailSubtabs activeTab={detailTab} setActiveTab={setDetailTab} canSeeFinance={canSeeFinance} />

          {detailTab === "overview" && (
            <>
              <div className="detailHero">
                <div>
                  <small>Route</small>
                  <h3>{selectedShipment.pol || "POL"} - {selectedShipment.pod || "POD"}</h3>
                </div>
                <div>
                  <small>Status</small>
                  <span className="badge">{selectedShipment.status}</span>
                </div>
                <div>
                  <small>Load</small>
                  <b>{getShipmentLoadDescription(selectedShipment)}</b>
                </div>
              </div>
              <div className="detailGrid">
                <p><b>Entry Date:</b> {selectedShipment.entryDate || "Not set"}</p>
                <p><b>Customer:</b> {selectedShipment.customer}</p>
                <p><b>Carrier:</b> {selectedShipment.line || "Not set"}</p>
                <p><b>Booking No:</b> {selectedShipment.bookingNo || "Not set"}</p>
                {!isAirShipment(selectedShipment) && <p><b>Vessel:</b> {selectedShipment.vessel || "Not set"}</p>}
                <p><b>Billable Quantity:</b> {getShipmentBillableQty(selectedShipment)} {getShipmentUnitLabel(selectedShipment)}</p>
                <p><b>Cut-Off:</b> {selectedShipment.cutOff || "Not set"}</p>
                <p><b>ETD / ETA:</b> {selectedShipment.etd || "Not set"} / {selectedShipment.eta || "Not set"}</p>
                <p><b>Payment:</b> {selectedShipment.paymentStatus}</p>
                <p><b>FX Rate:</b> {selectedShipment.fx || activeFxRate} TRY/USD</p>
              </div>

              <h3>Local Transport</h3>
              {transports.length === 0 && <p>No local transport records.</p>}
              <div className="miniList">
                {transports.map((transport, index) => (
                  <div className="miniCard" key={index}>
                    <b>{transport.company || "No company"}</b>
                    <p>{transport.from || "Origin"} - {transport.to || "Destination"} | {canSeeFinance ? money(transport.costTry, "TRY") : "Cost hidden"}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {detailTab === "finance" && canSeeFinance && (
            <>
              <div className="financeNote">
                <b>Calculation rule:</b> Sale is the amount charged to the customer. Extra expenses are not added to sales; they are deducted from net profit.
              </div>
              <div className="detailGrid">
                <p><b>Customer Sale:</b> {money(calcOceanSell(selectedShipment))}</p>
                <p><b>Freight Buy Cost:</b> {money(calcOceanBuy(selectedShipment))}</p>
                <p><b>Local Transport Cost:</b> {money(calcTransportTry(selectedShipment), "TRY")}</p>
                <p><b>Extra Expenses:</b> {money(calcExpensesUsd(selectedShipment))}</p>
                <p><b>Total Cost USD:</b> {money(calcTotalCostUsd(selectedShipment, activeFxRate))}</p>
                <p><b>Gross Before Expenses:</b> {money(calcGrossProfit(selectedShipment, activeFxRate))}</p>
                <p><b>Net After Expenses:</b> {money(calcNetProfit(selectedShipment, activeFxRate))}</p>
              </div>
              <PaymentSummaryBox shipment={selectedShipment} exchangeRate={activeFxRate} />

              <div className="twoCols mt">
                <div className="note">
                  <h3>Expenses</h3>
                  {expenses.length === 0 && <p>No extra expenses.</p>}
                  {expenses.map((expense, index) => (
                    <p key={index}>{expense.company || "No company"} - {expense.type} - {expense.description || "No description"} - {money(expense.amountUsd)}</p>
                  ))}
                </div>
                <div className="note">
                  <h3>Payment Records</h3>
                  {payments.length === 0 && <p>No payment records yet.</p>}
                  {payments.map((payment) => (
                    <p key={payment.id}>{payment.paidDate || "No date"} - {payment.purchaseType} - {payment.company || "No company"} - {money(payment.amount, payment.currency || "USD")}</p>
                  ))}
                </div>
              </div>
            </>
          )}

          {detailTab === "tasks" && (
            <>
              <div className="panelHead">
                <div>
                  <h3>Tasks / Reminders</h3>
                  <p>Operational follow-ups connected to this shipment.</p>
                </div>
                <div className="actions">
                  {canEditOperation && <button className="ghostBtn" onClick={() => createAutoTasksForShipment(selectedShipment)}>Create Cut-Off / ETD / ETA Reminders</button>}
                </div>
              </div>
              {tasks.length === 0 && <p>No tasks yet.</p>}
              <div className="miniList">
                {tasks.map((task) => (
                  <div className="miniCard" key={task.id}>
                    <b>{task.title}</b>
                    <p>{task.taskType || "General"} | Due: {task.dueDate || "No date"} | Priority: {task.priority || "Normal"} | Status: {getTaskStatus(task)}</p>
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
            </>
          )}

          {detailTab === "documents" && (
            <>
              <div className="panelHead">
                <div>
                  <h3>Documents</h3>
                  <p>Upload and manage shipment files. Files up to 4 MB are stored with the shipment.</p>
                </div>
                {canEditOperation && (
                  <div className="actions documentUpload">
                    <FormField label="Document Type">
                      <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
                        {documentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </FormField>
                    <label className="saveBtn uploadBtn">
                      Upload File
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) saveShipmentDocument(selectedShipment.id, file, documentType);
                        event.target.value = "";
                      }} />
                    </label>
                  </div>
                )}
              </div>

              {documents.length === 0 ? (
                <div className="emptyState">
                  <b>No documents uploaded yet.</b>
                  <p>Bill of Lading, invoices, packing list, customs files, and shipment images will appear here.</p>
                </div>
              ) : (
                <div className="tableWrap mt">
                  <table>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>File</th>
                        <th>Size</th>
                        <th>Uploaded</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((document) => (
                        <tr key={document.id}>
                          <td><span className="badge">{document.type || "Other"}</span></td>
                          <td>{document.name}</td>
                          <td>{formatFileSize(document.size)}</td>
                          <td>{document.uploadedAt ? new Date(document.uploadedAt).toLocaleString() : "Not set"}</td>
                          <td>
                            <div className="actions">
                              <button className="ghostBtn" onClick={() => downloadDocument(document)}>Download</button>
                              {canEditOperation && <button className="dangerBtn" onClick={() => deleteShipmentDocument(selectedShipment.id, document.id)}>Delete</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {detailTab === "timeline" && (
            <div className="timeline">
              {timelineEvents.map((event) => <TimelineItem key={event.id} event={event} />)}
            </div>
          )}
        </>
      )}
    </section>
  );
}
