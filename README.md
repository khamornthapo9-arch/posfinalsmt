# POS Buddy

Build a complete, production-ready, full-stack Point of Sale (POS) web application using React, Tailwind CSS, Lucide icons, Recharts, and Supabase (PostgreSQL), with full offline checkout support using IndexedDB (Dexie.js).

================================================================
1. DATABASE SCHEMA & BACKEND LOGIC (Supabase PostgreSQL)
================================================================
Create the following relational schema with primary keys, foreign keys, and indexes:

- `items` table:
  - id (UUID, PK, default gen_random_uuid())
  - sku (text, UNIQUE, required)
  - name (text, required)
  - price (numeric(10,2), required)
  - stock_quantity (integer, default 0)
  - min_stock_threshold (integer, default 5)
  - created_at (timestamptz, default now())

- `sales` table:
  - id (UUID, PK, default gen_random_uuid())
  - total_amount (numeric(10,2), required)
  - payment_method (text, e.g., 'Cash', 'Card', 'QR Code')
  - is_offline_sync (boolean, default false)
  - created_at (timestamptz, default now())

- `sale_items` table:
  - id (UUID, PK, default gen_random_uuid())
  - sale_id (UUID, FK -> sales.id ON DELETE CASCADE)
  - item_id (UUID, FK -> items.id ON DELETE RESTRICT)
  - quantity (integer, required)
  - unit_price (numeric(10,2), required)

PostgreSQL Trigger: Create a DB function and trigger on `sale_items` that automatically decrements `items.stock_quantity` by `NEW.quantity` whenever a new sale line item is created.

================================================================
2. LOCAL STORAGE & OFFLINE ENGINE (IndexedDB / Dexie.js)
================================================================
Configure client-side storage with two local stores: `cached_items` and `pending_sales`.

- Catalog Caching: On app load (when online), pull all items from Supabase and mirror them into `cached_items`. When offline, read product catalogs directly from `cached_items`.
- Offline Sales Queue: When completing a sale while offline:
  1. Store the transaction object (sale header + line items) in `pending_sales`.
  2. Deduct quantities locally in `cached_items` so UI inventory updates instantly.
  3. Mark transaction as pending sync.
- Sync Manager:
  - Listen for browser `online` events and poll network status every 30s.
  - When connection is restored, batch post records in `pending_sales` to Supabase (`sales` and `sale_items`).
  - Upon successful sync response, clear local `pending_sales` and re-fetch clean item data from Supabase.

================================================================
3. NAVIGATION & GLOBAL LAYOUT
================================================================
Create a sidebar layout with 3 primary views:
1. POS Register (Default)
2. Inventory Management
3. Sales Analytics

Top Navbar Indicator:
- Status Badge: 🟢 Online & Synced | 🟡 Offline (X Pending) | 🔵 Syncing...
- Low Stock Counter: Live alert count of items where `stock_quantity <= min_stock_threshold`.

================================================================
4. VIEW 1: POS REGISTER (CHECKOUT ENGINE)
================================================================
Split into two primary sections:

Left Column (Catalog & Scanners):
- Search input (Name or SKU filter).
- Camera Scanner button: Toggles camera modal using `html5-qrcode`. Scanning a valid SKU appends 1 unit directly to active cart.
- USB Scanner Support: Global keydown listener for physical barcode scanners (processing input ending with 'Enter').
- Product Grid: Cards showing Name, Price, SKU, and Stock Badge. Clicking adds item to cart.

Right Column (Active Cart & Checkout):
- Itemized cart table with (+ / - / delete) controls and line totals.
- Calculation Box: Subtotal, Tax (configurable e.g., 5%), and Grand Total.
- Payment Selector: "Cash", "Card", or "QR Code".
- Complete Sale Action:
  - Validates stock sufficiency.
  - Writes transaction (to Supabase if online, or `pending_sales` if offline).
  - Displays printable receipt modal (itemized list, tax, total, timestamp, payment method, offline status).
  - Clears cart.

================================================================
5. VIEW 2: INVENTORY & QR GENERATOR
================================================================
- Inventory Table: Searchable, filterable list of all items displaying Name, SKU, Price, Stock Level, Status Badge (In Stock / Low / Out), and Actions.
- Product Modal: Form to create and edit products (Name, SKU, Price, Stock, Threshold).
- QR Generator & Printing:
  - "Generate QR" button using `qrcode.react` encoding product `sku`.
  - "Print Label" modal formatted in 2x1 inch adhesive label style containing Product Name, Price, SKU, and rendered QR code with CSS `@media print` rules.

================================================================
6. VIEW 3: SALES ANALYTICS & DASHBOARD
================================================================
- Date Range Filters: "Today", "This Week", "This Month", and "Custom Range".
- Metric Cards: Total Revenue ($), Total Transactions, Total Units Sold, Average Order Value ($).
- Visualizations (Recharts):
  - Revenue Trend Chart: Dynamic line/bar chart over selected timeframe.
  - Top Selling Products: Bar chart ranking top 5 items by total quantity sold.
- Data Export: "Export CSV" button generating tabular download of filtered transactions.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://posmm.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c61e224e-918f-4709-b1b0-e3ccce020245).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
