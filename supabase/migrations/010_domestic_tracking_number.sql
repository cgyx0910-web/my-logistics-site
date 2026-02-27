-- ============================================================
-- 用户发往仓库的国内物流单号
-- ============================================================

ALTER TABLE public.shipping_orders
  ADD COLUMN IF NOT EXISTS domestic_tracking_number TEXT;

COMMENT ON COLUMN public.shipping_orders.domestic_tracking_number IS '用户录入的发往集运仓的国内快递单号';
