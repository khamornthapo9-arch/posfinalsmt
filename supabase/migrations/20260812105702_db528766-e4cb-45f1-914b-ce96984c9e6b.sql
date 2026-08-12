CREATE OR REPLACE FUNCTION public.decrement_stock_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.items
  SET stock_quantity = GREATEST(stock_quantity - (NEW.quantity * COALESCE(NEW.conversion, 1)), 0)
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$;