/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Plus, Edit3, Trash2, Search, FileText, ChevronRight, X, Phone, Mail, MapPin, Printer, ClipboardList } from "lucide-react";
import { Customer } from "../types.ts";

interface CustomerViewProps {
  customers: Customer[];
  userRole: string;
  onRefresh: () => void;
  onAdd: (data: Partial<Customer>) => Promise<any>;
  onEdit: (id: number, data: Partial<Customer>) => Promise<any>;
  onDelete: (id: number) => Promise<any>;
}

export default function CustomerView({ customers, userRole, onRefresh, onAdd, onEdit, onDelete }: CustomerViewProps) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Ledger view state
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [ledgerOutstanding, setLedgerOutstanding] = useState(0);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form states
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: "",
    company_name: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    ntn: "",
    notes: "",
  });

  const filtered = customers.filter((c) => {
    const nameStr = c.name || "";
    const companyStr = c.company_name || "";
    const phoneStr = c.phone || "";
    return (
      nameStr.toLowerCase().includes(search.toLowerCase()) ||
      companyStr.toLowerCase().includes(search.toLowerCase()) ||
      phoneStr.includes(search)
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
      company_name: "",
      phone: "",
      whatsapp: "",
      email: "",
      address: "",
      ntn: "",
      notes: "",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setFormData({
      name: customer.name,
      company_name: customer.company_name,
      phone: customer.phone,
      whatsapp: customer.whatsapp,
      email: customer.email,
      address: customer.address,
      ntn: customer.ntn,
      notes: customer.notes,
    });
    setShowModal(true);
  };

  const handleOpenLedger = async (customer: Customer) => {
    setLedgerCustomer(customer);
    setLedgerLoading(true);
    setShowLedgerModal(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}/ledger`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("artisan_erp_token")}` }
      });
      const data = await res.json();
      if (res.ok) {
        setLedgerData(data.ledger || []);
        setLedgerOutstanding(data.outstanding_balance || 0);
      } else {
        alert("Failed to load customer ledger: " + data.error);
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
      alert("Error processing customer: " + err.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await onDelete(id);
      onRefresh();
    } catch (err: any) {
      alert("Error deleting customer: " + err.message);
    }
  };

  // Double check authorization roles
  const canModify = ["admin", "manager", "accountant", "accounts_manager"].includes(userRole);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto" id="customers-view-panel">
      {/* 1. Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-slate-800 font-bold text-sm md:text-base select-none">Embroidery Customers Register</h3>
          <p className="text-[10px] text-slate-400 font-mono">Total Clients Booked: {customers.length}</p>
        </div>
        {canModify && (
          <button
            id="add-new-customer-btn"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-blue-600 text-white font-semibold hover:bg-blue-500 px-3.5 py-2 rounded-md text-xs tracking-wide transition-all shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            <span>RECORD NEW CLIENT</span>
          </button>
        )}
      </div>

      {/* 2. Searching & listings layout */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-150 bg-slate-50/50 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            id="customer-search-input"
            type="text"
            placeholder="Filter customers by name, textile brand, business entity, or phone shade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-0 outline-0 p-0 text-xs w-full text-slate-700 placeholder:text-slate-400"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left" id="customers-register-table">
            <thead>
              <tr className="border-b border-slate-200 text-[9px] text-slate-400 uppercase tracking-wider font-mono bg-slate-50/20">
                <th className="py-2 px-4 select-none">Client Detail</th>
                <th className="py-2 px-4 select-none font-bold text-slate-700">Outstanding Balance</th>
                <th className="py-2 px-4 select-none">NTN Number</th>
                <th className="py-2 px-4 select-none">Primary Contact</th>
                <th className="py-2 px-4 text-right select-none">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No embroidery clients found matching search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 px-4">
                      <div>
                        <p className="font-bold text-slate-800 text-xs md:text-sm">{c.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-sans font-medium">Brand: <span className="text-slate-600 font-semibold">{c.company_name}</span></p>
                      </div>
                    </td>
                    <td className="py-2 px-4">
                      <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        Number(c.outstanding_balance) > 0 
                          ? "bg-rose-50 text-rose-700 border border-rose-100" 
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {formatPKR(c.outstanding_balance || 0)}
                      </span>
                    </td>
                    <td className="py-2 px-4 font-mono text-slate-500 font-medium">
                      {c.ntn || "N/A"}
                    </td>
                    <td className="py-2 px-4">
                      <div className="space-y-0.5 text-[10px]">
                        <p className="flex items-center gap-1 text-slate-600">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.phone}</span>
                        </p>
                        {c.whatsapp && (
                          <p className="flex items-center gap-1 text-blue-600 font-medium">
                            <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                            <span>{c.whatsapp}</span>
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          id={`cust-view-ledger-${c.id}`}
                          onClick={() => handleOpenLedger(c)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Generate Complete Customer Ledger Report"
                        >
                          <ClipboardList className="w-4 h-4" />
                        </button>
                        {canModify && (
                          <>
                            <button
                              id={`cust-edit-${c.id}`}
                              onClick={() => handleOpenEdit(c)}
                              className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                              title="Edit Client Information"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {userRole === "admin" && (
                              deleteConfirmId === c.id ? (
                                <span className="flex items-center gap-1 select-none">
                                  <button
                                    onClick={() => {
                                      handleDelete(c.id);
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
                                  id={`cust-delete-${c.id}`}
                                  onClick={() => setDeleteConfirmId(c.id)}
                                  className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Delete Client Profile"
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Form Dialog Modal (Add/Edit) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 outline-none w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
              <h4 className="font-bold text-xs tracking-wide">
                {editingId ? "Update Customer Profile" : "Register New Client"}
              </h4>
              <button
                id="close-customer-modal-btn"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Client Full Name *</label>
                  <input
                    id="form-customer-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Khaadi Retail Pakistan"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Embroidery Trade Brand *</label>
                  <input
                    id="form-customer-company"
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Khaadi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Primary Contact Phone *</label>
                  <input
                    id="form-customer-phone"
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="+92 300 1234567"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">WhatsApp Mobile No</label>
                  <input
                    id="form-customer-whatsapp"
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="+92 300 1234567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    id="form-customer-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="accounts@khaadi.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tax Registration Number (NTN)</label>
                  <input
                    id="form-customer-ntn"
                    type="text"
                    value={formData.ntn}
                    onChange={(e) => setFormData({ ...formData, ntn: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. 3189456-7"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Registered Factory/Office Address Address *</label>
                <textarea
                  id="form-customer-address"
                  required
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Street No, Industrial Block, Karachi..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Additional Billing Notes</label>
                <textarea
                  id="form-customer-notes"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Add custom shipping instructions, credit limit configurations, tax exemptions, etc."
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3.5 border-t border-slate-100">
                <button
                  id="cancel-customer-form-btn"
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-customer-form-btn"
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 border border-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-500 transition-all cursor-pointer"
                >
                  {editingId ? "Save Updates" : "Register Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Complete Customer Ledger Modal */}
      {showLedgerModal && ledgerCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 outline-none w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Ledger Modal Header */}
            <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-400" />
                <h4 className="font-bold text-xs tracking-wide font-sans leading-none">
                  Customer General Ledger Statement
                </h4>
              </div>
              <button
                id="close-ledger-modal-btn"
                onClick={() => {
                  setShowLedgerModal(false);
                  setLedgerData([]);
                }}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ledger content body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4" id="customer-ledger-print-area">
              {/* Ledger Client and Company Information Block */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-3 block">
                <div className="space-y-0.5">
                  <h5 className="font-bold text-slate-800 text-base uppercase tracking-tight">{ledgerCustomer.name}</h5>
                  <p className="text-xs text-slate-500 font-medium">Textile Line: <span className="text-slate-700 font-semibold">{ledgerCustomer.company_name}</span></p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{ledgerCustomer.address}</span>
                  </p>
                </div>
                <div className="text-right space-y-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <p className="text-[9px] text-slate-400 font-mono tracking-wider font-bold uppercase leading-none">Status Balance</p>
                  <p className="text-lg font-bold text-rose-600 tracking-tight leading-none mt-1">
                    {formatPKR(ledgerOutstanding)}
                  </p>
                  <span className="inline-block text-[8px] uppercase font-mono font-bold text-slate-400 tracking-wider">
                    Ledger View
                  </span>
                </div>
              </div>

              {ledgerLoading ? (
                <div className="py-8 text-center text-slate-400 text-xs animate-pulse font-mono flex flex-col items-center justify-center gap-1.5">
                  <span className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></span>
                  <span>Fetching historical double-entry transaction ledgers from database...</span>
                </div>
              ) : ledgerData.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1 border border-dashed border-slate-200 rounded-lg">
                  <span>No general ledger history available for this client yet. Create invoicable items or payments to populate.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <table className="w-full text-left font-sans text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-150 text-[9px] text-slate-400 uppercase tracking-widest font-mono select-none">
                        <th className="pb-2 pr-1.5 font-bold">Date</th>
                        <th className="pb-2 pr-1.5 font-bold">Tx Type</th>
                        <th className="pb-2 pr-1.5 font-bold">Doc Reference</th>
                        <th className="pb-2 pr-1.5 text-right font-bold">Debit (INV Sales)</th>
                        <th className="pb-2 pr-1.5 text-right font-bold">Credit (Receipts)</th>
                        <th className="pb-2 text-right font-bold">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {ledgerData.map((row, index) => (
                        <tr key={index} className="hover:bg-slate-50/40">
                          <td className="py-2 font-mono text-[10px] text-slate-500">{row.date}</td>
                          <td className="py-2">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              row.type === "Invoice" ? "bg-blue-50 text-blue-800" : "bg-green-50 text-green-800"
                            }`}>
                              {row.type}
                            </span>
                          </td>
                          <td className="py-2 font-mono text-[10px] text-slate-600 font-semibold">{row.reference}</td>
                          <td className="py-2 text-right font-mono font-semibold text-slate-800">
                            {row.debit > 0 ? formatPKR(row.debit) : "—"}
                          </td>
                          <td className="py-2 text-right font-mono font-semibold text-green-600">
                            {row.credit > 0 ? formatPKR(row.credit) : "—"}
                          </td>
                          <td className="py-2 text-right font-mono font-black text-slate-900">
                            {formatPKR(row.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Print and Download Actions */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex justify-between items-center shrink-0">
              <button
                id="print-ledger-btn"
                onClick={() => {
                  window.print();
                }}
                className="flex items-center gap-1.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>PRINT STATEMENT</span>
              </button>
              
              <button
                id="cancel-ledger-modal-btn"
                onClick={() => {
                  setShowLedgerModal(false);
                  setLedgerData([]);
                }}
                className="px-4 py-1.5 bg-blue-600 border border-blue-600 text-white hover:bg-blue-500 rounded-md text-xs font-bold cursor-pointer"
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
