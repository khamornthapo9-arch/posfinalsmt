# POS Buddy — Major Upgrade Plan

## Goal
Transform the current POS into a retail-grade register: dense/fast UI, multi-unit wholesale/retail packaging, a real Master CSV report, and staff RBAC with Pro plan gating.

## Phase 1 — POS Register UI Redesign
**What changes:**
- Replace large product cards with a dense list/grid row: small thumbnail, name, SKU, price, stock badge, quick-add per row.
- Desktop/Tablet: fixed 60/40 two-column layout. Left = search + category pills + dense product list. Right = sticky order cart + checkout panel that stays in viewport.
- Mobile: sticky bottom summary bar ("3 items | Ks 15,000 → Checkout") that opens a slide-over payment drawer.
- Clean top bar: keep shop name, cashier name, Hold Orders button, Shift History; remove online-status pill and low-stock counter from header (low-stock alert stays inside the product area).
- Preserve existing features: barcode/USB scanner, camera scanner, split payments, credit/customer picker, held orders, restaurant table mode, receipt print.

**Files touched:**
- `src/routes/index.tsx` (main rewrite)
- `src/components/pos/pos-shell.tsx` (header cleanup)
- `src/styles.css` (new compact list tokens if needed)

## Phase 2 — Multi-Unit Packaging & Bulk Pricing
**Database changes:**
- Add `is_pro` boolean to `stores`.
- Extend `app_role` enum to include `MANAGER`.
- New table `item_units`:
  - `id`, `item_id` (FK → items), `unit_name` (e.g. "Pack", "Box"), `conversion` (base units per unit, integer), `price` (numeric), `is_default` boolean.
  - GRANTs + RLS: owner/manager can manage; cashiers read-only.
- Update `sale_items` to store the selected unit and base-unit equivalent, or keep `quantity` as base units and add `unit_name`/`unit_price` for display.

**Frontend/Logic changes:**
- Product modal in `src/routes/inventory.tsx`: add unit editor (base + up to 2 extra units with conversion + price).
- Cached item shape in `src/lib/pos-db.ts` carries `units: ItemUnit[]`.
- POS list row shows unit selector pills (Bottle / Pack / Box). Tapping a unit adds that unit to cart at its price.
- Cart line stores `unit_name`, `conversion`, `unit_price`, and base-unit `quantity`. Stock validation converts to base units.
- Stock deduction: always subtract `quantity * conversion` base units from `items.stock_quantity` (DB trigger updated, offline Dexie update uses same math).
- Pro-gate: unit editor and unit selector hidden/bannered for non-Pro stores.

**Files touched:**
- `src/lib/pos-db.ts`
- `src/lib/pos-store.tsx`
- `src/routes/index.tsx`
- `src/routes/inventory.tsx`

## Phase 3 — Advanced Master CSV Export
**What changes:**
- Rewrite `exportCsv` in `src/routes/analytics.tsx`.
- Query `debt_payments` and `expenses` for the same date range.
- Output columns:
  - Total Cash In (ငွေသား)
  - Total KBZ Pay In
  - Total Wave Pay In
  - Total Credit Issued (အကြွေး)
  - Total Debt Repayments Collected (အကြွေးပြန်ဆပ်ငွေ)
  - Total Refunds Issued (ပြန်အမ်းငွေ)
- Split payments are broken into their respective bucket columns, never grouped as "SPLIT".
- Net Cash On Hand = (Cash In + Cash Debt Repayments) − (Cash Refunds + Cash Expenses).
- Keep existing summary rows (revenue, COGS, gross profit, expenses, net profit, active debt).

**Files touched:**
- `src/routes/analytics.tsx`
- `src/lib/accounting-store.tsx` (helpers for debt payment/expense totals if needed)

## Phase 4 — Staff Management (RBAC) & Pro Plan System
**Database changes:**
- `stores.is_pro` boolean (already added in Phase 2).
- `store_members` additions:
  - `pin_code` text (nullable, 4–6 digit local PIN for fast cashier login)
  - `display_name` text
  - `is_active` boolean default true
- RLS: only OWNER can manage `store_members`; MANAGER can read staff; CASHIER can only read own record.

**New route:**
- `src/routes/settings/staff.tsx` (or `/settings/staff` nested route):
  - List staff with role + PIN status.
  - Add staff: email invite (Supabase auth) OR generate a local PIN.
  - Edit role (OWNER / MANAGER / CASHIER).
  - Deactivate/reactivate.

**Role permissions enforced in UI and server:**
- CASHIER: only `/` (register) and `/customers` (credit). Hide inventory, analytics, settings, CSV export, cost prices, supplier/purchase/expense modules.
- MANAGER: register + inventory + analytics + customers/suppliers/expenses, but not settings/staff/Pro-sensitive items.
- OWNER: full access.

**Pro plan gating:**
- Multi-unit packaging editor/selector locked behind `is_pro`.
- Custom receipt logo/header branding locked behind `is_pro`.
- Full CSV export locked behind `is_pro` (basic analytics still free).
- Non-Pro users see a Burmese upgrade banner with a "Pro Plan အဆင့်မြှင့်ရန်" CTA in settings.
- `is_pro` toggled manually in settings (payment integration out of scope; owner can flip after external payment).

**Files touched:**
- `src/lib/roles.tsx` (MANAGER role, permission helpers)
- `src/components/pos/pos-shell.tsx` (nav gating)
- `src/routes/settings.tsx` (Pro toggle, plan banner)
- `src/routes/settings/staff.tsx` (new)
- `src/routes/index.tsx` (hide cost info from cashiers)
- `src/routes/inventory.tsx` (Pro-gate multi-unit)
- `src/routes/analytics.tsx` (Pro-gate CSV)
- `src/routes/settings_.receipt.tsx` (Pro-gate custom logo/header if needed)

## Out of Scope / Notes
- Real subscription billing integration is not included; `is_pro` is a manual store flag.
- PIN-only login is a convenience layer for cashiers; owner/manager still use Supabase email auth. PINs are stored hashed with a simple salt.
- Restaurant table mode remains unchanged except for denser product list rendering.

## Suggested Order of Work
1. Phase 1 (UI) — visible, low-risk foundation.
2. Phase 2 (multi-unit) — schema + stock math.
3. Phase 3 (CSV) — report logic.
4. Phase 4 (RBAC + Pro) — access control and gates.

## Verification
- Build/typecheck after each phase.
- Test register add-to-cart, stock deduction, offline sale, and CSV export.
- Verify CASHIER cannot reach inventory/analytics/settings and MANAGER cannot manage staff.
