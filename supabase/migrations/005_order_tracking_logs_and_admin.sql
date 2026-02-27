-- ============================================================
-- 订单轨迹表 order_tracking_logs + 管理员权限（profiles.role）
-- ============================================================

-- 1. profiles 增加 role，用于区分管理员
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

COMMENT ON COLUMN public.profiles.role IS 'user | admin';

-- 2. 订单轨迹表
CREATE TABLE IF NOT EXISTS public.order_tracking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.shipping_orders(id) ON DELETE CASCADE,
  status_title TEXT NOT NULL,
  location TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.order_tracking_logs IS '订单物流流转明细';
COMMENT ON COLUMN public.order_tracking_logs.status_title IS '状态标题，如：包裹已到站';
COMMENT ON COLUMN public.order_tracking_logs.location IS '当前位置';
COMMENT ON COLUMN public.order_tracking_logs.description IS '详细说明';

CREATE INDEX IF NOT EXISTS idx_order_tracking_logs_order_id ON public.order_tracking_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_logs_created_at ON public.order_tracking_logs(created_at DESC);

ALTER TABLE public.order_tracking_logs ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己订单的轨迹（通过 order 的 user_id）
CREATE POLICY "用户可查看自己订单的轨迹"
  ON public.order_tracking_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipping_orders o
      WHERE o.id = order_tracking_logs.order_id AND o.user_id = auth.uid()
    )
  );

-- 管理员可查看、插入任意订单轨迹
CREATE POLICY "管理员可查看所有订单轨迹"
  ON public.order_tracking_logs FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "管理员可插入订单轨迹"
  ON public.order_tracking_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 3. shipping_orders：管理员可查看、更新任意订单
CREATE POLICY "管理员可查看所有订单"
  ON public.shipping_orders FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "管理员可更新所有订单"
  ON public.shipping_orders FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 将某用户设为管理员（执行后替换为实际邮箱）：
-- UPDATE public.profiles SET role = 'admin' WHERE email = '375781598@qq.com';
