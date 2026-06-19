/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { AsyncLocalStorage } from "async_hooks";

export const tenantStorage = new AsyncLocalStorage<{ tenantId: number, role: string }>();

// Database storage file for offline sandbox persistence
const SANDBOX_DB_PATH = path.join(process.cwd(), "artisan_erp_db.json");

// Define table types explicitly
interface DBStructure {
  users: any[];
  customers: any[];
  brands: any[];
  suppliers: any[];
  thread_inventory: any[];
  purchases: any[];
  purchase_items: any[];
  thread_stock_ledger: any[];
  thread_consumption: any[];
  expenses: any[];
  orders: any[];
  invoices: any[];
  invoice_items: any[];
  payments: any[];
  receivables: any[];
  payables: any[];
  settings: any;
}

// Global cached state for sandbox database
let sandboxCache: DBStructure | null = null;
let mysqlPool: mysql.Pool | null = null;

// Initialize MySQL pool if configured
function getMySQLPool(): mysql.Pool | null {
  if (mysqlPool) return mysqlPool;

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;

  if (host && user && database) {
    try {
      mysqlPool = mysql.createPool({
        host,
        user,
        password,
        database,
        port,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
      console.log("Connected to MySQL successfully!");
      return mysqlPool;
    } catch (err) {
      console.error("Failed to initialize MySQL Connection Pool, falling back to Sandbox DB", err);
      return null;
    }
  }
  return null;
}

// Generate secure passwords for the demo accounts
const SALT = bcrypt.genSaltSync(10);
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync("hassan321", SALT); // plaintext is "hassan321"

// Default mock seed data
const DEFAULT_DB_STATE: DBStructure = {
  users: [
    { id: 1, name: "hassan (Administrator)", username: "hassan", email: "hassan@artisan.com", role: "admin", password: DEFAULT_PASSWORD_HASH }
  ],
  customers: [
    { id: 1, name: "Khaadi Retail Pakistan", company_name: "Khaadi", phone: "+92 300 1234567", whatsapp: "+92 300 1234567", email: "accounts@khaadi.com", address: "Plot 34, Sector 15, Korangi Industrial Area, Karachi", ntn: "3189456-7", notes: "A-Grade premium fabric client" },
    { id: 2, name: "Sana Safinaz", company_name: "Sana Safinaz", phone: "+92 321 9876543", whatsapp: "+92 321 9876543", email: "billing@sanasafinaz.com", address: "Gate 4, S.I.T.E Area, Karachi", ntn: "4201399-2", notes: "Requires strict Net-15 invoicing" },
    { id: 3, name: "Gul Ahmed Textiles Ltd", company_name: "Gul Ahmed", phone: "+92 333 4567890", whatsapp: "+92 333 4567890", email: "vendors@gulahmed.com", address: "Landhi Industrial Area, Karachi", ntn: "1198543-1", notes: "Pioneering partner" }
  ],
  brands: [
    { id: 1, name: "Khaadi Pre-t", contact_person: "Zainab Bukhari", phone: "+92 300 1112222", email: "zainab.b@khaadi.com", address: "Head Office Tower, Clifton, Karachi", payment_terms: "30 Days Invoice Cycle" },
    { id: 2, name: "Sana Safinaz Luxury Wear", contact_person: "Sarah Ahmed", phone: "+92 321 8889999", email: "sarah.ahmed@sanasafinaz.com", address: "Phase VI, DHA, Karachi", payment_terms: "15 Days Invoice Cycle" },
    { id: 3, name: "Gul Ahmed Ideas", contact_person: "Bilal Khan", phone: "+92 333 5554444", email: "bilal.ideas@gulahmed.com", address: "Ideas Commercial Hub, Karachi", payment_terms: "Cash on Delivery" }
  ],
  suppliers: [
    { id: 1, name: "Anchorage Thread Distributors", contact_person: "Asif Malik", phone: "+92 302 7776665", whatsapp: "+92 302 7776665", email: "orders@anchorage.com", address: "Moti Bazaar, Faisalabad", supplier_type: "Thread" },
    { id: 2, name: "Sindh Garments & Zari Supplies", contact_person: "Rafiq Qureshi", phone: "+92 301 4443332", whatsapp: "+92 301 4443332", email: "rafiq@sindhgarment.com", address: "Saddar Bazaar, Karachi", supplier_type: "Accessory" },
    { id: 3, name: "Sana Fabric Support", contact_person: "Rizwan Baig", phone: "+92 345 9998887", whatsapp: "+92 345 9998887", email: "rizwan@fabricsupport.pk", address: "Jinnah Market, Lahore", supplier_type: "Fabric" }
  ],
  thread_inventory: [
    { id: 1, shade_code: "MA-01", shade_name: "Midnight Anthracite", brand: "Marathon Shiny", supplier_id: 1, qty_purchased: 50, qty_available: 36, unit: "Cones", cost_per_cone: 350, total_cost: 17500, purchase_bill_number: "PO-2026-001", purchase_date: "2026-06-01", number_of_cones: 50, available_quantity: 50, consumed_quantity: 14, remaining_quantity: 36 },
    { id: 2, shade_code: "CR-08", shade_name: "Crimson Royal Red", brand: "Madeira Premium", supplier_id: 1, qty_purchased: 40, qty_available: 4, unit: "Cones", cost_per_cone: 420, total_cost: 16800, purchase_bill_number: "PO-2026-001", purchase_date: "2026-06-01", number_of_cones: 40, available_quantity: 40, consumed_quantity: 36, remaining_quantity: 4 },
    { id: 3, shade_code: "GL-99", shade_name: "Metallic Gold Weave", brand: "Anchor Metallic", supplier_id: 2, qty_purchased: 20, qty_available: 18, unit: "Cones", cost_per_cone: 850, total_cost: 17000, purchase_bill_number: "PO-2026-002", purchase_date: "2026-06-10", number_of_cones: 20, available_quantity: 20, consumed_quantity: 2, remaining_quantity: 18 },
    { id: 4, shade_code: "EM-23", shade_name: "Emerald Jungle", brand: "Marathon Shiny", supplier_id: 1, qty_purchased: 30, qty_available: 28, unit: "Cones", cost_per_cone: 380, total_cost: 11400, purchase_bill_number: "PO-2026-001", purchase_date: "2026-06-01", number_of_cones: 30, available_quantity: 30, consumed_quantity: 2, remaining_quantity: 28 }
  ],
  purchases: [
    { id: 1, purchase_number: "PO-2026-001", purchase_date: "2026-06-01", supplier_id: 1, product_name: "Marathon Midnight Anthracite & Madeira Crimson Thread Cones", quantity: 90, unit: "Cones", unit_cost: 381, total_cost: 34300, payment_status: "Paid" },
    { id: 2, purchase_number: "PO-2026-002", purchase_date: "2026-06-10", supplier_id: 2, product_name: "Anchor Metallic Gold Thread Cones", quantity: 20, unit: "Cones", unit_cost: 850, total_cost: 17000, payment_status: "Unpaid" }
  ],
  purchase_items: [
    { id: 1, purchase_id: 1, shade_code: "MA-01", shade_name: "Midnight Anthracite", cones: 50, rate: 350, total_amount: 17500 },
    { id: 2, purchase_id: 1, shade_code: "CR-08", shade_name: "Crimson Royal Red", cones: 40, rate: 420, total_amount: 16800 },
    { id: 3, purchase_id: 2, shade_code: "GL-99", shade_name: "Metallic Gold Weave", cones: 20, rate: 850, total_amount: 17000 }
  ],
  thread_consumption: [
    { id: 1, date: "2026-06-05", shade_code: "MA-01", shade_name: "Midnight Anthracite", quantity_consumed: 14, order_id: 1, order_number: "ORD-1001", notes: "Floral Vine border embroidery run" },
    { id: 2, date: "2026-06-12", shade_code: "CR-08", shade_name: "Crimson Royal Red", quantity_consumed: 36, order_id: 2, order_number: "ORD-1002", notes: "Baroque neck patch run" },
    { id: 3, date: "2026-06-15", shade_code: "GL-99", shade_name: "Metallic Gold Weave", quantity_consumed: 2, order_id: 1, order_number: "ORD-1001", notes: "Gold highlight work" },
    { id: 4, date: "2026-06-15", shade_code: "EM-23", shade_name: "Emerald Jungle", quantity_consumed: 2, order_id: 3, order_number: "ORD-1003", notes: "Lawn sleeves leaves run" }
  ],
  thread_stock_ledger: [
    { id: 1, date: "2026-06-01", type: "Purchase", supplier_id: 1, purchase_id: 1, purchase_number: "PO-2026-001", shade_code: "MA-01", shade_name: "Midnight Anthracite", qty_in: 50, qty_out: 0, balance: 50 },
    { id: 2, date: "2026-06-01", type: "Purchase", supplier_id: 1, purchase_id: 1, purchase_number: "PO-2026-001", shade_code: "CR-08", shade_name: "Crimson Royal Red", qty_in: 40, qty_out: 0, balance: 40 },
    { id: 3, date: "2026-06-01", type: "Purchase", supplier_id: 1, purchase_id: 1, purchase_number: "PO-2026-001", shade_code: "EM-23", shade_name: "Emerald Jungle", qty_in: 30, qty_out: 0, balance: 30 },
    { id: 4, date: "2026-06-05", type: "Consumption", shade_code: "MA-01", shade_name: "Midnight Anthracite", qty_in: 0, qty_out: 14, balance: 36 },
    { id: 5, date: "2026-06-10", type: "Purchase", supplier_id: 2, purchase_id: 2, purchase_number: "PO-2026-002", shade_code: "GL-99", shade_name: "Metallic Gold Weave", qty_in: 20, qty_out: 0, balance: 20 },
    { id: 6, date: "2026-06-12", type: "Consumption", shade_code: "CR-08", shade_name: "Crimson Royal Red", qty_in: 0, qty_out: 36, balance: 4 },
    { id: 7, date: "2026-06-15", type: "Consumption", shade_code: "GL-99", shade_name: "Metallic Gold Weave", qty_in: 0, qty_out: 2, balance: 18 },
    { id: 8, date: "2026-06-15", type: "Consumption", shade_code: "EM-23", shade_name: "Emerald Jungle", qty_in: 0, qty_out: 2, balance: 28 }
  ],
  expenses: [
    { id: 1, expense_date: "2026-06-05", category: "Electricity", description: "Industrial High-Tension Meter Bill for May 2026", amount: 145000, payment_method: "Bank Transfer" },
    { id: 2, expense_date: "2026-06-10", category: "Salaries", description: "Wages for Embroidery Machine Operators & Helper Staff", amount: 280000, payment_method: "Bank Transfer" },
    { id: 3, expense_date: "2026-06-12", category: "Fuel", description: "Diesel for Backup Power Generator (50 Litres)", amount: 13500, payment_method: "Cash" },
    { id: 4, expense_date: "2026-06-15", category: "Maintenance", description: "Servicing of 20-Head Multi-針 Tajima Embroidery Machine", amount: 25000, payment_method: "Cash" }
  ],
  orders: [
    { id: 1, order_number: "ORD-1001", brand_id: 1, design_name: "Floral Vine Border Shalwar", design_code: "FL-993", quantity: 1200, rate: 85, total_amount: 102000, delivery_date: "2026-06-25", status: "Running" },
    { id: 2, order_number: "ORD-1002", brand_id: 2, design_name: "Symmetric Baroque Neckline v2", design_code: "BRQ-202", quantity: 800, rate: 150, total_amount: 120000, delivery_date: "2026-06-20", status: "Completed" },
    { id: 3, order_number: "ORD-1003", brand_id: 3, design_name: "Summer Lawn Sleeves Motif", design_code: "SL-640", quantity: 2000, rate: 45, total_amount: 90000, delivery_date: "2026-06-30", status: "Pending" },
    { id: 4, order_number: "ORD-1004", brand_id: 1, design_name: "Geometrical Panel Front", design_code: "GEO-01", quantity: 500, rate: 110, total_amount: 55000, delivery_date: "2026-06-14", status: "Delivered" }
  ],
  invoices: [],
  invoice_items: [],
  payments: [
    { id: 1, type: "receipt", entity_type: "customer", entity_id: 1, amount: 64350, payment_date: "2026-06-15", payment_method: "Bank Transfer", reference_number: "HBL-992144", notes: "Cleared full payment for INV-202s-001" },
    { id: 2, type: "payment", entity_type: "supplier", entity_id: 1, amount: 34300, payment_date: "2026-06-03", payment_method: "Cheque", reference_number: "CHQ-00124", notes: "Payment for PO-2026-001" }
  ],
  receivables: [
    { id: 1, customer_id: 1, invoice_id: 1, amount: 64350, amount_received: 64350, balance_remaining: 0, due_date: "2026-07-14" },
    { id: 2, customer_id: 2, invoice_id: 2, amount: 140400, amount_received: 0, balance_remaining: 140400, due_date: "2026-07-05" }
  ],
  payables: [
    { id: 1, supplier_id: 1, purchase_id: 1, amount: 34300, paid_amount: 34300, balance: 0, due_date: "2026-07-01" },
    { id: 2, supplier_id: 2, purchase_id: 2, amount: 17000, paid_amount: 0, balance: 17000, due_date: "2026-07-10" }
  ],
  settings: {
    company_name: "ARTISAN Embroidery Unit",
    logo_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&q=80",
    address: "Plot 89, Sector 24, Industrial Area, Korangi, Karachi, Pakistan",
    phone: "+92 21 35061188",
    email: "info@artisanembroidery.com",
    website: "https://artisanembroidery.com",
    ntn: "1234567-9",
    invoice_prefix: "ART8"
  }
};

// Main Sandbox Database loader
function loadSandboxDB(): DBStructure {
  if (sandboxCache) return sandboxCache;

  try {
    if (fs.existsSync(SANDBOX_DB_PATH)) {
      const data = fs.readFileSync(SANDBOX_DB_PATH, "utf-8");
      sandboxCache = JSON.parse(data);
      
      // Backward compatibility: inject new tables if missing
      let mutated = false;
      if (!sandboxCache!.purchase_items) {
        sandboxCache!.purchase_items = JSON.parse(JSON.stringify(DEFAULT_DB_STATE.purchase_items));
        mutated = true;
      }
      if (!sandboxCache!.thread_consumption) {
        sandboxCache!.thread_consumption = JSON.parse(JSON.stringify(DEFAULT_DB_STATE.thread_consumption));
        mutated = true;
      }
      if (!sandboxCache!.thread_stock_ledger) {
        sandboxCache!.thread_stock_ledger = JSON.parse(JSON.stringify(DEFAULT_DB_STATE.thread_stock_ledger));
        mutated = true;
      }
      // Ensure existing thread_inventory entries have the enhanced keys
      if (sandboxCache!.thread_inventory && sandboxCache!.thread_inventory.length > 0) {
        sandboxCache!.thread_inventory = sandboxCache!.thread_inventory.map(item => {
          const defaultItem = DEFAULT_DB_STATE.thread_inventory.find(di => di.id === item.id) || {};
          return {
            purchase_bill_number: item.purchase_bill_number || defaultItem.purchase_bill_number || "PO-2026-001",
            purchase_date: item.purchase_date || defaultItem.purchase_date || "2026-06-01",
            number_of_cones: item.number_of_cones !== undefined ? item.number_of_cones : (item.qty_purchased !== undefined ? item.qty_purchased : 50),
            available_quantity: item.available_quantity !== undefined ? item.available_quantity : (item.qty_available !== undefined ? item.qty_available : 50),
            consumed_quantity: item.consumed_quantity !== undefined ? item.consumed_quantity : (item.qty_purchased !== undefined && item.qty_available !== undefined ? item.qty_purchased - item.qty_available : 14),
            remaining_quantity: item.remaining_quantity !== undefined ? item.remaining_quantity : (item.qty_available !== undefined ? item.qty_available : 36),
            ...item
          };
        });
        mutated = true;
      }

      if (!sandboxCache!.invoice_items) {
        sandboxCache!.invoice_items = [];
        mutated = true;
      }
      if (mutated) {
        fs.writeFileSync(SANDBOX_DB_PATH, JSON.stringify(sandboxCache, null, 2), "utf-8");
      }
    } else {
      sandboxCache = JSON.parse(JSON.stringify(DEFAULT_DB_STATE));
      fs.writeFileSync(SANDBOX_DB_PATH, JSON.stringify(sandboxCache, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("Error reading Sandbox DB file, recreating default template:", err);
    sandboxCache = JSON.parse(JSON.stringify(DEFAULT_DB_STATE));
  }

  return sandboxCache!;
}

// Sandbox database saver
function saveSandboxDB(data: DBStructure) {
  sandboxCache = data;
  try {
    fs.writeFileSync(SANDBOX_DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing to Sandbox Database file:", err);
  }
}

// Database Operations Wrapper
export const DB = {
  // Query entire table
  async queryAll<T>(tableName: keyof DBStructure): Promise<T[]> {
    const store = tenantStorage.getStore();
    const tenantId = store?.tenantId;
    const role = store?.role;
    const isAdmin = role === "admin";

    const mysql = getMySQLPool();
    if (mysql) {
      try {
        let q = `SELECT * FROM \`${tableName}\``;
        let p: any[] = [];
        if (!isAdmin && tenantId && tableName !== "users" && tableName !== "settings") {
          q += " WHERE user_id = ?";
          p.push(tenantId);
        }
        const [rows] = await mysql.query(q, p);
        return rows as T[];
      } catch (err) {
        console.error(`MySQL select all error on table ${tableName}, failing back to Sandbox`, err);
      }
    }

    const cache = loadSandboxDB();
    if (tableName === "settings") {
      // settings is an object in sandbox but should be queryable as array
      return [cache.settings] as any;
    }
    
    let list = (cache[tableName] || []) as any[];
    if (!isAdmin && tenantId && tableName !== "users") {
      list = list.filter(item => item.user_id === tenantId);
    }
    return list as T[];
  },

  // Query individual row by ID
  async queryById<T>(tableName: keyof DBStructure, id: number): Promise<T | null> {
    const store = tenantStorage.getStore();
    const tenantId = store?.tenantId;
    const role = store?.role;
    const isAdmin = role === "admin";

    const mysql = getMySQLPool();
    if (mysql) {
      try {
        let q = `SELECT * FROM \`${tableName}\` WHERE id = ?`;
        let p: any[] = [id];
        if (!isAdmin && tenantId && tableName !== "users" && tableName !== "settings") {
          q += " AND user_id = ?";
          p.push(tenantId);
        }
        const [rows] = await mysql.query(q, p);
        const list = rows as T[];
        return list.length > 0 ? list[0] : null;
      } catch (err) {
        console.error(`MySQL select by ID error on table ${tableName}, failing back to Sandbox`, err);
      }
    }

    const cache = loadSandboxDB();
    if (tableName === "settings") {
      return cache.settings as any;
    }
    let list = (cache[tableName] || []) as any[];
    if (!isAdmin && tenantId && tableName !== "users") {
      list = list.filter(item => item.user_id === tenantId);
    }
    const match = list.find((item) => item.id === id);
    return match || null;
  },

  // Insert a record
  async insertRecord<T>(tableName: keyof DBStructure, record: Partial<T>): Promise<any> {
    const tenantId = tenantStorage.getStore()?.tenantId;
    let finalRecord: any = { ...record };
    if (tenantId && tableName !== "users" && tableName !== "settings") {
       finalRecord.user_id = tenantId;
    }

    const mysql = getMySQLPool();
    if (mysql) {
      try {
        const keys = Object.keys(finalRecord);
        const values = Object.values(finalRecord);
        const placeholders = keys.map(() => "?").join(", ");
        const sql = `INSERT INTO \`${tableName}\` (${keys.map(k => `\`${k}\``).join(", ")}) VALUES (${placeholders})`;
        const [result] = await mysql.query(sql, values);
        const insertId = (result as any).insertId;
        return { id: insertId, ...finalRecord };
      } catch (err) {
        console.error(`MySQL insert error on table ${tableName}, failing back to Sandbox`, err);
      }
    }

    const cache = loadSandboxDB();
    const list = (cache[tableName] || []) as any[];
    const nextId = list.reduce((max, item) => ((item && item.id > max) ? item.id : max), 0) + 1;
    const newRecord = { id: nextId, ...finalRecord };
    
    list.push(newRecord);
    cache[tableName] = list;
    saveSandboxDB(cache);
    return newRecord;
  },

  // Update a record
  async updateRecord(tableName: keyof DBStructure, id: number, record: any): Promise<any> {
    const store = tenantStorage.getStore();
    const tenantId = store?.tenantId;
    const isAdmin = store?.role === "admin";
    
    // First, verify ownership
    if (!isAdmin && tenantId && tableName !== "users" && tableName !== "settings") {
       const existing = await this.queryById(tableName, id);
       if (!existing || (existing as any).user_id !== tenantId) {
         throw new Error("Unauthorized to access or modify this record.");
       }
    }

    const mysql = getMySQLPool();
    if (mysql) {
      try {
        const keys = Object.keys(record);
        const values = Object.values(record);
        const updateString = keys.map((key) => `\`${key}\` = ?`).join(", ");
        const sql = `UPDATE \`${tableName}\` SET ${updateString} WHERE id = ?`;
        await mysql.query(sql, [...values, id]);
        return { id, ...record };
      } catch (err) {
        console.error(`MySQL update error on table ${tableName}, failing back to Sandbox`, err);
      }
    }

    const cache = loadSandboxDB();
    if (tableName === "settings") {
      cache.settings = { ...cache.settings, ...record };
      saveSandboxDB(cache);
      return cache.settings;
    }

    const list = (cache[tableName] || []) as any[];
    const index = list.findIndex((item) => item.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...record };
      cache[tableName] = list;
      saveSandboxDB(cache);
      return list[index];
    }
    return null;
  },

  // Delete record
  async deleteRecord(tableName: keyof DBStructure, id: number): Promise<boolean> {
    const store = tenantStorage.getStore();
    const tenantId = store?.tenantId;
    const isAdmin = store?.role === "admin";
    
    // First, verify ownership
    if (!isAdmin && tenantId && tableName !== "users" && tableName !== "settings") {
       const existing = await this.queryById(tableName, id);
       if (!existing || (existing as any).user_id !== tenantId) {
         throw new Error("Unauthorized to access or delete this record.");
       }
    }

    const mysql = getMySQLPool();
    if (mysql) {
      try {
        const sql = `DELETE FROM \`${tableName}\` WHERE id = ?`;
        await mysql.query(sql, [id]);
        return true;
      } catch (err) {
        console.error(`MySQL delete error on table ${tableName}, failing back to Sandbox`, err);
      }
    }

    const cache = loadSandboxDB();
    const list = (cache[tableName] || []) as any[];
    const originalLength = list.length;
    const filtered = list.filter((item) => item.id !== id);
    if (filtered.length !== originalLength) {
      cache[tableName] = filtered;
      saveSandboxDB(cache);
      return true;
    }
    return false;
  },

  // Specific settings save
  async getSettings(): Promise<any> {
    const mysql = getMySQLPool();
    if (mysql) {
      try {
        const [rows] = await mysql.query(`SELECT * FROM \`settings\` LIMIT 1`);
        const list = rows as any[];
        if (list.length > 0) return list[0];
        // If empty in mysql, insert default
        const defaultSet = DEFAULT_DB_STATE.settings;
        const keys = Object.keys(defaultSet);
        const values = Object.values(defaultSet);
        const placeholders = keys.map(() => "?").join(", ");
        const sql = `INSERT INTO \`settings\` (${keys.map(k => `\`${k}\``).join(", ")}) VALUES (${placeholders})`;
        await mysql.query(sql, values);
        return defaultSet;
      } catch (err) {
        console.error("MySQL settings select error, falling back to Sandbox", err);
      }
    }
    const cache = loadSandboxDB();
    return cache.settings;
  },

  async updateSettings(settingsData: any): Promise<any> {
    const mysql = getMySQLPool();
    if (mysql) {
      try {
        const keys = Object.keys(settingsData);
        const values = Object.values(settingsData);
        const updateString = keys.map((key) => `\`${key}\` = ?`).join(", ");
        const sql = `UPDATE \`settings\` SET ${updateString} LIMIT 1`;
        await mysql.query(sql, values);
        return settingsData;
      } catch (err) {
        console.error("MySQL settings update error, falling back to Sandbox", err);
      }
    }
    const cache = loadSandboxDB();
    cache.settings = { ...cache.settings, ...settingsData };
    saveSandboxDB(cache);
    return cache.settings;
  }
};
