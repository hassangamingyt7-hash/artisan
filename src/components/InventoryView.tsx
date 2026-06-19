/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import TableActionControls, { exportToExcel, filterByDateRange } from "./TableActionControls.tsx";
import { Plus, Edit3, Trash2, Search, Filter, Boxes, AlertTriangle, CheckCircle, Flame, X } from "lucide-react";
import { ThreadInventory, Supplier } from "../types.ts";

interface InventoryViewProps {
  inventory: ThreadInventory[];
  suppliers: Supplier[];
  userRole: string;
  onRefresh: () => void;
  onAdd: (data: Partial<ThreadInventory>) => Promise<any>;
  onEdit: (id: number, data: Partial<ThreadInventory>) => Promise<any>;
  onDelete: (id: number) => Promise<any>;
}

export default function InventoryView({ inventory, suppliers, userRole, onRefresh, onAdd, onEdit, onDelete }: InventoryViewProps) {
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState({ start: "", end: "" });
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [formData, setFormData] = useState<Partial<ThreadInventory>>({
    shade_code: "",
    shade_name: "",
    brand: "Marathon Shiny",
    supplier_id: 1,
    purchase_date: new Date().toISOString().substring(0, 10),
    qty_purchased: 50,
    qty_available: 50,
    unit: "Cones",
    cost_per_cone: 350,
  });

  const timeFiltered = filterByDateRange(inventory, "created_at", dateFilter, customDate);
  const filtered = timeFiltered.filter((item) => {
    const shadeCodeStr = item.shade_code || "";
    const shadeNameStr = item.shade_name || "";
    const brandStr = item.brand || "";
    const matchesSearch =
      shadeCodeStr.toLowerCase().includes(search.toLowerCase()) ||
      shadeNameStr.toLowerCase().includes(search.toLowerCase()) ||
      brandStr.toLowerCase().includes(search.toLowerCase());
    
    const matchesSupplier = selectedSupplier === "" || Number(item.supplier_id) === Number(selectedSupplier);

    return matchesSearch && matchesSupplier;
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
      shade_code: "",
      shade_name: "",
      brand: "Marathon Shiny",
      supplier_id: suppliers.length > 0 ? suppliers[0].id : 1,
      purchase_date: new Date().toISOString().substring(0, 10),
      qty_purchased: 50,
      qty_available: 50,
      unit: "Cones",
      cost_per_cone: 380,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: ThreadInventory) => {
    setEditingId(item.id);
    setFormData({
      shade_code: item.shade_code,
      shade_name: item.shade_name,
      brand: item.brand,
      supplier_id: item.supplier_id,
      purchase_date: item.purchase_date,
      qty_purchased: item.qty_purchased,
      qty_available: item.qty_available,
      unit: item.unit,
      cost_per_cone: item.cost_per_cone,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await onEdit(editingId, formData);
      } else {
        await onAdd(formData);
      }
      setShowModal(false);
      onRefresh();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await onDelete(id);
      onRefresh();
    } catch (err: any) {
      alert("Error deleting record: " + err.message);
    }
  };

  const canModify = ["admin", "manager", "store_manager"].includes(userRole);

  return (
    <div className="p-4 md:p-5 space-y-4 max-w-7xl mx-auto" id="inventory-view-panel">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-slate-800 font-bold text-base select-none">Embroidery Thread Shade Catalog</h3>
          <p className="text-[11px] text-slate-400 font-mono">Unique Shade Registrations: {inventory.length}</p>
        </div>
        {canModify && (
          <button
            id="register-new-shade-btn"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 bg-blue-600 text-white font-semibold hover:bg-blue-500 px-3 py-1.5 rounded text-xs tracking-wide transition-all shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white stroke-[2.5]" />
            <span>RECORD NEW STOCK SHADE</span>
          </button>
        )}
      </div>

      {/* Searching section */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 flex flex-col md:flex-row items-center gap-3">
        <div className="flex items-center gap-2 border border-slate-200 rounded bg-white px-2.5 py-1.5 flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            id="inventory-search-input"
            type="text"
            placeholder="Search shades by Shade code (e.g. MA-01), color name, shade brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-0 outline-0 p-0 text-xs w-full text-slate-700 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 border border-slate-200 rounded bg-white px-2.5 py-1.5 w-full md:w-60">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            id="inventory-supplier-filter"
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="bg-transparent border-0 outline-0 p-0 text-xs w-full text-slate-700 font-medium bg-white cursor-pointer"
          >
            <option value="">All Thread Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Inventory table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          
        <TableActionControls 
          onPrint={() => window.print()} 
          onPdf={() => window.print()} 
          onExcel={() => exportToExcel(filtered, "inventory")}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customDateRange={customDate}
          setCustomDateRange={setCustomDate}
        />
        <table className="w-full text-left" id="inventory-shades-table">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase tracking-widest font-mono bg-slate-50/60">
                <th className="py-2.5 px-4 select-none">Shade Code</th>
                <th className="py-2.5 px-4 select-none">Color Details</th>
                <th className="py-2.5 px-4 select-none">Supplier Name</th>
                <th className="py-2.5 px-4 select-none">Base Cost Details</th>
                <th className="py-2.5 px-4 select-none">Operational Status</th>
                <th className="py-2.5 px-4 text-right select-none">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px] font-medium text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs font-semibold">
                    No thread shades match the search query.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isLow = Number(item.qty_available) < 10;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-2.5 px-4">
                        <span className="font-mono font-bold text-[11px] text-slate-800 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                          {item.shade_code}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight">{item.shade_name}</p>
                          <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">{item.brand}</p>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-600">
                        {item.supplier_name || "N/A"}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-500">
                        <p className="text-slate-850 font-semibold">{formatPKR(item.cost_per_cone)} <span className="text-[10px] text-slate-400 font-normal">/ Cone</span></p>
                        <p className="text-[9.5px] text-slate-400">Total Purchase: {formatPKR(item.total_cost)}</p>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-12 font-mono font-bold text-xs text-right ${isLow ? "text-rose-600" : "text-emerald-600"}`}>
                            {item.qty_available} / {item.qty_purchased}
                          </span>
                          {isLow ? (
                            <span className="flex items-center gap-1 text-[9px] font-bold font-mono tracking-wide text-rose-700 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded uppercase shrink-0 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-rose-505" />
                              <span>LOW SAFETY</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[9px] font-bold font-mono tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded uppercase shrink-0">
                              <CheckCircle className="w-3 h-3 text-emerald-505" />
                              <span>In Stock</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {canModify ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              id={`shade-edit-btn-${item.id}`}
                              onClick={() => handleOpenEdit(item)}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-50 border border-slate-100 rounded cursor-pointer"
                              title="Edit stock levels or codes"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {userRole === "admin" && (
                              deleteConfirmId === item.id ? (
                                <span className="flex items-center gap-1 select-none shrink-0">
                                  <button
                                    onClick={() => {
                                      handleDelete(item.id);
                                      setDeleteConfirmId(null);
                                    }}
                                    className="px-1.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[9px] uppercase transition-colors shrink-0 whitespace-nowrap"
                                    title="Confirm Delete"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-1.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-[9px] uppercase transition-colors shrink-0 whitespace-nowrap"
                                    title="Cancel"
                                  >
                                    Cancel
                                  </button>
                                </span>
                              ) : (
                                <button
                                  id={`shade-delete-btn-${item.id}`}
                                  onClick={() => setDeleteConfirmId(item.id)}
                                  className="p-1 text-rose-455 hover:text-rose-600 hover:bg-rose-50 border border-slate-100 rounded cursor-pointer"
                                  title="Remove Shade"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 uppercase font-mono">View Only</span>
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

      {/* Add / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 outline-none w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center shrink-0">
              <h4 className="font-semibold text-xs tracking-wide font-sans">
                {editingId ? "Adjust Shade Level Attributes" : "Log New Shade Cones Batch"}
              </h4>
              <button
                id="close-shade-modal-btn"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-3 font-medium text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Shade Code *</label>
                  <input
                    id="form-shade-code"
                    type="text"
                    required
                    value={formData.shade_code}
                    onChange={(e) => setFormData({ ...formData, shade_code: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="e.g. MA-01"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Color Shade Name *</label>
                  <input
                    id="form-shade-name"
                    type="text"
                    required
                    value={formData.shade_name}
                    onChange={(e) => setFormData({ ...formData, shade_name: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="e.g. Midnight Black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Thread Brand Name</label>
                  <input
                    id="form-shade-brand"
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="e.g. Madeira Premium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Purchased From Supplier *</label>
                  <select
                    id="form-shade-supplier"
                    required
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2 bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Qty Purchased *</label>
                  <input
                    id="form-shade-qty"
                    type="number"
                    required
                    min={0}
                    value={formData.qty_purchased}
                    onChange={(e) => setFormData({ ...formData, qty_purchased: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Qty Available *</label>
                  <input
                    id="form-shade-qty-available"
                    type="number"
                    required
                    min={0}
                    value={formData.qty_available}
                    onChange={(e) => setFormData({ ...formData, qty_available: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Unit Metric</label>
                  <input
                    id="form-shade-unit"
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-slate-705"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Cost Per Cone (PKR) *</label>
                  <input
                    id="form-shade-cost"
                    type="number"
                    required
                    min={0}
                    value={formData.cost_per_cone}
                    onChange={(e) => setFormData({ ...formData, cost_per_cone: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-505 bg-white text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Transaction Date</label>
                  <input
                    id="form-shade-date"
                    type="date"
                    required
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-505 bg-white text-slate-700 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-150">
                <button
                  id="cancel-shade-form-btn"
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-shade-form-btn"
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 border border-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-500 transition-all cursor-pointer"
                >
                  {editingId ? "Update Batch" : "Log Shade Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
