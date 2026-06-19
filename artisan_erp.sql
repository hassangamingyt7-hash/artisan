-- ARTISAN ERP & Accounts Management System Database Schema
-- Target: MySQL 8.x or MariaDB 10.x compatible
-- Created for ARTISAN Embroidery Unit Hostinger Deployment

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `payables`;
DROP TABLE IF EXISTS `receivables`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `invoices`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `purchases`;
DROP TABLE IF EXISTS `thread_inventory`;
DROP TABLE IF EXISTS `suppliers`;
DROP TABLE IF EXISTS `brands`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `settings`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Users Table
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `role` ENUM('admin', 'manager', 'accountant') NOT NULL DEFAULT 'accountant',
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Customers Table
CREATE TABLE `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `company_name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `whatsapp` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `address` TEXT NOT NULL,
  `ntn` VARCHAR(50) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_customers_name` (`name`),
  INDEX `idx_customers_company` (`company_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Brands Table
CREATE TABLE `brands` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `contact_person` VARCHAR(100) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `payment_terms` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_brands_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Suppliers Table
CREATE TABLE `suppliers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `contact_person` VARCHAR(100) DEFAULT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `whatsapp` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `address` TEXT NOT NULL,
  `supplier_type` ENUM('Thread', 'Fabric', 'Accessory', 'Other') NOT NULL DEFAULT 'Other',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_suppliers_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Thread Inventory Table
CREATE TABLE `thread_inventory` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `shade_code` VARCHAR(50) NOT NULL,
  `shade_name` VARCHAR(100) NOT NULL,
  `brand` VARCHAR(100) NOT NULL,
  `supplier_id` INT NOT NULL,
  `purchase_date` DATE NOT NULL,
  `qty_purchased` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `qty_available` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `unit` VARCHAR(25) NOT NULL DEFAULT 'Cones',
  `cost_per_cone` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_thread_shade` (`shade_code`),
  INDEX `idx_thread_supplier` (`supplier_id`),
  CONSTRAINT `fk_thread_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Purchases Table
CREATE TABLE `purchases` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `purchase_number` VARCHAR(50) NOT NULL UNIQUE,
  `purchase_date` DATE NOT NULL,
  `supplier_id` INT NOT NULL,
  `product_name` TEXT NOT NULL,
  `quantity` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `unit` VARCHAR(25) NOT NULL DEFAULT 'Cones',
  `unit_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_status` ENUM('Paid', 'Partial', 'Unpaid') NOT NULL DEFAULT 'Unpaid',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_purchases_number` (`purchase_number`),
  INDEX `idx_purchases_supplier` (`supplier_id`),
  CONSTRAINT `fk_purchases_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Expenses Table
CREATE TABLE `expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `expense_date` DATE NOT NULL,
  `category` ENUM('Electricity', 'Rent', 'Salaries', 'Maintenance', 'Fuel', 'Internet', 'Transport', 'Miscellaneous') NOT NULL DEFAULT 'Miscellaneous',
  `description` TEXT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'Cash',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_expenses_category` (`category`),
  INDEX `idx_expenses_date` (`expense_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Orders Table
CREATE TABLE `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_number` VARCHAR(50) NOT NULL UNIQUE,
  `brand_id` INT NOT NULL,
  `design_name` VARCHAR(150) NOT NULL,
  `design_code` VARCHAR(50) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 0,
  `rate` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `delivery_date` DATE NOT NULL,
  `status` ENUM('Pending', 'Running', 'Completed', 'Delivered') NOT NULL DEFAULT 'Pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_orders_number` (`order_number`),
  INDEX `idx_orders_brand` (`brand_id`),
  CONSTRAINT `fk_orders_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Invoices Table
CREATE TABLE `invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
  `invoice_date` DATE NOT NULL,
  `brand_id` INT NOT NULL,
  `customer_id` INT NOT NULL,
  `items` JSON NOT NULL, -- Logical Array of items: [{description, quantity, rate, total}]
  `quantity_total` INT NOT NULL DEFAULT 0,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `tax_rate` DECIMAL(5,2) NOT NULL DEFAULT 17.00,
  `tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_invoices_number` (`invoice_number`),
  INDEX `idx_invoices_brand` (`brand_id`),
  INDEX `idx_invoices_customer` (`customer_id`),
  CONSTRAINT `fk_invoices_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_invoices_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Payments Table (receipts and vendor disbursements)
CREATE TABLE `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `type` ENUM('receipt', 'payment') NOT NULL,
  `entity_type` ENUM('customer', 'supplier', 'brand', 'expense', 'other') NOT NULL,
  `entity_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_date` DATE NOT NULL,
  `payment_method` ENUM('Cash', 'Bank Transfer', 'Cheque', 'JazzCash', 'Easypaisa') NOT NULL DEFAULT 'Cash',
  `reference_number` VARCHAR(100) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_payments_type` (`type`),
  INDEX `idx_payments_date` (`payment_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Receivables Table
