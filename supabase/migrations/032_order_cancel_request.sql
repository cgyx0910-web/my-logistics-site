-- ============================================================
-- 订单取消：仅「待确认」可申请取消，双方同意后 status=已取消
-- ============================================================

ALTER TABLE public.shipping_orders
  ADD COLUMN IF NOT EXISTS cancel_requested_by TEXT,
  ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMPTZ;

COMMENT ON COLUMN public.shipping_orders.cancel_requested_by IS '申请取消方：customer | admin，对方同意后置空并设 status=已取消';
COMMENT ON COLUMN public.shipping_orders.cancel_requested_at IS '申请取消时间';
