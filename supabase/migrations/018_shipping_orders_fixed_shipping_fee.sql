-- ============================================================
-- shipping_orders 增加 fixed_shipping_fee，与 treasures/auction_products 字段名一致
-- 淘货订单创建时从商品 fixed_shipping_fee 写入订单 fixed_shipping_fee
-- ============================================================

ALTER TABLE public.shipping_orders
  ADD COLUMN IF NOT EXISTS fixed_shipping_fee NUMERIC(12, 2);

COMMENT ON COLUMN public.shipping_orders.fixed_shipping_fee IS '预设运费（元），与 auction_products.fixed_shipping_fee 同名；淘货订单创建时从商品表写入';

-- 淘货相关订单：从 shipping_fee 回填 fixed_shipping_fee 以便一致
UPDATE public.shipping_orders
SET fixed_shipping_fee = shipping_fee
WHERE (source_type IN ('auction_exchange', 'auction_win') OR order_type = 'treasure')
  AND fixed_shipping_fee IS NULL;
