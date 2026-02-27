-- ============================================================
-- Storage RLS：product-images、site-assets 桶
-- 解决上传时报错 "new row violates row-level security policy"
-- 需在 Dashboard -> Storage 中已创建 product-images、site-assets 桶（可设为公开）
-- ============================================================

-- product-images：仅允许已登录用户上传到「自己」的路径
-- 上传路径约定：products/{user_id}/{filename}，foldername 返回 ['products','user_id']，故 [2] = 用户 id
CREATE POLICY "已登录用户可上传 product-images 至本人目录"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[2] = (auth.jwt() ->> 'sub')
  );

-- product-images：公开读（列表/详情页展示商品图）
CREATE POLICY "product-images 公开读"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- site-assets：已登录用户可上传（实际由管理端 API 限制为仅 admin 可调）
-- 上传路径约定：stories/{filename}
CREATE POLICY "已登录用户可上传 site-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'site-assets');

-- site-assets：公开读（物流故事封面等）
CREATE POLICY "site-assets 公开读"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'site-assets');
