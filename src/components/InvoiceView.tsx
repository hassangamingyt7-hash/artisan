/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, Trash2, Search, Printer, Receipt, Calendar, HelpCircle, X, ShieldAlert, CreditCard, Edit3 } from "lucide-react";
import { Invoice, Order, Brand } from "../types.ts";

interface InvoiceViewProps {
  invoices: Invoice[];
  orders: Order[];
  brands: Brand[];
  userRole: string;
  onRefresh: () => void;
  onAddInvoice: (data: Partial<Invoice>) => Promise<any>;
  onEditInvoice: (id: number, data: Partial<Invoice>) => Promise<any>;
  onDeleteInvoice: (id: number) => Promise<any>;
}

export default function InvoiceView({ invoices, orders, brands, userRole, onRefresh, onAddInvoice, onEditInvoice, onDeleteInvoice }: InvoiceViewProps) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form states to create invoice
  const [selectedBrand, setSelectedBrand] = useState<number>(brands[0]?.id || 1);
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [dueDate, setDueDate] = useState<string>(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
  
  // Tax configuration options
  const [taxRate, setTaxRate] = useState<number>(18); // standard 18% GST (Embroidery)
  const [withholdingRate, setWithholdingRate] = useState<number>(4.5); // standard 4.5% tax withholder
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  
  // Choose completed orders for this brand to bundle in the sales invoice
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);

  // Filter completed and delivered orders belonging to this brand that have not been invoiced yet
  // Plus orders that are already linked to the invoice we are currently editing
  const availableOrders = orders.filter((o) => {
    if (o.brand_id !== selectedBrand) return false;
    
    const isCurrentlyLinked = editingId && editingInvoice 
      ? (editingInvoice.orders?.includes(o.id) || editingInvoice.orders_list?.some((item: any) => item.id === o.id))
      : false;
      
    if (isCurrentlyLinked) return true;
    
    return o.status === "Completed" || o.status === "Delivered";
  });

  const filteredInvoices = invoices.filter((i) =>
    i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    i.brand_name.toLowerCase().includes(search.toLowerCase())
  );

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handlePrintOrPdf = (isSavePdf: boolean) => {
    const printContent = document.getElementById("invoice-layout-full-printable")?.innerHTML;
    if (!printContent) return;

    const iframeId = "invoice-printing-iframe-temp";
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (iframe) {
      document.body.removeChild(iframe);
    }
    
    iframe = document.createElement("iframe") as HTMLIFrameElement;
    iframe.id = iframeId;
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    iframe.style.left = "-9999px";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow || iframe.contentDocument;
    if (doc) {
      const docToWrite = (doc as any).document || doc;
      docToWrite.open();
      
      const titleText = "Tax Invoice - " + (editingInvoice ? editingInvoice.invoice_number : "");
      
      const parts = [
        "<!DOCTYPE html>",
        "<html>",
        "  <head>",
        "    <title>" + titleText + "</title>",
        "    <link href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap' rel='stylesheet' />",
        "    <script src='https://cdn.tailwindcss.com'></script>",
        "    <style>",
        "      @media print {",
        "        body {",
        "          -webkit-print-color-adjust: exact !important;",
        "          print-color-adjust: exact !important;",
        "          padding: 10px;",
        "        }",
        "      }",
        "      body {",
        "        font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;",
        "        background-color: #fff !important;",
        "        color: #334155 !important;",
        "        padding: 24px;",
        "      }",
        "      .font-mono {",
        "        font-family: 'JetBrains Mono', monospace !important;",
        "      }",
        "      .lines-normal {",
        "        line-height: 1.5;",
        "      }",
        "    </style>",
        "  </head>",
        "  <body>",
        "    <div>",
        printContent,
        "    </div>",
        "    <script>",
        "      window.onload = function() {",
        "        setTimeout(function() {",
        "          window.focus();",
        "          window.print();",
        "          setTimeout(function() {",
        "            window.parent.document.body.removeChild(window.frameElement);",
        "          }, 1000);",
        "        }, 800);",
        "      };",
        "    </script>",
        "  </body>",
        "</html>"
      ];

      docToWrite.write(parts.join("\n"));
      docToWrite.close();

      if (isSavePdf) {
        const toast = document.createElement("div");
        toast.className = "fixed bottom-5 right-5 bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-lg shadow-2xl z-[99999] text-xs transition-opacity duration-300 font-sans flex flex-col gap-1";
        toast.innerHTML = '<strong class="text-blue-400">PDF Export Workflow:</strong><span>In the print dialog destination, select <strong>"Save as PDF"</strong> or <strong>"Print to PDF"</strong> to save.</span>';
        document.body.appendChild(toast);
        setTimeout(() => {
          toast.style.opacity = "0";
          setTimeout(() => {
            if (toast.parentNode) document.body.removeChild(toast);
          }, 300);
        }, 5000);
      }
    }
  };

  const handleToggleOrderSelection = (orderId: number) => {
    if (selectedOrderIds.includes(orderId)) {
      setSelectedOrderIds(selectedOrderIds.filter((id) => id !== orderId));
    } else {
      setSelectedOrderIds([...selectedOrderIds, orderId]);
    }
  };

  // Compute live subtotal dynamically based on selected embroidery jobs
  const calculateSubtotal = () => {
    return selectedOrderIds.reduce((sum, id) => {
      const order = orders.find((o) => o.id === id);
      return sum + (order ? Number(order.total_amount) : 0);
    }, 0);
  };

  const valSubtotal = calculateSubtotal();
  const valTax = parseFloat(((valSubtotal * taxRate) / 100).toFixed(2));
  const valWHT = parseFloat(((valSubtotal * withholdingRate) / 100).toFixed(2));
  const valTotal = valSubtotal + valTax - valWHT - discountAmount;

  const handleOpenAdd = () => {
    setEditingId(null);
    setSelectedBrand(brands[0]?.id || 1);
    setInvoiceDate(new Date().toISOString().substring(0, 10));
    setDueDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
    setTaxRate(18);
    setWithholdingRate(4.5);
    setDiscountAmount(0);
    setSelectedOrderIds([]);
    setShowModal(true);
  };

  const handleOpenEdit = (inv: Invoice) => {
    setEditingId(inv.id);
    setSelectedBrand(inv.brand_id);
    setInvoiceDate(inv.invoice_date);
    setDueDate(inv.due_date);
    setTaxRate(inv.tax_rate);
    setWithholdingRate(inv.withholding_rate);
    setDiscountAmount(inv.discount);
    // Extract linked orders
    const linkedIds = inv.orders || inv.orders_list?.map((o: any) => o.id) || [];
    setSelectedOrderIds(linkedIds);
    // Also set editingInvoice so availableOrders filter can access it
    setEditingInvoice(inv);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this sales tax invoice? This will also remove the corresponding accounts receivable ledger records.")) {
      try {
        await onDeleteInvoice(id);
        onRefresh();
      } catch (err: any) {
        alert("Error deleting invoice: " + err.message);
      }
    }
  };

  const handleCloseForm = () => {
    setShowModal(false);
    setEditingId(null);
    setEditingInvoice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOrderIds.length === 0) {
      alert("Please select at least one completed embroidery order job to register in this sales tax invoice.");
      return;
    }

    try {
      const payload = {
        brand_id: selectedBrand,
        invoice_date: invoiceDate,
        due_date: dueDate,
        subtotal: valSubtotal,
        tax_rate: taxRate,
        tax_amount: valTax,
        withholding_rate: withholdingRate,
        withholding_tax: valWHT,
        discount: discountAmount,
        total_amount: valTotal,
        grand_total: valTotal,
        payment_status: editingId ? (invoices.find(inv => inv.id === editingId)?.payment_status || "Unpaid") : "Unpaid",
        orders: selectedOrderIds,
      };

      if (editingId) {
        await onEditInvoice(editingId, payload);
      } else {
        await onAddInvoice(payload);
      }
      setShowModal(false);
      setEditingId(null);
      setEditingInvoice(null);
      onRefresh();
    } catch (err: any) {
      alert("Error saving invoice: " + err.message);
    }
  };

  const viewInvoiceDetail = (invoice: Invoice) => {
    setEditingInvoice(invoice);
  };

  const canModify = ["admin", "manager", "accountant"].includes(userRole);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto" id="sales-invoices-panel">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-slate-800 font-bold text-sm md:text-base select-none font-sans">Corporate Sales Tax Invoices</h3>
          <p className="text-[10px] text-slate-400 font-mono">Issued GST Invoices: {invoices.length}</p>
        </div>
        {canModify && (
          <button
            id="create-sales-invoice-btn"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-blue-600 text-white font-semibold hover:bg-blue-500 px-3.5 py-2 rounded-md text-xs tracking-wide transition-all shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            <span>CREATE SALES INVOICE</span>
          </button>
        )}
      </div>

      {/* Searching row */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          id="invoice-search-input"
          type="text"
          placeholder="Filter issued tax invoices by invoice number or designated buyer brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-0 outline-0 p-0 text-xs w-full text-slate-700 placeholder:text-slate-400"
        />
      </div>

      {/* Main Table Register */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden text-[11px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left" id="invoices-main-register-table">
            <thead>
              <tr className="border-b border-slate-200 text-[9px] text-slate-400 uppercase tracking-wider font-mono bg-slate-50/20 select-none">
                <th className="py-2 px-4 select-none">Invoice No</th>
                <th className="py-2 px-4 select-none">Invoice Date</th>
                <th className="py-2 px-4 select-none">Client Brand</th>
                <th className="py-2 px-4 select-none">Base Value</th>
                <th className="py-2 px-4 select-none">GST & WHT Net</th>
                <th className="py-2 px-4 select-none">Invoice State</th>
                <th className="py-2 px-4 text-right select-none">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No issued sales tax invoices matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {inv.invoice_number}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[10px] text-slate-500">
                        {inv.invoice_date}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-800">
                        {inv.brand_name || "N/A"}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        {formatPKR(inv.subtotal)}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-blue-600 font-bold">
                        {formatPKR(inv.total_amount)}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`status-badge leading-none py-0.5 px-2 rounded-full text-[9px] font-bold font-mono tracking-wider ${
                          inv.payment_status === "Paid"
                            ? "bg-green-150 text-green-800"
                            : inv.payment_status === "Partial"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-rose-100 text-rose-800"
                        }`}>
                          {inv.payment_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          id={`view-invoice-${inv.id}`}
                          onClick={() => viewInvoiceDetail(inv)}
                          className="px-2.5 py-1 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded text-[10px] font-bold cursor-pointer inline-flex items-center gap-1 transition-colors"
                        >
                          <Printer className="w-3 h-3 text-slate-400" />
                          <span>PRINT / REVIEW</span>
                        </button>

                        {canModify && (
                          <button
                            id={`edit-invoice-${inv.id}`}
                            onClick={() => handleOpenEdit(inv)}
                            className="px-2.5 py-1 border border-blue-200 text-blue-700 hover:bg-blue-50 rounded text-[10px] font-bold cursor-pointer inline-flex items-center gap-1 transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>EDIT</span>
                          </button>
                        )}

                        {userRole === "admin" && (
                          <button
                            id={`delete-invoice-${inv.id}`}
                            onClick={() => handleDelete(inv.id)}
                            className="px-2.5 py-1 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded text-[10px] font-bold cursor-pointer inline-flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>DELETE</span>
                          </button>
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

      {/* Create Sales Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 outline-none w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center shrink-0">
              <h4 className="font-bold text-xs tracking-wide">
                {editingId ? "Update & Revise Sales Tax Invoice" : "Issue Accounts Sales Tax Invoice (FBR Verified Format)"}
              </h4>
              <button
                id="close-invoice-modal-btn"
                onClick={handleCloseForm}
                className="text-slate-400 hover:text-white p-1 rounded font-semibold text-lg cursor-pointer flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-4 space-y-3.5 text-[11px] font-medium">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Client Brand *</label>
                  <select
                    id="form-invoice-brand"
                    required
                    value={selectedBrand}
                    onChange={(e) => {
                      setSelectedBrand(Number(e.target.value));
                      setSelectedOrderIds([]); // reset selections on brand shift
                    }}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2 outline-none"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Invoice Date *</label>
                  <input
                    id="form-invoice-date"
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Due Date *</label>
                  <input
                    id="form-invoice-duedate"
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded py-1.5 px-2.5 outline-none font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Tax configuration section */}
              <div className="bg-slate-50 p-3 border border-slate-200 rounded-lg space-y-2.5 shrink-0">
                <p className="text-[9px] uppercase font-mono font-bold tracking-widest text-slate-400">Custom Taxes & Discounts</p>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Standard GST %</label>
                    <input
                      id="invoice-gst-rate"
                      type="number"
                      min={0}
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="w-full bg-white text-xs border border-slate-200 rounded py-1 px-2 font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Withholding %</label>
                    <input
                      id="invoice-wht-rate"
                      type="number"
                      min={0}
                      value={withholdingRate}
                      onChange={(e) => setWithholdingRate(Number(e.target.value))}
                      className="w-full bg-white text-xs border border-slate-200 rounded py-1 px-2 font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Discount amount (PKR)</label>
                    <input
                      id="invoice-discount"
                      type="number"
                      min={0}
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      className="w-full bg-white text-xs border border-slate-200 rounded py-1 px-2 font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Selection list of completed orders that need invoicing */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">
                  Select Completed Embroidery Jobs for Brand *
                </label>
                <div className="border border-slate-200 rounded-lg max-h-32 overflow-y-auto divide-y divide-slate-100 bg-white">
                  {availableOrders.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      No uninvoiced completed or delivered orders found registered under this Brand.
                    </div>
                  ) : (
                    availableOrders.map((o) => (
                      <div
                        key={o.id}
                        onClick={() => handleToggleOrderSelection(o.id)}
                        className={`p-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors ${
                          selectedOrderIds.includes(o.id) ? "bg-blue-50/40" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(o.id)}
                            readOnly
                            className="rounded text-blue-600 focus:ring-0 cursor-pointer pointer-events-none"
                          />
                          <div>
                            <p className="font-bold text-slate-800 text-[11px]">
                              {o.order_number} — {o.design_name}
                            </p>
                            <span className="text-[9px] text-slate-400 font-mono">Code: {o.design_code} ({o.quantity} Stitches @ {o.rate} PKR)</span>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-slate-700">
                          {formatPKR(o.total_amount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Real-time Tax Ledger visual calculations summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 font-mono text-[10px]">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Subtotal value of selected jobs:</span>
                  <span>{formatPKR(valSubtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>GST Sales tax (+ {taxRate}%):</span>
                  <span>{formatPKR(valTax)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Withholding tax deductions (- {withholdingRate}%):</span>
                  <span>{formatPKR(valWHT)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Discount / Outflow Adjustment:</span>
                    <span>-{formatPKR(discountAmount)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center text-slate-800 font-bold text-xs">
                  <span>Net Invoice Payable Total:</span>
                  <span className="text-blue-700 font-mono">{formatPKR(valTotal)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
                <button
                  id="cancel-invoice-form-btn"
                  type="button"
                  onClick={handleCloseForm}
                  className="px-3.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-invoice-form-btn"
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 border border-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-500 transition-all cursor-pointer"
                >
                  {editingId ? "Save Invoice Changes" : "Generate Tax Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF / Print Review Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 outline-none w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center shrink-0">
              <h4 className="font-bold text-xs tracking-wide">
                Invoice Documentation Viewer & FBR Audit Review
              </h4>
              <button
                id="close-invoice-viewer-btn"
                onClick={() => setEditingInvoice(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Incredibly detailed Tax Invoice Printable layout */}
            <div className="p-6 overflow-y-auto flex-1 font-sans space-y-4 text-slate-700 bg-white" id="invoice-layout-full-printable">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3 block">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">ARTISAN EMBROIDERY</h1>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Premium Stitching, Cord, Schiffli & Sequence Unit</p>
                  <p className="text-[10px] text-slate-500 mt-1 lines-normal">
                    Liaqatabad Industrial Sector, Gate 4<br />
                    Faisalabad, Punjab, Pakistan<br />
                    NTN: 8829102-3 | Strn: 110099223311
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                    Tax Sales Invoice
                  </div>
                  <h2 className="text-base font-bold text-slate-800 mt-2 font-mono">{editingInvoice.invoice_number}</h2>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Invoice Date: {editingInvoice.invoice_date}</p>
                  <p className="text-[10px] text-slate-400 font-mono">Due Date: {editingInvoice.due_date}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 border border-slate-200 rounded-lg">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Invoice Recipient (Buyer Details):</p>
                  <h3 className="text-xs font-bold text-slate-800 mt-1 uppercase">{editingInvoice.brand_name}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Design House Block, Gulberg III<br />
                    Lahore, Pakistan<br />
                    Payment Cycle terms: Net-15 corporate ledger
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">FBR Audit Particulars:</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    <strong>Payment status:</strong> {editingInvoice.payment_status}<br />
                    <strong>GST Sales Tax Code:</strong> 18% Standard rate<br />
                    Withholding applied under FBR Sec (153_1_b)
                  </p>
                </div>
              </div>

              {/* Items tabular ledger */}
              <div className="space-y-1.5">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[9px] text-slate-400 uppercase tracking-widest font-mono font-bold">
                      <th className="pb-2 pr-1.5">Embroidery Job Description</th>
                      <th className="pb-2 pr-1.5 text-right">Job No</th>
                      <th className="pb-2 pr-1.5 text-right">Stitch Count</th>
                      <th className="pb-2 pr-1.5 text-right">Unit Rate</th>
                      <th className="pb-2 text-right">Net Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {editingInvoice.orders_list && editingInvoice.orders_list.map((o: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2 font-semibold pr-1.5">
                          {o.design_name}
                          <p className="text-[9px] text-slate-400 font-mono mt-0.5">Design Code: {o.design_code}</p>
                        </td>
                        <td className="py-2 font-mono text-[10px] text-slate-500 text-right pr-1.5">
                          {o.order_number}
                        </td>
                        <td className="py-2 font-mono text-right pr-1.5">
                          {o.quantity}
                        </td>
                        <td className="py-2 font-mono text-right pr-1.5">
                          {formatPKR(o.rate)}
                        </td>
                        <td className="py-2 font-mono text-right font-semibold text-slate-800">
                          {formatPKR(o.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Balance columns */}
              <div className="flex justify-end pt-3 border-t border-slate-200 animate-none">
                <div className="w-60 space-y-1.5 font-mono text-[10px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Invoice Subtotal:</span>
                    <span>{formatPKR(editingInvoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>GST Tax (+ {editingInvoice.tax_rate}%):</span>
                    <span>{formatPKR(editingInvoice.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Withholding tax (- {editingInvoice.withholding_rate}%):</span>
                    <span>{formatPKR(editingInvoice.withholding_tax)}</span>
                  </div>
                  {Number(editingInvoice.discount) > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Discount deduction:</span>
                      <span>-{formatPKR(editingInvoice.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-900 border-t border-slate-200 pt-1.5 font-bold text-xs animate-none">
                    <span>Net Amount Due:</span>
                    <span className="text-blue-700">{formatPKR(editingInvoice.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Legal verification footer stamp */}
              <div className="pt-6 border-t border-dashed border-slate-200 grid grid-cols-2 gap-6 text-[9px] text-slate-400 select-none">
                <div>
                  <p className="font-bold uppercase tracking-wider">Terms & Conditions:</p>
                  <p className="mt-1 leading-relaxed">
                    1. Overdue payments accrue standard interest rates of 1.5% monthly.<br />
                    2. This is a computer-verified GST tax invoice and does not require signatures.<br />
                    3. Generated on artisan ERP servers at 2026-06-19.
                  </p>
                </div>
                <div className="flex items-end justify-end flex-col text-right">
                  <div className="w-32 border-b border-slate-200 h-8"></div>
                  <span className="mt-1 uppercase tracking-widest font-mono text-[8px] font-bold">Authorized Auditor Sign</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex justify-between items-center shrink-0">
              <div className="flex gap-2">
                <button
                  id="print-issued-invoice-btn"
                  onClick={() => handlePrintOrPdf(false)}
                  className="flex items-center gap-1.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>PRINT INVOICE</span>
                </button>

                <button
                  id="save-pdf-issued-invoice-btn"
                  onClick={() => handlePrintOrPdf(true)}
                  className="flex items-center gap-1.5 border border-blue-200 text-blue-700 bg-white hover:bg-blue-50 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5 text-blue-500" />
                  <span>SAVE AS PDF</span>
                </button>
              </div>

              <button
                id="invoice-viewer-close-btn"
                onClick={() => setEditingInvoice(null)}
                className="px-4 py-1.5 bg-blue-600 border border-blue-600 text-white hover:bg-blue-500 rounded-md text-xs font-bold cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inject custom print styles so only the invoice is printed */}
      <style>{`
        @media print {
          html, body {
            height: auto !important;
            background: #fff !important;
          }
          /* Hide everything except the invoice modal and its children */
          body > div:not(.z-50), 
          #applet-viewport-frame, 
          #sales-invoices-panel, 
          header, 
          nav, 
          aside, 
          footer {
            display: none !important;
          }
          /* Ensure modal backdrop and modal wrapper themselves are unstyled for printing */
          .fixed.inset-0 {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            background: transparent !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            z-index: 99999 !important;
          }
          .max-w-3xl {
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }
          /* Hide modal headers or footers with buttons */
          .bg-slate-900.text-white, 
          .bg-slate-50.border-t {
            display: none !important;
          }
          #invoice-layout-full-printable {
            max-height: none !important;
            overflow: visible !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
