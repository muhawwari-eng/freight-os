import { Card, FormField } from "../components/freightComponents";

export function TasksScreen({ canEditOperation, checkAndSendReminders, reminderRunning, taskFilter, setTaskFilter, taskDashboard, addTaskToShipment, taskForm, updateTask, shipments, selectedTaskShipment, notifications, clearNotifications, allTasks, toggleTaskStatus, role, deleteTask }) {
  return (
          <section className="panel">
            <div className="panelHead">
              <div>
                <h2>Tasks / Reminders</h2>
                <p>Track shipment follow-ups, cut-off reminders, loading reminders, and daily operation tasks.</p>
              </div>
              <div className="actions">
                {canEditOperation && <button className="ghostBtn" onClick={() => checkAndSendReminders("manual")} disabled={reminderRunning}>{reminderRunning ? "Sending..." : "Check & Send Email Reminders"}</button>}
                <select value={taskFilter} onChange={(e) => setTaskFilter(e.target.value)}>
                  <option value="open">Open Tasks</option>
                  <option value="dueSoon">Due Soon</option>
                  <option value="overdue">Overdue</option>
                  <option value="done">Done</option>
                  <option value="all">All Tasks</option>
                </select>
              </div>
            </div>

            <section className="stats">
              <Card icon="📌" title="Total Tasks" value={taskDashboard.total} />
              <Card icon="⏳" title="Pending" value={taskDashboard.pending} />
              <Card icon="⚠️" title="Due Soon" value={taskDashboard.dueSoon} />
              <Card icon="🚨" title="Overdue" value={taskDashboard.overdue} />
              <Card icon="✅" title="Done" value={taskDashboard.done} />
            </section>

            {canEditOperation && (
              <form onSubmit={addTaskToShipment} className="editBox">
                <div className="formGrid">
                  <FormField label="Shipment"><select value={taskForm.shipmentId} onChange={(e) => updateTask("shipmentId", e.target.value)}><option value="">Select Shipment</option>{shipments.map((s) => <option key={s.id} value={s.id}>{s.id} - {s.customer}</option>)}</select></FormField>
                  <FormField label="Customer"><input value={selectedTaskShipment?.customer || ""} readOnly placeholder="Auto-filled from shipment" /></FormField>
                  <FormField label="Booking No"><input value={selectedTaskShipment?.bookingNo || ""} readOnly placeholder="Auto-filled from shipment" /></FormField>
                  <FormField label="Route"><input value={selectedTaskShipment ? `${selectedTaskShipment.pol || ""} → ${selectedTaskShipment.pod || ""}` : ""} readOnly placeholder="Auto-filled from shipment" /></FormField>
                  <FormField label="Task Type"><select value={taskForm.taskType} onChange={(e) => updateTask("taskType", e.target.value)}><option value="General">General</option><option value="Cut-Off">Cut-Off</option><option value="ETD">ETD / Departure</option><option value="ETA">ETA / Arrival</option><option value="Documents">Documents</option><option value="Payment">Payment</option><option value="Customer Follow-up">Customer Follow-up</option></select></FormField>
                  <FormField label="Task Title"><input value={taskForm.title} onChange={(e) => updateTask("title", e.target.value)} placeholder="Auto-filled after selecting shipment/type" /></FormField>
                  <FormField label="Due Date"><input type="date" value={taskForm.dueDate} onChange={(e) => updateTask("dueDate", e.target.value)} /></FormField>
                  <FormField label="Priority"><select value={taskForm.priority} onChange={(e) => updateTask("priority", e.target.value)}><option value="Low">Low</option><option value="Normal">Normal</option><option value="High">High</option><option value="Urgent">Urgent</option></select></FormField>
                  <FormField label="Note"><input value={taskForm.note} onChange={(e) => updateTask("note", e.target.value)} placeholder="Optional note" /></FormField>
                </div>
                <div className="actions mt"><button className="saveBtn" type="submit">Add Task</button></div>
              </form>
            )}

            {notifications.length > 0 && (
              <div className="editBox mt">
                <div className="panelHead">
                  <div>
                    <h3>🔔 Reminder Notifications</h3>
                    <p>Latest email reminder results.</p>
                  </div>
                  <button className="ghostBtn" onClick={clearNotifications}>Clear</button>
                </div>
                <div className="stackList">
                  {notifications.slice(0, 6).map((item) => (
                    <div className="miniCard" key={item.id}>
                      <b>{item.type === "error" ? "🚨" : item.type === "warning" ? "⚠️" : item.type === "success" ? "✅" : "ℹ️"} {item.title}</b>
                      <p>{item.message}</p>
                      <small>{new Date(item.createdAt).toLocaleString()}</small>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="tableWrap mt">
              <table>
                <thead><tr><th>Due Date</th><th>Task</th><th>Shipment</th><th>Customer</th><th>Booking</th><th>Route</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {allTasks.map((task) => (
                    <tr key={task.id}>
                      <td>{task.dueDate || "No date"}</td>
                      <td><b>{task.title}</b><br /><span className="smallText">{task.taskType || "General"}{task.note ? ` • ${task.note}` : ""}</span></td>
                      <td>{task.shipmentId}</td>
                      <td>{task.shipmentCustomer}</td>
                      <td>{task.bookingNo || "Not set"}</td>
                      <td>{task.route}</td>
                      <td>{task.priority || "Normal"}</td>
                      <td><span className="badge">{task.taskStatus}</span></td>
                      <td><div className="actions">{canEditOperation && <button className="saveBtn" onClick={() => toggleTaskStatus(task.shipmentId, task.id)}>{task.status === "Done" ? "Pending" : "Done"}</button>}{role === "admin" && <button className="dangerBtn" onClick={() => deleteTask(task.shipmentId, task.id)}>Delete</button>}</div></td>
                    </tr>
                  ))}
                  {allTasks.length === 0 && <tr><td colSpan="9">No tasks found.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

  );
}
