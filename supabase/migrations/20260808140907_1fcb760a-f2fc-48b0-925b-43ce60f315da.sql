DELETE FROM public.sale_items si USING public.items i WHERE si.item_id = i.id;
DELETE FROM public.sales s WHERE NOT EXISTS (SELECT 1 FROM public.sale_items si WHERE si.sale_id = s.id);
DELETE FROM public.items;