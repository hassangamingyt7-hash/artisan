/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Menu, LogOut, Clock, User, Calendar } from "lucide-react";

interface HeaderProps {
  currentTab: string;
  userName: string;
  userRole: string;
  onLogout: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function Header({ currentTab, userName, userRole, onLogout, sidebarOpen, onToggleSidebar }: HeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getTabLabel = (id: string) => {
    switch (id) {
      case "dashboard": return "Business Dashboard";
      case "customers": return "Customers Ledger Directory";
      case "brands": return "Registered Design Brands";
      case "suppliers": return "Suppliers Registry & Ledger";
      case "inventory": return "Thread Shade Stock System";
      case "orders": return "Embroidery Job Orders";
      case "purchases": return "Vendor Invoices & Purchases";
      case "expenses": return "Overhead Expenses Ledger";
      case "payments": return "Cash & Bank Payment Vouchers";
      case "invoices": return "Invoice Generation Engine";
      case "reports": return "ERP Standard Financial Reports";
      case "settings": return "ARTI8SAN System Profile Configuration";
      default: return "ARTI8SAN Management Console";
    }
  };

  const formattedDate = time.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const formattedTime = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <header
      id="app-header"
      className="h-14 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30"
    >
      {/* Left side: tab name & mobile toggle */}
      <div className="flex items-center gap-2">
        <button
          id="open-sidebar-btn"
          onClick={onToggleSidebar}
          className="p-1 px-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 shrink-0"
          title={sidebarOpen ? "Close Sidebar" : "Open Sidebar"}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="font-bold text-slate-800 text-xs md:text-sm capitalize tracking-wide select-none">
            {getTabLabel(currentTab)}
          </h2>
        </div>
      </div>

      {/* Right side: time, user profile information, logout */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Dynamic Live Clock */}
        <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md select-none">
          <Clock className="w-3 h-3 text-blue-600" />
          <span>{formattedDate}</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-700 tracking-wider font-semibold">{formattedTime}</span>
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-3 border-l border-slate-200 pl-3 md:pl-5">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-800 truncate max-w-32 md:max-w-48 leading-tight">
              {userName}
            </p>
            <p className="text-[10px] uppercase font-mono font-bold text-slate-400 mt-0.5 leading-none tracking-wider">
              {userRole}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
            <User className="w-4 h-4 text-slate-500" />
          </div>
          
          <button
            id="header-logout-btn"
            onClick={() => {
              onLogout();
            }}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-s ml-1"
            title="Log out of application"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
