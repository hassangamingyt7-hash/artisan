/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ARTI8SAN ERP - Supplier Purchase Advanced Item Entry View
 */

import React, { useState } from "react";
import TableActionControls, { exportToExcel, filterByDateRange } from "./TableActionControls.tsx";
import { Plus, Edit3, Trash2, Search, Calendar, CheckSquare, X, AlertCircle } from "lucide-react";
import { Purchase, Supplier } from "../types.ts";

interface PurchaseViewProps {
  purchases: Purchase[];
  suppliers: Supplier[];
  userRole: string;
  onRefresh: () => void;
  onAdd: (data: Partial<Purchase>) => Promise<any>;
  onEdit: (id: number, data: Partial<Purchase>) => Promise<any>;
  onDelete: (id: number) => Promise<any>;
}

export default function PurchaseView({ purchases, suppliers, userRole, onRefresh, onAdd, onEdit, onDelete }: PurchaseViewProps) {
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState({ start: "", end: "" });
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Parent metadata properties
  const [formData, setFormData] = useState<Partial<Purchase>>({
    supplier_id: 1,
    payment_status: "Unpaid",
    purchase_date: new Date().toISOString().substring(0, 10),
  });

  // Multiple Item Shade Lines List State
  const [items, setItems] = useState<{ shade_code: string; shade_name: string; cones: number; rate: number }[]>([
    { shade_code: "", shade_name: "", cones: 10, rate: 350 }
  ]);

  const timeFiltered = filterByDateRange(purchases, "purchase_date", dateFilter, customDate);
  const filtered = timeFiltered.filter((p) => {
    const productStr = p.product_name || "";
    const purchaseNumStr = p.purchase_number || "";
    return (
      productStr.toLowerCase().includes(search.toLowerCase()) ||
      purchaseNumStr.toLowerCase().includes(search.toLowerCase())
    );
  });

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      supplier_id: suppliers.length > 0 ? suppliers[0].id : 1,
      payment_status: "Unpaid",
      purchase_date: new Date().toISOString().substring(0, 10),
    });
    setItems([
      { shade_code: "", shade_name: "", cones: 10, rate: 350 }
    ]);
    setShowModal(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditingId(p.id);
    setFormData({
      supplier_id: p.supplier_id,
      payment_status: p.payment_status,
      purchase_date: p.purchase_date,
    });

    // Populate multiple items from sub-array if available, otherwise fallback
    if (p.items && p.items.length > 0) {
      setItems(p.items.map((pi: any) => ({
        shade_code: pi.shade_code,
        shade_name: pi.shade_name,
        cones: pi.cones,
        rate: pi.rate
      })));
    } else {
      setItems([
        { shade_code: "MA-01", shade_name: p.product_name, cones: p.quantity, rate: p.unit_cost }
      ]);
    }
    setShowModal(true);
  };

  const addRow = () => {
    setItems([...items, { shade_code: "", shade_name: "", cones: 10, rate: 350 }]);
  };

  const removeRow = (index: number) => {
    if (items.length === 1) return; // Keep at least one item row
    setItems(items.filter((_, i) => i !== index));
  };

  const updateRowField = (index: number, field: string, value: any) => {
    const updated = items.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setItems(updated);
  };

  // Live total bill calculations for the active modal session
  const totalCostBill = items.reduce((sum, item) => sum + Number(item.cones || 0) * Number(item.rate || 0), 0);
  const totalConesBill = items.reduce((sum, item) => sum + Number(item.cones || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Basic validations
      const invalid = items.some(it => !it.shade_code.trim() || !it.shade_name.trim() || Number(it.cones) <= 0 || Number(it.rate) <= 0);
      if (invalid) {
        alert("Validation error: All items must have valid Shade Code, Shade Name, Quantity and Rate.");
        return;
      }

      const total_cost = totalCostBill;
      const quantity = totalConesBill;
      
      // Compute detailed summary label for backward compatibility rendering
      const product_name = items
        .map(it => `${it.shade_code}: ${it.shade_name} (${it.cones} cones)`)
        .join(", ");
      
      const average_cost = quantity > 0 ? total_cost / quantity : 0;

      const payload = {
        supplier_id: Number(formData.supplier_id),
        payment_status: formData.payment_status,
        purchase_date: formData.purchase_date,
        total_cost,
        quantity,
        product_name,
        unit: "Cones",
        unit_cost: average_cost,
        items // Transmit shade entries items list payload for backend inventory mapping
      };

      if (editingId) {
        await onEdit(editingId, payload);
      } else {
        // Safe PO identifier generation
        const nextNum = purchases.reduce((max, item) => {
          const split = item.purchase_number.split("-");
          const num = parseInt(split[split.length - 1], 10);
          return num > max ? num : max;
        }, 100) + 1;

        const completePayload = {
          ...payload,
          purchase_number: `PO-2026-${nextNum}`
        };
        await onAdd(completePayload);
      }
      setShowModal(false);
      onRefresh();
    } catch (err: any) {
      alert("Error saving: " + err.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await onDelete(id);
      onRefresh();
    } catch (err: any) {
      alert("Error deleting: " + err.message);
    }
  };

  const canModify = ["admin", "manager", "accountant", "accounts_manager", "store_manager"].includes(userRole);

  return (
    <div className="p-4 md:p-5 space-y-4 max-w-7xl mx-auto" id="purchases-view-panel">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-slate-800 font-bold text-base select-none font-sans">Purchasing & Sourcing Bills</h3>
          <p className="text-[11px] text-slate-400 font-mono">Total Purchase Audits: {purchases.length}</p>
        </div>
        {canModify && (
          <button
            id="record-new-purchase-btn"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 bg-blue-600 text-white font-semibold hover:bg-blue-500 px-3 py-1.5 rounded text-xs tracking-wide transition-all shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white stroke-[2.5]" />
            <span>RECORD SUPPLIER BILL</span>
          </button>
        )}
      </div>

      {/* Filter and Search block */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 flex items-center gap-2.5">
        <Search className="w-3.5 h-3.5 text-slate-400" />
        <input
          id="purchase-search-input"
          type="text"
          placeholder="Filter purchases by purchase order identifier, shade codes, or product descriptions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-0 outline-0 p-0 text-xs w-full text-slate-700 placeholder:text-slate-400 font-sans"
        />
      </div>

      {/* Main Table Register */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          
        <TableActionControls 
          onPrint={() => window.print()} 
          onPdf={() => window.print()} 
          onExcel={() => exportToExcel(filtered, "purchase")}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customDateRange={customDate}
          setCustomDateRange={setCustomDate}
        />
        <table className="w-full text-left" id="purchases-main-table">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase tracking-widest font-mono bg-slate-50/60 select-none">
                <th className="py-2.5 px-4">PO Number</th>
                <th className="py-2.5 px-4">Purchase Date</th>
                <th className="py-2.5 px-4">Supplier Name</th>
                <th className="py-2.5 px-4">Items & Shade Materials Details</th>
                <th className="py-2.5 px-4">Total Bill (PKR)</th>
                <th className="py-2.5 px-4">Bill Status</th>
                <th className="py-2.5 px-4 text-right">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold font-sans">
                    No sourcing bills registered.
                  </td>
                </tr>
              ) : (
                filtered.map((p: any) => {
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-2.5 px-4">
                        <span className="font-mono font-semibold text-slate-800 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                          {p.purchase_number}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[10px] text-slate-500">
                        {p.purchase_date}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800 font-sans">
                        {p.supplier_name || "N/A"}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="space-y-1">
                          {p.items && p.items.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-md">
                              {p.items.map((pi: any, idx: number) => (
                                <span key={idx} className="inline-block bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9.5px] font-mono border border-slate-200">
                                  {pi.shade_code} : {pi.shade_name} ({pi.cones} cones @ Rs. {pi.rate})
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div>
                              <p className="font-semibold text-slate-800 font-sans line-clamp-1">{p.product_name}</p>
                              <span className="text-[9.5px] text-slate-400 font-mono mt-0.5 inline-block">Quantity: {p.quantity} {p.unit}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-semibold font-mono text-slate-800">
                        {formatPKR(p.total_cost)}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-bold font-mono uppercase tracking-wide border ${
                          p.payment_status === "Paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : p.payment_status === "Partial"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-rose-50 text-rose-700 border-rose-100"
                        }`}>
                          {p.payment_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {canModify ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              id={`purchase-edit-btn-${p.id}`}
                              onClick={() => handleOpenEdit(p)}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-50 border border-slate-100 rounded cursor-pointer transition-all"
                              title="Modify Bill Attributes"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {userRole === "admin" && (
                              deleteConfirmId === p.id ? (
                                <span className="flex items-center gap-1 select-none shrink-0">
                                  <button
                                    onClick={() => {
                                      handleDelete(p.id);
                                      setDeleteConfirmId(null);
                                    }}
                                    className="px-1.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[9px] uppercase transition-colors shrink-0 whitespace-nowrap font-sans cursor-pointer"
                                    title="Confirm Delete"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-1.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-[9px] uppercase transition-colors shrink-0 whitespace-nowrap font-sans cursor-pointer"
                                    title="Cancel"
                                  >
                                    Cancel
                                  </button>
                                </span>
                              ) : (
                                <button
                                  id={`purchase-delete-btn-${p.id}`}
                                  onClick={() => setDeleteConfirmId(p.id)}
                                  className="p-1 text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-100 rounded cursor-pointer transition-all"
                                  title="Remove Bill Log"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 uppercase font-mono select-none">View Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advanced Multi-Item Sourcing Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 outline-none w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex justify-between items-center shrink-0">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider font-sans">
                  {editingId ? "Update Recorded Multi-Item Bill" : "Supplier Sourcing Entry (Multi-Item)"}
                </h4>
                <p className="text-[9.5px] text-slate-400 mt-0.5 font-mono">Invoice shade and color cones purchase logs</p>
              </div>
              <button
                id="close-purchase-modal-btn"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition-all cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-medium">
              {/* Top Meta info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 border border-slate-150 p-4 rounded-lg">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Supplier / Vendor *</label>
                  <select
                    id="form-purchase-supplier"
                    required
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 bg-white rounded py-2 px-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 shadow-sm"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.supplier_type})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Purchasing Date *</label>
                  <input
                    id="form-purchase-date"
                    type="date"
                    required
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full text-xs border border-slate-200 bg-white rounded py-2 px-2.5 outline-none font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Payment Term State *</label>
                  <select
                    id="form-purchase-status"
                    required
                    value={formData.payment_status}
                    onChange={(e: any) => setFormData({ ...formData, payment_status: e.target.value })}
                    className="w-full text-xs border border-slate-200 bg-white rounded py-2 px-2.5 outline-none font-bold text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                  >
                    <option value="Unpaid">Unpaid (Record Accounts Payable)</option>
                    <option value="Paid">Fully Paid Upfront</option>
                    <option value="Partial">Partial Cash Deposit</option>
                  </select>
                </div>
              </div>

              {/* Items Detail Panel */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-slate-100/50 px-3 py-1.5 border border-slate-150 rounded">
                  <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider font-sans select-none">Purchase Invoice Shade Items</span>
                  <button
                    type="button"
                    onClick={addRow}
                    className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-1 px-2.5 rounded text-[10.5px] tracking-wide transition-all uppercase font-sans cursor-pointer focus:outline-none"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add Item</span>
                  </button>
                </div>

                {/* Sub-Items Form Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs bg-white">
                    <thead>
                      <tr className="border-b border-slate-200 text-[9px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50 select-none">
                        <th className="py-2 px-3 w-1/4">Shade Code *</th>
                        <th className="py-2 px-3 w-1/3">Shade Name *</th>
                        <th className="py-2 px-3 w-1/6">Cones Qty *</th>
                        <th className="py-2 px-3 w-1/6">Rate (PKR) *</th>
                        <th className="py-2 px-3 text-right">Total</th>
                        <th className="py-2 px-3 text-center">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {items.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/30">
                          <td className="py-1.5 px-3">
                            <input
                              type="text"
                              required
                              placeholder="e.g. 1201"
                              value={item.shade_code}
                              onChange={(e) => updateRowField(index, "shade_code", e.target.value)}
                              className="w-full text-xs border border-slate-200 rounded py-1 px-1.5 outline-none font-mono focus:border-blue-500 bg-white"
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="text"
                              required
                              placeholder="e.g. Tomato Red"
                              value={item.shade_name}
                              onChange={(e) => updateRowField(index, "shade_name", e.target.value)}
                              className="w-full text-xs border border-slate-200 rounded py-1 px-1.5 outline-none font-sans focus:border-blue-500 bg-white"
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="number"
                              required
                              min={1}
                              value={item.cones}
                              onChange={(e) => updateRowField(index, "cones", Number(e.target.value))}
                              className="w-full text-xs border border-slate-200 rounded py-1 px-1.5 outline-none font-mono focus:border-blue-500 bg-white"
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="number"
                              required
                              min={1}
                              value={item.rate}
                              onChange={(e) => updateRowField(index, "rate", Number(e.target.value))}
                              className="w-full text-xs border border-slate-200 rounded py-1 px-1.5 outline-none font-mono focus:border-blue-500 bg-white"
                            />
                          </td>
                          <td className="py-1.5 px-3 font-semibold font-mono text-[10.5px] text-slate-700 text-right">
                            {formatPKR(Number(item.cones || 0) * Number(item.rate || 0))}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeRow(index)}
                              disabled={items.length === 1}
                              className={`p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer focus:outline-none transition-all ${items.length === 1 && "opacity-30 cursor-not-allowed"}`}
                              title="Remove item shade line"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Informative calculated total banner */}
              <div className="grid grid-cols-2 gap-4 bg-slate-900 text-white p-3.5 rounded-lg font-mono text-[11px] items-center shrink-0 shadow-lg">
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[8.5px]">Total Items / Cones</span>
                  <div className="font-extrabold text-sm">{items.length} shades / {totalConesBill} cones</div>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[8.5px]">Invoice Total Bill</span>
                  <div className="font-extrabold text-base text-emerald-400">
                    {formatPKR(totalCostBill)}
                  </div>
                </div>
              </div>

              {formData.payment_status === "Unpaid" && (
                <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-md flex items-start gap-2 text-[9.5px] text-rose-700 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>Recording this bill as <strong>Unpaid</strong> will automatically file an outstanding accounts payable balance of <strong>{formatPKR(totalCostBill)}</strong> against this supplier's ledger record.</span>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-150">
                <button
                  id="cancel-purchase-form-btn"
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  id="submit-purchase-form-btn"
                  type="submit"
                  className="px-5 py-2 bg-blue-600 border border-blue-600 text-white rounded text-xs font-bold hover:bg-blue-500 transition-all cursor-pointer uppercase tracking-wider"
                >
                  {editingId ? "Update Bill Information" : "Save Invoice Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
