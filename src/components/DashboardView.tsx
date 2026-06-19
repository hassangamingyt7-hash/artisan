/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Boxes,
  BellRing,
  CheckCircle2,
  Hourglass,
  Activity,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  ShoppingBag,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { DashboardStats, Machine, Operator, DailyProduction } from "../types.ts";

interface DashboardProps {
  stats: DashboardStats | null;
  machines?: Machine[];
  operators?: Operator[];
  dailyProduction?: DailyProduction[];
  loading: boolean;
  onNavigate: (tab: string) => void;
}

export default function DashboardView({ 
  stats, 
  machines = [], 
  operators = [], 
  dailyProduction = [], 
  loading, 
  onNavigate 
}: DashboardProps) {
  if (loading || !stats) {
    return (
      <div className="p-6 space-y-6">
        {/* Skeleton grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse border border-slate-200"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-100 rounded-xl animate-pulse border border-slate-200"></div>
          <div className="h-80 bg-slate-100 rounded-xl animate-pulse border border-slate-200"></div>
        </div>
      </div>
    );
  }

  // Format currency
  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const { financials, inventory, production } = stats;

  const summaryCards = [
    {
      title: "Total Receivables",
      value: formatPKR(financials.totalReceivables),
      desc: `${financials.outstandingInvoicesCount} invoices pending payment`,
      icon: TrendingUp,
      color: "border-slate-200 bg-white text-slate-900 border",
      valueColor: "text-blue-600",
      iconColor: "text-blue-500 bg-blue-50",
      action: "customers",
    },
    {
      title: "Total Payables",
      value: formatPKR(financials.totalPayables),
      desc: `${financials.pendingSupplierPaymentsCount} pending supplier bills`,
      icon: TrendingDown,
      color: "border-slate-200 bg-white text-slate-900 border",
      valueColor: "text-orange-600",
      iconColor: "text-orange-500 bg-orange-50",
      action: "suppliers",
    },
    {
      title: "Monthly Invoiced Revenue",
      value: formatPKR(financials.monthlyRevenue),
      desc: "All design orders invoiced in June 2026",
      icon: Zap,
      color: "border-slate-200 bg-white text-slate-900 border",
      valueColor: "text-slate-800",
      iconColor: "text-blue-600 bg-blue-50/70",
      action: "invoices",
    },
    {
      title: "Monthly Cash Expenses",
      value: formatPKR(financials.monthlyExpenses),
      desc: "Salaries, electricity, rents, and fuels",
      icon: Activity,
      color: "border-slate-200 bg-white text-slate-900 border",
      valueColor: "text-rose-600",
      iconColor: "text-rose-500 bg-rose-50",
      action: "expenses",
    },
    {
      title: "Thread Inventory",
      value: `${inventory.totalThreadStock} Cones`,
      desc: `${inventory.lowStockAlertsCount} shade codes running extremely low`,
      icon: Boxes,
      color: "border-slate-200 bg-white text-slate-900 border",
      valueColor: inventory.lowStockAlertsCount > 4 ? "text-red-500" : "text-indigo-600",
      iconColor: "text-slate-500 bg-slate-50",
      action: "inventory",
    },
    {
      title: "Running Production Orders",
      value: `${production.runningOrders} Jobs`,
      desc: `Total booked orders: ${production.totalOrders}`,
      icon: ShoppingBag,
      color: "border-slate-200 bg-white text-slate-900 border",
      valueColor: "text-slate-800",
      iconColor: "text-sky-500 bg-sky-50",
      action: "orders",
    },
  ];

  // Pie chart stats for production distribution
  const orderPieData = [
    { name: "Running", value: production.runningOrders, color: "#2563eb" },
    { name: "Completed", value: production.completedOrders, color: "#fb923c" },
    { name: "Delivered", value: production.deliveredOrders, color: "#64748b" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto" id="dashboard-view-panel">
      {/* 1. Low stock safety block alert banner */}
      {inventory.lowStockAlertsCount > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-sm">
          <div className="flex gap-2.5">
            <AlertTriangle className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs">Low Thread Shade Stock Alert!</p>
              <p className="text-[11px] text-red-700 mt-0.5">
                There are currently {inventory.lowStockAlertsCount} critical thread shades containing less than 10 cones in the machine floor. Please replenish immediately.
              </p>
            </div>
          </div>
          <button
            id="replenish-stock-banner-btn"
            onClick={() => onNavigate("inventory")}
            className="text-[10px] font-bold font-mono actions-badge uppercase tracking-wider text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded transition-all border border-red-300 shrink-0 self-end sm:self-center"
          >
            Review Shades
          </button>
        </div>
      )}

      {/* 2. Primary KPI grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaryCards.map((card, idx) => (
          <div
            id={`kpi-card-${idx}`}
            key={idx}
            className="border border-slate-200 p-3.5 rounded-lg bg-white shadow-sm flex flex-col justify-between h-32 hover:border-slate-300 transition-all duration-150"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">
                  {card.title}
                </p>
                <p className={`text-xl font-bold ${card.valueColor} tracking-tight mt-2`}>
                  {card.value}
                </p>
              </div>
              <div className={`p-1.5 rounded-md ${card.iconColor}`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            
            <div className="flex justify-between items-center border-t border-slate-100 pt-2.5 mt-2 select-none">
              <p className="text-[10px] text-slate-400 font-medium truncate max-w-[70%]">
                {card.desc}
              </p>
              <button
                id={`kpi-action-btn-${card.action}`}
                onClick={() => onNavigate(card.action)}
                className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 hover:text-blue-700 transition-colors cursor-pointer"
              >
                <span>Manage</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* 3. Charts row */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Monthly Revenue vs Expense area chart (8 columns) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div>
              <h3 className="font-bold text-slate-800 text-xs md:text-sm tracking-tight">
                Financial Outlay: Sales vs Overheads
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">June 2026 Monthly Comparison Plot</p>
            </div>
            <span className="bg-slate-100 text-slate-600 text-[9px] font-bold font-mono px-2 py-0.5 rounded border border-slate-200">
              Live Feed
            </span>
          </div>
          <div className="h-64 w-full flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={financials.monthlySalesChart}
                margin={{ top: 10, right: 10, left: -22, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip formatter={(value) => [`${formatPKR(Number(value))}`, ""]} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="sales" name="Invoiced Sales" stroke="#2563eb" strokeWidth={1.5} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="expenses" name="Overhead Expenses" stroke="#64748b" strokeWidth={1.5} fillOpacity={1} fill="url(#colorExpenses)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Embroidery Status Pie Chart (4 columns) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-xs md:text-sm tracking-tight mb-0.5">
              Job Status Breakdown
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">Embroidery Machine Work Distribution</p>
          </div>
          
          <div className="h-40 w-full flex items-center justify-center relative my-2">
            {production.totalOrders === 0 ? (
              <p className="text-slate-400 text-xs">No order registrations active</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderPieData.filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={60}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {orderPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip wrapperStyle={{ fontSize: "10px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="absolute text-center select-none">
              <span className="text-xl font-bold text-slate-800">{production.totalOrders}</span>
              <p className="text-[8px] uppercase font-bold tracking-widest text-slate-400">Total Jobs</p>
            </div>
          </div>

          <div className="space-y-1.5 select-none text-[11px] pb-1 border-t border-slate-100 pt-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                <span className="text-slate-500">Running embroidery</span>
              </div>
              <span className="font-bold text-slate-700">{production.runningOrders}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                <span className="text-slate-500">Completed (Unbilled)</span>
              </div>
              <span className="font-bold text-slate-700">{production.completedOrders}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
                <span className="text-slate-500">Delivered & Invoiced</span>
              </div>
              <span className="font-bold text-slate-700">{production.deliveredOrders}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Bottom Table section: Recent orders & Low shades lists */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Recent Active Orders List */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-xs md:text-sm">Active Embroidery Jobs</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Top-priority machine tracking</p>
            </div>
            <button
              id="view-all-orders-dashboard-btn"
              onClick={() => onNavigate("orders")}
              className="text-[11px] text-blue-600 font-bold hover:underline py-1 px-2 rounded hover:bg-blue-50 cursor-pointer"
            >
              Order List
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left" id="dashboard-orders-table">
              <thead>
                <tr className="border-b border-slate-100 text-[9px] text-slate-400 uppercase tracking-wider font-mono">
                  <th className="pb-2 font-bold">Order No</th>
                  <th className="pb-2 font-bold">Brand/Design</th>
                  <th className="pb-2 font-bold">Quantity</th>
                  <th className="pb-2 text-right font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {(stats.production as any).ordersList?.map((o: any) => (
                  <tr key={o.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 font-semibold text-blue-600">{o.order_number}</td>
                    <td className="py-2.5">
                      <div>
                        <p className="font-bold text-slate-800 leading-tight">{o.design_name}</p>
                        <span className="text-[9px] font-mono font-medium text-slate-400">Code: {o.design_code}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-slate-600">{o.quantity} pcs</td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`status-badge leading-none py-0.5 px-2 rounded-full text-[9px] font-bold font-mono tracking-wider ${
                          o.status === "Pending"
                            ? "bg-amber-100 text-amber-800"
                            : o.status === "Running"
                            ? "bg-blue-100 text-blue-700"
                            : o.status === "Completed"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Thread Stock Monitor section */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-xs md:text-sm">Thread Shade Replenishment Monitor</h3>
              <p className="text-[10px] text-red-500 flex items-center gap-1 font-mono font-bold mt-0.5 animate-pulse">
                <AlertTriangle className="w-3 h-3" /> Critical Stock Warning Threshold (10 Cones)
              </p>
            </div>
            <button
              id="view-all-inv-dashboard-btn"
              onClick={() => onNavigate("inventory")}
              className="text-[11px] text-blue-600 font-bold hover:underline py-1 px-2 rounded hover:bg-blue-50 cursor-pointer"
            >
              Verify Stock
            </button>
          </div>
          
          {inventory.lowStockList.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-[11px] flex flex-col items-center justify-center gap-1.5 border border-dashed border-slate-200 rounded-lg">
              <ShieldCheck className="w-8 h-8 text-blue-500" />
              <span>Perfect! All thread shades are fully stocked above safety limits.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left" id="dashboard-low-stock-table">
                <thead>
                  <tr className="border-b border-slate-100 text-[9px] text-slate-400 uppercase tracking-widest font-mono">
                    <th className="pb-2 font-bold">Shade Code</th>
                    <th className="pb-2 font-bold">Shade Name</th>
                    <th className="pb-2 font-bold">Brand Name</th>
                    <th className="pb-2 text-right font-bold">Stock Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {inventory.lowStockList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 font-mono font-bold text-slate-800">{item.shade_code}</td>
                      <td className="py-2.5 text-slate-700 font-semibold">{item.shade_name}</td>
                      <td className="py-2.5 text-slate-500">{item.brand}</td>
                      <td className="py-2.5 text-right">
                        <span className="font-mono text-xs font-bold text-red-600">
                          {item.qty_available} {item.unit}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </section>

      {/* Production & Machine Dashboards */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Machine Stats */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
             <h3 className="font-bold text-slate-800 text-xs md:text-sm">Machine Floor Monitor</h3>
             <button onClick={() => onNavigate("machines")} className="text-[11px] text-indigo-600 font-bold hover:underline">Manage Machines</button>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
             <div className="p-3 bg-slate-50 border border-slate-100 rounded text-center">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Total Machines</span>
                <span className="text-xl font-black text-slate-800">{machines.length}</span>
             </div>
             <div className="p-3 bg-emerald-50 border border-emerald-100 rounded text-center">
                <span className="block text-[10px] uppercase font-bold text-emerald-600">Running</span>
                <span className="text-xl font-black text-emerald-700">{machines.filter((m: any) => m.status === 'Running').length}</span>
             </div>
             <div className="p-3 bg-amber-50 border border-amber-100 rounded text-center">
                <span className="block text-[10px] uppercase font-bold text-amber-600">Idle / Maint</span>
                <span className="text-xl font-black text-amber-700">{machines.filter((m: any) => m.status !== 'Running').length}</span>
             </div>
          </div>
          <div>
            <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-2">Today's Production Totals</h4>
            <div className="flex justify-between items-center py-2 border-t border-slate-100">
               <span className="text-xs font-bold text-slate-600">Total Volume Produced</span>
               <span className="text-sm font-black font-mono text-indigo-600">
                 {dailyProduction.filter((p: any) => p.date === new Date().toISOString().substring(0, 10)).reduce((sum, p: any) => sum + p.quantity_produced, 0).toLocaleString()} Units
               </span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-slate-100 border-b">
               <span className="text-xs font-bold text-slate-600">Total Working Hours</span>
               <span className="text-sm font-black font-mono text-slate-800">
                 {dailyProduction.filter((p: any) => p.date === new Date().toISOString().substring(0, 10)).reduce((sum, p: any) => sum + p.working_hours, 0)} hours
               </span>
            </div>
          </div>
        </div>

        {/* Operator Stats */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
             <h3 className="font-bold text-slate-800 text-xs md:text-sm">Operator Performance Overview</h3>
             <button onClick={() => onNavigate("operators")} className="text-[11px] text-fuchsia-600 font-bold hover:underline">Manage Payroll</button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
             <div className="p-3 bg-slate-50 border border-slate-100 rounded text-center">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Total Operators</span>
                <span className="text-xl font-black text-slate-800">{operators.length}</span>
             </div>
             <div className="p-3 bg-fuchsia-50 border border-fuchsia-100 rounded text-center">
                <span className="block text-[10px] uppercase font-bold text-fuchsia-600">Payroll Payable Estimates</span>
                <span className="text-xl font-black text-fuchsia-700 font-mono">
                  {new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0 }).format(
                    operators.reduce((sum, op: any) => {
                       const produced = dailyProduction.filter((p: any) => p.operator_id === op.id).reduce((s, p: any) => s + p.quantity_produced, 0);
                       return sum + op.monthly_base_salary + (produced * op.bonus_rate_per_unit);
                    }, 0)
                  )}
                </span>
             </div>
          </div>
          <div>
            <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-2">Top Performer (By Volume)</h4>
            <div className="bg-slate-50 p-3 rounded border border-slate-100">
               {(() => {
                 if (operators.length === 0 || dailyProduction.length === 0) return <span className="text-xs text-slate-500">Not enough data to calculate top performer.</span>;
                 let topOp = null;
                 let maxVol = 0;
                 operators.forEach((op: any) => {
                   const vol = dailyProduction.filter((p: any) => p.operator_id === op.id).reduce((s, p: any) => s + p.quantity_produced, 0);
                   if (vol > maxVol) { maxVol = vol; topOp = op; }
                 });
                 if (!topOp) return <span className="text-xs text-slate-500">Not enough data to calculate top performer.</span>;
                 return (
                   <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 uppercase">{topOp.name}</span>
                      <span className="font-black text-fuchsia-600 font-mono">{maxVol.toLocaleString()} Units</span>
                   </div>
                 );
               })()}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
