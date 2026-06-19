/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, Edit3, Trash2, Search, Wallet, Tag, Calendar, CreditCard, X, DollarSign } from "lucide-react";
import { Expense } from "../types.ts";

interface ExpenseViewProps {
  expenses: Expense[];
  userRole: string;
  onRefresh: () => void;
  onAdd: (data: Partial<Expense>) => Promise<any>;
  onEdit: (id: number, data: Partial<Expense>) => Promise<any>;
  onDelete: (id: number) => Promise<any>;
}

export default function ExpenseView({ expenses, userRole, onRefresh, onAdd, onEdit, onDelete }: ExpenseViewProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [formData, setFormData] = useState<Partial<Expense>>({
    expense_date: new Date().toISOString().substring(0, 10),
    category: "Miscellaneous",
    description: "",
    amount: 5000,
    payment_method: "Cash",
  });

  const categories = [
    "Electricity",
    "Rent",
    "Salaries",
    "Maintenance",
    "Fuel",
    "Internet",
    "Transport",
    "Miscellaneous",
  ];

  const filtered = expenses.filter((e) => {
    const descStr = e.description || "";
    const matchesSearch = descStr.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "" || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
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
      expense_date: new Date().toISOString().substring(0, 10),
      category: "Miscellaneous",
      description: "",
      amount: 5000,
      payment_method: "Cash",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingId(exp.id);
    setFormData({
      expense_date: exp.expense_date,
      category: exp.category,
      description: exp.description,
      amount: exp.amount,
      payment_method: exp.payment_method,
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
      alert("Error: " + err.message);
    }
  };

  const canModify = ["admin", "manager", "accountant"].includes(userRole);
  const totalExpensesSum = filtered.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <div className="p-4 md:p-5 space-y-4 max-w-7xl mx-auto" id="expenses-view-panel">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-slate-800 font-bold text-base select-none">Overhead Operational Expenses</h3>
          <p className="text-[11px] text-slate-400 font-mono">Total Logged Expense Items: {expenses.length}</p>
        </div>
        {canModify && (
          <button
            id="record-new-expense-btn"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 bg-blue-600 text-white font-semibold hover:bg-blue-500 px-3 py-1.5 rounded text-xs tracking-wide transition-all shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white stroke-[2.5]" />
            <span>RECORD CASH DISBURSEMENT</span>
          </button>
        )}
      </div>

      {/* Aggregate stats and searching block row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 text-white rounded-lg p-3 border border-slate-800 flex justify-between items-center md:col-span-1">
          <div>
            <p className="text-[9px] text-slate-400 uppercase font-mono tracking-widest font-bold leading-none">Selected Expenditures Total</p>
            <p className="text-lg font-bold text-blue-400 mt-2 tracking-tight">
              {formatPKR(totalExpensesSum)}
            </p>
          </div>
          <div className="p-2 bg-slate-800 border border-slate-700 text-slate-400 rounded leading-none">
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 flex flex-col sm:flex-row items-center gap-3 md:col-span-2 w-full">
          <div className="flex items-center gap-2 border border-slate-200 rounded bg-white px-2.5 py-1.5 flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 focus:text-slate-700" />
            <input
              id="expense-search-input"
              type="text"
              placeholder="Search expenses description logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-0 outline-0 p-0 text-xs w-full text-slate-700 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 border border-slate-200 rounded bg-white px-2.5 py-1.5 w-full sm:w-48">
            <select
              id="expense-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent border-0 outline-0 p-0 text-xs w-full text-slate-700 font-semibold cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid List */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left" id="expenses-main-register-table">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase tracking-widest font-mono bg-slate-50/60 select-none">
                <th className="py-2.5 px-4 select-none">Spent Date</th>
                <th className="py-2.5 px-4 select-none">Category Tag</th>
                <th className="py-2.5 px-4 select-none">Expense Description log</th>
                <th className="py-2.5 px-4 select-none">Payment Method</th>
                <th className="py-2.5 px-4 select-none">Amount Out</th>
                <th className="py-2.5 px-4 text-right select-none">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No matching overhead disbursements registered.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-[10px] text-slate-500">
                        {e.expense_date}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-block px-1.5 py-0.5 text-[9px] uppercase font-mono font-bold tracking-wide text-slate-700 bg-slate-50 border border-slate-200 rounded">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 max-w-sm font-semibold text-slate-800">
                        {e.description}
                      </td>
                      <td className="py-2.5 px-4 font-semibold font-mono text-slate-500 text-[10px]">
                        {e.payment_method}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-rose-600">
                        {formatPKR(e.amount)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {canModify ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              id={`expense-edit-${e.id}`}
                              onClick={() => handleOpenEdit(e)}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-50 border border-slate-100 rounded cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {userRole === "admin" && (
                              deleteConfirmId === e.id ? (
                                <span className="flex items-center gap-1 select-none shrink-0">
                                  <button
                                    onClick={() => {
                                      handleDelete(e.id);
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
                                  id={`expense-delete-${e.id}`}
                                  onClick={() => setDeleteConfirmId(e.id)}
                                  className="p-1 text-rose-455 hover:text-rose-600 hover:bg-rose-50 border border-slate-100 rounded cursor-pointer"
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

      {/* Record Expense Dialog Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 outline-none w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center font-sans shrink-0">
              <h4 className="font-semibold text-xs tracking-wide">
                {editingId ? "Update Overhead Expense" : "Record Overhead Cash Outflow"}
              </h4>
              <button
                id="close-expense-modal-btn"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-3 font-medium text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Expense Date *</label>
                  <input
                    id="form-expense-date"
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Category Classification *</label>
                  <select
                    id="form-expense-category"
                    required
                    value={formData.category}
                    onChange={(e: any) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2 bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700"
                  >
                    {categories.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Cash Outflow Amount (PKR) *</label>
                <input
                  id="form-expense-amount"
                  type="number"
                  required
                  min={1}
                  value={formData.amount || ""}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-slate-700"
                  placeholder="e.g. 45000"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Payment Method / Account *</label>
                <input
                  id="form-expense-payment-method"
                  type="text"
                  required
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-slate-705"
                  placeholder="e.g. Petty Cash, Allied Bank Account"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Payment Description log *</label>
                <textarea
                  id="form-expense-description"
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded py-1.5 px-2 w-full outline-none resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-medium"
                  placeholder="Describe details (e.g. Industrial meter bill paid for May 2026)"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-150">
                <button
                  id="cancel-expense-form-btn"
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-expense-form-btn"
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 border border-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-500 transition-all cursor-pointer"
                >
                  {editingId ? "Save Changes" : "Log Expense Outflow"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
