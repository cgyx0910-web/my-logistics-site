-- ============================================================
-- 创建 3 个 Storage 桶（正确 id/name）+ 2MB 限制 + 仅允许图片 MIME
-- 并在 storage.objects 上创建每桶 2 条策略（共 6 条）
-- 若 Dashboard 创建桶失败，可在 SQL Editor 中执行本文件内容
-- 注意：Supabase 不允许对 storage 表做 DELETE，删桶请用 Dashboard 或 Storage API
-- ============================================================

-- 1) 创建或更新 3 个桶：id 必须与代码中 storage.from('id') 一致
-- File size limit: 2MB = 2097152 bytes
-- Allowed MIME types: image/jpeg, image/png, image/webp
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('payment-proofs', 'payment-proofs', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('product-images', 'product-images', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('site-assets', 'site-assets', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 若之前用错 id 建过桶，请在 Dashboard → Storage → 点进该桶 → 删除（Supabase 不允许 SQL 直接删 storage 表）

-- 2) 删除旧策略（若存在），避免重复创建报错
DROP POLICY IF EXISTS "用户可上传本人订单的支付凭证" ON storage.objects;
DROP POLICY IF EXISTS "支付凭证公开读" ON storage.objects;
DROP POLICY IF EXISTS "已登录用户可上传 product-images 至本人目录" ON storage.objects;
DROP POLICY IF EXISTS "product-images 公开读" ON storage.objects;
DROP POLICY IF EXISTS "已登录用户可上传 site-assets" ON storage.objects;
DROP POLICY IF EXISTS "site-assets 公开读" ON storage.objects;

-- 3) 创建每桶 2 条策略（共 6 条）
-- payment-proofs：用户只能上传到本人路径，所有人可读
CREATE POLICY "用户可上传本人订单的支付凭证"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

CREATE POLICY "支付凭证公开读"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'payment-proofs');

-- product-images：已登录用户只能上传到自己的 products/{user_id}/ 下，所有人可读
CREATE POLICY "已登录用户可上传 product-images 至本人目录"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[2] = (auth.jwt() ->> 'sub')
  );

CREATE POLICY "product-images 公开读"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- site-assets：已登录用户可上传（实际由后端限制为仅 admin），所有人可读
CREATE POLICY "已登录用户可上传 site-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'site-assets');

CREATE POLICY "site-assets 公开读"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'site-assets');
