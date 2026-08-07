# Offline-First Point of Sale App

A full POS system with three views (Register, Inventory, Analytics), backed by Lovable Cloud, that keeps selling when the internet drops and syncs automatically when it returns.

## What gets built

**Backend (Lovable Cloud)**
- Tables: `items` (sku, name, price, stock, min threshold), `sales` (total, payment method, offline flag), `sale_items` (line items linked to sale and item).
- A database trigger that decrements item stock automatically whenever a sale line is recorded.
- Seed catalog of demo products so the register is usable immediately.
- Open read/write access (no login) since a register terminal is shared — can be locked behind staff accounts later.

**Offline engine (IndexedDB via Dexie)**
- Catalog mirrored locally on load; offline reads come from the local copy.
- Sales made offline are queued locally, stock deducted locally so the UI stays accurate.
- Sync manager watches the browser online event plus a 30s poll; on reconnect it pushes queued sales, clears the queue, and refetches the fresh catalog.

**Layout**
- Sidebar with Register / Inventory / Analytics.
- Top bar status badge: Online & Synced, Offline (X pending), or Syncing, plus a live low-stock counter.

**View 1 — POS Register**
- Left: search by name/SKU, camera scanner modal (html5-qrcode), USB barcode scanner support via global keydown, product grid with stock badges.
- Right: cart with +/-/delete, subtotal, configurable tax (5% default), grand total, payment selector (Cash / Card / QR Code), Complete Sale with stock validation and a printable receipt modal.

**View 2 — Inventory**
- Searchable/filterable table with status badges (In Stock / Low / Out).
- Create + edit product modal.
- QR generator per product encoding its SKU, plus a 2x1 inch print-label modal with print-only CSS.

**View 3 — Analytics**
- Today / Week / Month / Custom range filters.
- Metric cards: revenue, transactions, units sold, average order value.
- Recharts revenue trend chart and top-5 products bar chart.
- CSV export of the filtered transactions.

## Design direction
Dense operator-console aesthetic: dark slate sidebar, bright high-contrast action buttons, large tap targets for the register grid, tabular numerals for money. Semantic design tokens throughout, no hardcoded colors.

## Technical notes
- Stack: TanStack Start routes (`/` register, `/inventory`, `/analytics`), TanStack Query for server state, Dexie for IndexedDB.
- New packages: `dexie`, `dexie-react-hooks`, `html5-qrcode`, `qrcode.react`.
- Register/inventory/analytics routes render client-side for browser-only APIs (IndexedDB, camera).
- Offline sale sync posts sale header then line items; the stock trigger applies on insert, and local stock is reconciled by refetching after sync.
- Analytics queries aggregate `sales` + `sale_items` client-side over the selected range.
