/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, Edit3, Trash2, Search, ClipboardList, Phone, User, MapPin, X, Printer, FileSpreadsheet } from "lucide-react";
import { Supplier } from "../types.ts";

interface SupplierViewProps {
  suppliers: Supplier[];
  userRole: string;
  onRefresh: () => void;
  onAdd: (data: Partial<Supplier>) => Promise<any>;
  onEdit: (id: number, data: Partial<Supplier>) => Promise<any>;
  onDelete: (id: number) => Promise<any>;
}

export default function SupplierView({ suppliers, userRole, onRefresh, onAdd, onEdit, onDelete }: SupplierViewProps) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Supplier ledger states
  const [ledgerSupplier, setLedgerSupplier] = useState<Supplier | null>(null);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [ledgerOutstanding, setLedgerOutstanding] = useState(0);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: "",
    contact_person: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    supplier_type: "Thread",
  });

  const filtered = suppliers.filter((s) => {
    const nameStr = s.name || "";
    const contactStr = s.contact_person || "";
    const typeStr = s.supplier_type || "";
    return (
      nameStr.toLowerCase().includes(search.toLowerCase()) ||
      contactStr.toLowerCase().includes(search.toLowerCase()) ||
      typeStr.toLowerCase().includes(search.toLowerCase())
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
      name: "",
      contact_person: "",
      phone: "",
      whatsapp: "",
      email: "",
      address: "",
      supplier_type: "Thread",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingId(s.id);
    setFormData({
      name: s.name,
      contact_person: s.contact_person,
      phone: s.phone,
      whatsapp: s.whatsapp,
      email: s.email,
      address: s.address,
      supplier_type: s.supplier_type,
    });
    setShowModal(true);
  };

  const handleOpenLedger = async (supplier: Supplier) => {
    setLedgerSupplier(supplier);
    setLedgerLoading(true);
    setShowLedgerModal(true);
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}/ledger`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("artisan_erp_token")}` }
      });
      const data = await res.json();
      if (res.ok) {
        setLedgerData(data.ledger || []);
        setLedgerOutstanding(data.outstanding_payables || 0);
      } else {
        alert("Failed to load supplier ledger: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLedgerLoading(false);
    }
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
      alert("Error processing supplier: " + err.message);
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

  const canModify = userRole === "admin" || userRole === "manager";

  return (
    <div className="p-4 md:p-5 space-y-4 max-w-7xl mx-auto" id="suppliers-view-panel">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-slate-800 font-bold text-base select-none">Suppliers Registry</h3>
          <p className="text-[11px] text-slate-400 font-mono">Total Verified Suppliers: {suppliers.length}</p>
        </div>
        {canModify && (
          <button
            id="register-new-supplier-btn"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 bg-blue-600 text-white font-semibold hover:bg-blue-500 px-3 py-1.5 rounded text-xs tracking-wide transition-all shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white stroke-[2.5]" />
            <span>RECORD NEW SUPPLIER</span>
          </button>
        )}
      </div>

      {/* Tables representation */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden text-xs">
        <div className="p-3 border-b border-slate-200 bg-white flex items-center gap-2.5">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            id="supplier-search-input"
            type="text"
            placeholder="Search suppliers by vendor name, representative, or inventory classification types..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-0 outline-0 p-0 text-xs w-full text-slate-700 placeholder:text-slate-400"
          />
        </div>

        <div className="overflow-x-auto text-[11px] font-medium text-slate-700">
          <table className="w-full text-left" id="suppliers-register-table">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase tracking-widest font-mono bg-slate-50/60">
                <th className="py-2.5 px-4 select-none">Vendor Detail</th>
                <th className="py-2.5 px-4 select-none">Outstanding Payables</th>
                <th className="py-2.5 px-4 select-none">Material Type</th>
                <th className="py-2.5 px-4 select-none">Contact Rep</th>
                <th className="py-2.5 px-4 text-right select-none">Ledger / Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    No raw material suppliers found matching search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4 animate-in fade-in-50 duration-200">
                      <div>
                        <p className="font-semibold text-slate-900 text-xs">{s.name}</p>
                        <p className="text-[10px] text-slate-455 font-mono mt-0.5">{s.phone}</p>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono">
                      <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded ${
                        Number((s as any).outstanding_payables) > 0 
                          ? "bg-rose-50 text-rose-700 border border-rose-100" 
                          : "bg-emerald-50 text-emerald-705 border border-emerald-100"
                      }`}>
                        {formatPKR((s as any).outstanding_payables || 0)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-1.5 py-0.5 font-semibold rounded text-[9px] uppercase border ${
                        s.supplier_type === "Thread"
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                          : s.supplier_type === "Fabric"
                          ? "bg-amber-50 text-amber-700 border border-amber-100"
                          : s.supplier_type === "Accessory"
                          ? "bg-teal-50 text-teal-700 border border-teal-100"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {s.supplier_type}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-semibold text-slate-700">
                      {s.contact_person || "-"}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`supplier-ledger-btn-${s.id}`}
                          onClick={() => handleOpenLedger(s)}
                          className="p-2 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Generate Supplier Ledger and Payables Timelines"
                        >
                          <ClipboardList className="w-4.5 h-4.5" />
                        </button>
                        {canModify && (
                          <>
                            <button
                              id={`supplier-edit-btn-${s.id}`}
                              onClick={() => handleOpenEdit(s)}
                              className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Supplier Attributes"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {userRole === "admin" && (
                              deleteConfirmId === s.id ? (
                                <span className="flex items-center gap-1 select-none shrink-0">
                                  <button
                                    onClick={() => {
                                      handleDelete(s.id);
                                      setDeleteConfirmId(null);
                                    }}
                                    className="px-1.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[9px] uppercase transition-colors shrink-0"
                                    title="Confirm Delete"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-1.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-[9px] uppercase transition-colors shrink-0"
                                    title="Cancel"
                                  >
                                    Cancel
                                  </button>
                                </span>
                              ) : (
                                <button
                                  id={`supplier-delete-btn-${s.id}`}
                                  onClick={() => setDeleteConfirmId(s.id)}
                                  className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Remove Supplier"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Supplier Dialog Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 outline-none w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center">
              <h4 className="font-bold text-sm tracking-wide font-sans">
                {editingId ? "Update Supplier attributes" : "Register Raw materials supplier"}
              </h4>
              <button
                id="close-supplier-modal-btn"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Supplier Name *</label>
                  <input
                    id="form-supplier-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg py-2 px-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="e.g. Faisalabad Thread Corp"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Supplier Type *</label>
                  <select
                    id="form-supplier-type"
                    required
                    value={formData.supplier_type}
                    onChange={(e: any) => setFormData({ ...formData, supplier_type: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg py-2 px-3 outline-none"
                  >
                    <option value="Thread">Thread Supplier</option>
                    <option value="Fabric">Fabric Supplier</option>
                    <option value="Accessory">Accessory Supplier</option>
                    <option value="Other">Other Category</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contact Person *</label>
                  <input
                    id="form-supplier-contact"
                    type="text"
                    required
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg py-2 px-3 outline-none"
                    placeholder="Representative Name"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Primary Phone *</label>
                  <input
                    id="form-supplier-phone"
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg py-2 px-3 outline-none"
                    placeholder="+92 300 1234567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">WhatsApp Number</label>
                  <input
                    id="form-supplier-whatsapp"
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg py-2 px-3 outline-none"
                    placeholder="+92 300 1234567"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Corporate Email</label>
                  <input
                    id="form-supplier-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg py-2 px-3 outline-none"
                    placeholder="sales@vendor.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Corporate / Factory Address *</label>
                <textarea
                  id="form-supplier-address"
                  required
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg py-2 px-3 outline-none resize-none"
                  placeholder="Factory Street-4, Faisalabad Moti Bazaar..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  id="cancel-supplier-form-btn"
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-supplier-form-btn"
                  type="submit"
                  className="px-5 py-2 bg-slate-900 border border-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
                >
                  {editingId ? "Update Supplier" : "Register Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Ledger modal view */}
      {showLedgerModal && ledgerSupplier && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 outline-none w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-rose-400" />
                <h4 className="font-extrabold text-sm tracking-wide font-sans leading-none">
                  Supplier General Ledger & Liability Record
                </h4>
              </div>
              <button
                id="close-supplier-ledger-modal-btn"
                onClick={() => {
                  setShowLedgerModal(false);
                  setLedgerData([]);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6" id="supplier-ledger-print-area">
              <div className="flex justify-between items-start border-b border-slate-100 pb-5">
                <div className="space-y-1">
                  <h5 className="font-black text-slate-800 text-lg uppercase tracking-tight">{ledgerSupplier.name}</h5>
                  <p className="text-xs text-slate-400 font-mono">Classification: {ledgerSupplier.supplier_type} Supplier</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{ledgerSupplier.address}</span>
                  </p>
                </div>
                <div className="text-right space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-200 shrink-0">
                  <p className="text-[10px] text-slate-400 font-mono tracking-widest font-bold uppercase leading-none">Total Outstanding Payable</p>
                  <p className="text-2xl font-black text-rose-600 tracking-tight leading-none mt-2">
                    {formatPKR(ledgerOutstanding)}
                  </p>
                  <span className="inline-block mt-1 text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">
                    As of 2026-06-19
                  </span>
                </div>
              </div>

              {ledgerLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs animate-pulse font-mono flex flex-col items-center justify-center gap-2">
                  <span className="w-6 h-6 border-2 border-slate-300 border-t-rose-600 rounded-full animate-spin"></span>
                  <span>Fetching supplier ledger history entries...</span>
                </div>
              ) : ledgerData.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1 border-2 border-dashed border-slate-100 rounded-2xl">
                  <span>No general ledger records registered with this supplier yet. Create supplier purchase bills or payments to populate.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase tracking-widest font-mono select-none">
                        <th className="pb-3 pr-2">Date</th>
                        <th className="pb-3 pr-2">Doc Type</th>
                        <th className="pb-3 pr-2">Doc Reference</th>
                        <th className="pb-3 pr-2 text-right">Debit (Disbursed)</th>
                        <th className="pb-3 pr-2 text-right">Credit (Bills)</th>
                        <th className="pb-3 text-right">Total Liability Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {ledgerData.map((row, index) => (
                        <tr key={index} className="hover:bg-slate-50/40">
                          <td className="py-3 font-mono text-[11px] text-slate-500">{row.date}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.type === "Purchase Bill" ? "bg-amber-50 text-amber-800" : "bg-teal-50 text-teal-800"
                            }`}>
                              {row.type}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-[11px] text-slate-600 font-semibold">{row.reference}</td>
                          <td className="py-3 text-right font-mono font-semibold text-emerald-600">
                            {row.debit > 0 ? formatPKR(row.debit) : "—"}
                          </td>
                          <td className="py-3 text-right font-mono font-semibold text-rose-800">
                            {row.credit > 0 ? formatPKR(row.credit) : "—"}
                          </td>
                          <td className="py-3 text-right font-mono font-black text-slate-900">
                            {formatPKR(row.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-between items-center shrink-0">
              <button
                id="print-supplier-statement-btn"
                onClick={() => {
                  window.print();
                }}
                className="flex items-center gap-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>PRINT STATEMENT</span>
              </button>
              
              <button
                id="supplier-ledger-done-btn"
                onClick={() => {
                  setShowLedgerModal(false);
                  setLedgerData([]);
                }}
                className="px-5 py-2 bg-slate-900 border border-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-extrabold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
