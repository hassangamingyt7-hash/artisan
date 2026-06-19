# Hostinger Deployment Guide for ARTI8SAN ERP & Accounts System

This guide outlines step-by-step instructions for deploying the **ARTI8SAN ERP & Accounts Management System** on either **Hostinger VPS Hosting** or **Hostinger Shared Node.js Hosting**.

---

## 1. Directory Structure Overview
Your directory holds standard React + Express full-stack architecture:
```
├── artisan_erp_db.json        # Sandbox JSON state (only used in offline sandbox)
├── artisan_erp.sql            # MySQL Database schema definition
├── HOSTINGER_DEPLOYMENT_GUIDE.md # This compilation guide
├── package.json               # Node Scripts and server/client dependencies
├── tsconfig.json              # TypeScript compilation attributes
├── vite.config.ts             # Client compilers
├── server.ts                  # Dedicated Express HTTP rest controller
├── index.html                 # Main browser layout index
└── src/
    ├── main.tsx               # Client entry point
    ├── index.css              # Global custom CSS styles (Tailwind import)
    ├── App.tsx                # Client interface routing hub
    ├── types.ts               # Full TS interface bindings
    └── components/            # Interface modules
```

---

## 2. Deploying on Hostinger Shared Node.js Hosting

Hostinger’s standard Shared hosting has built-in Node.js application management directly inside the **hPanel**.

### Step A: Initialize the MySQL Database
1. Login to **Hostinger hPanel**.
2. Navigate to **Databases** -> **MySQL Databases**.
3. Create a new Database:
   - **Database Name**: e.g., `u123456789_artisan_db`
   - **MySQL User**: e.g., `u123456789_artisan`
   - **Password**: E.g., `MySecureDbPassword123`
4. Click **Create**.
5. Once created, click on **Enter phpMyAdmin** next to the newly created database.
6. Select **Import** in phpMyAdmin, choose the `/artisan_erp.sql` file from your project bundle, and click **Go** to build all tables, indexes, and insert default user credentials.

### Step B: Create and Configure Node.js Application
1. Search for **Node.js** in hPanel search bar.
2. Click **Node.js** under Advanced menu.
3. Click **Create Application**:
   - **App Directory**: `artisan-erp`
   - **Node.js Version**: Select **Node.js 18.x** or **Node.js 20.x** (recommended).
   - **App Domain/URL**: Select your preferred domain address.
   - **Run Command/Script**: Set this to `dist/server.cjs`
4. Click **Create**.

### Step C: File Upload & Building the Project
1. Build the production assets locally (or click compile within AI Studio):
   ```bash
   npm run build
   ```
   This generates:
   - `/dist/` containing all static web elements (HTML, JS, CSS assets).
   - `/dist/server.cjs` representing the fully-compiled bundle of your `server.ts` Express code (compiled using esbuild, fully resolving type imports).
2. Archive the built project folder to a `.zip` (excluding `node_modules` and raw server files if desired, make sure you include `/dist/`, `/package.json`, `.env`).
3. Inside hPanel, open **File Manager** and enter the `artisan-erp` directory.
4. Upload your ZIP file and extract it here.
5. Create a file named `.env` in this directory:
   ```env
   NODE_ENV=production
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=u123456789_artisan
   DB_PASSWORD=MySecureDbPassword123
   DB_NAME=u123456789_artisan_db
   JWT_SECRET=ARTISAN_SUPER_SECRET_ERP_JWT_TOKEN_2026
   ```

### Step D: Dependency Installation & Launch
1. Go back to hPanel **Node.js Dashboard**.
2. Click **Install Dependencies** (runs `npm install` inside the folder).
3. Once completed, click **Start App**.
4. Access your domain! The system runs live in production.

---

## 3. Deploying on Hostinger VPS Hosting (Ubuntu 22.04 LTS / Debian)

A Virtual Private Server (VPS) gives you total root control to host the Express server.

### Step A: Update Server & Setup Node.js
Connect via SSH to your Hostinger VPS IP and run:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs mysql-server git build-essential
```

### Step B: Setup MySQL Database
1. Enter the MySQL terminal:
   ```bash
   sudo mysql
   ```
2. Create database and administrative user:
   ```sql
   CREATE DATABASE artisan_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'artisan_user'@'localhost' IDENTIFIED BY 'MySecureDbPassword123';
   GRANT ALL PRIVILEGES ON artisan_db.* TO 'artisan_user'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```
3. Import the system schema:
   ```bash
   mysql -u artisan_user -p artisan_db < artisan_erp.sql
   ```

### Step C: Deploy Files to VPS
Locate the code folder on server (e.g., `/var/www/artisan-erp`):
```bash
sudo mkdir -p /var/www/artisan-erp
sudo chown -R $USER:$USER /var/www/artisan-erp
cd /var/www/artisan-erp
```
Move your bundle files here using git or SFTP (Cyberduck/FileZilla).

### Step D: Build & Start App via PM2
PM2 is a robust Node.js process manager to keep the application running 24/7.
1. Install project dependencies and build:
   ```bash
   npm install
   npm run build
   ```
2. Install PM2 globally:
   ```bash
   sudo npm install pm2 -g
   ```
3. Create the production `.env` file:
   ```bash
   nano .env
   ```
   Add settings:
   ```env
   NODE_ENV=production
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=artisan_user
   DB_PASSWORD=MySecureDbPassword123
   DB_NAME=artisan_db
   JWT_SECRET=ARTISAN_SUPER_SECRET_ERP_JWT_TOKEN_2026
   ```
4. Start the Express server:
   ```bash
   pm2 start dist/server.cjs --name "artisan-erp"
   pm2 save
   pm2 startup
   ```

### Step E: Expose App via Nginx Reverse Proxy (Optional, Port 80/443)
Configure Nginx to route domain requests to local port 3000:
1. Install Nginx:
   ```bash
   sudo apt install nginx -y
   ```
2. Create server configuration:
   ```bash
   sudo nano /etc/nginx/sites-available/artisan-erp
   ```
   Paste:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
3. Enable configuration and test:
   ```bash
   sudo ln -s /etc/nginx/sites-available/artisan-erp /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```
4. (Optional) Run `sudo certbot --nginx` to add free SSL encryption!
