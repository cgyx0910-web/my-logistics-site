-- ============================================================
-- 允许订单状态「已取消」（与 032 订单取消流程配合）
-- ============================================================

ALTER TABLE public.shipping_orders
  DROP CONSTRAINT IF EXISTS shipping_orders_status_check;

ALTER TABLE public.shipping_orders
  ADD CONSTRAINT shipping_orders_status_check
  CHECK (status IN (
    '待确认', '待付款', '待支付运费', '已支付', '待出库', '已入库', '运输中', '已完成', '已取消'
  ));
