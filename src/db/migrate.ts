import fs from "fs";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { DB } from "./dbEngine";

export async function initMySQLDB() {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;

  if (!host || !user || !database) {
    console.log("No MySQL credentials provided, skipping MySQL initialization.");
    return;
  }

  try {
    const connection = await mysql.createConnection({
      host, user, password, database, port
    });

    console.log("MySQL connection established, validating schema...");

    const checkTable = async (tableName: string, createQuery: string) => {
      const [rows]: any = await connection.query(`SHOW TABLES LIKE '${tableName}'`);
      if (rows.length === 0) {
        console.log(`Creating table \`${tableName}\`...`);
        await connection.query(createQuery);
      }
    };

    await checkTable("users", `CREATE TABLE users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255) UNIQUE,
      role VARCHAR(50),
      password VARCHAR(255)
    )`);

    await checkTable("customers", `CREATE TABLE customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255), company_name VARCHAR(255), phone VARCHAR(100),
      whatsapp VARCHAR(100), email VARCHAR(255), address TEXT, ntn VARCHAR(100), notes TEXT
    )`);

    await checkTable("brands", `CREATE TABLE brands (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255), contact_person VARCHAR(255), phone VARCHAR(100),
      email VARCHAR(255), address TEXT, payment_terms VARCHAR(255)
    )`);

    await checkTable("suppliers", `CREATE TABLE suppliers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255), contact_person VARCHAR(255), phone VARCHAR(100), whatsapp VARCHAR(100),
      email VARCHAR(255), address TEXT, supplier_type VARCHAR(100)
    )`);

    await checkTable("thread_inventory", `CREATE TABLE thread_inventory (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shade_code VARCHAR(100), shade_name VARCHAR(255), brand VARCHAR(100), supplier_id INT,
      qty_purchased INT, qty_available INT, unit VARCHAR(50), cost_per_cone DECIMAL(10,2), total_cost DECIMAL(12,2),
      purchase_bill_number VARCHAR(100), purchase_date VARCHAR(50), number_of_cones INT, available_quantity INT,
      consumed_quantity INT, remaining_quantity INT
    )`);

    await checkTable("purchases", `CREATE TABLE purchases (
      id INT AUTO_INCREMENT PRIMARY KEY,
      purchase_number VARCHAR(100), purchase_date VARCHAR(50), supplier_id INT,
      product_name TEXT, quantity INT, unit VARCHAR(50), unit_cost DECIMAL(10,2), total_cost DECIMAL(12,2), payment_status VARCHAR(50)
    )`);

    await checkTable("purchase_items", `CREATE TABLE purchase_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      purchase_id INT, shade_code VARCHAR(100), shade_name VARCHAR(255), cones INT, rate DECIMAL(10,2), total_amount DECIMAL(12,2)
    )`);

    await checkTable("thread_consumption", `CREATE TABLE thread_consumption (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date VARCHAR(50), shade_code VARCHAR(100), shade_name VARCHAR(255), quantity_consumed INT,
      order_id INT, order_number VARCHAR(100), notes TEXT
    )`);

    await checkTable("thread_stock_ledger", `CREATE TABLE thread_stock_ledger (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date VARCHAR(50), type VARCHAR(50), supplier_id INT, purchase_id INT, purchase_number VARCHAR(100),
      shade_code VARCHAR(100), shade_name VARCHAR(255), qty_in INT, qty_out INT, balance INT
    )`);

    await checkTable("expenses", `CREATE TABLE expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      expense_date VARCHAR(50), category VARCHAR(100), description TEXT, amount DECIMAL(10,2), payment_method VARCHAR(50)
    )`);

    await checkTable("orders", `CREATE TABLE orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_number VARCHAR(100), brand_id INT, design_name VARCHAR(255), design_code VARCHAR(100),
      quantity INT, rate DECIMAL(10,2), total_amount DECIMAL(12,2), delivery_date VARCHAR(50), status VARCHAR(50)
    )`);

    await checkTable("invoices", `CREATE TABLE invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_number VARCHAR(100), invoice_date VARCHAR(50), brand_id INT, customer_id INT,
      items TEXT, quantity_total INT, total_amount DECIMAL(12,2), tax_rate DECIMAL(5,2), tax_amount DECIMAL(10,2),
      withholding_tax DECIMAL(10,2), withholding_rate DECIMAL(5,2), discount DECIMAL(10,2), grand_total DECIMAL(12,2),
      notes TEXT, orders TEXT, orders_list TEXT, subtotal DECIMAL(12,2)
    )`);

    await checkTable("payments", `CREATE TABLE payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(50), entity_type VARCHAR(50), entity_id INT, amount DECIMAL(12,2), payment_date VARCHAR(50),
      payment_method VARCHAR(50), reference_number VARCHAR(150), notes TEXT
    )`);

    await checkTable("receivables", `CREATE TABLE receivables (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT, invoice_id INT, amount DECIMAL(12,2), amount_received DECIMAL(12,2), balance_remaining DECIMAL(12,2), due_date VARCHAR(50)
    )`);

    await checkTable("payables", `CREATE TABLE payables (
      id INT AUTO_INCREMENT PRIMARY KEY,
      supplier_id INT, purchase_id INT, amount DECIMAL(12,2), paid_amount DECIMAL(12,2), balance DECIMAL(12,2), due_date VARCHAR(50)
    )`);

    await checkTable("settings", `CREATE TABLE settings (
      company_name VARCHAR(255), logo_url TEXT, address TEXT, phone VARCHAR(100), email VARCHAR(255), website VARCHAR(255), ntn VARCHAR(100), invoice_prefix VARCHAR(50)
    )`);

    // Seed default admin if missing
    const [userRows]: any = await connection.query(`SELECT COUNT(*) as cnt FROM users`);
    if (userRows[0].cnt === 0) {
      console.log("Seeding default users...");
      const SALT = bcrypt.genSaltSync(10);
      const DEFAULT_PASSWORD_HASH = bcrypt.hashSync("admin123", SALT);
      await connection.query(`INSERT INTO users (name, email, role, password) VALUES (?, ?, ?, ?)`, ["Administrator", "admin@artisan.com", "admin", DEFAULT_PASSWORD_HASH]);
      await connection.query(`INSERT INTO users (name, email, role, password) VALUES (?, ?, ?, ?)`, ["Manager", "manager@artisan.com", "manager", DEFAULT_PASSWORD_HASH]);
      await connection.query(`INSERT INTO users (name, email, role, password) VALUES (?, ?, ?, ?)`, ["Accountant", "accountant@artisan.com", "accountant", DEFAULT_PASSWORD_HASH]);
    }

    const [settingsRows]: any = await connection.query(`SELECT COUNT(*) as cnt FROM settings`);
    if (settingsRows[0].cnt === 0) {
      console.log("Seeding default settings...");
      await connection.query(`INSERT INTO settings (company_name, logo_url, address, phone, email, website, ntn, invoice_prefix) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
        ["ARTISAN Embroidery Unit", "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&q=80", "Plot 89, Sector 24, Industrial Area, Korangi, Karachi", "+92 21 35061188", "info@artisanembroidery.com", "https://artisanembroidery.com", "1234567-9", "ART8"]
      );
    }

    await connection.end();
    console.log("MySQL Database schema validation completed.");

  } catch (err: any) {
    console.error("MySQL Initialization failed: ", err.message);
  }
}
