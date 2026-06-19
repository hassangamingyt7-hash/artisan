/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  LayoutGrid,
  Users,
  Award,
  Truck,
  Boxes,
  ShoppingCart,
  CreditCard,
  FileSpreadsheet,
  Receipt,
  Wallet,
  BarChart3,
  Settings,
  X,
  History,
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  userRole: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ currentTab, setTab, userRole, isOpen, onClose }: SidebarProps) {
  const menuItems = [
    // Core
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid, roles: ["admin", "manager", "accountant"], category: "Core" },
    { id: "customers", label: "Customers Ledger", icon: Users, roles: ["admin", "manager", "accountant"], category: "Core" },
    { id: "brands", label: "Brands Directory", icon: Award, roles: ["admin", "manager", "accountant"], category: "Core" },
    { id: "suppliers", label: "Suppliers Directory", icon: Truck, roles: ["admin", "manager", "accountant"], category: "Core" },
    
    // Inventory & Production
    { id: "inventory", label: "Thread Inventory", icon: Boxes, roles: ["admin", "manager", "accountant"], category: "Inventory & Production" },
    { id: "ledger", label: "Stock Ledger", icon: History, roles: ["admin", "manager", "accountant"], category: "Inventory & Production" },
    { id: "orders", label: "Order Management", icon: FileSpreadsheet, roles: ["admin", "manager", "accountant"], category: "Inventory & Production" },
    { id: "purchases", label: "Purchases", icon: ShoppingCart, roles: ["admin", "manager", "accountant"], category: "Inventory & Production" },
    
    // Finance
    { id: "expenses", label: "Expenses Ledger", icon: CreditCard, roles: ["admin", "manager", "accountant"], category: "Finance" },
    { id: "payments", label: "Payments & Vouchers", icon: Wallet, roles: ["admin", "manager", "accountant"], category: "Finance" },
    { id: "invoices", label: "Invoice Engine", icon: Receipt, roles: ["admin", "manager", "accountant"], category: "Finance" },
    { id: "reports", label: "Reporting Engine", icon: BarChart3, roles: ["admin", "manager", "accountant"], category: "Finance" },
    { id: "settings", label: "System Settings", icon: Settings, roles: ["admin", "manager"], category: "Finance" },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          id="sidebar-backdrop"
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-56 bg-slate-900 text-white flex flex-col border-r border-slate-800 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 select-none">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-base italic text-white shadow-md shadow-blue-900/20">
              A8
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white leading-none">ARTISAN EMB</h1>
              <span className="text-[9px] text-slate-500 font-mono tracking-wider uppercase font-semibold">ERP System</span>
            </div>
          </div>
          <button
            id="close-sidebar"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            title="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Role Badge */}
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/20 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono font-bold">Role Hierarchy</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">{userRole}</span>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 scrollbar-thin">
          {(() => {
            let lastCategory = "";
            return menuItems.map((item) => {
              const isAllowed = item.roles.includes(userRole);
              if (!isAllowed) return null;

              const showCategoryHeader = item.category !== lastCategory;
              lastCategory = item.category;

              const IconComp = item.icon;
              const isActive = currentTab === item.id;

              return (
                <React.Fragment key={item.id}>
                  {showCategoryHeader && (
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 font-extrabold mt-3.5 mb-1.5 ml-2">
                      {item.category}
                    </div>
                  )}
                  <button
                    id={`sidebar-tab-${item.id}`}
                    onClick={() => {
                      setTab(item.id);
                      if (window.innerWidth < 1024) {
                        onClose();
                      }
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-slate-800 text-white font-semibold"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/45"
                    }`}
                  >
                    <IconComp className={`w-4 h-4 shrink-0 transition-transform duration-100 ${isActive ? "text-blue-400 scale-105" : "text-slate-400"}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                </React.Fragment>
              );
            });
          })()}
        </nav>

        {/* Bottom Credits */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-center text-[9px] text-slate-500 font-mono select-none">
          <span>v1.0 ERP • Stable</span>
        </div>
      </aside>
    </>
  );
}
