-- Rollback guidance for 20261128040000_m9_supplier_payments.sql
--
-- This removes the M9 database objects only. It does NOT delete any data: supplier payments already
-- recorded (debt_payments, ledger_entries, cash_movements of type SUPPLIER_PAYMENT) are real financial
-- history and stay. Run it only if you must go back to client-side supplier payments, and ship the
-- previous client first (the previous client writes suppliers.balance directly, which the guard blocks).

DROP TRIGGER IF EXISTS trg_suppliers_balance_guard ON public.suppliers;
DROP TRIGGER IF EXISTS trg_suppliers_delete_guard ON public.suppliers;
DROP FUNCTION IF EXISTS public.suppliers_balance_guard();
DROP FUNCTION IF EXISTS public.suppliers_delete_guard();
DROP FUNCTION IF EXISTS public.pay_supplier(uuid, uuid, numeric, text, uuid, text);

-- Restore the M8 shift_totals (without supplier_payments). Re-run the shift_totals definition from
-- supabase/migrations/20261127040000_m8_accounting_integrity.sql. NOTE: until then, drawer expected
-- cash ignores SUPPLIER_PAYMENT movements, so only do this if no cash supplier payment was recorded
-- against an open shift.

-- The cash_movements CHECK still allows 'SUPPLIER_PAYMENT'. Leave it: existing rows use it. Narrow it only
-- when this returns 0:
--   SELECT count(*) FROM public.cash_movements WHERE movement_type = 'SUPPLIER_PAYMENT';
