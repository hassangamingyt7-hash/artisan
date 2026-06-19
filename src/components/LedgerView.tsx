/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ARTI8SAN ERP - Thread Stock Ledger & Consumption View Panel
 */

import React, { useState, useEffect } from "react";
import { Plus, Search, Calendar, History, Eye, Trash2, ArrowUpRight, ArrowDownLeft, SlidersHorizontal, AlertCircle, Sparkles, X } from "lucide-react";
import { ThreadInventory, Order } from "../types.ts";

interface LedgerViewProps {
  inventory: ThreadInventory[];
  orders: Order[];
  userRole: string;
  token: string | null;
  onRefresh: () => void;
}

export default function LedgerView({ inventory, orders, userRole, token, onRefresh }: LedgerViewProps) {
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [consumptionLogs, setConsumptionLogs] = useState<any[]>([]);
  const [selectedShadeFilter, setSelectedShadeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Tab states for inside the ledger view (Ledger Registry vs Consumption Logs)
  const [subTab, setSubTab] = useState<"movement" | "consumptions">("movement");
  
  // Modal states
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [consumeError, setConsumeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [consumeForm, setConsumeForm] = useState({
    date: new Date().toISOString().substring(0, 10),
    shade_code: "",
    quantity_consumed: 5,
    order_id: "",
    notes: ""
  });

  // Fetch ledger and consumption logs from API
  const fetchLedgerAndLogs = async () => {
    if (!token) return;
    try {
      const authHeader = `Bearer ${token}`;
      
      const [resLedger, resCons] = await Promise.all([
        fetch("/api/thread-stock-ledger", { headers: { Authorization: authHeader } }),
        fetch("/api/thread-consumption", { headers: { Authorization: authHeader } })
      ]);

      if (resLedger.ok && resCons.ok) {
        const ledgerJson = await resLedger.json();
        const consJson = await resCons.json();
        // Sort ledger entries by date descending, then ID descending
        setLedgerData(ledgerJson.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id));
        setConsumptionLogs(consJson.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id));
      }
    } catch (err) {
      console.error("Error loading stock ledger APIs:", err);
    }
  };

  useEffect(() => {
    fetchLedgerAndLogs();
  }, [token, inventory]); // reload on cache updates

  // Populate dynamic shade description when selector changes
  const activeSelectedInventoryItem = inventory.find(
    (item) => item.shade_code === consumeForm.shade_code
  );

  const handleOpenConsume = () => {
    // Pick the first available shade as default
    const firstShade = inventory.length > 0 ? inventory[0].shade_code : "";
    setConsumeForm({
      date: new Date().toISOString().substring(0, 10),
      shade_code: firstShade,
      quantity_consumed: 5,
      order_id: "",
      notes: ""
    });
    setConsumeError(null);
    setShowConsumeModal(true);
  };

  const handleConsumeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConsumeError(null);
    setIsSubmitting(true);

    try {
      const selectedInv = inventory.find(item => item.shade_code === consumeForm.shade_code);
      if (!selectedInv) {
        setConsumeError("Please select a valid thread shade from standard inventory.");
        setIsSubmitting(false);
        return;
      }

      const available = selectedInv.available_quantity !== undefined ? selectedInv.available_quantity : selectedInv.qty_available;
      if (Number(consumeForm.quantity_consumed) > available) {
        setConsumeError(`Insufficient stock! Standard inventory only has ${available} cones left for shade ${selectedInv.shade_code}. Cannot consume more than available.`);
        setIsSubmitting(false);
        return;
      }

      // Find selected order metadata
      const linkedOrder = orders.find(o => o.id === Number(consumeForm.order_id));

      const payload = {
        date: consumeForm.date,
        shade_code: selectedInv.shade_code,
        shade_name: selectedInv.shade_name,
        quantity_consumed: Number(consumeForm.quantity_consumed),
        order_id: consumeForm.order_id ? Number(consumeForm.order_id) : null,
        order_number: linkedOrder ? linkedOrder.order_number : "",
        notes: consumeForm.notes
      };

      const res = await fetch("/api/thread-consumption", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to log consumption.");
      }

      setShowConsumeModal(false);
      onRefresh(); // Refresh master inventory in parent app
      fetchLedgerAndLogs(); // Reload local ledger history
    } catch (err: any) {
      setConsumeError(err.message || "An exception occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConsumption = async (id: number) => {
    const confirmRestore = window.confirm("Are you sure you want to delete this consumption log? This will restore the corresponding thread stock.");
    if (!confirmRestore) return;

    try {
      const res = await fetch(`/api/thread-consumption/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to delete log.");
      }

      onRefresh(); // Refresh parent inventory
      fetchLedgerAndLogs(); // Refresh local tables
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Filter Ledger data
  const filteredLedger = ledgerData.filter((entry) => {
    const matchesShade = selectedShadeFilter === "ALL" || entry.shade_code === selectedShadeFilter;
    const matchesQuery = searchQuery === "" || 
      (entry.shade_code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.shade_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.purchase_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.reference_no || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesShade && matchesQuery;
  });

  // Calculate high-level stats based on ledger
  const totalIn = filteredLedger.reduce((sum, entry) => sum + Number(entry.qty_in || 0), 0);
  const totalOut = filteredLedger.reduce((sum, entry) => sum + Number(entry.qty_out || 0), 0);

  const canModify = ["admin", "manager", "store_manager", "accounts_manager"].includes(userRole);

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get distinct shade codes in active system for filters dropdown box
  const distinctShades = Array.from(new Set(inventory.map((item) => item.shade_code)));

  return (
    <div className="p-4 md:p-5 space-y-4 max-w-7xl mx-auto" id="ledger-view-panel">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-slate-800 font-bold text-base select-none font-sans">Thread Stock Ledger & Consumption</h3>
          <p className="text-[11px] text-slate-400 font-mono">Movement tracking history, consumption logs, and inventory audit trail</p>
        </div>
        {canModify && (
          <button
            id="log-consumption-entry-btn"
            onClick={handleOpenConsume}
            className="flex items-center gap-1.5 bg-rose-600 text-white font-semibold hover:bg-rose-500 px-3.5 py-1.5 rounded text-xs tracking-wide transition-all shadow-md shadow-rose-500/10 cursor-pointer uppercase"
          >
            <Plus className="w-4 h-4 text-white stroke-[2.5]" />
            <span>Log Thread Consumption</span>
          </button>
        )}
      </div>

      {/* Internal Tabs Navigator */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setSubTab("movement")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wide cursor-pointer ${
            subTab === "movement"
              ? "border-blue-600 text-blue-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Dynamic Stock Ledger
        </button>
        <button
          onClick={() => setSubTab("consumptions")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wide cursor-pointer ${
            subTab === "consumptions"
              ? "border-blue-600 text-blue-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Historic Consumption Logs
        </button>
      </div>

      {subTab === "movement" ? (
        <>
          {/* Movement quick statistics widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="ledger-stats-banner">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex items-center gap-3.5">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Total Stock IN</span>
                <p className="font-extrabold text-slate-800 text-base font-mono">{totalIn} Cones</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex items-center gap-3.5">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
                <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Total Stock OUT</span>
                <p className="font-extrabold text-slate-800 text-base font-mono">{totalOut} Cones</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex items-center gap-3.5">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <History className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Filtered Records</span>
                <p className="font-extrabold text-slate-800 text-base font-mono">{filteredLedger.length} Movements</p>
              </div>
            </div>
          </div>

          {/* Filters shelf */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3.5 flex flex-col md:flex-row items-stretch md:items-center gap-3 justify-between">
            <div className="flex flex-1 items-center gap-2 border border-slate-200 rounded px-2.5 py-1.5 shadow-inner">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search ledger by shade code, name, bill reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-0 outline-none text-xs w-full text-slate-700 placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shade Filter:</span>
              <select
                value={selectedShadeFilter}
                onChange={(e) => setSelectedShadeFilter(e.target.value)}
                className="text-xs border border-slate-200 bg-white rounded px-2.5 py-1.5 font-bold text-slate-705 outline-none focus:border-blue-500"
              >
                <option value="ALL">Show All Thread Shades</option>
                {distinctShades.map((shade) => (
                  <option key={shade} value={shade}>Shade: {shade}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Main Ledger Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left" id="stock-ledger-table-register">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase tracking-widest font-mono bg-slate-50/60 select-none">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4 w-1/8">Type</th>
                    <th className="py-2.5 px-4">Shade Code</th>
                    <th className="py-2.5 px-4 w-1/4">Shade / Color Specification</th>
                    <th className="py-2.5 px-4">Supplier / Reference</th>
                    <th className="py-2.5 px-4 text-right">In (Cones)</th>
                    <th className="py-2.5 px-4 text-right">Out (Cones)</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-[11px]">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold font-sans">
                        No stock movements logged. Keep recording supplier purchases to populate items automatically.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-[10px] text-slate-500">{entry.date}</td>
                        <td className="py-2.5 px-4">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8.5px] font-extrabold uppercase tracking-widest font-mono border ${
                            entry.type === "Purchase"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-150"
                              : entry.type === "Consumption"
                              ? "bg-rose-50 text-rose-700 border-rose-150"
                              : "bg-blue-50 text-blue-700 border-blue-150"
                          }`}>
                            {entry.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-mono font-bold bg-slate-50 border border-slate-200 text-slate-800 rounded px-1.5 py-0.5 text-[9.5px]">
                            {entry.shade_code}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-sans font-semibold text-slate-800">{entry.shade_name}</td>
                        <td className="py-2.5 px-4">
                          <div className="font-sans">
                            {entry.type === "Purchase" ? (
                              <>
                                <p className="font-semibold text-slate-800 leading-none">{entry.supplier_name || "N/A"}</p>
                                <span className="text-[9px] text-slate-400 font-mono mt-0.5 inline-block">Bill: {entry.purchase_number || "Direct"}</span>
                              </>
                            ) : (
                              <p className="text-slate-500 font-mono text-[10px]">{entry.reference_no || "Manual Consumption"}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">
                          {entry.qty_in > 0 ? `+${entry.qty_in}` : "—"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">
                          {entry.qty_out > 0 ? `-${entry.qty_out}` : "—"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-extrabold text-blue-700 bg-blue-50/10">
                          {entry.balance} cones
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Consumption logs panel */
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left" id="consumption-history-table">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase tracking-widest font-mono bg-slate-50 select-none">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Shade Code</th>
                  <th className="py-2.5 px-4">Shade Name</th>
                  <th className="py-2.5 px-4">Qty Consumed</th>
                  <th className="py-2.5 px-4">Production Link</th>
                  <th className="py-2.5 px-4">Notes & Specifications</th>
                  {canModify && <th className="py-2.5 px-4 text-right">Delete Log</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-[11px]">
                {consumptionLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold font-sans">
                      No consumption history recorded. Click "Log Thread Consumption" above to get started.
                    </td>
                  </tr>
                ) : (
                  consumptionLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-[10px] text-slate-500">{log.date}</td>
                      <td className="py-2.5 px-4">
                        <span className="font-mono font-bold bg-slate-100 border border-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-[9.5px]">
                          {log.shade_code}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-sans font-semibold text-slate-800">{log.shade_name}</td>
                      <td className="py-2.5 px-4 font-mono font-extrabold text-rose-600 whitespace-nowrap">
                        {log.quantity_consumed} Cones
                      </td>
                      <td className="py-2.5 px-4">
                        {log.order_number ? (
                          <span className="inline-block px-1.5 py-0.5 font-mono text-[9px] bg-blue-50 border border-blue-150 text-blue-700 rounded select-all font-semibold uppercase">
                            Order: {log.order_number}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No order linked</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-505 max-w-sm shrink-0 truncate font-sans" title={log.notes}>
                        {log.notes || "—"}
                      </td>
                      {canModify && (
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteConsumption(log.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 border border-slate-100 rounded cursor-pointer hover:bg-rose-50 transition-colors"
                            title="Delete log, restores stock"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Consume Thread Dialog modal */}
      {showConsumeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 outline-none w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center shrink-0">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider font-sans">
                  Log Thread Consumption Entry
                </h4>
                <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">Deducts stock automatically from selected shade inventory</p>
              </div>
              <button
                onClick={() => setShowConsumeModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition-all cursor-pointer"
              >
                <X className="w-4 h-4 text-white stroke-[2.5]" />
              </button>
            </div>
            
            <form onSubmit={handleConsumeSubmit} className="p-5 space-y-3.5 text-xs font-medium">
              
              {consumeError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded text-[10.5px] text-rose-700 flex items-start gap-1.5 leading-snug">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{consumeError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Select Thread Shade *</label>
                <select
                  required
                  value={consumeForm.shade_code}
                  onChange={(e) => setConsumeForm({ ...consumeForm, shade_code: e.target.value })}
                  className="w-full text-xs border border-slate-200 bg-white rounded py-2 px-2.5 text-slate-700 focus:border-blue-500 shadow-sm font-semibold cursor-pointer"
                >
                  <option value="" disabled>-- Pick Thread Shade Code --</option>
                  {inventory.map((item) => {
                    const av = item.available_quantity !== undefined ? item.available_quantity : item.qty_available;
                    return (
                      <option key={item.id} value={item.shade_code} disabled={av <= 0}>
                        {item.shade_code} - {item.shade_name} (Available: {av} cones)
                      </option>
                    );
                  })}
                </select>
                {activeSelectedInventoryItem && (
                  <p className="text-[9px] text-slate-400 mt-1 font-mono italic">
                    Shade Description: {activeSelectedInventoryItem.shade_name} • Supplier Ref: {activeSelectedInventoryItem.supplier_name || "N/A"}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Quantity to Consume *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={consumeForm.quantity_consumed}
                    onChange={(e) => setConsumeForm({ ...consumeForm, quantity_consumed: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded py-2 px-2.5 font-mono focus:border-blue-500 bg-white shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Consumption Date *</label>
                  <input
                    type="date"
                    required
                    value={consumeForm.date}
                    onChange={(e) => setConsumeForm({ ...consumeForm, date: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-2 px-2.5 font-mono focus:border-blue-500 bg-white shadow-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Link Production Order (Optional)</label>
                <select
                  value={consumeForm.order_id}
                  onChange={(e) => setConsumeForm({ ...consumeForm, order_id: e.target.value })}
                  className="w-full text-xs border border-slate-200 bg-white rounded py-2 px-2.5 text-slate-700 focus:border-blue-500 shadow-sm cursor-pointer"
                >
                  <option value="">No Order Binding (Internal Adjustment)</option>
                  {orders.filter(o => o.status !== "Delivered").map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.order_number} - {order.design_name} ({order.quantity} pcs)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Consumption Specification / Notes</label>
                <textarea
                  rows={2}
                  value={consumeForm.notes}
                  onChange={(e) => setConsumeForm({ ...consumeForm, notes: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded py-2 px-2.5 outline-none resize-none focus:border-blue-500 bg-white shadow-sm text-slate-700 font-sans"
                  placeholder="e.g. Back neck floral border run, Tajima Machine 04"
                />
              </div>

              {/* Informative message */}
              <div className="p-2.5 bg-blue-50 border border-blue-100 rounded text-[9.5px] text-blue-700 flex items-start gap-1.5 leading-snug">
                <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span>Saving will immediately deduct stock from inventory and create an automated audit trace in the Stock Ledger ledger.</span>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setShowConsumeModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 border border-rose-600 text-white rounded text-xs font-bold hover:bg-rose-500 transition-all cursor-pointer uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Logging..." : "Confirm Consumption"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
