-- 修正 product-images 上传策略：路径为 products/{user_id}/xxx，第二段 [2] 才是 user_id（[1] 为 'products'）
DROP POLICY IF EXISTS "已登录用户可上传 product-images 至本人目录" ON storage.objects;

CREATE POLICY "已登录用户可上传 product-images 至本人目录"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[2] = (auth.jwt() ->> 'sub')
  );
