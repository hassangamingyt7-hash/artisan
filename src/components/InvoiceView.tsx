import React, { useState } from "react";
import TableActionControls, { exportToExcel, filterByDateRange } from "./TableActionControls.tsx";
import { Plus, Trash2, Search, Printer, Receipt, Eye, X, Save, Edit3 } from "lucide-react";
import { Invoice, InvoiceItem } from "../types";

interface InvoiceViewProps {
  invoices: Invoice[];
  userRole: string;
  onRefresh: () => void;
  onAddInvoice: (data: Partial<Invoice>) => Promise<any>;
  onEditInvoice: (id: number, data: Partial<Invoice>) => Promise<any>;
  onDeleteInvoice: (id: number) => Promise<any>;
}

export default function InvoiceView({ invoices, userRole, onRefresh, onAddInvoice, onEditInvoice, onDeleteInvoice }: InvoiceViewProps) {
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState({ start: "", end: "" });
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  
  // Form states
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [brandName, setBrandName] = useState("");
  const [ntn, setNtn] = useState("");
  const [stn, setStn] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [notes, setNotes] = useState("");
  
  const [items, setItems] = useState<InvoiceItem[]>([]);

  const timeFilteredInvoices = filterByDateRange(invoices, "invoice_date", dateFilter, customDate);
  const filteredInvoices = timeFilteredInvoices.filter((i) =>
    (i.invoice_number || "").toLowerCase().includes(search.toLowerCase()) ||
    (i.brand_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (i.po_number || "").toLowerCase().includes(search.toLowerCase())
  );

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const handleOpenAdd = () => {
    setEditingInvoice(null);
    setInvoiceDate(new Date().toISOString().substring(0, 10));
    setBrandName("");
    setNtn("");
    setStn("");
    setContactPerson("");
    setPhone("");
    setEmail("");
    setAddress("");
    setPoNumber("");
    setNotes("");
    setItems([{ description: "", quantity: 1, unit_mtr: "MTR", rate: 0, amount: 0 }]);
    setShowModal(true);
  };

  const handleOpenEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setInvoiceDate(inv.invoice_date || "");
    setBrandName(inv.brand_name || "");
    setNtn(inv.ntn || "");
    setStn(inv.stn || "");
    setContactPerson(inv.contact_person || "");
    setPhone(inv.phone || "");
    setEmail(inv.email || "");
    setAddress(inv.address || "");
    setPoNumber(inv.po_number || "");
    setNotes(inv.notes || "");
    
    let parsedItems: InvoiceItem[] = [];
    if (typeof inv.items === "string") {
      try {
        parsedItems = JSON.parse(inv.items);
      } catch (e) {}
    } else if (Array.isArray(inv.items)) {
      parsedItems = inv.items;
    }
    
    if (parsedItems.length === 0) {
      parsedItems = [{ description: "", quantity: 1, unit_mtr: "MTR", rate: 0, amount: 0 }];
    }
    setItems(parsedItems);
    setShowModal(true);
  };

  const handleAddItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_mtr: "MTR", rate: 0, amount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    if (field === "quantity" || field === "rate") {
      item.amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
    }
    newItems[index] = item;
    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const gst_amount = subtotal * 0.18; // 18% GST
    const grand_total = subtotal + gst_amount;
    return { subtotal, gst_amount, grand_total };
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(i => !i.description)) {
      alert("Please provide a description for all items.");
      return;
    }
    
    setIsSaving(true);
    const { subtotal, gst_amount, grand_total } = calculateTotals();
    
    try {
      const payload: Partial<Invoice> = {
        invoice_date: invoiceDate,
        brand_name: brandName,
        ntn,
        stn,
        contact_person: contactPerson,
        phone,
        email,
        address,
        po_number: poNumber,
        subtotal,
        gst_amount,
        grand_total,
        notes,
        items
      };

      if (editingInvoice) {
        await onEditInvoice(editingInvoice.id, payload);
      } else {
        await onAddInvoice(payload);
      }
      setShowModal(false);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      alert("Failed to save invoice: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      await onDeleteInvoice(id);
      onRefresh();
    }
  };

  const handlePrint = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    window.print();
  };

  const canModify = ["admin", "manager", "accountant", "accounts_manager"].includes(userRole);

  const { subtotal, gst_amount, grand_total } = calculateTotals();

  // Print View Rendering
  if (viewingInvoice) {
    let printItems: InvoiceItem[] = [];
    if (typeof viewingInvoice.items === "string") {
      try {
        printItems = JSON.parse(viewingInvoice.items);
      } catch (e) {}
    } else if (Array.isArray(viewingInvoice.items)) {
      printItems = viewingInvoice.items;
    }

    return (
      <div className="bg-white min-h-screen text-black print-container absolute inset-0 z-50 overflow-y-auto w-full h-full pb-24 border sm:border-0 border-transparent">
        {/* Style specifically for printing */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * { visibility: hidden; }
            .print-container, .print-container * { visibility: visible; }
            .print-container { position: absolute; left: 0; top: 0; width: 100%; height: auto; border: none; }
            .no-print { display: none !important; }
          }
        `}} />
        
        <div className="max-w-4xl mx-auto p-4 sm:p-8 shrink-0">
          <div className="flex justify-end mb-6 no-print gap-3">
            <button onClick={() => setViewingInvoice(null)} className="px-4 py-2 border border-slate-300 rounded font-medium hover:bg-slate-50 transition-colors">Back</button>
            <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 flex items-center gap-2">
              <Printer className="w-4 h-4" /> Print / PDF
            </button>
          </div>

          {/* Invoice Header */}
          <div className="text-center mb-10 pb-6 border-b-2 border-slate-800">
            <h1 className="text-4xl font-extrabold tracking-tighter uppercase text-slate-900 mb-2">ARTISAN EMB</h1>
            <p className="text-sm font-semibold tracking-widest text-slate-500 uppercase">Sales Tax Invoice</p>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="space-y-1 text-sm">
              <h3 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest mb-1">Billed To</h3>
              <p className="font-extrabold text-lg text-slate-800 uppercase">{viewingInvoice.brand_name || "N/A"}</p>
              {viewingInvoice.address && <p className="text-slate-600 leading-snug max-w-[280px]">{viewingInvoice.address}</p>}
              {viewingInvoice.contact_person && <p className="text-slate-600 pt-1"><span className="font-semibold text-slate-800">Attn:</span> {viewingInvoice.contact_person}</p>}
              {viewingInvoice.phone && <p className="text-slate-600"><span className="font-semibold text-slate-800">Tel:</span> {viewingInvoice.phone}</p>}
              {(viewingInvoice.ntn || viewingInvoice.stn) && (
                <div className="pt-2 mt-2 border-t border-slate-100 flex flex-col gap-0.5">
                  {viewingInvoice.ntn && <p className="text-slate-600"><span className="font-semibold text-slate-800">NTN:</span> {viewingInvoice.ntn}</p>}
                  {viewingInvoice.stn && <p className="text-slate-600"><span className="font-semibold text-slate-800">STN:</span> {viewingInvoice.stn}</p>}
                </div>
              )}
            </div>
            
            <div className="space-y-3 text-sm text-right">
              <div>
                <p className="font-bold text-slate-400 text-xs uppercase tracking-wider">Invoice Number</p>
                <p className="font-bold text-slate-800 text-base font-mono">{viewingInvoice.invoice_number}</p>
              </div>
              <div>
                <p className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Invoice Date</p>
                <p className="font-medium text-slate-800">{new Date(viewingInvoice.invoice_date).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              {viewingInvoice.po_number && (
                <div>
                  <p className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">P.O Number</p>
                  <p className="font-medium text-slate-800 uppercase">{viewingInvoice.po_number}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8 overflow-hidden rounded-md border border-slate-200 print:border-slate-800">
            
        <TableActionControls 
          onPrint={() => window.print()} 
          onPdf={() => window.print()} 
          onExcel={() => exportToExcel(filteredInvoices, "invoice")}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customDateRange={customDate}
          setCustomDateRange={setCustomDate}
        />
        <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 text-sm bg-slate-50 print:bg-transparent">
                  <th className="py-3 px-3 font-bold text-slate-800 uppercase tracking-wider">#</th>
                  <th className="py-3 px-3 font-bold text-slate-800 uppercase tracking-wider">Description</th>
                  <th className="py-3 px-3 font-bold text-slate-800 uppercase tracking-wider text-right">Quantity</th>
                  <th className="py-3 px-3 font-bold text-slate-800 uppercase tracking-wider text-right">Unit/MTR</th>
                  <th className="py-3 px-3 font-bold text-slate-800 uppercase tracking-wider text-right">Rate</th>
                  <th className="py-3 px-3 font-bold text-slate-800 uppercase tracking-wider text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {printItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-200 last:border-0 hover:bg-slate-50/50 print:border-slate-300">
                    <td className="py-3 px-3 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-3 px-3 font-medium text-slate-800 max-w-[280px] break-words">{item.description}</td>
                    <td className="py-3 px-3 text-right text-slate-700 font-mono">{Number(item.quantity).toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-slate-500 text-xs">{item.unit_mtr || "MTR"}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">{formatPKR(item.rate)}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-800 font-mono">{formatPKR(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end mb-12">
            <div className="w-full sm:w-1/2 min-w-[300px]">
              <div className="flex justify-between py-2 px-3 text-sm border-b border-slate-200">
                <span className="font-bold text-slate-500 uppercase">Subtotal</span>
                <span className="font-mono font-bold text-slate-800">{formatPKR(viewingInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between py-2 px-3 text-sm border-b border-slate-200">
                <span className="font-bold text-slate-500 uppercase">GST (18%)</span>
                <span className="font-mono font-bold text-slate-800">{formatPKR(viewingInvoice.gst_amount)}</span>
              </div>
              <div className="flex justify-between py-4 px-3 text-lg border-b-2 border-slate-800 bg-slate-50 print:bg-transparent print:border-t-2">
                <span className="font-extrabold uppercase text-slate-800 tracking-wider">Grand Total</span>
                <span className="font-mono font-black text-slate-900 bg-slate-200 print:bg-transparent px-2 py-1 rounded">{formatPKR(viewingInvoice.grand_total)}</span>
              </div>
            </div>
          </div>

          {viewingInvoice.notes && (
            <div className="mb-12 text-sm text-slate-600 bg-slate-50 print:bg-transparent p-4 rounded border border-slate-200 print:border-slate-400">
              <span className="font-bold block mb-2 text-slate-800 uppercase text-[10px] tracking-wider">Notes / Remarks</span>
              <p className="whitespace-pre-wrap">{viewingInvoice.notes}</p>
            </div>
          )}

          <div className="mt-24 pt-8 border-t border-slate-300 text-center text-xs text-slate-400 font-medium">
            <p className="mb-1 uppercase tracking-widest font-bold">ARTISAN EMB</p>
            <p>This is a computer generated invoice and requires no signature.</p>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto" id="standalone-invoices-panel">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            Standalone Tax Outwards
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Independent GST Invoice Generator</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by Invoice, Brand, PO..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
            />
          </div>
          <button onClick={() => {
            const csv = [
              ["Invoice #", "Date", "Brand", "NTN", "PO #", "Subtotal", "GST", "Grand Total", "Notes"].join(","),
              ...filteredInvoices.map(inv => [
                inv.invoice_number,
                inv.invoice_date,
                `"${inv.brand_name || ""}"`,
                `"${inv.ntn || ""}"`,
                `"${inv.po_number || ""}"`,
                inv.subtotal,
                inv.gst_amount,
                inv.grand_total,
                `"${(inv.notes || "").replace(/"/g, '""').replace(/\n/g, ' ')}"`
              ].join(","))
            ].join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `Invoices_Export_${new Date().getTime()}.csv`;
            link.click();
          }} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 shadow-sm shrink-0">
            Export Excel
          </button>
          {canModify && (
            <button onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 shadow-sm shadow-blue-600/20 shrink-0">
              <Plus className="w-4 h-4" /> Create Invoice
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Invoice #</th>
                <th className="py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Date</th>
                <th className="py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Brand Name</th>
                <th className="py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">PO #</th>
                <th className="py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Subtotal</th>
                <th className="py-3 px-4 font-semibold text-blue-500 text-xs uppercase tracking-wider text-right">GST (18%)</th>
                <th className="py-3 px-4 font-bold text-slate-800 text-xs uppercase tracking-wider text-right">Grand Total</th>
                <th className="py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 font-medium">No invoices found. Click 'Create Invoice' to generate one.</td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold font-mono text-slate-800 text-sm whitespace-nowrap">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600 text-sm whitespace-nowrap">
                      {new Date(inv.invoice_date).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700 text-sm uppercase">
                      {inv.brand_name || "N/A"}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-500 text-xs uppercase">
                      {inv.po_number || "-"}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-right text-sm">
                      {formatPKR(inv.subtotal)}
                    </td>
                    <td className="py-3 px-4 font-mono text-blue-600 font-medium text-right text-sm">
                      {formatPKR(inv.gst_amount)}
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-slate-900 text-right">
                      {formatPKR(inv.grand_total)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewingInvoice(inv)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="View & Print">
                          <Eye className="w-4 h-4" />
                        </button>
                        {canModify && (
                          <button onClick={() => handleOpenEdit(inv)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Edit">
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {canModify && (
                          <button onClick={() => handleDelete(inv.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                {editingInvoice ? "Edit Standalone Invoice" : "Generate Manual Invoice"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-6">
              
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-2">
                   Customer & Document Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm font-medium">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Company / Brand Name *</label>
                    <input required type="text" value={brandName} onChange={e => setBrandName(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500 font-bold uppercase transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Invoice Date *</label>
                    <input required type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">P.O Number</label>
                    <input type="text" value={poNumber} onChange={e => setPoNumber(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500 uppercase transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">NTN Number</label>
                    <input type="text" value={ntn} onChange={e => setNtn(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500 font-mono transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">STN Number</label>
                    <input type="text" value={stn} onChange={e => setStn(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500 font-mono transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contact Person</label>
                    <input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                    <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500 transition-colors" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500 transition-colors" />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Address</label>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500 transition-colors" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">Invoice Items</h4>
                  <button type="button" onClick={handleAddItem} className="text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 px-3 py-1.5 rounded transition-colors flex items-center gap-1 shadow-sm">
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                
                <div className="border border-slate-300 rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 border-b border-slate-300">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold text-slate-700 w-5/12">Description *</th>
                        <th className="py-2.5 px-3 font-semibold text-slate-700 w-32">Quantity *</th>
                        <th className="py-2.5 px-3 font-semibold text-slate-700 w-24">Unit/MTR</th>
                        <th className="py-2.5 px-3 font-semibold text-slate-700 w-32">Rate *</th>
                        <th className="py-2.5 px-3 font-semibold text-slate-700 w-32 text-right">Amount</th>
                        <th className="py-2.5 px-3 font-semibold text-slate-700 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {items.map((item, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50">
                          <td className="p-2">
                            <input required type="text" value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Item description" className="w-full border border-slate-300 rounded px-2 py-1.5 outline-none focus:border-blue-500 transition-colors" />
                          </td>
                          <td className="p-2">
                            <input required type="number" min="0.01" step="0.01" value={item.quantity || ""} onChange={e => updateItem(idx, "quantity", e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 outline-none font-mono focus:border-blue-500 transition-colors" />
                          </td>
                          <td className="p-2">
                            <input type="text" value={item.unit_mtr} onChange={e => updateItem(idx, "unit_mtr", e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 outline-none uppercase focus:border-blue-500 transition-colors" placeholder="MTR" />
                          </td>
                          <td className="p-2">
                            <input required type="number" min="0" step="0.01" value={item.rate || ""} onChange={e => updateItem(idx, "rate", e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 outline-none font-mono focus:border-blue-500 transition-colors" />
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-700">
                            {formatPKR(item.amount)}
                          </td>
                          <td className="p-2 text-center">
                            {items.length > 1 && (
                              <button type="button" onClick={() => handleRemoveItem(idx)} className="text-slate-300 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between gap-6 pt-4">
                <div className="flex-1 space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Additional Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500 text-sm transition-colors" placeholder="Payment terms, delivery instructions, etc..."></textarea>
                </div>
                
                <div className="w-full md:w-80 bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-3 self-end shrink-0">
                  <div className="flex justify-between items-center text-sm font-medium text-slate-600">
                    <span className="uppercase text-[10px] font-bold tracking-wider">Subtotal</span>
                    <span className="font-mono text-base">{formatPKR(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-slate-700 border-b border-slate-200 pb-3">
                    <span className="uppercase text-[10px] font-bold tracking-wider">GST (18%)</span>
                    <span className="font-mono text-base">{formatPKR(gst_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-black text-slate-900 pt-1">
                    <span className="uppercase text-sm tracking-wider">Grand Total</span>
                    <span className="font-mono bg-yellow-100 px-2 py-0.5 rounded text-xl">{formatPKR(grand_total)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 shrink-0 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 bg-white border border-slate-200 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="px-5 py-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50">
                  <Save className="w-4 h-4" /> {isSaving ? "Saving..." : (editingInvoice ? "Update Invoice" : "Save Invoice")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
