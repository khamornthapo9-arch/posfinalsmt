CREATE POLICY "Store members can view item images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'item-images' AND public.is_store_member(((storage.foldername(name))[1])::uuid));

CREATE POLICY "Store members can upload item images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'item-images' AND public.is_store_member(((storage.foldername(name))[1])::uuid));

CREATE POLICY "Store members can update item images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'item-images' AND public.is_store_member(((storage.foldername(name))[1])::uuid))
WITH CHECK (bucket_id = 'item-images' AND public.is_store_member(((storage.foldername(name))[1])::uuid));

CREATE POLICY "Store members can delete item images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'item-images' AND public.is_store_member(((storage.foldername(name))[1])::uuid));