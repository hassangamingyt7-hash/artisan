import React, { useState } from "react";
import { Printer, FileDown, Download, Filter } from "lucide-react";

interface TableActionControlsProps {
  onPrint: () => void;
  onPdf: () => void;
  onExcel: () => void;
  dateFilter: string;
  setDateFilter: (val: string) => void;
  customDateRange?: { start: string, end: string };
  setCustomDateRange?: (val: { start: string, end: string }) => void;
}

export default function TableActionControls({
  onPrint, onPdf, onExcel, dateFilter, setDateFilter, customDateRange, setCustomDateRange
}: TableActionControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3 bg-white p-2 rounded-lg border border-slate-200">
      <div className="flex items-center gap-2 border-r border-slate-200 pr-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <select 
          value={dateFilter} 
          onChange={(e) => setDateFilter(e.target.value)}
          className="text-xs border-none outline-none bg-transparent font-medium text-slate-700 cursor-pointer"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {dateFilter === "custom" && customDateRange && setCustomDateRange && (
        <div className="flex items-center gap-2 border-r border-slate-200 pr-3">
          <input type="date" className="text-xs p-1 border border-slate-200 rounded" value={customDateRange.start} onChange={e => setCustomDateRange({ ...customDateRange, start: e.target.value })} />
          <span className="text-xs text-slate-400">to</span>
          <input type="date" className="text-xs p-1 border border-slate-200 rounded" value={customDateRange.end} onChange={e => setCustomDateRange({ ...customDateRange, end: e.target.value })} />
        </div>
      )}

      <div className="flex items-center gap-2 pl-1">
        <button onClick={onPrint} className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-slate-100 rounded text-xs font-semibold text-slate-600 transition-colors">
          <Printer className="w-4 h-4 text-slate-500" /> Print
        </button>
        <button onClick={onPdf} className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-slate-100 rounded text-xs font-semibold text-slate-600 transition-colors">
          <FileDown className="w-4 h-4 text-red-500" /> Save PDF
        </button>
        <button onClick={onExcel} className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-slate-100 rounded text-xs font-semibold text-green-700 transition-colors">
          <Download className="w-4 h-4 text-green-600" /> Export Excel
        </button>
      </div>
    </div>
  );
}

export function exportToExcel(data: any[], filename: string) {
  if (!data || !data.length) {
    alert("No data available to export.");
    return;
  }
  const headers = Object.keys(data[0] || {}).filter(k => typeof data[0][k] !== "object");
  const csvStr = [
    headers.join(","),
    ...data.map(row => headers.map(k => `"${String(row[k] || "").replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function filterByDateRange(items: any[], dateField: string, dateFilter: string, customRange?: { start: string, end: string }) {
  if (dateFilter === "all" || !dateFilter) return items;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return items.filter(item => {
    const itemDate = new Date(item[dateField]);
    if (isNaN(itemDate.getTime())) return true; // If no valid date, keep it (e.g. legacy data)

    if (dateFilter === "today") {
      return itemDate >= today;
    }
    if (dateFilter === "week") {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(startOfWeek.getDate() - today.getDay());
      return itemDate >= startOfWeek;
    }
    if (dateFilter === "month") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return itemDate >= startOfMonth;
    }
    if (dateFilter === "custom" && customRange?.start && customRange?.end) {
      const s = new Date(customRange.start);
      const e = new Date(customRange.end);
      e.setHours(23, 59, 59, 999);
      return itemDate >= s && itemDate <= e;
    }
    return true;
  });
}
