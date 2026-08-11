ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_type text NOT NULL DEFAULT 'REGISTERED';

CREATE OR REPLACE FUNCTION public.seed_demo_catalog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.items (store_id, sku, name, cost_price, price, stock_quantity, min_stock_threshold)
  VALUES
    (NEW.id, '8850001001019', 'ကော်ဖီမစ် (၃ဆက်)', 800, 1200, 120, 20),
    (NEW.id, '8850001001026', 'လက်ဖက်ခြောက် ထုပ်', 1500, 2200, 60, 10),
    (NEW.id, '8850001001033', 'သောက်ရေသန့် ၁ လီတာ', 300, 500, 200, 30),
    (NEW.id, '8850001001040', 'ကိုကာကိုလာ ကန်', 700, 1000, 150, 24),
    (NEW.id, '8850001001057', 'မုန့်ဖုတ် ပက်ကက်', 900, 1500, 80, 12),
    (NEW.id, '8850001001064', 'ဆပ်ပြာမှုန့် ၅၀၀ ဂရမ်', 1800, 2600, 45, 10),
    (NEW.id, '8850001001071', 'သွားတိုက်ဆေး', 1400, 2000, 40, 8),
    (NEW.id, '8850001001088', 'ခေါက်ဆွဲခြောက် ထုပ်', 400, 700, 300, 40),
    (NEW.id, '8850001001095', 'ဆီ ၁ လီတာ', 4200, 5500, 35, 6),
    (NEW.id, '8850001001101', 'ဆား ၁ ထုပ်', 350, 600, 90, 15),
    (NEW.id, '8850001001118', 'ကြက်ဥ (၁၀ လုံး)', 2800, 3800, 25, 5),
    (NEW.id, '8850001001125', 'ဆန် ၁ ပြည်', 2000, 2800, 50, 10)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_demo_catalog ON public.stores;
CREATE TRIGGER trg_seed_demo_catalog
AFTER INSERT ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.seed_demo_catalog();