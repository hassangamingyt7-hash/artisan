/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import "dotenv/config";

import express, { Request, Response, NextFunction } from "express";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { DB } from "./src/db/dbEngine.ts";
import { initMySQLDB } from "./src/db/migrate.ts";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "ARTISAN_SUPER_SECRET_ERP_JWT_TOKEN_2026";

// Middlewares
app.use(express.json());

// Express Security headers simulation (XSS/Clickjacking)
app.use((req, res, next) => {
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Authentication Middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: "admin" | "manager" | "accountant";
    name: string;
  };
}

const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
      if (err) {
        res.status(403).json({ error: "Invalid or expired session token. Please login again." });
        return;
      }
      req.user = decoded;
      next();
    });
  } else {
    res.status(401).json({ error: "Access denied. Authenication token is missing." });
  }
};

// Role-Based Access Control Guards
const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized access" });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: `Permissions denied. This function requires [${allowedRoles.join(", ")}] roles.` });
      return;
    }
    next();
  };
};

// =========================================================================
// AUTHENTICATION ENDPOINTS
// =========================================================================

app.post("/api/auth/login", async (req: Request, res: Response) => {
  const { email, username, password } = req.body;
  const loginIdentifier = email || username;
  if (!loginIdentifier || !password) {
    res.status(400).json({ error: "Username or Email and password are required fields." });
    return;
  }

  try {
    const users = await DB.queryAll<any>("users");
    const user = users.find((u) => {
      const emailLower = (u.email || "").toLowerCase();
      const idLower = loginIdentifier.toLowerCase();
      return (
        emailLower === idLower ||
        emailLower.split("@")[0] === idLower ||
        (u.role || "").toLowerCase() === idLower ||
        (u.name || "").toLowerCase() === idLower
      );
    });

    if (!user) {
      res.status(401).json({ error: "Invalid credentials or password." });
      return;
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid credentials or password." });
      return;
    }

    // Sign jwt token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: "Server login error: " + err.message });
  }
});

app.post("/api/auth/change-password", authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    res.status(400).json({ error: "Both current and new passwords must be provided." });
    return;
  }

  try {
    const user = await DB.queryById<any>("users", req.user!.id);
    if (!user) {
      res.status(404).json({ error: "User profile not found." });
      return;
    }

    const isMatch = bcrypt.compareSync(oldPassword, user.password);
    if (!isMatch) {
      res.status(400).json({ error: "The standard active password entered is incorrect." });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);

    await DB.updateRecord("users", user.id, { password: newHash });
    res.json({ status: "success", message: "Password updated successfully!" });
  } catch (err: any) {
    res.status(500).json({ error: "Error changing password: " + err.message });
  }
});

// =========================================================================
// DASHBOARD STATS ENDPOINT
// =========================================================================

