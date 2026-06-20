/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import TableActionControls, { exportToExcel, filterByDateRange } from "./TableActionControls.tsx";
import { Plus, Edit3, Trash2, Search, Play, CheckSquare, CheckCircle, Truck, X, Eye } from "lucide-react";
import { Order, Brand } from "../types.ts";

interface OrderViewProps {
  orders: Order[];
  brands: Brand[];
  userRole: string;
  onRefresh: () => void;
  onAdd: (data: Partial<Order>) => Promise<any>;
  onEdit: (id: number, data: Partial<Order>) => Promise<any>;
  onDelete: (id: number) => Promise<any>;
}

export default function OrderView({ orders, brands, userRole, onRefresh, onAdd, onEdit, onDelete }: OrderViewProps) {
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState({ start: "", end: "" });
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [formData, setFormData] = useState<Partial<Order>>({
    brand_id: 1,
    design_name: "",
    design_code: "",
    quantity: 1000,
    rate: 85,
    delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    status: "Pending",
  });

  const timeFiltered = filterByDateRange(orders, "order_date", dateFilter, customDate);
  const filtered = timeFiltered.filter((o) => {
    const designNameStr = o.design_name || "";
    const designCodeStr = o.design_code || "";
    const orderNumStr = o.order_number || "";
    const matchesSearch =
      designNameStr.toLowerCase().includes(search.toLowerCase()) ||
      designCodeStr.toLowerCase().includes(search.toLowerCase()) ||
      orderNumStr.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "" || o.status === statusFilter;

    return matchesSearch && matchesStatus;
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
      brand_id: brands.length > 0 ? brands[0].id : 1,
      design_name: "",
      design_code: "",
      quantity: 1000,
      rate: 85,
      delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      status: "Pending",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (order: Order) => {
    setEditingId(order.id);
    setFormData({
      brand_id: order.brand_id,
      design_name: order.design_name,
      design_code: order.design_code,
      quantity: order.quantity,
      rate: order.rate,
      delivery_date: order.delivery_date,
      status: order.status,
    });
    setShowModal(true);
  };

  const handleUpdateStatus = async (order: Order, nextStatus: "Pending" | "Running" | "Completed" | "Delivered") => {
    const confirmMsg = `Are you sure you would like to transition Order ${order.order_number} to list: [${nextStatus}]?`;
    if (window.confirm(confirmMsg)) {
      try {
        await onEdit(order.id, { status: nextStatus });
        onRefresh();
      setIsSaving(false);
      } catch (err: any) {
        alert("Error transitioning status: " + err.message);
      
      setIsSaving(false);
    }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingId) {
        await onEdit(editingId, formData);
      } else {
        // Automatically auto-increment Custom Order Numbers
        const nextNum = orders.reduce((max, item) => {
          const split = item.order_number.split("-");
          const num = parseInt(split[split.length - 1], 10);
          return num > max ? num : max;
        }, 1000) + 1;
        
        const payload = {
          ...formData,
          order_number: `ORD-${nextNum}`
        };
        await onAdd(payload);
      }
      setShowModal(false);
      onRefresh();
      setIsSaving(false);
    } catch (err: any) {
      alert("Error saving order: " + err.message);
    
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await onDelete(id);
      onRefresh();
      setIsSaving(false);
    } catch (err: any) {
      alert("Error deleting order: " + err.message);
    
      setIsSaving(false);
    }
  };

  const canModify = ["admin", "manager", "store_manager"].includes(userRole);

  return (
    <div className="p-4 md:p-5 space-y-4 max-w-7xl mx-auto" id="orders-view-panel">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-slate-800 font-bold text-base select-none">Embroidery Jobs Registry</h3>
          <p className="text-[11px] text-slate-400 font-mono">Booked Production Orders: {orders.length}</p>
        </div>
        {canModify && (
          <button
            id="create-new-order-btn"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 bg-blue-600 text-white font-semibold hover:bg-blue-500 px-3 py-1.5 rounded text-xs transition-all shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            <span>BOOK NEW PRODUCTION JOB</span>
          </button>
        )}
      </div>

      {/* Searching & filters panel */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 flex flex-col md:flex-row items-center gap-3">
        <div className="flex items-center gap-2 border border-slate-200 rounded bg-slate-50/50 px-2.5 py-1.5 flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 focus:text-slate-600" />
          <input
            id="order-search-input"
            type="text"
            placeholder="Search orders by Job No (e.g. ORD-1001), Design name, design code (e.g. BRQ-202)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-0 outline-0 p-0 text-xs w-full text-slate-700 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 border border-slate-200 rounded bg-slate-50/50 px-2.5 py-1.5 w-full md:w-48">
          <select
            id="order-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent border-0 outline-0 p-0 text-xs w-full text-slate-700 font-semibold cursor-pointer"
          >
            <option value="">All Production Status</option>
            <option value="Pending">Pending (Queue)</option>
            <option value="Running">Running (Machines)</option>
            <option value="Completed">Completed (To Invoice)</option>
            <option value="Delivered">Delivered & Invoiced</option>
          </select>
        </div>
      </div>

      {/* Orders list Grid table representation */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden animate-in fade-in duration-205">
        <div className="overflow-x-auto">
          
        <TableActionControls 
          onPrint={() => window.print()} 
          onPdf={() => window.print()} 
          onExcel={() => exportToExcel(filtered, "order")}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customDateRange={customDate}
          setCustomDateRange={setCustomDate}
        />
        <table className="w-full text-left" id="orders-main-register-table">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase tracking-widest font-mono bg-slate-50/60 select-none">
                <th className="py-2.5 px-4 select-none">Order Number ID</th>
                <th className="py-2.5 px-4 select-none">Design Metadata</th>
                <th className="py-2.5 px-4 select-none">Client Brand</th>
                <th className="py-2.5 px-4 select-none">Rates & Total</th>
                <th className="py-2.5 px-4 select-none">Production State</th>
                <th className="py-2.5 px-4 text-right select-none">Management Flow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No production embroidery jobs match filters.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-2.5 px-4">
                        <span className="font-mono font-bold text-[10px] text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                          {o.order_number}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div>
                          <p className="font-semibold text-slate-800 text-[12px] leading-normal">{o.design_name}</p>
                          <span className="text-[9px] font-mono font-medium text-slate-400 mt-0.5 inline-block">Code: {o.design_code}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-600">
                        {o.brand_name || "N/A"}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        <p className="text-slate-800 font-bold">{o.quantity} units <span className="text-[10px] text-slate-400 font-normal">@ {formatPKR(o.rate)}</span></p>
                        <p className="text-[10px] text-blue-600 font-bold mt-0.5">Val: {formatPKR(o.total_amount)}</p>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold font-mono tracking-wide border uppercase ${
                            o.status === "Pending"
                              ? "bg-amber-50 text-amber-700 border-amber-100"
                              : o.status === "Running"
                              ? "bg-sky-50 text-sky-700 border-sky-100"
                              : o.status === "Completed"
                              ? "bg-purple-50 text-purple-700 border-purple-100"
                              : "bg-green-50 text-green-700 border-green-100"
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Chronological Status Pipeline transition tools */}
                          {o.status === "Pending" && (
                            <button
                              id={`trigger-machine-${o.id}`}
                              onClick={() => handleUpdateStatus(o, "Running")}
                              className="p-1 text-sky-600 hover:bg-sky-50 rounded border border-slate-200 cursor-pointer"
                              title="Engage Tajima Embroidery Machines (Set Status: 'Running')"
                            >
                              <Play className="w-3 h-3 shrink-0" />
                            </button>
                          )}
                          {o.status === "Running" && (
                            <button
                              id={`complete-job-${o.id}`}
                              onClick={() => handleUpdateStatus(o, "Completed")}
                              className="p-1 text-purple-600 hover:bg-purple-50 rounded border border-slate-200 cursor-pointer"
                              title="Finish Embroidery Stitching (Set Status: 'Completed')"
                            >
                              <CheckSquare className="w-3 h-3 shrink-0" />
                            </button>
                          )}
                          {o.status === "Completed" && (
                            <button
                              id={`dispatch-job-${o.id}`}
                              onClick={() => handleUpdateStatus(o, "Delivered")}
                              className="p-1 text-green-600 hover:bg-green-50 rounded border border-slate-200 cursor-pointer"
                              title="Dispatch Cargo Shipment (Set Status: 'Delivered')"
                            >
                              <Truck className="w-3 h-3 shrink-0" />
                            </button>
                          )}

                          {canModify && (
                            <>
                              <button
                                id={`order-edit-btn-${o.id}`}
                                onClick={() => handleOpenEdit(o)}
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded border border-slate-200 transition-colors cursor-pointer"
                                title="Modify Order particulars"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {userRole === "admin" && (
                                deleteConfirmId === o.id ? (
                                  <span className="flex items-center gap-1 select-none shrink-0">
                                    <button
                                      onClick={() => {
                                        handleDelete(o.id);
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
                                    id={`order-delete-btn-${o.id}`}
                                    onClick={() => setDeleteConfirmId(o.id)}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded border border-slate-200 transition-colors cursor-pointer"
                                    title="Erase order record"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Book Order Dialog Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-200 outline-none w-full max-w-sm shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
              <h4 className="font-bold text-xs tracking-wide">
                {editingId ? "Update Booked Job Order" : "Embroidery Job Booking Voucher"}
              </h4>
              <button
                id="close-order-modal-btn"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Select Designer Brand *</label>
                <select
                  id="form-order-brand"
                  required
                  value={formData.brand_id}
                  onChange={(e) => setFormData({ ...formData, brand_id: Number(e.target.value) })}
                  className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Design Pattern Name *</label>
                  <input
                    id="form-order-design-name"
                    type="text"
                    required
                    value={formData.design_name || ""}
                    onChange={(e) => setFormData({ ...formData, design_name: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Baroque Floral"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Design Code *</label>
                  <input
                    id="form-order-design-code"
                    type="text"
                    required
                    value={formData.design_code || ""}
                    onChange={(e) => setFormData({ ...formData, design_code: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. BRQ-104"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Booked Stitch Quantity *</label>
                  <input
                    id="form-order-quantity"
                    type="number"
                    required
                    min={1}
                    value={formData.quantity || ""}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Rate Per Unit (PKR) *</label>
                  <input
                    id="form-order-rate"
                    type="number"
                    required
                    min={0.01}
                    step="0.01"
                    value={formData.rate || ""}
                    onChange={(e) => setFormData({ ...formData, rate: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Target Delivery Date *</label>
                  <input
                    id="form-order-delivery"
                    type="date"
                    required
                    value={formData.delivery_date}
                    onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Production Queue State</label>
                  <select
                    id="form-order-status"
                    required
                    value={formData.status}
                    onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2 bg-white outline-none font-semibold text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Pending">Pending (Queue)</option>
                    <option value="Running">Running (Machines)</option>
                    <option value="Completed">Completed (To Invoice)</option>
                    <option value="Delivered">Delivered & Invoiced</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  id="cancel-order-form-btn"
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-order-form-btn"
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 border border-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-500 transition-all cursor-pointer disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isSaving ? "Saving..." : (editingId ? "Update Job" : "Book Production Job")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
