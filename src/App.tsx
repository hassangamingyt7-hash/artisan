/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Building2, Lock, User, Eye, EyeOff, LayoutDashboard, LogOut, Loader2,
  AlertCircle, CheckCircle2, ShieldCheck, Terminal
} from "lucide-react";

import Sidebar from "./components/Sidebar.tsx";
import Header from "./components/Header.tsx";
import DashboardView from "./components/DashboardView.tsx";
import CustomerView from "./components/CustomerView.tsx";
import BrandView from "./components/BrandView.tsx";
import SupplierView from "./components/SupplierView.tsx";
import InventoryView from "./components/InventoryView.tsx";
import LedgerView from "./components/LedgerView.tsx";
import OrderView from "./components/OrderView.tsx";
import PurchaseView from "./components/PurchaseView.tsx";
import ExpenseView from "./components/ExpenseView.tsx";
import PaymentView from "./components/PaymentView.tsx";
import InvoiceView from "./components/InvoiceView.tsx";
import ReportsView from "./components/ReportsView.tsx";
import SettingsView from "./components/SettingsView.tsx";

import { 
  Customer, Brand, Supplier, ThreadInventory, Order, 
  Purchase, Expense, Payment, Invoice 
} from "./types.ts";

export default function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem("artisan_erp_token"));
  const [username, setUsername] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  
  // Login Inputs
  const [loginUsername, setLoginUsername] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

  // Core synchronized ERP state tables
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventory, setInventory] = useState<ThreadInventory[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Page level metadata state
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Parse token info on mount or change
  useEffect(() => {
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        setUsername(decoded.username || "Operator");
        setUserRole(decoded.role || "accountant");
        fetchSyncAllData();
      } catch (err) {
        handleLogout();
      }
    }
  }, [token]);

  // Synchronize all database tables dynamically from backend APIs
  const fetchSyncAllData = async () => {
    if (!token) return;
    setDataLoading(true);
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const safeFetchJson = async (url: string, defaultValue: any) => {
        try {
          const res = await fetch(url, { headers });
          if (!res.ok) {
            console.warn(`Unsuccessful fetch for ${url}: status ${res.status}`);
            return defaultValue;
          }
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            return await res.json();
          } else {
            console.warn(`Non-JSON response received from ${url}`);
            return defaultValue;
          }
        } catch (err) {
          console.error(`Error fetching from ${url}:`, err);
          return defaultValue;
        }
      };

      const [
        dataCust,
        dataBrand,
        dataSupp,
        dataInv,
        dataOrd,
        dataPurch,
        dataExp,
        dataPay,
        dataInvoices,
        dataStats
      ] = await Promise.all([
        safeFetchJson("/api/customers", []),
        safeFetchJson("/api/brands", []),
        safeFetchJson("/api/suppliers", []),
        safeFetchJson("/api/inventory", []),
        safeFetchJson("/api/orders", []),
        safeFetchJson("/api/purchases", []),
        safeFetchJson("/api/expenses", []),
        safeFetchJson("/api/payments", []),
        safeFetchJson("/api/invoices", []),
        safeFetchJson("/api/dashboard-stats", { financials: {}, inventory: {}, production: {} }),
      ]);

      setCustomers(dataCust);
      setBrands(dataBrand);
      setSuppliers(dataSupp);
      setInventory(dataInv);
      setOrders(dataOrd);
      setPurchases(dataPurch);
      setExpenses(dataExp);
      setPayments(dataPay);
      setInvoices(dataInvoices);
      setDashboardStats(dataStats);
    } catch (err) {
      console.error("Critical API Synchronization Fail:", err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginUsername, username: loginUsername, password: loginPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("artisan_erp_token", data.token);
        setToken(data.token);
      } else {
        setAuthError(data.error || "Authentication failed.");
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
      }
    } catch (err) {
      setAuthError("Failed to establish server connection.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("artisan_erp_token");
    setToken(null);
    setUsername("");
    setUserRole("");
    setActiveTab("dashboard");
  };

  const handlePasswordChange = async (oldP: string, newP: string) => {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ oldPassword: oldP, newPassword: newP })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Password change unsuccessful.");
    }
    return data;
  };

  // Helper APIs wrappers for generic tables mutations
  const handleMutateEntity = async (path: string, method: "POST" | "PUT" | "DELETE", data?: any, id?: number) => {
    const url = id ? `${path}/${id}` : path;
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    let body: any = null;
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      try {
        body = await res.json();
      } catch (err) {
        body = { error: "Failed to parse system response as JSON." };
      }
    } else {
      try {
        const txt = await res.text();
        body = { error: txt || `Server responded with status code ${res.status}` };
      } catch (err) {
        body = { error: `Server responded with status code ${res.status}` };
      }
    }

    if (!res.ok) {
      throw new Error(body.error || "Database operation failed");
    }
    fetchSyncAllData();
    return body;
  };

  // Render Login state screen if no token validated
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-blue-600 selection:text-white font-sans" id="login-screen-outer">
        <div className={`w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-7 shadow-2xl relative overflow-hidden space-y-5 ${isShaking ? 'animate-shake border-rose-500/50' : ''}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl"></div>
          
          <div className="text-center space-y-1.5 select-none animate-none">
            <div className="mx-auto w-10 h-10 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/5">
              <Building2 className="w-5 h-5 stroke-[1.5]" />
            </div>
            <h2 className="text-base font-bold text-white uppercase tracking-tight">ARTI8SAN ERP</h2>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold">Embroidery & Accounts Ledger Engine</p>
          </div>

          {authError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/30 rounded-lg text-rose-300 text-xs flex items-start gap-2 animate-none">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-500" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-[9px] uppercase font-mono font-extrabold text-slate-500 tracking-wider mb-1.5">Operator Username</label>
              <div className="relative">
                <User className="absolute left-3 top-2 text-slate-500 w-4 h-4" />
                <input
                  id="login-username"
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full text-xs text-white bg-slate-950/60 border border-slate-800 rounded py-2 pl-9 pr-3 outline-none focus:border-blue-500 transition-colors"
                  placeholder="e.g. admin, manager, accountant"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] uppercase font-mono font-extrabold text-slate-500 tracking-wider mb-1.5">Access Security Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2 text-slate-500 w-4 h-4" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full text-xs text-white bg-slate-950/60 border border-slate-800 rounded py-2 pl-9 pr-9 outline-none focus:border-blue-500 transition-colors"
                  placeholder="Password Code"
                />
                <button
                  type="button"
                  id="toggle-login-password"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-slate-500 hover:text-slate-300 rounded"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="submit-auth-btn"
              type="submit"
              disabled={authLoading}
              className="w-full bg-blue-600 text-white hover:bg-blue-500 font-semibold py-2 px-3 rounded text-xs tracking-wide uppercase transition-all shadow-md shadow-blue-500/10 cursor-pointer flex justify-center items-center gap-2"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>SECURING CHANNEL...</span>
                </>
              ) : (
                <span>SECURE OPERATOR LOGIN</span>
              )}
            </button>
          </form>

          {/* Fully-functional quick login selector buttons */}
          <div className="border-t border-slate-800 pt-4 space-y-2.5" id="quick-login-selection-panel">
            <p className="text-[9px] text-slate-500 uppercase font-mono font-bold text-center tracking-widest">Select Convenient Trial Operator Login</p>
            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
              <button
                id="quick-login-admin"
                type="button"
                onClick={() => {
                  setLoginUsername("admin");
                  setLoginPassword("admin123");
                }}
                className={`py-1.5 border rounded text-center cursor-pointer transition-all font-medium ${
                  loginUsername === "admin" && loginPassword === "admin123"
                    ? "border-blue-500 bg-blue-500/15 text-white shadow-sm"
                    : "border-blue-500/15 hover:border-blue-500/40 hover:bg-blue-500/5 text-slate-400 hover:text-white"
                }`}
              >
                Admin
              </button>
              <button
                id="quick-login-manager"
                type="button"
                onClick={() => {
                  setLoginUsername("manager");
                  setLoginPassword("manager123");
                }}
                className={`py-1.5 border rounded text-center cursor-pointer transition-all font-medium ${
                  loginUsername === "manager" && loginPassword === "manager123"
                    ? "border-sky-500 bg-sky-500/15 text-white shadow-sm"
                    : "border-sky-500/15 hover:border-sky-500/40 hover:bg-sky-500/5 text-slate-400 hover:text-white"
                }`}
              >
                Manager
              </button>
              <button
                id="quick-login-accountant"
                type="button"
                onClick={() => {
                  setLoginUsername("accountant");
                  setLoginPassword("accountant123");
                }}
                className={`py-1.5 border rounded text-center cursor-pointer transition-all font-medium ${
                  loginUsername === "accountant" && loginPassword === "accountant123"
                    ? "border-purple-500 bg-purple-500/15 text-white shadow-sm"
                    : "border-purple-500/15 hover:border-purple-500/40 hover:bg-purple-500/5 text-slate-400 hover:text-white"
                }`}
              >
                Accountant
              </button>
            </div>
            <div className="p-2.5 bg-slate-950/40 border border-slate-800/30 rounded flex items-start gap-1.5 text-[9.5px] text-slate-500 leading-normal font-sans">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Full active RBAC enforced dynamically. Admin grants broad controls, Accountant locks financial views, and Manager supervises thread inventories.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render complete Application Shell layout
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-row overflow-hidden font-sans selection:bg-rose-500 selection:text-white" id="applet-viewport-frame">
      {/* Navigation Sidebar */}
      <Sidebar 
        currentTab={activeTab} 
        setTab={setActiveTab} 
        userRole={userRole} 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Primary Page Canvas Frame */}
      <div className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-300 ${sidebarOpen ? "lg:pl-56" : "lg:pl-0"}`}>
        {/* Top Header bar */}
        <Header 
          currentTab={activeTab}
          userName={username} 
          userRole={userRole} 
          onLogout={handleLogout} 
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        />

        {/* Page Sub-Views */}
        <main className="flex-1 overflow-y-auto bg-slate-50/40 pb-16">
          {dataLoading && (
            <div className="h-1 bg-rose-500/10 relative overflow-hidden shrink-0">
              <div className="absolute top-0 left-0 h-full w-1/3 bg-blue-500 animate-infinite-loading"></div>
            </div>
          )}

          {activeTab === "dashboard" && (
            <DashboardView 
              stats={dashboardStats} 
              loading={dataLoading}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "customers" && (
            <CustomerView 
              customers={customers} 
              userRole={userRole}
              onRefresh={fetchSyncAllData}
              onAdd={(data) => handleMutateEntity("/api/customers", "POST", data)}
              onEdit={(id, data) => handleMutateEntity("/api/customers", "PUT", data, id)}
              onDelete={(id) => handleMutateEntity("/api/customers", "DELETE", undefined, id)}
            />
          )}

          {activeTab === "brands" && (
            <BrandView 
              brands={brands} 
              userRole={userRole}
              onRefresh={fetchSyncAllData}
              onAdd={(data) => handleMutateEntity("/api/brands", "POST", data)}
              onEdit={(id, data) => handleMutateEntity("/api/brands", "PUT", data, id)}
              onDelete={(id) => handleMutateEntity("/api/brands", "DELETE", undefined, id)}
            />
          )}

          {activeTab === "suppliers" && (
            <SupplierView 
              suppliers={suppliers} 
              userRole={userRole}
              onRefresh={fetchSyncAllData}
              onAdd={(data) => handleMutateEntity("/api/suppliers", "POST", data)}
              onEdit={(id, data) => handleMutateEntity("/api/suppliers", "PUT", data, id)}
              onDelete={(id) => handleMutateEntity("/api/suppliers", "DELETE", undefined, id)}
            />
          )}

          {activeTab === "inventory" && (
            <InventoryView 
              inventory={inventory} 
              suppliers={suppliers}
              userRole={userRole}
              onRefresh={fetchSyncAllData}
              onAdd={(data) => handleMutateEntity("/api/inventory", "POST", data)}
              onEdit={(id, data) => handleMutateEntity("/api/inventory", "PUT", data, id)}
              onDelete={(id) => handleMutateEntity("/api/inventory", "DELETE", undefined, id)}
            />
          )}

          {activeTab === "ledger" && (
            <LedgerView 
              inventory={inventory}
              orders={orders}
              userRole={userRole}
              token={token}
              onRefresh={fetchSyncAllData}
            />
          )}

          {activeTab === "orders" && (
            <OrderView 
              orders={orders} 
              brands={brands}
              userRole={userRole}
              onRefresh={fetchSyncAllData}
              onAdd={(data) => handleMutateEntity("/api/orders", "POST", data)}
              onEdit={(id, data) => handleMutateEntity("/api/orders", "PUT", data, id)}
              onDelete={(id) => handleMutateEntity("/api/orders", "DELETE", undefined, id)}
            />
          )}

          {activeTab === "purchases" && (
            <PurchaseView 
              purchases={purchases} 
              suppliers={suppliers}
              userRole={userRole}
              onRefresh={fetchSyncAllData}
              onAdd={(data) => handleMutateEntity("/api/purchases", "POST", data)}
              onEdit={(id, data) => handleMutateEntity("/api/purchases", "PUT", data, id)}
              onDelete={(id) => handleMutateEntity("/api/purchases", "DELETE", undefined, id)}
            />
          )}

          {activeTab === "expenses" && (
            <ExpenseView 
              expenses={expenses} 
              userRole={userRole}
              onRefresh={fetchSyncAllData}
              onAdd={(data) => handleMutateEntity("/api/expenses", "POST", data)}
              onEdit={(id, data) => handleMutateEntity("/api/expenses", "PUT", data, id)}
              onDelete={(id) => handleMutateEntity("/api/expenses", "DELETE", undefined, id)}
            />
          )}

          {activeTab === "payments" && (
            <PaymentView 
              payments={payments} 
              customers={customers}
              suppliers={suppliers}
              userRole={userRole}
              onRefresh={fetchSyncAllData}
              onAddPayment={(data) => handleMutateEntity("/api/payments", "POST", data)}
            />
          )}

          {activeTab === "invoices" && (
            <InvoiceView 
              invoices={invoices} 
              orders={orders}
              brands={brands}
              userRole={userRole}
              onRefresh={fetchSyncAllData}
              onAddInvoice={(data) => handleMutateEntity("/api/invoices", "POST", data)}
              onEditInvoice={(id, data) => handleMutateEntity("/api/invoices", "PUT", data, id)}
              onDeleteInvoice={(id) => handleMutateEntity("/api/invoices", "DELETE", undefined, id)}
            />
          )}

          {activeTab === "reports" && (
            <ReportsView 
              brands={brands}
              suppliers={suppliers}
              inventory={inventory}
              purchases={purchases}
              expenses={expenses}
              payments={payments}
              invoices={invoices}
              orders={orders}
            />
          )}

          {activeTab === "settings" && (
            <SettingsView 
              userRole={userRole}
              userName={username}
              onChangePassword={handlePasswordChange}
            />
          )}
        </main>
      </div>
    </div>
  );
}