CREATE TABLE `receivables` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT NOT NULL,
  `invoice_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `amount_received` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `balance_remaining` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `due_date` DATE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_receivables_customer` (`customer_id`),
  INDEX `idx_receivables_invoice` (`invoice_id`),
  CONSTRAINT `fk_receivables_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_receivables_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Payables Table
CREATE TABLE `payables` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `supplier_id` INT NOT NULL,
  `purchase_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `due_date` DATE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_payables_supplier` (`supplier_id`),
  INDEX `idx_payables_purchase` (`purchase_id`),
  CONSTRAINT `fk_payables_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_payables_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Settings Table
CREATE TABLE `settings` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `company_name` VARCHAR(150) NOT NULL DEFAULT 'ARTISAN Embroidery Unit',
  `logo_url` TEXT DEFAULT NULL,
  `address` TEXT NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `website` VARCHAR(100) DEFAULT NULL,
  `ntn` VARCHAR(50) DEFAULT NULL,
  `invoice_prefix` VARCHAR(20) NOT NULL DEFAULT 'ART8',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- SEED DATA INSERT SERVICE
-- Default users (passwords are 'admin123' encrypted with standard bcrypt)
-- ==========================================
INSERT INTO `users` (`id`, `name`, `email`, `role`, `password`) VALUES
(1, 'ARTI8SAN Administrator', 'admin@artisan.com', 'admin', '$2a$10$EfyLgW0XNpeA20XwWCHGZutqG30lpx9W6vG8/L5KBy8xYmP9mCOsK'),
(2, 'Factory Manager', 'manager@artisan.com', 'manager', '$2a$10$EfyLgW0XNpeA20XwWCHGZutqG30lpx9W6vG8/L5KBy8xYmP9mCOsK'),
(3, 'Lead Accountant', 'accountant@artisan.com', 'accountant', '$2a$10$EfyLgW0XNpeA20XwWCHGZutqG30lpx9W6vG8/L5KBy8xYmP9mCOsK')
ON DUPLICATE KEY UPDATE `id`=`id`;

INSERT INTO `customers` (`id`, `name`, `company_name`, `phone`, `whatsapp`, `email`, `address`, `ntn`, `notes`) VALUES
(1, 'Khaadi Retail Pakistan', 'Khaadi', '+92 300 1234567', '+92 300 1234567', 'accounts@khaadi.com', 'Plot 34, Sector 15, Korangi Industrial Area, Karachi', '3189456-7', 'A-Grade premium fabric client'),
(2, 'Sana Safinaz', 'Sana Safinaz', '+92 321 9876543', '+92 321 9876543', 'billing@sanasafinaz.com', 'Gate 4, S.I.T.E Area, Karachi', '4201399-2', 'Requires strict Net-15 invoicing'),
(3, 'Gul Ahmed Textiles Ltd', 'Gul Ahmed', '+92 333 4567890', '+92 333 4567890', 'vendors@gulahmed.com', 'Landhi Industrial Area, Karachi', '1198543-1', 'Pioneering partner')
ON DUPLICATE KEY UPDATE `id`=`id`;

INSERT INTO `brands` (`id`, `name`, `contact_person`, `phone`, `email`, `address`, `payment_terms`) VALUES
(1, 'Khaadi Pre-t', 'Zainab Bukhari', '+92 300 1112222', 'zainab.b@khaadi.com', 'Head Office Tower, Clifton, Karachi', '30 Days Invoice Cycle'),
(2, 'Sana Safinaz Luxury Wear', 'Sarah Ahmed', '+92 321 8889999', 'sarah.ahmed@sanasafinaz.com', 'Phase VI, DHA, Karachi', '15 Days Invoice Cycle'),
(3, 'Gul Ahmed Ideas', 'Bilal Khan', '+92 333 5554444', 'bilal.ideas@gulahmed.com', 'Ideas Commercial Hub, Karachi', 'Cash on Delivery')
ON DUPLICATE KEY UPDATE `id`=`id`;

INSERT INTO `suppliers` (`id`, `name`, `contact_person`, `phone`, `whatsapp`, `email`, `address`, `supplier_type`) VALUES
(1, 'Anchorage Thread Distributors', 'Asif Malik', '+92 302 7776665', '+92 302 7776665', 'orders@anchorage.com', 'Moti Bazaar, Faisalabad', 'Thread'),
(2, 'Sindh Garments & Zari Supplies', 'Rafiq Qureshi', '+92 301 4443332', '+92 301 4443332', 'rafiq@sindhgarment.com', 'Saddar Bazaar, Karachi', 'Accessory'),
(3, 'Sana Fabric Support', 'Rizwan Baig', '+92 345 9998887', '+92 345 9998887', 'rizwan@fabricsupport.pk', 'Jinnah Market, Lahore', 'Fabric')
ON DUPLICATE KEY UPDATE `id`=`id`;

INSERT INTO `settings` (`id`, `company_name`, `logo_url`, `address`, `phone`, `email`, `website`, `ntn`, `invoice_prefix`) VALUES
(1, 'ARTISAN Embroidery Unit', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&q=80', 'Plot 89, Sector 24, Industrial Area, Korangi, Karachi, Pakistan', '+92 21 35061188', 'info@artisanembroidery.com', 'https://artisanembroidery.com', '1234567-9', 'ART8')
ON DUPLICATE KEY UPDATE `id`=`id`;
