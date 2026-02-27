-- ============================================================
-- 支付凭证存储桶与策略
-- 需在 Supabase Dashboard -> Storage 中手动创建名为 payment-proofs 的公开桶（若尚未创建）
-- ============================================================

-- 允许已登录用户向 payment-proofs 桶上传，仅限路径第一段为自己的 user_id（path: user_id/order_id/filename）
CREATE POLICY "用户可上传本人订单的支付凭证"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

-- 允许所有人读取（公开桶内文件）
CREATE POLICY "支付凭证公开读"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'payment-proofs');
