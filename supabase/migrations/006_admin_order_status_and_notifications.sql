-- ============================================================
-- 订单状态「已支付」；站内通知表
-- ============================================================

-- 1. shipping_orders：状态增加「已支付」
ALTER TABLE public.shipping_orders
  DROP CONSTRAINT IF EXISTS shipping_orders_status_check;

ALTER TABLE public.shipping_orders
  ADD CONSTRAINT shipping_orders_status_check
  CHECK (status IN ('待确认', '待付款', '已支付', '已入库', '运输中', '已完成'));

COMMENT ON COLUMN public.shipping_orders.status IS '待确认、待付款、已支付、已入库、运输中、已完成';

-- 2. 站内通知表（积分发放等）
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_notifications IS '用户站内通知';
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON public.user_notifications(created_at DESC);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户只能查看自己的通知"
  ON public.user_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的通知（如已读）"
  ON public.user_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "管理员可插入通知（给任意用户）"
  ON public.user_notifications FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
