/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Search, DollarSign, Calendar, TrendingUp, TrendingDown, Layers, Printer, BarChart2 } from "lucide-react";
import { Brand, Supplier, ThreadInventory, Purchase, Expense, Payment, Invoice, Order } from "../types.ts";

interface ReportsViewProps {
  brands: Brand[];
  suppliers: Supplier[];
  inventory: ThreadInventory[];
  purchases: Purchase[];
  expenses: Expense[];
  payments: Payment[];
  invoices: Invoice[];
  orders: Order[];
}

export default function ReportsView({ brands, suppliers, inventory, purchases, expenses, payments, invoices, orders }: ReportsViewProps) {
  const [reportType, setReportType] = useState<"pl" | "inventory" | "receivables">("pl");

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // 1. PL calculations
  const totalSalesRevenue = invoices.reduce((sum, item) => sum + Number(item.total_amount), 0);
  const totalThreadPurchases = purchases.reduce((sum, item) => sum + Number(item.total_cost), 0);
  const totalOperatingOverheads = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const netOperatingProfit = totalSalesRevenue - totalThreadPurchases - totalOperatingOverheads;

  // 2. Receivables calculations
  const totalInvoiceSum = invoices.reduce((sum, item) => sum + Number(item.total_amount), 0);
  const totalClientReceipts = payments.filter((p) => p.type === "receipt").reduce((sum, item) => sum + Number(item.amount), 0);
  const outstandingAccountsReceivables = totalInvoiceSum - totalClientReceipts;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" id="reports-view-panel">
      {/* Tab controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-slate-800 font-extrabold text-lg select-none font-sans">Corporate Fiscal Reports</h3>
          <p className="text-xs text-slate-400 font-mono">Real-time ledger analytics & balance audits</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl w-full sm:w-auto">
          <button
            id="report-tab-pl"
            onClick={() => setReportType("pl")}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === "pl" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Profit & Loss
          </button>
          <button
            id="report-tab-inv"
            onClick={() => setReportType("inventory")}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === "inventory" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Threadshade Inventory
          </button>
          <button
            id="report-tab-rec"
            onClick={() => setReportType("receivables")}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === "receivables" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Audit Balances
          </button>
        </div>
      </div>

      {reportType === "pl" && (
        <div className="space-y-6" id="pl-statement-report font-sans">
          {/* Executive Overview Cards row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-black leading-none">Gross Sales Revenue (Invoiced)</p>
                <p className="text-xl font-black mt-4 text-emerald-600 leading-none">{formatPKR(totalSalesRevenue)}</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl leading-none">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-black leading-none">Inventory Purchases & Overheads</p>
                <p className="text-xl font-black mt-4 text-rose-600 leading-none">{formatPKR(totalThreadPurchases + totalOperatingOverheads)}</p>
              </div>
              <div className="p-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl leading-none">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>

            <div className={`rounded-2xl p-5 border shadow-sm flex items-center justify-between ${
              netOperatingProfit >= 0 
                ? "bg-slate-900 text-white border-slate-800" 
                : "bg-rose-900 text-white border-rose-800"
            }`}>
              <div>
                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-black leading-none">Net EBITDA Operating Profit</p>
                <p className="text-xl font-black mt-4 leading-none text-emerald-400">{formatPKR(netOperatingProfit)}</p>
              </div>
              <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl leading-none">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Tabular Profit & Loss statement */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">Operational Income Statement</h4>
                <p className="text-xs text-slate-400 font-mono">For period ending: 2026-06-19</p>
              </div>
              <button
                id="print-statement-btn"
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white px-3.5 py-1.5 rounded-xl cursor-pointer shadow-sm transition-all"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                <span>Print Profit & Loss</span>
              </button>
            </div>

            {/* Income statement dynamic ledger table */}
            <div className="space-y-4 text-xs font-sans">
              <div className="space-y-2">
                <p className="font-black text-slate-400 uppercase tracking-widest text-[10px] font-mono select-none">1. Trading Sales Income</p>
                <div className="flex justify-between items-center py-2.5 px-3 bg-slate-50 hover:bg-slate-100/50 rounded-lg">
                  <span className="font-semibold text-slate-700">Gross Sales Invoices Generated</span>
                  <span className="font-mono font-bold text-indigo-700">{formatPKR(totalSalesRevenue)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <p className="font-black text-slate-400 uppercase tracking-widest text-[10px] font-mono select-none">2. Direct Cost of Sourcing (COGS)</p>
                <div className="flex justify-between items-center py-2.5 px-3 bg-slate-50 hover:bg-slate-100/50 rounded-lg">
                  <span className="font-semibold text-slate-700">Raw materials Thread purchases & fabric sourcing costs</span>
                  <span className="font-mono font-bold text-rose-700">({formatPKR(totalThreadPurchases)})</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <p className="font-black text-slate-400 uppercase tracking-widest text-[10px] font-mono select-none">3. Operating Administrative Expenditures (OpEx)</p>
                {expenses.length === 0 ? (
                  <p className="text-slate-400 px-3 text-[11px] font-medium leading-normal italic">No operating overheads logged.</p>
                ) : (
                  <div className="space-y-1.5">
                    {expenses.map((e) => (
                      <div key={e.id} className="flex justify-between items-center py-2 px-3 hover:bg-slate-50 rounded-lg">
                        <span className="text-slate-600 font-medium">{e.description} <span className="text-[10px] text-slate-400 font-mono ml-1">({e.category})</span></span>
                        <span className="font-mono font-semibold text-rose-600">({formatPKR(e.amount)})</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-2.5 px-3 bg-slate-50 rounded-lg border-t border-slate-150 font-bold leading-none mt-2">
                      <span className="text-slate-800">Total Operating Expenses</span>
                      <span className="font-mono text-rose-700">({formatPKR(totalOperatingOverheads)})</span>
                    </div>
                  </div>
                )}
              </div>

              {/* EBITDA Summary */}
              <div className="border-t-2 border-dashed border-slate-200 pt-5 flex justify-between items-center font-bold text-sm bg-slate-900 text-white rounded-xl p-4">
                <span className="uppercase tracking-wider">Net Operating Profits Margin (EBITDA)</span>
                <span className="font-mono text-lg text-emerald-400">{formatPKR(netOperatingProfit)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportType === "inventory" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">Thread Shade Stocks Valuation Report</h4>
              <p className="text-xs text-slate-400 font-mono">Detailed listing of threads shade codes & valuation levels</p>
            </div>
            <button
              id="print-inventory"
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white px-3.5 py-1.5 rounded-xl cursor-pointer shadow-sm transition-all"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>Print Stock Audit</span>
            </button>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left" id="report-inventory-table">
              <thead>
                <tr className="border-b border-slate-150 font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                  <th className="pb-3 px-2">Shade Code</th>
                  <th className="pb-3">Shade Color Spec</th>
                  <th className="pb-3">Thread Brand</th>
                  <th className="pb-3 text-right">Available Volume (Cones)</th>
                  <th className="pb-3 text-right">Asset Cost Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {inventory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">No registered shade stocks found.</td>
                  </tr>
                ) : (
                  inventory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-2">
                        <span className="font-mono font-black text-slate-800 bg-slate-100 border border-slate-250 px-2 py-0.5 rounded text-[11px]">{item.shade_code}</span>
                      </td>
                      <td className="py-3 font-semibold text-slate-800">{item.shade_name}</td>
                      <td className="py-3 text-slate-500">{item.brand}</td>
                      <td className="py-3 text-right font-mono font-bold">{item.qty_available} / {item.qty_purchased}</td>
                      <td className="py-3 text-right font-mono font-black text-slate-800">{formatPKR(Number(item.qty_available) * Number(item.cost_per_cone))}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === "receivables" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="balance-audits-row font-sans">
          {/* Customer outstanding receivables card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <h4 className="font-black text-xs text-slate-400 uppercase tracking-widest font-mono select-none">Accounts Receivable Ledger Summary</h4>
            <div className="p-4 bg-slate-50 border border-slate-205 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Aggregate client Outstanding</p>
                <p className="text-xl font-black text-rose-700 mt-2 font-mono">{formatPKR(outstandingAccountsReceivables)}</p>
              </div>
              <div className="p-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-full leading-none">
                <TrendingDown className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            <div className="overflow-x-auto text-[11px]">
              <table className="w-full text-left" id="receivables-list-table">
                <thead>
                  <tr className="border-b border-slate-200 font-mono text-[9px] uppercase tracking-widest text-slate-400">
                    <th className="py-2">Client Description</th>
                    <th className="py-2 text-right">Debit Outstanding balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {brands.map((b) => {
                    const balance = (b as any).outstanding_receivables || 0;
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/50">
                        <td className="py-3 font-semibold text-slate-800">{b.name}</td>
                        <td className={`py-3 text-right font-mono font-black ${balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {formatPKR(balance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Supplier outstanding payables card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <h4 className="font-black text-xs text-slate-400 uppercase tracking-widest font-mono select-none">Accounts Payable Ledger Summary</h4>
            <div className="p-4 bg-slate-50 border border-slate-205 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Aggregate vendor Payables</p>
                <p className="text-xl font-black text-indigo-800 mt-2 font-mono">
                  {formatPKR(suppliers.reduce((sum, item) => sum + Number((item as any).outstanding_payables || 0), 0))}
                </p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 border border-indigo-150 rounded-full leading-none">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="overflow-x-auto text-[11px]">
              <table className="w-full text-left" id="payables-list-table">
                <thead>
                  <tr className="border-b border-slate-200 font-mono text-[9px] uppercase tracking-widest text-slate-400">
                    <th className="py-2">Vendor Supplier</th>
                    <th className="py-2 text-right font-bold text-rose-800">Outstanding Liability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {suppliers.map((s) => {
                    const balance = (s as any).outstanding_payables || 0;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="py-3 font-semibold text-slate-800">
                          {s.name} <span className="text-[9px] font-mono font-bold text-slate-400">({s.supplier_type})</span>
                        </td>
                        <td className={`py-3 text-right font-mono font-black ${balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {formatPKR(balance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
