/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import TableActionControls, { exportToExcel, filterByDateRange } from "./TableActionControls.tsx";
import { Plus, Search, Tag, Wallet, CheckSquare, X, DollarSign, Calendar, ClipboardList, Info } from "lucide-react";
import { Payment, Customer, Supplier } from "../types.ts";

interface PaymentViewProps {
  payments: Payment[];
  customers: Customer[];
  suppliers: Supplier[];
  userRole: string;
  onRefresh: () => void;
  onAddPayment: (data: Partial<Payment>) => Promise<any>;
}

export default function PaymentView({ payments, customers, suppliers, userRole, onRefresh, onAddPayment }: PaymentViewProps) {
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState({ start: "", end: "" });
  const [typeFilter, setTypeFilter] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState<Partial<Payment>>({
    type: "receipt",
    entity_type: "customer",
    entity_id: 1,
    amount: 10000,
    payment_date: new Date().toISOString().substring(0, 10),
    payment_method: "Cash",
    reference_number: "",
    notes: "",
  });

  const timeFiltered = filterByDateRange(payments, "payment_date", dateFilter, customDate);
  const filtered = timeFiltered.filter((p) => {
    const matchesSearch =
      p.notes.toLowerCase().includes(search.toLowerCase()) ||
      (p.reference_number && p.reference_number.toLowerCase().includes(search.toLowerCase()));
    
    const matchesType = typeFilter === "" || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleOpenAdd = (type: "receipt" | "payment") => {
    setFormData({
      type,
      entity_type: type === "receipt" ? "customer" : "supplier",
      entity_id: type === "receipt" ? (customers[0]?.id || 1) : (suppliers[0]?.id || 1),
      amount: 10000,
      payment_date: new Date().toISOString().substring(0, 10),
      payment_method: "Cash",
      reference_number: "",
      notes: "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onAddPayment(formData);
      setShowModal(false);
      onRefresh();
      setIsSaving(false);
    } catch (err: any) {
      alert("Error logging payment: " + err.message);
    
      setIsSaving(false);
    }
  };

  const totalReceipts = payments.filter((p) => p.type === "receipt").reduce((sum, p) => sum + Number(p.amount), 0);
  const totalDisbursements = payments.filter((p) => p.type === "payment").reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="p-4 md:p-5 space-y-4 max-w-7xl mx-auto" id="payments-view-panel">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-slate-800 font-bold text-base select-none font-sans">Cash Book & Receipts Journal</h3>
          <p className="text-[11px] text-slate-400 font-mono">Total Logged Vouchers: {payments.length}</p>
        </div>
        
        {/* Dual actions to create Receipt vs Vendor payment */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="log-customer-receipt-btn"
            onClick={() => handleOpenAdd("receipt")}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-blue-600 text-white font-semibold hover:bg-blue-500 px-3 py-1.5 rounded text-xs tracking-wide transition-all cursor-pointer shadow-md shadow-blue-500/10"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>RECORD RECEIPT</span>
          </button>
          <button
            id="log-supplier-disb-btn"
            onClick={() => handleOpenAdd("payment")}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-800 text-white font-semibold hover:bg-slate-700 px-3 py-1.5 rounded text-xs tracking-wide transition-all cursor-pointer shadow-md"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>RECORD VENDOR PAYMENT</span>
          </button>
        </div>
      </div>

      {/* Aggregate Financial Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sans">
        <div className="bg-slate-900 text-white border border-slate-800 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest font-bold leading-none">Net Bank/Cash Sunk Intake</p>
            <p className="text-lg font-bold text-blue-400 mt-2 tracking-tight">{formatPKR(totalReceipts)}</p>
          </div>
          <div className="p-2 bg-slate-800 border border-slate-700 text-blue-400 rounded leading-none">
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest font-bold leading-none">Total Outgoing Disbursements</p>
            <p className="text-lg font-bold text-slate-900 mt-2 tracking-tight">{formatPKR(totalDisbursements)}</p>
          </div>
          <div className="p-2 bg-slate-50 border border-slate-200 text-slate-500 rounded leading-none">
            <ClipboardList className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest font-bold leading-none">Net Liquid Cash Balance</p>
            <p className="text-lg font-bold text-slate-800 mt-2 tracking-tight">{formatPKR(totalReceipts - totalDisbursements)}</p>
          </div>
          <div className="p-2 bg-slate-50 border border-slate-200 text-slate-500 rounded leading-none">
            <Wallet className="w-4 h-4 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Search block and list representation */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden text-xs">
        <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 border border-slate-200 rounded bg-white px-2.5 py-1.5 flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 focus:text-slate-700" />
            <input
              id="payment-search-input"
              type="text"
              placeholder="Search payment vouchers by cash references or transaction notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-0 outline-0 p-0 text-xs w-full text-slate-700 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 border border-slate-200 rounded bg-white px-2.5 py-1.5 w-full sm:w-48 shrink-0">
            <select
              id="payment-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent border-0 outline-0 p-0 text-xs w-full text-slate-700 font-semibold cursor-pointer"
            >
              <option value="">All Vouchers</option>
              <option value="receipt">Receipts From Clients</option>
              <option value="payment">Payments to Vendors</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          
        <TableActionControls 
          onPrint={() => window.print()} 
          onPdf={() => window.print()} 
          onExcel={() => exportToExcel(filtered, "payment")}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customDateRange={customDate}
          setCustomDateRange={setCustomDate}
        />
        <table className="w-full text-left" id="payments-vouchers-register-table">
            <thead>
              <tr className="border-b border-slate-150 text-[10px] text-slate-400 uppercase tracking-widest font-mono bg-slate-50/20 select-none">
                <th className="py-2.5 px-4 select-none">Voucher No</th>
                <th className="py-2.5 px-4 select-none">Date Logged</th>
                <th className="py-2.5 px-4 select-none">Cash Flow Type</th>
                <th className="py-2.5 px-4 select-none">Associated Entity</th>
                 <th className="py-2.5 px-4 select-none">Accounts Channel</th>
                <th className="py-2.5 px-4 select-none">Channel Ref</th>
                <th className="py-2.5 px-4 text-right select-none font-bold">Flow Net Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No matching cash vouchers recorded.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-2.5 px-4">
                        <span className="font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                          VCH-{p.id}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[10px] text-slate-500">
                        {p.payment_date}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] uppercase font-mono font-bold tracking-wide border ${
                          p.type === "receipt"
                            ? "bg-green-50 text-green-700 border-green-100"
                            : "bg-rose-50 text-rose-700 border-rose-100"
                        }`}>
                          {p.type === "receipt" ? "IN (Receipt)" : "OUT (Disb)"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-850">
                        {p.entity_name || "N/A"}
                        <p className="text-[9px] uppercase font-mono font-bold text-slate-400 tracking-wider">
                          {p.entity_type} ID: {p.entity_id}
                        </p>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-600">{p.payment_method}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[10px] text-slate-500 truncate max-w-40">
                        {p.reference_number || "—"}
                      </td>
                      <td className={`py-2.5 px-4 text-right font-mono font-bold text-xs ${
                        p.type === "receipt" ? "text-green-600" : "text-rose-600"
                      }`}>
                        {p.type === "receipt" ? "+" : "-"}{formatPKR(p.amount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment/Receipt Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 outline-none w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center shrink-0">
              <h4 className="font-semibold text-xs tracking-wide">
                {formData.type === "receipt" ? "Record Cash/Bank Receipt Voucher" : "Record Supplier Cash Voucher"}
              </h4>
              <button
                id="close-payment-modal-btn"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Transaction Date *</label>
                  <input
                    id="form-payment-date"
                    type="date"
                    required
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Accounting Channel *</label>
                  <select
                    id="form-payment-method"
                    required
                    value={formData.payment_method}
                    onChange={(e: any) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2 bg-white outline-none font-semibold text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Cash">Cash Account (PETTY)</option>
                    <option value="Bank Transfer">Bank Transfer (HBL CORP)</option>
                    <option value="Cheque">Corporate Cheque</option>
                    <option value="JazzCash">JazzCash Wallet</option>
                    <option value="Easypaisa">Easypaisa Wallet</option>
                  </select>
                </div>
              </div>

              {formData.type === "receipt" ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Received From Customer *</label>
                  <select
                    id="form-payment-customer-entity"
                    required
                    value={formData.entity_id}
                    onChange={(e) => setFormData({ ...formData, entity_id: Number(e.target.value), entity_type: "customer" })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2 bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-705"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Disbursed to Supplier *</label>
                  <select
                    id="form-payment-supplier-entity"
                    required
                    value={formData.entity_id}
                    onChange={(e) => setFormData({ ...formData, entity_id: Number(e.target.value), entity_type: "supplier" })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2 bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-705"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.supplier_type})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Voucher Amount (PKR) *</label>
                  <input
                    id="form-payment-amount"
                    type="number"
                    required
                    min={1}
                    value={formData.amount || ""}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-slate-700"
                    placeholder="e.g. 50000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Audit Reference Code</label>
                  <input
                    id="form-payment-reference"
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="e.g. CHQ-00124"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Internal audit notes *</label>
                <textarea
                  id="form-payment-notes"
                  required
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded py-1.5 px-2 w-full outline-none resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-medium"
                  placeholder="e.g. Clearing invoice, partial cash layout, etc."
                />
              </div>

              {/* Informative reconcile visual prompt */}
              <div className="p-2.5 bg-blue-50 border border-blue-105 text-blue-800 rounded flex items-start gap-1.5 text-[9.5px] font-medium leading-normal shadow-sm">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  The system implements chronological **First-In First-Out (FIFO)** general ledger reconciliation. Logging this cash flow automatically adjusts outstanding balances in sequence across matching customer invoices or supplier billing vouchers.
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-150">
                <button
                  id="cancel-payment-form-btn"
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-payment-form-btn"
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 border border-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-500 transition-all cursor-pointer disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isSaving ? "Saving..." : (formData.type === "receipt" ? "Record Cash Receipt" : "Record Vendor Payment")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
