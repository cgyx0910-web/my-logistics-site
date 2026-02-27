-- ============================================================
-- 淘货（Treasures）订单类型与状态：平台发货、跳过入库、预设运费
-- ============================================================

-- 1. shipping_orders：订单类型 order_type
ALTER TABLE public.shipping_orders
  ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'logistics';

ALTER TABLE public.shipping_orders
  DROP CONSTRAINT IF EXISTS shipping_orders_order_type_check;

ALTER TABLE public.shipping_orders
  ADD CONSTRAINT shipping_orders_order_type_check
  CHECK (order_type IN ('logistics', 'treasure'));

COMMENT ON COLUMN public.shipping_orders.order_type IS 'logistics=普通集运, treasure=淘货（平台发货，跳过入库）';

-- 2. 状态增加：待支付运费、待出库
ALTER TABLE public.shipping_orders
  DROP CONSTRAINT IF EXISTS shipping_orders_status_check;

ALTER TABLE public.shipping_orders
  ADD CONSTRAINT shipping_orders_status_check
  CHECK (status IN (
    '待确认', '待付款', '待支付运费', '已支付', '待出库', '已入库', '运输中', '已完成'
  ));

COMMENT ON COLUMN public.shipping_orders.status IS '待确认、待付款、待支付运费(淘货)、已支付、待出库(淘货)、已入库、运输中、已完成';