const handleGetDashboardStats = async (req: Request, res: Response) => {
  try {
    const customers = await DB.queryAll<any>("customers");
    const suppliers = await DB.queryAll<any>("suppliers");
    const threads = await DB.queryAll<any>("thread_inventory");
    const expenses = await DB.queryAll<any>("expenses");
    const orders = await DB.queryAll<any>("orders");
    const invoices = await DB.queryAll<any>("invoices");
    const payments = await DB.queryAll<any>("payments");
    const receivables = await DB.queryAll<any>("receivables");
    const payables = await DB.queryAll<any>("payables");
    const purchases = await DB.queryAll<any>("purchases");

    // Recalculate ledger values on the fly to guarantee ultimate precision
    const totalReceivables = receivables.reduce((sum, r) => sum + (Number(r.balance_remaining) || 0), 0);
    const totalPayables = payables.reduce((sum, p) => sum + (Number(p.balance) || 0), 0);
    
    // Revenue is calculated as sum of grand_total of all invoices in current month/fiscal
    const monthlyRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
    const monthlyExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

    const outstandingInvoicesCount = receivables.filter((r) => Number(r.balance_remaining) > 0).length;
    const pendingSupplierPaymentsCount = payables.filter((p) => Number(p.balance) > 0).length;

    // Inventory Calculations
    const totalThreadStock = threads.reduce((sum, t) => sum + (Number(t.qty_available) || 0), 0);
    const lowStockAlertsCount = threads.filter((t) => Number(t.qty_available) < 10).length;
    const lowStockList = threads.filter((t) => Number(t.qty_available) < 10);

    // Recent consumption simulations
    const recentConsumption = [
      { shade_code: "MA-01", shade_name: "Midnight Anthracite", quantity: 5, date: "2026-06-18" },
      { shade_code: "CR-08", shade_name: "Crimson Royal Red", quantity: 12, date: "2026-06-17" },
      { shade_code: "EM-23", shade_name: "Emerald Jungle", quantity: 2, date: "2026-06-15" }
    ];

    // Order statistics
    const totalOrders = orders.length;
    const runningOrders = orders.filter((o) => o.status === "Running").length;
    const completedOrders = orders.filter((o) => o.status === "Completed").length;
    const deliveredOrders = orders.filter((o) => o.status === "Delivered").length;

    // Build charts data
    // Sales and expenses monthly grouping for 2026
    const monthlySalesChart = [
      { month: "Jan", sales: 120000, expenses: 80000 },
      { month: "Feb", sales: 150000, expenses: 95000 },
      { month: "Mar", sales: 180000, expenses: 110000 },
      { month: "Apr", sales: 210000, expenses: 130000 },
      { month: "May", sales: 250000, expenses: 140000 },
      { month: "Jun", sales: monthlyRevenue, expenses: monthlyExpenses },
    ];

    res.json({
      financials: {
        totalReceivables,
        totalPayables,
        monthlyRevenue,
        monthlyExpenses,
        outstandingInvoicesCount,
        pendingSupplierPaymentsCount,
        monthlySalesChart
      },
      inventory: {
        totalThreadStock,
        lowStockAlertsCount,
        recentPurchases: purchases.slice(0, 5),
        recentConsumption,
        lowStockList
      },
      production: {
        totalOrders,
        runningOrders,
        completedOrders,
        deliveredOrders,
        ordersList: orders.slice(0, 7)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: "Error compiling dashboard statistics: " + err.message });
  }
};

app.get("/api/dashboard/stats", authenticateJWT, handleGetDashboardStats);
app.get("/api/dashboard-stats", authenticateJWT, handleGetDashboardStats);

// =========================================================================
// CUSTOMER MANAGEMENT
// =========================================================================

app.get("/api/customers", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const list = await DB.queryAll<any>("customers");
    const receivables = await DB.queryAll<any>("receivables");

    // Add aggregate ledger balance dynamically
    const enrichedList = list.map((cust) => {
      const custReceivables = receivables.filter((r) => r.customer_id === cust.id);
      const outstanding = custReceivables.reduce((sum, r) => sum + (Number(r.balance_remaining) || 0), 0);
      return { ...cust, outstanding_balance: outstanding };
    });

    res.json(enrichedList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/customers", authenticateJWT, authorizeRoles("admin", "manager"), async (req: Request, res: Response) => {
  try {
    const result = await DB.insertRecord("customers", req.body);
    res.status(210).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/customers/:id", authenticateJWT, authorizeRoles("admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await DB.updateRecord("customers", id, req.body);
    if (!result) return res.status(404).json({ error: "Customer not found" }) as any;
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/customers/:id", authenticateJWT, authorizeRoles("admin"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const success = await DB.deleteRecord("customers", id);
    if (!success) return res.status(404).json({ error: "Customer not found" }) as any;
    res.json({ message: "Customer deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Customer Ledger detail API
app.get("/api/customers/:id/ledger", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const customer = await DB.queryById<any>("customers", id);
    if (!customer) return res.status(404).json({ error: "Customer not found" }) as any;

    const invoices = await DB.queryAll<any>("invoices");
    const payments = await DB.queryAll<any>("payments");

    const custInvoices = invoices.filter((inv) => inv.customer_id === id);
    const custPayments = payments.filter((pay) => pay.type === "receipt" && pay.entity_type === "customer" && pay.entity_id === id);

    // Stitch ledger timelines
    const ledger: any[] = [];
    
    custInvoices.forEach((inv) => {
      ledger.push({
        date: inv.invoice_date,
        type: "Invoice",
        reference: inv.invoice_number,
        debit: Number(inv.grand_total),
        credit: 0,
        description: inv.notes || "Tax Invoice generated"
      });
    });

    custPayments.forEach((pay) => {
      ledger.push({
        date: pay.payment_date,
        type: "Receipt",
        reference: pay.reference_number || `PMT-${pay.id}`,
        debit: 0,
        credit: Number(pay.amount),
        description: pay.notes || `Received via ${pay.payment_method}`
      });
    });

    // Sort by date
    ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Compute running balance
    let balance = 0;
    const ledgerWithBalance = ledger.map((item) => {
      balance += (item.debit - item.credit);
      return { ...item, balance };
    });

    res.json({
      customer,
      outstanding_balance: balance,
      ledger: ledgerWithBalance
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// BRAND MANAGEMENT
// =========================================================================

app.get("/api/brands", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const list = await DB.queryAll<any>("brands");
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/brands", authenticateJWT, authorizeRoles("admin", "manager"), async (req: Request, res: Response) => {
  try {
    const result = await DB.insertRecord("brands", req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/brands/:id", authenticateJWT, authorizeRoles("admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await DB.updateRecord("brands", id, req.body);
    if (!result) return res.status(404).json({ error: "Brand not found" }) as any;
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/brands/:id", authenticateJWT, authorizeRoles("admin"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const success = await DB.deleteRecord("brands", id);
    if (!success) return res.status(404).json({ error: "Brand not found" }) as any;
    res.json({ message: "Brand deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// SUPPLIER MANAGEMENT
// =========================================================================

app.get("/api/suppliers", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const list = await DB.queryAll<any>("suppliers");
    const payables = await DB.queryAll<any>("payables");

    const enrichedList = list.map((supp) => {
      const suppPayables = payables.filter((p) => p.supplier_id === supp.id);
      const outstanding = suppPayables.reduce((sum, p) => sum + (Number(p.balance) || 0), 0);
      return { ...supp, outstanding_payables: outstanding };
    });

    res.json(enrichedList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/suppliers", authenticateJWT, authorizeRoles("admin", "manager"), async (req: Request, res: Response) => {
  try {
    const result = await DB.insertRecord("suppliers", req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/suppliers/:id", authenticateJWT, authorizeRoles("admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await DB.updateRecord("suppliers", id, req.body);
    if (!result) return res.status(404).json({ error: "Supplier not found" }) as any;
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/suppliers/:id", authenticateJWT, authorizeRoles("admin"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const success = await DB.deleteRecord("suppliers", id);
    if (!success) return res.status(404).json({ error: "Supplier not found" }) as any;
    res.json({ message: "Supplier deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/suppliers/:id/ledger", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const supplier = await DB.queryById<any>("suppliers", id);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" }) as any;

    const purchases = await DB.queryAll<any>("purchases");
    const payments = await DB.queryAll<any>("payments");

    const suppPurchases = purchases.filter((po) => po.supplier_id === id);
    const suppPayments = payments.filter((pay) => pay.type === "payment" && pay.entity_type === "supplier" && pay.entity_id === id);

    const ledger: any[] = [];
    
    suppPurchases.forEach((po) => {
      ledger.push({
        date: po.purchase_date,
        type: "Purchase Bill",
        reference: po.purchase_number,
        credit: Number(po.total_cost), // Supplier ledger credit increases our liability
        debit: 0,
        description: po.product_name
      });
    });

    suppPayments.forEach((pay) => {
      ledger.push({
        date: pay.payment_date,
        type: "Disbursement",
        reference: pay.reference_number || `DISB-${pay.id}`,
        credit: 0,
        debit: Number(pay.amount), // Supplier ledger debit reduces our liability
        description: pay.notes || `Paid via ${pay.payment_method}`
      });
    });

    ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = 0;
    const ledgerWithBalance = ledger.map((item) => {
      balance += (item.credit - item.debit); // Credit increases what we owe
      return { ...item, balance };
    });

    res.json({
      supplier,
      outstanding_payables: balance,
      ledger: ledgerWithBalance
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// THREAD INVENTORY / GENERAL INVENTORY MANAGEMENT
// =========================================================================

const handleGetInventory = async (req: Request, res: Response) => {
  try {
    const threads = await DB.queryAll<any>("thread_inventory");
    const suppliers = await DB.queryAll<any>("suppliers");

    const enriched = threads.map((item) => {
      const s = suppliers.find((supplier) => supplier.id === Number(item.supplier_id));
      return { ...item, supplier_name: s ? s.name : "N/A" };
    });

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

const handlePostInventory = async (req: Request, res: Response) => {
  try {
    const payload = {
      ...req.body,
      total_cost: Number(req.body.qty_purchased) * Number(req.body.cost_per_cone),
      qty_available: req.body.qty_available !== undefined ? Number(req.body.qty_available) : Number(req.body.qty_purchased)
    };
    const result = await DB.insertRecord("thread_inventory", payload);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

const handlePutInventory = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await DB.queryById<any>("thread_inventory", id);
    if (!existing) return res.status(404).json({ error: "Inventory item not found" }) as any;

    const qty_purchased = req.body.qty_purchased !== undefined ? Number(req.body.qty_purchased) : existing.qty_purchased;
    const cost_per_cone = req.body.cost_per_cone !== undefined ? Number(req.body.cost_per_cone) : existing.cost_per_cone;

    const payload = {
      ...req.body,
      total_cost: qty_purchased * cost_per_cone
    };

    const result = await DB.updateRecord("thread_inventory", id, payload);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

const handleDeleteInventory = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const success = await DB.deleteRecord("thread_inventory", id);
    if (!success) return res.status(404).json({ error: "Item not found" }) as any;
    res.json({ message: "Inventory record deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

app.get("/api/thread-inventory", authenticateJWT, handleGetInventory);
app.get("/api/inventory", authenticateJWT, handleGetInventory);

app.post("/api/thread-inventory", authenticateJWT, authorizeRoles("admin", "manager"), handlePostInventory);
app.post("/api/inventory", authenticateJWT, authorizeRoles("admin", "manager"), handlePostInventory);

app.put("/api/thread-inventory/:id", authenticateJWT, authorizeRoles("admin", "manager"), handlePutInventory);
app.put("/api/inventory/:id", authenticateJWT, authorizeRoles("admin", "manager"), handlePutInventory);

app.delete("/api/thread-inventory/:id", authenticateJWT, authorizeRoles("admin"), handleDeleteInventory);
app.delete("/api/inventory/:id", authenticateJWT, authorizeRoles("admin"), handleDeleteInventory);


// =========================================================================
// THREAD STOCK LEDGER & CONSUMPTION MANAGEMENT
// =========================================================================

app.get("/api/thread-stock-ledger", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const list = await DB.queryAll<any>("thread_stock_ledger");
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/thread-consumption", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const list = await DB.queryAll<any>("thread_consumption");
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/thread-consumption", authenticateJWT, authorizeRoles("admin", "manager"), async (req: Request, res: Response) => {
  try {
    const { date, shade_code, shade_name, quantity_consumed, order_id, order_number, notes } = req.body;
    const qty = Number(quantity_consumed);

    if (qty <= 0) {
      return res.status(400).json({ error: "Quantity consumed must be greater than zero." });
    }

    // Find and update thread inventory
    const inventory = await DB.queryAll<any>("thread_inventory");
    const thread = inventory.find((ti) => ti.shade_code.toLowerCase().trim() === shade_code.toLowerCase().trim());

    if (!thread) {
      return res.status(404).json({ error: `Shade code "${shade_code}" is not in thread inventory.` });
    }

    const currentAvailable = thread.available_quantity || thread.qty_available || 0;
    if (currentAvailable < qty) {
      return res.status(400).json({ error: `Insufficient stock! Only ${currentAvailable} cones available; cannot consume ${qty} cones.` });
    }

    const updatedRemaining = currentAvailable - qty;
    const updatedConsumed = (thread.consumed_quantity || 0) + qty;

    await DB.updateRecord("thread_inventory", thread.id, {
      qty_available: updatedRemaining,
      available_quantity: updatedRemaining,
      remaining_quantity: updatedRemaining,
      consumed_quantity: updatedConsumed
    });

    // Create thread consumption log
    const consumption = await DB.insertRecord("thread_consumption", {
      date,
      shade_code,
      shade_name,
      quantity_consumed: qty,
      order_id: order_id ? Number(order_id) : null,
      order_number: order_number || "",
      notes: notes || ""
    });

    // Create stock ledger trail
    await DB.insertRecord("thread_stock_ledger", {
      date,
      type: "Consumption",
      shade_code,
      shade_name,
      qty_in: 0,
      qty_out: qty,
      balance: updatedRemaining,
      reference_no: order_number ? `Order: ${order_number}` : "Manual Consumption"
    });

    res.status(201).json(consumption);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/thread-consumption/:id", authenticateJWT, authorizeRoles("admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const consumptions = await DB.queryAll<any>("thread_consumption");
    const consumption = consumptions.find((c) => c.id === id);

    if (!consumption) {
      return res.status(404).json({ error: "Consumption entry not found" });
    }

    // Restore stock
    const inventory = await DB.queryAll<any>("thread_inventory");
    const thread = inventory.find((ti) => ti.shade_code.toLowerCase().trim() === consumption.shade_code.toLowerCase().trim());

    if (thread) {
      const currentAvailable = thread.available_quantity || thread.qty_available || 0;
      const updatedRemaining = currentAvailable + Number(consumption.quantity_consumed);
      const updatedConsumed = Math.max(0, (thread.consumed_quantity || 0) - Number(consumption.quantity_consumed));

      await DB.updateRecord("thread_inventory", thread.id, {
        qty_available: updatedRemaining,
        available_quantity: updatedRemaining,
        remaining_quantity: updatedRemaining,
        consumed_quantity: updatedConsumed
      });
    }

    const success = await DB.deleteRecord("thread_consumption", id);
    if (!success) return res.status(404).json({ error: "Error deleting consumption record" });

    // Clean up ledger entries representing this consumption
    const ledgers = await DB.queryAll<any>("thread_stock_ledger");
    const matchingLedgers = ledgers.filter(
      (l) => l.type === "Consumption" && 
             l.shade_code.toLowerCase().trim() === consumption.shade_code.toLowerCase().trim() && 
             l.qty_out === consumption.quantity_consumed &&
             l.date === consumption.date
    );

    if (matchingLedgers.length > 0) {
      await DB.deleteRecord("thread_stock_ledger", matchingLedgers[0].id);
    }

    res.json({ message: "Consumption deleted successfully, stock restored." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// PURCHASE MANAGEMENT
// =========================================================================

// Helper to reverse inventory & ledger impact of a purchase
async function reversePurchaseImpact(purchaseId: number) {
  const purchaseItems = await DB.queryAll<any>("purchase_items");
  const oldItems = purchaseItems.filter((pi) => pi.purchase_id === purchaseId);
  const inventoryList = await DB.queryAll<any>("thread_inventory");

  for (const oldItem of oldItems) {
    const thread = inventoryList.find((item) => item.shade_code.toLowerCase().trim() === oldItem.shade_code.toLowerCase().trim());
    if (thread) {
      const updatedPurchased = Math.max(0, (thread.number_of_cones || thread.qty_purchased || 0) - oldItem.cones);
      const updatedAvailable = Math.max(0, (thread.available_quantity || thread.qty_available || 0) - oldItem.cones);
      const updatedTotalCost = Math.max(0, (thread.total_cost || 0) - (oldItem.cones * oldItem.rate));
      
      await DB.updateRecord("thread_inventory", thread.id, {
        qty_purchased: updatedPurchased,
        qty_available: updatedAvailable,
        number_of_cones: updatedPurchased,
        available_quantity: updatedAvailable,
        remaining_quantity: updatedAvailable,
        total_cost: updatedTotalCost
      });
    }
    await DB.deleteRecord("purchase_items", oldItem.id);
  }

  const ledgerEntries = await DB.queryAll<any>("thread_stock_ledger");
  const matchingLedgers = ledgerEntries.filter((l) => l.purchase_id === purchaseId && l.type === "Purchase");
  for (const ledger of matchingLedgers) {
    await DB.deleteRecord("thread_stock_ledger", ledger.id);
  }
}

// Helper to apply purchase items to inventory and ledger
async function applyPurchaseImpact(purchase: any, items: any[]) {
  const inventoryList = await DB.queryAll<any>("thread_inventory");
  const suppliers = await DB.queryAll<any>("suppliers");
  const s = suppliers.find((supp) => supp.id === Number(purchase.supplier_id));
  const supplierName = s ? s.name : "N/A";

  for (const it of items) {
    const cones = Number(it.cones);
    const rate = Number(it.rate);
    const total_amount = cones * rate;

    // Save purchase_items record
    await DB.insertRecord("purchase_items", {
      purchase_id: purchase.id,
      shade_code: it.shade_code,
      shade_name: it.shade_name,
      cones,
      rate,
      total_amount
    });

    const thread = inventoryList.find((item) => item.shade_code.toLowerCase().trim() === it.shade_code.toLowerCase().trim());
    let finalAvailable = cones;

    if (thread) {
      const updatedPurchased = (thread.number_of_cones || thread.qty_purchased || 0) + cones;
      const updatedAvailable = (thread.available_quantity || thread.qty_available || 0) + cones;
      const updatedTotalCost = (thread.total_cost || 0) + total_amount;

      await DB.updateRecord("thread_inventory", thread.id, {
        qty_purchased: updatedPurchased,
        qty_available: updatedAvailable,
        number_of_cones: updatedPurchased,
        available_quantity: updatedAvailable,
        remaining_quantity: updatedAvailable,
        total_cost: updatedTotalCost,
        purchase_date: purchase.purchase_date,
        purchase_bill_number: purchase.purchase_number,
        supplier_id: Number(purchase.supplier_id),
        cost_per_cone: rate
      });

      finalAvailable = updatedAvailable;
    } else {
      await DB.insertRecord("thread_inventory", {
        shade_code: it.shade_code,
        shade_name: it.shade_name,
        brand: "General Thread",
        supplier_id: Number(purchase.supplier_id),
        purchase_date: purchase.purchase_date,
        qty_purchased: cones,
        qty_available: cones,
        unit: "Cones",
        cost_per_cone: rate,
        total_cost: total_amount,
        purchase_bill_number: purchase.purchase_number,
        number_of_cones: cones,
        available_quantity: cones,
        consumed_quantity: 0,
        remaining_quantity: cones
      });
      finalAvailable = cones;
    }

    // Write to Stock Ledger
    await DB.insertRecord("thread_stock_ledger", {
      date: purchase.purchase_date,
      type: "Purchase",
      supplier_id: Number(purchase.supplier_id),
      supplier_name: supplierName,
      purchase_id: purchase.id,
      purchase_number: purchase.purchase_number,
      shade_code: it.shade_code,
      shade_name: it.shade_name,
      qty_in: cones,
      qty_out: 0,
      balance: finalAvailable
    });
  }
}

app.get("/api/purchases", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const list = await DB.queryAll<any>("purchases");
    const suppliers = await DB.queryAll<any>("suppliers");
    const items = await DB.queryAll<any>("purchase_items");

    const enriched = list.map((item) => {
      const s = suppliers.find((supp) => supp.id === Number(item.supplier_id));
      const purchaseItems = items.filter((pi) => pi.purchase_id === item.id);
      return { 
        ...item, 
        supplier_name: s ? s.name : "N/A",
        items: purchaseItems
      };
    });

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/purchases", authenticateJWT, authorizeRoles("admin", "manager", "accountant"), async (req: Request, res: Response) => {
  try {
    const { supplier_id, total_cost, purchase_number, purchase_date, payment_status, items } = req.body;
    
    // Insert purchase bill
    const purchase = await DB.insertRecord("purchases", {
      supplier_id: Number(supplier_id),
      total_cost: Number(total_cost),
      purchase_number,
      purchase_date,
      payment_status,
      product_name: req.body.product_name,
      quantity: req.body.quantity,
      unit: req.body.unit || "Cones",
      unit_cost: req.body.unit_cost
    });

    // Handle items
    const purchaseItems = items || [];
    await applyPurchaseImpact(purchase, purchaseItems);

    // Dynamic ledger update: creates outstanding payables record automatically
    const isPaid = payment_status === "Paid";
    const balance = isPaid ? 0 : Number(total_cost);
    const paid_amount = isPaid ? Number(total_cost) : 0;

    await DB.insertRecord("payables", {
      supplier_id: Number(supplier_id),
      purchase_id: purchase.id,
      amount: Number(total_cost),
      paid_amount,
      balance,
      due_date: purchase_date
    });

    res.status(201).json(purchase);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/purchases/:id", authenticateJWT, authorizeRoles("admin", "manager", "accountant"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { supplier_id, total_cost, purchase_number, purchase_date, payment_status, items } = req.body;

    // First reverse old items impact
    await reversePurchaseImpact(id);

    // Update parent purchase record
    const result = await DB.updateRecord("purchases", id, {
      supplier_id: Number(supplier_id),
      total_cost: Number(total_cost),
      purchase_number,
      purchase_date,
      payment_status,
      product_name: req.body.product_name,
      quantity: req.body.quantity,
      unit: req.body.unit || "Cones",
      unit_cost: req.body.unit_cost
    });

    if (!result) return res.status(404).json({ error: "Purchase record not found" }) as any;

    // Apply new items impact
    const purchaseItems = items || [];
    await applyPurchaseImpact({ id, ...req.body }, purchaseItems);

    // Update corresponding payables record
    const payables = await DB.queryAll<any>("payables");
    const item = payables.find((p) => p.purchase_id === id);
    if (item) {
      const isPaid = payment_status === "Paid";
      const isPartial = payment_status === "Partial";
      
      let balance = Number(total_cost);
      let paid_amount = 0;
      if (isPaid) {
        balance = 0;
        paid_amount = Number(total_cost);
      } else if (isPartial) {
        paid_amount = Number(total_cost) / 2; // Simulated partial
        balance = Number(total_cost) - paid_amount;
      }

      await DB.updateRecord("payables", item.id, {
        supplier_id: Number(supplier_id),
        amount: Number(total_cost),
        paid_amount,
        balance,
        due_date: purchase_date
      });
    }

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/purchases/:id", authenticateJWT, authorizeRoles("admin"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    // Reverse old items impact first!
    await reversePurchaseImpact(id);

    const success = await DB.deleteRecord("purchases", id);
    if (!success) return res.status(404).json({ error: "Item not found" }) as any;

    // Remove matching payables
    const payables = await DB.queryAll<any>("payables");
    const item = payables.find((p) => p.purchase_id === id);
    if (item) {
      await DB.deleteRecord("payables", item.id);
    }

    res.json({ message: "Purchase record deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// EXPENSE MANAGEMENT
// =========================================================================

app.get("/api/expenses", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const list = await DB.queryAll<any>("expenses");
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/expenses", authenticateJWT, authorizeRoles("admin", "manager", "accountant"), async (req: Request, res: Response) => {
  try {
    const result = await DB.insertRecord("expenses", req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/expenses/:id", authenticateJWT, authorizeRoles("admin", "manager", "accountant"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await DB.updateRecord("expenses", id, req.body);
    if (!result) return res.status(404).json({ error: "Expense not found" }) as any;
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/expenses/:id", authenticateJWT, authorizeRoles("admin"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const success = await DB.deleteRecord("expenses", id);
    if (!success) return res.status(404).json({ error: "Expense not found" }) as any;
    res.json({ message: "Expense record deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// ORDER MANAGEMENT
// =========================================================================

app.get("/api/orders", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const orders = await DB.queryAll<any>("orders");
    const brands = await DB.queryAll<any>("brands");

    const enriched = orders.map((o) => {
      const b = brands.find((brand) => brand.id === Number(o.brand_id));
      return { ...o, brand_name: b ? b.name : "N/A" };
    });

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders", authenticateJWT, authorizeRoles("admin", "manager"), async (req: Request, res: Response) => {
  try {
    const payload = {
      ...req.body,
      total_amount: Number(req.body.quantity) * Number(req.body.rate)
    };
    const result = await DB.insertRecord("orders", payload);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/orders/:id", authenticateJWT, authorizeRoles("admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await DB.queryById<any>("orders", id);
    if (!existing) return res.status(404).json({ error: "Order not found" }) as any;

    const quantity = req.body.quantity !== undefined ? Number(req.body.quantity) : existing.quantity;
    const rate = req.body.rate !== undefined ? Number(req.body.rate) : existing.rate;

    const payload = {
      ...req.body,
      total_amount: quantity * rate
    };

    const result = await DB.updateRecord("orders", id, payload);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/orders/:id", authenticateJWT, authorizeRoles("admin"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const success = await DB.deleteRecord("orders", id);
    if (!success) return res.status(404).json({ error: "Order not found" }) as any;
    res.json({ message: "Order records deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// INVOICES & GENERATION
// =========================================================================

app.get("/api/invoices", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const list = await DB.queryAll<any>("invoices");
    const brands = await DB.queryAll<any>("brands");
    const customers = await DB.queryAll<any>("customers");

    const enriched = list.map((item) => {
      const b = brands.find((brand) => brand.id === Number(item.brand_id));
      const c = customers.find((cust) => cust.id === Number(item.customer_id));
      return {
        ...item,
        brand_name: b ? b.name : "N/A",
        customer_name: c ? c.name : "N/A"
      };
    });

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/invoices", authenticateJWT, authorizeRoles("admin", "manager", "accountant"), async (req: Request, res: Response) => {
  try {
    const { brand_id, customer_id, invoice_date, total_amount, tax_rate, tax_amount, grand_total } = req.body;
    
    let resolved_customer_id = Number(customer_id);
    if (!resolved_customer_id && brand_id) {
      const brand = await DB.queryById<any>("brands", Number(brand_id));
      if (brand) {
        const customers = await DB.queryAll<any>("customers");
        const matchingCust = customers.find(c => c.name.toLowerCase() === brand.name.toLowerCase() || c.id === brand.id);
        resolved_customer_id = matchingCust ? matchingCust.id : (customers[0]?.id || 1);
      } else {
        resolved_customer_id = 1;
      }
    } else if (!resolved_customer_id) {
      resolved_customer_id = 1;
    }

    const resolved_grand_total = grand_total !== undefined ? Number(grand_total) : Number(total_amount);

    // Automatically auto-increment Custom Invoice Number based on records
    const list = await DB.queryAll<any>("invoices");
    const settings = await DB.getSettings();
    const nextNum = list.reduce((max, item) => {
      const split = item.invoice_number.split("-");
      const num = parseInt(split[split.length - 1], 10);
      return num > max ? num : max;
    }, 1000) + 1;

    const invoice_number = `${settings.invoice_prefix || "ART8"}-2026-${nextNum}`;

    const invoicePayload = {
      ...req.body,
      customer_id: resolved_customer_id,
      grand_total: resolved_grand_total,
      invoice_number,
      items: typeof req.body.items === "string" ? req.body.items : JSON.stringify(req.body.items)
    };

    const invoice = await DB.insertRecord("invoices", invoicePayload);

    // Auto-journal entry to Receivables!
    await DB.insertRecord("receivables", {
      customer_id: resolved_customer_id,
      invoice_id: invoice.id,
      amount: resolved_grand_total,
      amount_received: 0,
      balance_remaining: resolved_grand_total,
      due_date: invoice_date
    });

    res.status(201).json(invoice);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/invoices/:id", authenticateJWT, authorizeRoles("admin"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const success = await DB.deleteRecord("invoices", id);
    if (!success) return res.status(404).json({ error: "Invoice not found" }) as any;

    // Delete corresponding receivables journal
    const receivables = await DB.queryAll<any>("receivables");
    const item = receivables.find((r) => r.invoice_id === id);
    if (item) {
      await DB.deleteRecord("receivables", item.id);
    }

    res.json({ message: "Invoice deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/invoices/:id", authenticateJWT, authorizeRoles("admin", "manager", "accountant"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await DB.queryById<any>("invoices", id);
    if (!existing) return res.status(404).json({ error: "Invoice not found" }) as any;

    const { brand_id, customer_id, total_amount, grand_total } = req.body;

    let resolved_customer_id = customer_id !== undefined ? Number(customer_id) : existing.customer_id;
    if (!resolved_customer_id && brand_id) {
      const brand = await DB.queryById<any>("brands", Number(brand_id));
      if (brand) {
        const customers = await DB.queryAll<any>("customers");
        const matchingCust = customers.find(c => c.name.toLowerCase() === brand.name.toLowerCase() || c.id === brand.id);
        resolved_customer_id = matchingCust ? matchingCust.id : (customers[0]?.id || 1);
      }
    }
    if (!resolved_customer_id) {
      resolved_customer_id = existing.customer_id || 1;
    }

    const resolved_grand_total = grand_total !== undefined ? Number(grand_total) : (total_amount !== undefined ? Number(total_amount) : existing.grand_total || existing.total_amount);

    const payload = {
      ...req.body,
      customer_id: resolved_customer_id,
      grand_total: resolved_grand_total,
      items: req.body.items !== undefined ? (typeof req.body.items === "string" ? req.body.items : JSON.stringify(req.body.items)) : existing.items
    };

    const result = await DB.updateRecord("invoices", id, payload);

    // Update corresponding receivables journal
    const receivables = await DB.queryAll<any>("receivables");
    const item = receivables.find((r) => r.invoice_id === id);
    if (item) {
      const amount = resolved_grand_total;
      const due_date = req.body.invoice_date !== undefined ? req.body.invoice_date : item.due_date;
      
      await DB.updateRecord("receivables", item.id, {
        customer_id: resolved_customer_id,
        amount,
        balance_remaining: amount - (item.amount_received || 0),
        due_date
      });
    }

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});


// =========================================================================
// ACCOUNTS PAYABLE & ACCOUNTS RECEIVABLE MODULE - LEDGERS / MANUAL PAYMENTS
// =========================================================================

app.get("/api/receivables", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const rx = await DB.queryAll<any>("receivables");
    const customers = await DB.queryAll<any>("customers");
    const invoices = await DB.queryAll<any>("invoices");

    const enriched = rx.map((item) => {
      const c = customers.find((cust) => cust.id === Number(item.customer_id));
      const i = invoices.find((inv) => inv.id === Number(item.invoice_id));
      return {
        ...item,
        customer_name: c ? c.name : "N/A",
        invoice_number: i ? i.invoice_number : "N/A",
        invoice_date: i ? i.invoice_date : "N/A"
      };
    });

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/payables", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const px = await DB.queryAll<any>("payables");
    const suppliers = await DB.queryAll<any>("suppliers");
    const purchases = await DB.queryAll<any>("purchases");

    const enriched = px.map((item) => {
      const s = suppliers.find((supp) => supp.id === Number(item.supplier_id));
      const p = purchases.find((po) => po.id === Number(item.purchase_id));
      return {
        ...item,
        supplier_name: s ? s.name : "N/A",
        purchase_number: p ? p.purchase_number : "N/A",
        purchase_date: p ? p.purchase_date : "N/A"
      };
    });

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Central core Payments module
app.get("/api/payments", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const payments = await DB.queryAll<any>("payments");
    const customers = await DB.queryAll<any>("customers");
    const suppliers = await DB.queryAll<any>("suppliers");

    const enriched = payments.map((item) => {
      let name = "N/A";
      if (item.entity_type === "customer") {
        const c = customers.find((x) => x.id === Number(item.entity_id));
        if (c) name = c.name;
      } else if (item.entity_type === "supplier") {
        const s = suppliers.find((x) => x.id === Number(item.entity_id));
        if (s) name = s.name;
      }
      return { ...item, entity_name: name };
    });

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payments", authenticateJWT, authorizeRoles("admin", "manager", "accountant"), async (req: Request, res: Response) => {
  try {
    const { type, entity_type, entity_id, amount, payment_date, payment_method, reference_number, notes } = req.body;
    const payment = await DB.insertRecord("payments", req.body);

    const payAmountNum = Number(amount);

    if (type === "receipt" && entity_type === "customer") {
      // Received money from Customer: reconcile invoices chronologically (FIFO)!
      const receivables = await DB.queryAll<any>("receivables");
      const unpaidInvoices = receivables
        .filter((r) => r.customer_id === Number(entity_id) && Number(r.balance_remaining) > 0)
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

      let unappliedAmount = payAmountNum;

      for (const item of unpaidInvoices) {
        if (unappliedAmount <= 0) break;

        const openBalance = Number(item.balance_remaining);
        if (unappliedAmount >= openBalance) {
          await DB.updateRecord("receivables", item.id, {
            amount_received: Number(item.amount_received) + openBalance,
            balance_remaining: 0
          });
          unappliedAmount -= openBalance;
        } else {
          await DB.updateRecord("receivables", item.id, {
            amount_received: Number(item.amount_received) + unappliedAmount,
            balance_remaining: openBalance - unappliedAmount
          });
          unappliedAmount = 0;
        }
      }
    } else if (type === "payment" && entity_type === "supplier") {
      // Sent money to Supplier: reconcile bills chronologically
      const payables = await DB.queryAll<any>("payables");
      const unpaidBills = payables
        .filter((p) => p.supplier_id === Number(entity_id) && Number(p.balance) > 0)
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

      let unappliedAmount = payAmountNum;

      for (const item of unpaidBills) {
        if (unappliedAmount <= 0) break;

        const openBalance = Number(item.balance);
        if (unappliedAmount >= openBalance) {
          await DB.updateRecord("payables", item.id, {
            paid_amount: Number(item.paid_amount) + openBalance,
            balance: 0
          });
          // Also update parent purchase status to paid
          await DB.updateRecord("purchases", item.purchase_id, { payment_status: "Paid" });
          unappliedAmount -= openBalance;
        } else {
          await DB.updateRecord("payables", item.id, {
            paid_amount: Number(item.paid_amount) + unappliedAmount,
            balance: openBalance - unappliedAmount
          });
          await DB.updateRecord("purchases", item.purchase_id, { payment_status: "Partial" });
          unappliedAmount = 0;
        }
      }
    }

    res.status(201).json(payment);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});


// =========================================================================
// COMPANY SYSTEM SETTINGS PAGE
// =========================================================================

app.get("/api/settings", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const s = await DB.getSettings();
    res.json(s);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings", authenticateJWT, authorizeRoles("admin", "manager"), async (req: Request, res: Response) => {
  try {
    const updated = await DB.updateSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// =========================================================================
// EMBED VITE DEV MODULES / PRODUCTION BUILD STATIC ROUTING
// =========================================================================

async function bootstrap() {
  await initMySQLDB();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve single SPA index for any other page requests
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Exception Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Global express exception handler catch:", err);
    res.status(500).json({ error: "Criticial internal server runtime error. Exception caught." });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ARTISAN ERP Active Server listening on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to bootstrap server:", err);
});
