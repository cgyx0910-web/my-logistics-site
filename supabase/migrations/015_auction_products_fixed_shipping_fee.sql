-- ============================================================
-- 淘货商品表增加「预设运费」字段
-- 说明：本项目中淘货（Treasures/Shop）对应表为 auction_products，无单独 treasures 表
-- ============================================================

ALTER TABLE public.auction_products
  ADD COLUMN IF NOT EXISTS fixed_shipping_fee NUMERIC(12, 2);

COMMENT ON COLUMN public.auction_products.fixed_shipping_fee IS '预设运费（元），后台上架时可填写';

-- 从现有 shipping_fee 回填，便于兼容
UPDATE public.auction_products
SET fixed_shipping_fee = COALESCE(fixed_shipping_fee, shipping_fee, 0)
WHERE fixed_shipping_fee IS NULL;
