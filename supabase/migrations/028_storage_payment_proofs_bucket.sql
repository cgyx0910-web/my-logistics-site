-- 创建 payment-proofs 存储桶（若不存在），用于用户上传支付凭证
-- 桶需存在后，RLS 策略（011）才能生效；否则上传会报「存储服务未就绪」
-- 若本迁移报错（如 storage.buckets 不可写），请在 Supabase Dashboard -> Storage -> New bucket -> 名称: payment-proofs，公开: 是 -> 创建
INSERT INTO storage.buckets (id, name, public)
SELECT gen_random_uuid(), 'payment-proofs', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'payment-proofs');
