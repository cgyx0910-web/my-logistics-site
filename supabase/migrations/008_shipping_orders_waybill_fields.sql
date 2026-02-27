-- ============================================================
-- shipping_orders 面单与收寄件人信息
-- ============================================================

ALTER TABLE public.shipping_orders
  ADD COLUMN IF NOT EXISTS cargo_details TEXT,
  ADD COLUMN IF NOT EXISTS sender_name TEXT,
  ADD COLUMN IF NOT EXISTS sender_phone TEXT,
  ADD COLUMN IF NOT EXISTS sender_address TEXT,
  ADD COLUMN IF NOT EXISTS receiver_name TEXT,
  ADD COLUMN IF NOT EXISTS receiver_phone TEXT,
  ADD COLUMN IF NOT EXISTS receiver_address TEXT;

COMMENT ON COLUMN public.shipping_orders.cargo_details IS '简要货物品名/种类';
COMMENT ON COLUMN public.shipping_orders.sender_name IS '寄件人姓名';
COMMENT ON COLUMN public.shipping_orders.sender_phone IS '寄件人电话';
COMMENT ON COLUMN public.shipping_orders.sender_address IS '寄件人地址';
COMMENT ON COLUMN public.shipping_orders.receiver_name IS '收件人姓名';
COMMENT ON COLUMN public.shipping_orders.receiver_phone IS '收件人电话';
COMMENT ON COLUMN public.shipping_orders.receiver_address IS '收件人地址';
