/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "admin" | "manager" | "accountant" | "accounts_manager" | "store_manager";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
}

export interface Customer {
  id: number;
  name: string;
  company_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  ntn: string;
  notes: string;
  outstanding_balance?: number;
}

export interface Brand {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  payment_terms: string;
  outstanding_balance?: number;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  supplier_type: "Thread" | "Fabric" | "Accessory" | "Other";
}

export interface ThreadInventory {
  id: number;
  shade_code: string;
  shade_name: string;
  brand: string;
  supplier_id: number;
  supplier_name?: string;
  purchase_date: string;
  qty_purchased: number;
  qty_available: number;
  unit: string;
  cost_per_cone: number;
  total_cost: number;
  
  // Sourcing & Consumption Audit Fields
  number_of_cones?: number;
  available_quantity?: number;
  consumed_quantity?: number;
  remaining_quantity?: number;
  purchase_bill_number?: string;
}

export interface Purchase {
  id: number;
  purchase_number: string;
  purchase_date: string;
  supplier_id: number;
  supplier_name?: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  payment_status: "Paid" | "Partial" | "Unpaid";
  amount_paid?: number;
}

export interface Expense {
  id: number;
  expense_date: string;
  category: "Electricity" | "Rent" | "Salaries" | "Maintenance" | "Fuel" | "Internet" | "Transport" | "Miscellaneous";
  description: string;
  amount: number;
  payment_method: string;
}

export interface Order {
  id: number;
  order_number: string;
  brand_id: number;
  brand_name?: string;
  design_name: string;
  design_code: string;
  quantity: number;
  rate: number;
  total_amount: number;
  delivery_date: string;
  status: "Pending" | "Running" | "Completed" | "Delivered";
}

export interface InvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  unit_mtr: string;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  brand_name: string;
  ntn: string;
  stn: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  po_number: string;
  items: InvoiceItem[] | string;
  subtotal: number;
  gst_amount: number;
  grand_total: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id: number;
  type: "receipt" | "payment";
  entity_type: "customer" | "supplier" | "brand" | "expense" | "other";
  entity_id: number;
  entity_name?: string;
  amount: number;
  payment_date: string;
  payment_method: "Cash" | "Bank Transfer" | "Cheque" | "JazzCash" | "Easypaisa";
  reference_number: string;
  notes: string;
}

export interface Receivable {
  id: number;
  customer_id: number;
  customer_name?: string;
  invoice_id: number;
  invoice_number?: string;
  invoice_date?: string;
  amount: number;
  amount_received: number;
  balance_remaining: number;
  due_date: string;
}

export interface Payable {
  id: number;
  supplier_id: number;
  supplier_name?: string;
  purchase_id: number;
  purchase_number?: string;
  purchase_date?: string;
  amount: number;
  paid_amount: number;
  balance: number;
  due_date: string;
}

export interface CompanySettings {
  company_name: string;
  logo_url: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  ntn: string;
  invoice_prefix: string;
}

export interface DashboardStats {
  financials: {
    totalReceivables: number;
    totalPayables: number;
    monthlyRevenue: number;
    monthlyExpenses: number;
    outstandingInvoicesCount: number;
    pendingSupplierPaymentsCount: number;
    monthlySalesChart?: any[];
  };
  inventory: {
    totalThreadStock: number;
    lowStockAlertsCount: number;
    recentPurchases: Purchase[];
    recentConsumption: { shade_code: string; shade_name: string; quantity: number; date: string }[];
    lowStockList: ThreadInventory[];
  };
  production: {
    totalOrders: number;
    runningOrders: number;
    completedOrders: number;
    deliveredOrders: number;
  };
}
