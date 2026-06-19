/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, Edit3, Trash2, Search, Award, Calendar, HelpCircle, X, ShieldAlert } from "lucide-react";
import { Brand } from "../types.ts";

interface BrandViewProps {
  brands: Brand[];
  userRole: string;
  onRefresh: () => void;
  onAdd: (data: Partial<Brand>) => Promise<any>;
  onEdit: (id: number, data: Partial<Brand>) => Promise<any>;
  onDelete: (id: number) => Promise<any>;
}

export default function BrandView({ brands, userRole, onRefresh, onAdd, onEdit, onDelete }: BrandViewProps) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [formData, setFormData] = useState<Partial<Brand>>({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    payment_terms: "COD",
  });

  const filtered = brands.filter((b) => {
    const nameStr = b.name || "";
    const contactStr = b.contact_person || "";
    return (
      nameStr.toLowerCase().includes(search.toLowerCase()) ||
      contactStr.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      payment_terms: "COD",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (brand: Brand) => {
    setEditingId(brand.id);
    setFormData({
      name: brand.name,
      contact_person: brand.contact_person,
      phone: brand.phone,
      email: brand.email,
      address: brand.address,
      payment_terms: brand.payment_terms,
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
      alert("Error deleting brand: " + err.message);
    }
  };

  const canModify = userRole === "admin" || userRole === "manager";

  return (
    <div className="p-4 md:p-5 space-y-4 max-w-7xl mx-auto" id="brands-view-panel">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-slate-800 font-bold text-base select-none">Embroidery Design Brands</h3>
          <p className="text-[11px] text-slate-400 font-mono">Registered Brands: {brands.length}</p>
        </div>
        {canModify && (
          <button
            id="register-new-brand-btn"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 bg-blue-600 text-white font-semibold hover:bg-blue-500 px-3 py-1.5 rounded text-xs tracking-wide transition-all shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white stroke-[2.5]" />
            <span>RECORD NEW BRAND</span>
          </button>
        )}
      </div>

      {/* Brands Table layout */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden text-xs">
        <div className="p-3 border-b border-slate-200 bg-white flex items-center gap-2.5">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            id="brand-search-input"
            type="text"
            placeholder="Search brands by brand name or contact representative..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-0 outline-0 p-0 text-xs w-full text-slate-700 placeholder:text-slate-400"
          />
        </div>

        <div className="overflow-x-auto text-[11px] font-medium text-slate-700">
          <table className="w-full text-left" id="brands-register-table">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase tracking-widest font-mono bg-slate-50/60">
                <th className="py-2.5 px-4 select-none">Brand Name</th>
                <th className="py-2.5 px-4 select-none">Contact Person</th>
                <th className="py-2.5 px-4 select-none">Terms Configuration</th>
                <th className="py-2.5 px-4 select-none">Communication Details</th>
                <th className="py-2.5 px-4 text-right select-none">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs font-semibold">
                    No design brands found matching filter parameters.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <Award className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <span className="font-semibold text-slate-900 text-xs">{b.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {b.contact_person || "-"}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-block px-1.5 py-0.5 font-mono font-semibold rounded text-[10px] bg-slate-50 border border-slate-200 text-slate-700">
                        {b.payment_terms || "COD"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500 space-y-0.5 text-[10px]">
                      <p className="font-bold text-slate-700">{b.phone || "—"}</p>
                      <p className="text-slate-400">{b.email || ""}</p>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {canModify ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            id={`brand-edit-${b.id}`}
                            onClick={() => handleOpenEdit(b)}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-50 border border-slate-100 rounded cursor-pointer"
                            title="Edit Brand details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {userRole === "admin" && (
                            deleteConfirmId === b.id ? (
                              <span className="flex items-center gap-1 select-none">
                                <button
                                  onClick={() => {
                                    handleDelete(b.id);
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
                                id={`brand-delete-${b.id}`}
                                onClick={() => setDeleteConfirmId(b.id)}
                                className="p-1 text-rose-455 hover:text-rose-600 hover:bg-rose-50 border border-slate-100 rounded cursor-pointer"
                                title="Delete Brand"
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Brand Add/Edit Form Dialog */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 outline-none w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center shrink-0">
              <h4 className="font-semibold text-xs tracking-wide">
                {editingId ? "Update Brand Attributes" : "Register Design Brand"}
              </h4>
              <button
                id="close-brand-modal-btn"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-3 font-medium text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Brand Name *</label>
                <input
                  id="form-brand-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                  placeholder="e.g. Sana Safinaz Luxury Line"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Contact Person / Designer *</label>
                <input
                  id="form-brand-contact"
                  type="text"
                  required
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                  placeholder="e.g. Sarah Ahmed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Contact Phone</label>
                  <input
                    id="form-brand-phone"
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="+92 321 8889999"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Email Address</label>
                  <input
                    id="form-brand-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="designer@brand.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Payment Cycle Terms *</label>
                <input
                  id="form-brand-terms"
                  type="text"
                  required
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-505 bg-white"
                  placeholder="e.g. 15 Days Net, COD, Advance 50%"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Corporate Address</label>
                <textarea
                  id="form-brand-address"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-505 bg-white"
                  placeholder="Design Studio Tower, DHA..."
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-150">
                <button
                  id="cancel-brand-form-btn"
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-brand-form-btn"
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 border border-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-500 transition-all cursor-pointer"
                >
                  {editingId ? "Update Brand" : "Add Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
