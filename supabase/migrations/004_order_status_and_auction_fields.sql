-- ============================================================
-- 订单状态增加「待确认」；积分淘货商品增加起拍/直拍积分与固定运费
-- ============================================================

-- 1. shipping_orders：状态增加「待确认」（保存订单时使用）
ALTER TABLE public.shipping_orders
  DROP CONSTRAINT IF EXISTS shipping_orders_status_check;

ALTER TABLE public.shipping_orders
  ADD CONSTRAINT shipping_orders_status_check
  CHECK (status IN ('待确认', '待付款', '已入库', '运输中', '已完成'));

COMMENT ON COLUMN public.shipping_orders.status IS '待确认、待付款、已入库、运输中、已完成';

-- 2. auction_products：起拍积分沿用 points_required；新增直拍积分与固定运费
ALTER TABLE public.auction_products
  ADD COLUMN IF NOT EXISTS direct_buy_points INTEGER,
  ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(12, 2);

COMMENT ON COLUMN public.auction_products.points_required IS '起拍积分（竞拍起始价）';
COMMENT ON COLUMN public.auction_products.direct_buy_points IS '直拍积分（一口价，可选）';
COMMENT ON COLUMN public.auction_products.shipping_fee IS '该商品固定运费（元）';

-- 为已有数据设置默认直拍与运费（可按需在后台修改）
UPDATE public.auction_products
SET direct_buy_points = COALESCE(direct_buy_points, points_required),
    shipping_fee = COALESCE(shipping_fee, 0)
WHERE direct_buy_points IS NULL OR shipping_fee IS NULL;

-- 签到积分设为 5（与产品需求一致）
UPDATE public.site_settings SET value = '5' WHERE key = 'sign_in_points';
