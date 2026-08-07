CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_threshold INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO anon, authenticated;
GRANT ALL ON public.items TO service_role;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage items" ON public.items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_items_sku ON public.items(sku);

CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  is_offline_sync BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO anon, authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage sales" ON public.sales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_sales_created_at ON public.sales(created_at);

CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO anon, authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage sale_items" ON public.sale_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX idx_sale_items_item_id ON public.sale_items(item_id);

CREATE OR REPLACE FUNCTION public.decrement_stock_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.items
  SET stock_quantity = GREATEST(stock_quantity - NEW.quantity, 0)
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_decrement_stock
AFTER INSERT ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.decrement_stock_on_sale();

INSERT INTO public.items (sku, name, price, stock_quantity, min_stock_threshold) VALUES
('ESP-001','Espresso Shot',2.50,120,15),
('LAT-002','Vanilla Latte',4.75,64,15),
('CLD-003','Cold Brew 16oz',5.25,40,10),
('CRO-004','Butter Croissant',3.50,22,10),
('BGL-005','Everything Bagel',2.95,8,10),
('MUF-006','Blueberry Muffin',3.25,31,10),
('SND-007','Turkey Club Sandwich',8.95,12,6),
('SLD-008','Caesar Salad',7.50,5,6),
('JUC-009','Fresh Orange Juice',4.25,18,8),
('WTR-010','Sparkling Water',1.95,96,20),
('CHP-011','Sea Salt Chips',2.25,0,10),
('CKE-012','Chocolate Chip Cookie',2.75,45,12);