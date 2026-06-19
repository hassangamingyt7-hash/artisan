import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;

  if (!host) {
    console.log("No DB config");
    return;
  }

  const pool = mysql.createPool({
    host,
    user,
    password,
    database,
    port,
  });

  try {
    await pool.query("ALTER TABLE users ADD COLUMN username VARCHAR(255) UNIQUE");
    console.log("Added username column.");
  } catch (e) {
    console.log("Username column may already exist");
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync("hassan321", salt);

  console.log("Updating user 1 to hassan/hassan321...");
  await pool.query("UPDATE users SET username = ?, email = ?, name = ?, password = ? WHERE id = 1", ["hassan", "hassan@artisan.com", "hassan (Administrator)", hash]);

  console.log("Deleting other users...");
  await pool.query("DELETE FROM users WHERE id > 1");

  console.log("Done.");
  const tablesToAlter = [
    "customers", "brands", "suppliers", "thread_inventory",
    "purchases", "purchase_items", "thread_consumption",
    "thread_stock_ledger", "expenses", "orders", "invoices",
    "payments", "receivables", "payables"
  ];
  for (const table of tablesToAlter) {
    try {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN user_id INT`);
      await pool.query(`UPDATE ${table} SET user_id = 1 WHERE user_id IS NULL`);
      console.log(`Added user_id column to ${table}.`);
    } catch (e) {
      console.log(`user_id column may already exist in ${table}`);
    }
  }

  process.exit(0);
}

run();
